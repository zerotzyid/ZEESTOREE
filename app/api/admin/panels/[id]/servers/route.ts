import { z } from 'zod';
import { get, remove, set } from '@/lib/rtdb';
import { requireAdmin } from '@/lib/authz';
import { decryptSecret } from '@/lib/crypto';
import { writeLog } from '@/lib/log';
import type { PanelDoc } from '@/app/api/admin/panels/route';
import * as C from '@/lib/pterodactyl';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const serverActionSchema = z.object({
  action: z.enum(['list', 'suspend', 'unsuspend', 'delete', 'reinstall', 'change_password', 'get']),
  serverId: z.union([z.string(), z.number()]).optional(),
  serverUuid: z.string().optional(),
  password: z.string().min(8).max(100).optional(),
  page: z.number().int().positive().optional(),
  perPage: z.number().int().positive().max(500).optional(),
});

async function getPanel(panelId: string): Promise<{ panelDoc: PanelDoc; appPanel: C.PteroPanel; clientPanel: C.ClientPanel } | null> {
  const panelDoc = await get<PanelDoc & { capiKeyEnc?: string }>(`panels/${panelId}`);
  if (!panelDoc || !panelDoc.apiKeyEnc) return null;
  const appPanel: C.PteroPanel = { baseUrl: panelDoc.baseUrl, apiKey: decryptSecret(panelDoc.apiKeyEnc) };
  let clientPanel: C.ClientPanel | null = null;
  if (panelDoc.capiKeyEnc) {
    clientPanel = { baseUrl: panelDoc.baseUrl, capiKey: decryptSecret(panelDoc.capiKeyEnc) };
  }
  return { panelDoc, appPanel, clientPanel: clientPanel! };
}

function fail(error: string, status = 400) {
  return Response.json({ error }, { status });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const session = await requireAdmin();
  if (!session) return fail('Hanya admin.', 403);

  const { id } = await params;
  const panelData = await getPanel(id);
  if (!panelData) return fail('Panel tidak ditemukan atau Application API key belum diatur.', 404);

  const url = new URL(request.url);
  const action = url.searchParams.get('action') ?? 'list';
  const serverId = url.searchParams.get('serverId');
  const serverUuid = url.searchParams.get('serverUuid');
  const page = Number(url.searchParams.get('page') ?? '1');
  const perPage = Number(url.searchParams.get('perPage') ?? '50');

  try {
    if (action === 'list') {
      const servers = await C.listApplicationServers(panelData.appPanel, { page, perPage });
      return Response.json({ servers });
    }

    if (action === 'get') {
      const idNum = serverId ? Number(serverId) : null;
      if (!idNum) return fail('serverId wajib diisi.', 400);
      const server = await C.getApplicationServer(panelData.appPanel, idNum);
      if (!server) return fail('Server tidak ditemukan.', 404);
      return Response.json({ server });
    }

    return fail('Aksi tidak valid untuk GET.', 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal mengambil data server.';
    return fail(message, 500);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const session = await requireAdmin();
  if (!session) return fail('Hanya admin.', 403);

  const { id } = await params;
  const panelData = await getPanel(id);
  if (!panelData) return fail('Panel tidak ditemukan atau API key tidak lengkap.', 404);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail('Permintaan tidak valid.', 400);
  }

  const parsed = serverActionSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.errors[0]?.message ?? 'Input tidak valid.', 400);
  }

  const { action, serverId, serverUuid, password } = parsed.data;

  try {
    let targetServerId: number | null = serverId ? Number(serverId) : null;

    // Jika pakai UUID, cari server ID nya
    if (!targetServerId && serverUuid) {
      const servers = await C.listApplicationServers(panelData.appPanel, { perPage: 500 });
      const found = servers.find((s) => s.uuid === serverUuid);
      targetServerId = found?.id ?? null;
    }

    if (!targetServerId && action !== 'list') {
      return fail('Server tidak ditemukan (serverId/serverUuid diperlukan).', 404);
    }

    switch (action) {
      case 'suspend': {
        if (!targetServerId) return fail('serverId diperlukan.', 400);
        await C.suspendApplicationServer(panelData.appPanel, targetServerId);
        await writeLog({ actor: session.username, action: 'server.suspend', detail: `${id} · ${targetServerId}` });
        return Response.json({ ok: true, message: 'Server berhasil disuspend.' });
      }

      case 'unsuspend': {
        if (!targetServerId) return fail('serverId diperlukan.', 400);
        await C.unsuspendApplicationServer(panelData.appPanel, targetServerId);
        await writeLog({ actor: session.username, action: 'server.unsuspend', detail: `${id} · ${targetServerId}` });
        return Response.json({ ok: true, message: 'Server berhasil diaktifkan kembali.' });
      }

      case 'delete': {
        if (!targetServerId) return fail('serverId diperlukan.', 400);
        await C.deleteApplicationServer(panelData.appPanel, targetServerId, true);
        await writeLog({ actor: session.username, action: 'server.delete', detail: `${id} · ${targetServerId}` });
        return Response.json({ ok: true, message: 'Server berhasil dihapus permanen.' });
      }

      case 'reinstall': {
        if (!targetServerId) return fail('serverId diperlukan.', 400);
        await C.reinstallApplicationServer(panelData.appPanel, targetServerId);
        await writeLog({ actor: session.username, action: 'server.reinstall', detail: `${id} · ${targetServerId}` });
        return Response.json({ ok: true, message: 'Reinstall server dimulai.' });
      }

      case 'change_password': {
        if (!targetServerId) return fail('serverId diperlukan.', 400);
        if (!password) return fail('Password wajib diisi.', 400);
        // Dapatkan user ID dari server
        const server = await C.getApplicationServer(panelData.appPanel, targetServerId);
        if (!server) return fail('Server tidak ditemukan.', 404);
        await C.changeUserPassword(panelData.appPanel, server.user, password);
        await writeLog({ actor: session.username, action: 'server.change_password', detail: `${id} · ${targetServerId}` });
        return Response.json({ ok: true, message: 'Password user server berhasil diubah.' });
      }

      default:
        return fail('Aksi tidak dikenal.', 400);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menjalankan aksi server.';
    return fail(message, 500);
  }
}