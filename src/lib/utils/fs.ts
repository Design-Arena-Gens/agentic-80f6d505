import { promises as fs } from 'fs';
import path from 'path';

export const DATA_ROOT = path.join(process.cwd(), 'data');

export async function ensureDir(relativePath: string) {
  const target = path.join(DATA_ROOT, relativePath);
  await fs.mkdir(target, { recursive: true });
  return target;
}

export async function readJsonFile<T>(relativePath: string, fallback: T): Promise<T> {
  const target = path.join(DATA_ROOT, relativePath);
  try {
    const raw = await fs.readFile(target, 'utf8');
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await writeJsonFile(relativePath, fallback);
      return fallback;
    }
    throw error;
  }
}

export async function writeJsonFile(relativePath: string, value: unknown) {
  const target = path.join(DATA_ROOT, relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify(value, null, 2), 'utf8');
}

export async function appendLog(relativePath: string, entry: unknown) {
  const target = path.join(DATA_ROOT, relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.appendFile(target, `${JSON.stringify(entry)}\n`, 'utf8');
}

export async function withTempDir<T>(runId: string, fn: (tempDir: string) => Promise<T>): Promise<T> {
  const tmpRoot = await ensureDir(path.join('runs', runId));
  try {
    return await fn(tmpRoot);
  } finally {
    // Keep artifacts for audit; no cleanup here.
  }
}
