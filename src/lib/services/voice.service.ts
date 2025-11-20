import { promises as fs } from 'fs';
import path from 'path';
import { ensureDir } from '../utils/fs';
import type { AgentRuntimeContext, ScriptDraft, VoiceoverAsset } from '../types';

const OPENAI_VOICE_MODEL = process.env.OPENAI_VOICE_MODEL ?? 'gpt-4o-mini-tts';

export async function synthesizeVoiceover(
  context: AgentRuntimeContext,
  script: ScriptDraft,
): Promise<VoiceoverAsset> {
  const { config, runId, logger } = context;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY missing. Unable to synthesize voiceover.');
  }

  const voiceMap: Record<string, string> = {
    openai_alloy: 'alloy',
    openai_nova: 'nova',
    openai_orion: 'orion',
  };

  const targetDir = await ensureDir(`runs/${runId}/voiceovers`);
  const targetPath = path.join(targetDir, 'voiceover.mp3');

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_VOICE_MODEL,
      voice: voiceMap[config.voiceProfile] ?? 'alloy',
      input: script.fullScript,
      format: 'mp3',
      speed: 1.08,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    await logger('Voiceover synthesis failed', { text });
    throw new Error(`Voiceover generation failed: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await fs.writeFile(targetPath, Buffer.from(arrayBuffer));

  await logger('Voiceover generated', { path: targetPath });

  // Estimate duration by naive words per second (2.6 words/sec).
  const words = script.fullScript.split(/\s+/).length;
  const estimatedDurationSeconds = Math.round(words / 2.6);

  return {
    path: targetPath,
    format: 'mp3',
    durationSeconds: estimatedDurationSeconds,
  };
}
