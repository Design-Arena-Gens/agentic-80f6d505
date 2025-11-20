import { readJsonFile } from '../utils/fs';
import type { RunResult } from '../types';

export async function getRunHistory(): Promise<RunResult[]> {
  return readJsonFile<RunResult[]>('runs/history.json', []);
}

export async function getLatestRun(): Promise<RunResult | null> {
  const latest = await readJsonFile<RunResult | null>('runs/latest.json', null);
  return latest;
}
