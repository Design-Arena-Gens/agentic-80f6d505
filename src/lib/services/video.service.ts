import { promises as fs } from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { ensureDir } from '../utils/fs';
import type {
  AgentRuntimeContext,
  ScriptDraft,
  VoiceoverAsset,
  VisualAsset,
  ThumbnailAsset,
} from '../types';

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
    child.stderr?.on('data', (chunk) => process.stderr.write(chunk));
  });
}

function chunkScript(script: ScriptDraft): Array<{ text: string; duration: number }> {
  const lines = [script.hook, script.body, script.outro]
    .join(' ')
    .split(/[.!?]/)
    .map((line) => line.trim())
    .filter(Boolean);

  const totalWords = lines.reduce((count, line) => count + line.split(/\s+/).length, 0);
  const seconds = Math.max(12, Math.min(18, script.estimatedDurationSeconds));
  const wps = totalWords / seconds;

  return lines.map((line) => {
    const words = line.split(/\s+/).length;
    return { text: line, duration: Math.max(1.5, words / wps) };
  });
}

async function createCaptionsSrt(script: ScriptDraft, targetDir: string): Promise<string> {
  const segments = chunkScript(script);
  let cursor = 0;
  const rows = segments.map((segment, index) => {
    const start = cursor;
    cursor += segment.duration;
    const end = cursor;
    const toTimestamp = (value: number) => {
      const hours = Math.floor(value / 3600);
      const minutes = Math.floor((value % 3600) / 60);
      const seconds = Math.floor(value % 60);
      const millis = Math.floor((value - Math.floor(value)) * 1000);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')},${millis.toString().padStart(3, '0')}`;
    };
    const sanitized = segment.text.replace(/\[[^\]]+]/g, '');
    return `${index + 1}\n${toTimestamp(start)} --> ${toTimestamp(end)}\n${sanitized}\n`;
  });

  const filePath = path.join(targetDir, 'captions.srt');
  await fs.writeFile(filePath, rows.join('\n'), 'utf8');
  return filePath;
}

export async function assembleVideo(
  context: AgentRuntimeContext,
  visual: VisualAsset,
  voice: VoiceoverAsset,
  script: ScriptDraft,
): Promise<string> {
  const { runId, config, logger } = context;
  const targetDir = await ensureDir(`runs/${runId}`);
  const outputPath = path.join(targetDir, 'short.mp4');
  const captionsFile = await createCaptionsSrt(script, targetDir);

  const accent = config.accentColor.replace('#', '0x');
  const brand = config.brandColor.replace('#', '0x');

  const filterComplex = [
    `[0:v]fps=60,format=yuv420p,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,eq=contrast=1.1:saturation=1.35:brightness=0.03,split[vbase][vbuf];`,
    `[vbuf]tblend=all_mode='screen',format=rgba,curves=r='0/0 0.35/0.6 0.6/0.9 1/1',hue=s=${config.videoStyle === 'minimal-future' ? 1 : 1.35}:H=10*sin(0.7*PI*t)[vglitch];`,
    `[vbase][vglitch]blend=all_mode='lighten':all_opacity=0.18,drawbox=x=0:y=(mod(t*40,30))*10:w=1080:h=3:color=${accent}@0.6,drawbox=x=40:y=40:w=6:h=160:color=${brand}@0.75,drawbox=x=1034:y=1400:w=20:h=200:color=${accent}@0.6[vstyled];`,
    `[vstyled]subtitles='${captionsFile.replace(/'/g, "\\'")}:force_style=FontName=Montserrat,FontSize=52,PrimaryColour=&H00FFFFFF&,OutlineColour=&H00252525&,Outline=3,Shadow=0,MarginV=90,Alignment=10'[vout];`,
  ].join('');

  await runFfmpeg([
    '-i',
    visual.path,
    '-i',
    voice.path,
    '-filter_complex',
    filterComplex,
    '-map',
    '[vout]',
    '-map',
    '1:a:0',
    '-shortest',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-movflags',
    '+faststart',
    outputPath,
  ]);

  await logger('Video assembled', { outputPath });
  return outputPath;
}

export async function generateThumbnail(
  context: AgentRuntimeContext,
  videoPath: string,
  script: ScriptDraft,
): Promise<ThumbnailAsset> {
  const { runId, config, logger } = context;
  const targetDir = await ensureDir(`runs/${runId}`);
  const outputPath = path.join(targetDir, 'thumbnail.jpg');

  const hookText = script.hook.replace(/\[[^\]]+]/g, '').toUpperCase();
  const fontFile = process.env.THUMBNAIL_FONT_FILE;

  const hookDraw = fontFile
    ? `drawtext=fontfile='${fontFile.replace(/'/g, "\\'")}':text='${hookText.replace(/'/g, "\\'")}':x=(w-text_w)/2:y=H*0.2:fontsize=96:fontcolor=white:shadowcolor=0x000000AA:shadowx=10:shadowy=10`
    : `drawtext=font=Montserrat-Bold:text='${hookText.replace(/'/g, "\\'")}':x=(w-text_w)/2:y=H*0.2:fontsize=96:fontcolor=white:shadowcolor=0x000000AA:shadowx=10:shadowy=10`;

  const taglineDraw = fontFile
    ? `drawtext=fontfile='${fontFile.replace(/'/g, "\\'")}':text='${config.tagline.replace(/'/g, "\\'")}':x=(w-text_w)/2:y=H*0.8:fontsize=48:fontcolor=${config.accentColor.replace('#', '0x')}FF`
    : `drawtext=font=Montserrat-SemiBold:text='${config.tagline.replace(/'/g, "\\'")}':x=(w-text_w)/2:y=H*0.8:fontsize=48:fontcolor=${config.accentColor.replace('#', '0x')}FF`;

  const filter = [
    'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920',
    `drawbox=x=0:y=0:w=1080:h=1920:color=${config.brandColor.replace('#', '0x')}@0.15:t=fill`,
    hookDraw,
    taglineDraw,
  ].join(',');

  await runFfmpeg([
    '-i',
    videoPath,
    '-vframes',
    '1',
    '-vf',
    filter,
    outputPath,
  ]);

  await logger('Thumbnail generated', { outputPath });
  return { path: outputPath };
}
