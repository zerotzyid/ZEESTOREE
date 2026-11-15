import { get, set, update, type Json } from './rtdb';

export type StatusService = {
  id: string;
  name: string;
  ok: boolean;
  latencyMs: number | null;
  uptimePct: number | null;
};

export type StatusPayload = { checkedAt: number; services: StatusService[] };

type RawCheck = { id: string; name: string; ok: boolean; latencyMs: number | null };
type HistoryMap = Record<string, Array<{ t: number; ok: boolean }>>;

const CACHE_MS = 90_000;
const HISTORY_CAP = 200;

async function timed(url: string): Promise<{ ok: boolean; latencyMs: number | null }> {
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
      redirect: 'follow',
      headers: { 'User-Agent': 'StoreUptimeCheck/1.0' },
    });
    // 2xx/3xx/4xx = layanan hidup; 5xx / timeout / DNS = down.
    return { ok: res.status < 500, latencyMs: Date.now() - t0 };
  } catch {
    return { ok: false, latencyMs: null };
  }
}

async function runChecks(siteOrigin: string): Promise<RawCheck[]> {
  const dbUrl = (process.env.FIREBASE_DATABASE_URL ?? '').replace(/\/+$/, '');

  const jobs: Promise<RawCheck>[] = [
    (async () => {
      const r = dbUrl
        ? await timed(`${dbUrl}/.json?shallow=true`)
        : { ok: false, latencyMs: null };
      return { id: 'firebase', name: 'Firebase RTDB', ...r };
    })(),
    (async () => {
      const r = await timed(`${siteOrigin}/api/public/stats`);
      return { id: 'website', name: 'Website', ...r };
    })(),
  ];

  const panels = await get<Record<string, { name?: unknown; baseUrl?: unknown; active?: unknown }>>('panels');
  for (const [key, doc] of Object.entries(panels ?? {})) {
    if (!doc || doc.active === false || typeof doc.baseUrl !== 'string') continue;
    const name = typeof doc.name === 'string' && doc.name ? doc.name : `Panel ${key}`;
    jobs.push(
      (async (): Promise<RawCheck> => {
        const r = await timed(doc.baseUrl as string);
        return { id: `panel-${key}`, name, ...r };
      })()
    );
  }

  return Promise.all(jobs);
}

function uptimeOf(history: HistoryMap, id: string): number | null {
  const entries = history[id];
  if (!entries || entries.length === 0) return null;
  const okCount = entries.filter((e) => e.ok).length;
  return Math.round((okCount / entries.length) * 1000) / 10;
}

/**
 * Pemeriksaan on-demand (tanpa cron): cache 90 detik, riwayat per layanan
 * disimpan maksimal 200 entri untuk menghitung uptime % transparan.
 */
export async function getStatusPayload(siteOrigin: string): Promise<StatusPayload> {
  const cached = await get<StatusPayload>('status_cache');
  if (cached && Date.now() - cached.checkedAt < CACHE_MS) return cached;

  const checks = await runChecks(siteOrigin);
  const history = (await get<HistoryMap>('status_history')) ?? {};
  const now = Date.now();

  const historyUpdate: Record<string, Json> = {};
  for (const c of checks) {
    const prev = (history[c.id] ?? []).slice(-(HISTORY_CAP - 1));
    historyUpdate[`status_history/${c.id}`] = [...prev, { t: now, ok: c.ok }];
  }
  await update('/', historyUpdate);

  const freshHistory = (await get<HistoryMap>('status_history')) ?? {};
  const payload: StatusPayload = {
    checkedAt: now,
    services: checks.map((c) => ({
      id: c.id,
      name: c.name,
      ok: c.ok,
      latencyMs: c.latencyMs,
      uptimePct: uptimeOf(freshHistory, c.id),
    })),
  };
  await set('status_cache', payload as unknown as Json);
  return payload;
}
