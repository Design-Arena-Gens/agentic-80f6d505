import { readJsonFile, writeJsonFile } from '../utils/fs';
import type { BrandConfig } from '../types';

const CONFIG_FILE = 'config.json';

const DEFAULT_CONFIG: Partial<BrandConfig> = {
  brandColor: '#12F7FF',
  accentColor: '#FF2E63',
  tone: 'hype',
  videoStyle: 'cyberpunk',
  voiceProfile: 'openai_alloy',
  channelName: 'FutureFlash AI',
  tagline: 'Daily neural jolts about tomorrow.',
  hashtags: ['#AIShorts', '#FutureTech', '#Robotics', '#QuantumLeap'],
  keywords: ['AI', 'technology', 'future', 'robotics', 'innovation'],
};

export async function getBrandConfig(): Promise<BrandConfig | null> {
  const raw = await readJsonFile<Partial<BrandConfig>>(CONFIG_FILE, {});
  if (!raw || Object.keys(raw).length === 0) {
    return null;
  }
  return raw as BrandConfig;
}

export async function upsertBrandConfig(config: Partial<BrandConfig>): Promise<BrandConfig> {
  const merged = { ...DEFAULT_CONFIG, ...(await getBrandConfig()), ...config } as BrandConfig;
  await writeJsonFile(CONFIG_FILE, merged);
  return merged;
}

export function requireBrandConfig(config: BrandConfig | null): asserts config is BrandConfig {
  if (!config) {
    throw new Error('Brand configuration missing. Please set brand color, tone, and video style once.');
  }
}
