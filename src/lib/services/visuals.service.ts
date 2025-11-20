import { promises as fs } from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { ensureDir } from '../utils/fs';
import type { AgentRuntimeContext, ScriptDraft, VisualAsset } from '../types';

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const binary = process.env.FFMPEG_PATH ?? 'ffmpeg';
    const child = execFile(binary, ['-y', ...args], (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
    child.stdout?.pipe(process.stdout);
    child.stderr?.pipe(process.stderr);
  });
}

async function downloadFile(url: string, targetPath: string, headers: Record<string, string>) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Failed downloading asset: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  await fs.writeFile(targetPath, Buffer.from(arrayBuffer));
}

async function generateFallbackVisual(targetPath: string, duration: number) {
  const palette = [
    '0x0d0d15',
    '0x1f2940',
    '0x14213d',
    '0x000000',
  ];

  const input = `color=c=#101425:size=1080x1920:rate=60:d=${duration}`;
  const filters = [
    'format=yuv420p',
    'noise=alls=14:allf=t+u',
    'eq=contrast=1.15:brightness=0.03:saturation=1.6',
    `drawbox=x=(iw/2-4):y=0:w=8:h=ih:color=${palette[1]}:t=fill`,
    'vignette=PI/4',
    `hue=h=90*sin(2*PI*t/${duration})`,
  ].join(',');

  await runFfmpeg([
    '-f',
    'lavfi',
    '-i',
    input,
    '-vf',
    filters,
    '-t',
    duration.toString(),
    '-preset',
    'ultrafast',
    '-r',
    '60',
    '-pix_fmt',
    'yuv420p',
    targetPath,
  ]);
}

export async function createVisualSequence(
  context: AgentRuntimeContext,
  script: ScriptDraft,
): Promise<VisualAsset> {
  const { runId, logger, config } = context;
  const targetDir = await ensureDir(`runs/${runId}/visuals`);
  const targetPath = path.join(targetDir, 'sequence.mp4');

  const apiKey = process.env.PEXELS_API_KEY;
  const duration = Math.max(12, Math.min(18, script.estimatedDurationSeconds));

  if (apiKey) {
    try {
      const query = encodeURIComponent(`${config.videoStyle} technology`);
      const response = await fetch(
        `https://api.pexels.com/videos/search?orientation=portrait&per_page=5&query=${query}`,
        {
          headers: { Authorization: apiKey },
        },
      );

      if (!response.ok) {
        throw new Error(`Pexels API error ${response.status}`);
      }

      const data = (await response.json()) as {
        videos?: Array<{
          video_files?: Array<{ link: string; width: number; height: number; quality: string }>;
        }>;
      };

      const candidate = data.videos?.[0]?.video_files?.find((file) => file.height >= 1920) ??
        data.videos?.[0]?.video_files?.[0];

      if (candidate?.link) {
        const tempPath = path.join(targetDir, 'stock.mp4');
        await downloadFile(candidate.link, tempPath, { Authorization: apiKey });

        await runFfmpeg([
          '-i',
          tempPath,
          '-vf',
          `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black`,
          '-t',
          duration.toString(),
          '-an',
          '-preset',
          'veryfast',
          targetPath,
        ]);

        await logger('Visual sequence built from stock footage', { targetPath });
        return {
          path: targetPath,
          aspectRatio: '9:16',
          durationSeconds: duration,
          source: 'stock',
        };
      }
    } catch (error) {
      await logger('Stock video fetch failed, falling back', { error: (error as Error).message });
    }
  }

  await generateFallbackVisual(targetPath, duration);
  await logger('Visual sequence generated procedurally', { targetPath });
  return {
    path: targetPath,
    aspectRatio: '9:16',
    durationSeconds: duration,
    source: 'generated',
  };
}
