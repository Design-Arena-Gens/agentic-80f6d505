export interface BrandConfig {
  brandColor: string;
  accentColor: string;
  tone: 'educational' | 'hype' | 'mysterious' | 'playful' | 'analytical';
  videoStyle: 'glitch' | 'holographic' | 'cyberpunk' | 'minimal-future' | 'neon';
  voiceProfile: 'openai_alloy' | 'openai_nova' | 'openai_orion';
  channelName: string;
  tagline: string;
  hashtags: string[];
  keywords: string[];
  lastPrompted?: string;
}

export interface TopicIdea {
  title: string;
  summary: string;
  angle: string;
  sources: Array<{ title: string; url: string }>;
}

export interface ScriptDraft {
  hook: string;
  body: string;
  outro: string;
  fullScript: string;
  estimatedDurationSeconds: number;
}

export interface VoiceoverAsset {
  path: string;
  format: 'mp3' | 'wav';
  durationSeconds: number;
}

export interface VisualAsset {
  path: string;
  aspectRatio: '9:16';
  durationSeconds: number;
  source: 'generated' | 'stock' | 'mixed';
}

export interface ThumbnailAsset {
  path: string;
}

export interface UploadMetadata {
  title: string;
  description: string;
  hashtags: string[];
  keywords: string[];
  scheduledAt: string;
  watchUrl?: string;
}

export interface RunResult {
  id: string;
  startedAt: string;
  completedAt?: string;
  status: 'success' | 'failed';
  topic?: TopicIdea;
  script?: ScriptDraft;
  voiceover?: VoiceoverAsset;
  visual?: VisualAsset;
  videoPath?: string;
  thumbnail?: ThumbnailAsset;
  upload?: UploadMetadata;
  error?: string;
}

export interface AgentRuntimeContext {
  config: BrandConfig;
  runId: string;
  workdir: string;
  logger: (message: string, context?: Record<string, unknown>) => void;
}
