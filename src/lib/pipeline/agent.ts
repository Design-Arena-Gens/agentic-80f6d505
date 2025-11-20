import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { createRunLogger } from '../utils/logger';
import { ensureDir, writeJsonFile, readJsonFile } from '../utils/fs';
import { getBrandConfig, requireBrandConfig } from '../services/config.service';
import { generateTopicIdea } from '../services/research.service';
import { craftScript } from '../services/script.service';
import { synthesizeVoiceover } from '../services/voice.service';
import { createVisualSequence } from '../services/visuals.service';
import { assembleVideo, generateThumbnail } from '../services/video.service';
import { buildUploadMetadata } from '../services/metadata.service';
import { uploadShort } from '../services/youtube.service';
import type { AgentRuntimeContext, RunResult } from '../types';

const HISTORY_FILE = 'runs/history.json';
const LATEST_FILE = 'runs/latest.json';

async function appendRunHistory(result: RunResult) {
  const history = await readJsonFile<RunResult[]>(HISTORY_FILE, []);
  history.unshift(result);
  const limited = history.slice(0, 30);
  await writeJsonFile(HISTORY_FILE, limited);
  await writeJsonFile(LATEST_FILE, result);
}

export async function executeDailyRun(): Promise<RunResult> {
  const runId = randomUUID();
  const logger = createRunLogger(runId);
  const startedAt = new Date().toISOString();

  await ensureDir(`runs/${runId}`);

  const config = await getBrandConfig();
  try {
    requireBrandConfig(config);
  } catch (error) {
    const result: RunResult = {
      id: runId,
      startedAt,
      status: 'failed',
      error: (error as Error).message,
    };
    await appendRunHistory(result);
    throw error;
  }

  const context: AgentRuntimeContext = {
    config,
    runId,
    workdir: path.join(process.cwd(), 'data', 'runs', runId),
    logger: async (message, extra) => {
      await logger(message, extra);
    },
  };

  let result: RunResult = {
    id: runId,
    startedAt,
    status: 'failed',
  };

  try {
    const topic = await generateTopicIdea(context);
    const script = await craftScript(context, topic);
    const voice = await synthesizeVoiceover(context, script);
    const visual = await createVisualSequence(context, script);
    const videoPath = await assembleVideo(context, visual, voice, script);
    const thumbnail = await generateThumbnail(context, videoPath, script);
    const uploadMetadata = buildUploadMetadata(context, topic, script);

    let uploadResult: { videoId: string; watchUrl: string } | null = null;
    try {
      uploadResult = await uploadShort(context, videoPath, thumbnail, uploadMetadata);
    } catch (uploadError) {
      await context.logger('Upload failed', { error: (uploadError as Error).message });
    }

    result = {
      id: runId,
      startedAt,
      completedAt: new Date().toISOString(),
      status: uploadResult ? 'success' : 'failed',
      topic,
      script,
      voiceover: voice,
      visual,
      videoPath,
      thumbnail,
      upload: uploadResult
        ? { ...uploadMetadata, watchUrl: uploadResult.watchUrl }
        : uploadMetadata,
      error: uploadResult ? undefined : 'Upload failed. Check credentials.',
    };

    await appendRunHistory(result);
    return result;
  } catch (error) {
    result.error = (error as Error).message;
    result.completedAt = new Date().toISOString();
    await appendRunHistory(result);
    throw error;
  }
}
