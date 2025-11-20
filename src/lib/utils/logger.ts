import { appendLog } from './fs';

export function createRunLogger(runId: string) {
  return async (message: string, context: Record<string, unknown> = {}) => {
    const record = {
      timestamp: new Date().toISOString(),
      message,
      ...context,
    };
    await appendLog(`runs/${runId}/log.ndjson`, record);
  };
}
