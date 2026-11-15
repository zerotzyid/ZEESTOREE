import { push } from './rtdb';

export type LogEntry = {
  actor: string;
  action: string;
  detail?: string;
};

/** Menulis log aktivitas ke node `logs`. Kegagalan log tidak menggagalkan operasi utama. */
export async function writeLog(entry: LogEntry): Promise<void> {
  try {
    await push('logs', {
      actor: entry.actor,
      action: entry.action,
      detail: entry.detail ?? null,
      at: Date.now(),
    });
  } catch {
    /* log bersifat best-effort */
  }
}
