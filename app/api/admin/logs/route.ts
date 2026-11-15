import { get } from '@/lib/rtdb';
import { requireAdmin } from '@/lib/authz';

export const dynamic = 'force-dynamic';

type LogDoc = Record<string, unknown>;

export type AdminLogItem = {
  id: string;
  actor: string;
  action: string;
  detail: string | null;
  at: number;
};

/**
 * Log aktivitas terbaru (FR-M7). Toleran terhadap skema log lama
 * (userId/aksi/target/created_at) dan skema baru (actor/action/detail/at).
 */
export async function GET(request: Request): Promise<Response> {
  const session = await requireAdmin();
  if (!session) {
    return Response.json({ error: 'Hanya admin.' }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 12, 1), 100);

    const logs = await get<Record<string, LogDoc>>('logs');
    const list: AdminLogItem[] = Object.entries(logs ?? {})
      .filter(([, doc]) => doc && typeof doc === 'object')
      .map(([id, doc]): AdminLogItem => {
        const rawAt = typeof doc.at === 'number' ? doc.at : doc.created_at;
        const parsedAt =
          typeof rawAt === 'number' ? rawAt : typeof rawAt === 'string' ? Date.parse(rawAt) : 0;
        return {
          id,
          actor:
            typeof doc.actor === 'string'
              ? doc.actor
              : typeof doc.userId === 'string'
                ? doc.userId
                : '-',
          action:
            typeof doc.action === 'string'
              ? doc.action
              : typeof doc.aksi === 'string'
                ? doc.aksi
                : '-',
          detail:
            typeof doc.detail === 'string'
              ? doc.detail
              : typeof doc.target === 'string'
                ? doc.target
                : null,
          at: Number.isFinite(parsedAt) ? parsedAt : 0,
        };
      })
      .sort((a, b) => b.at - a.at)
      .slice(0, limit);

    return Response.json({ logs: list }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat log.';
    return Response.json({ error: message }, { status: 500 });
  }
}
