import { z } from 'zod';
import { get, update, type Json } from '@/lib/rtdb';
import { requireUser } from '@/lib/authz';
import { adjustSaldo } from '@/lib/balance';
import { decryptSecret } from '@/lib/crypto';
import { writeLog } from '@/lib/log';
import type { PanelDoc } from '@/app/api/admin/panels/route';
import * as C from '@/lib/pterodactyl-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DAY = 86_400_000;

type Order = {
  userId: string;
  productId: string;
  productName?: string;
  kind: string;
  status: string;
  panelId?: string | null;
  panelServerId?: number | null;
  panelServerUuid?: string | null;
  expiresAt?: number | null;
};

const fail = (error: string, status = 400) => Response.json({ error }, { status });

function safePath(p: unknown, fallback = '/'): string | null {
  const s = typeof p === 'string' && p ? p : fallback;
  if (s.length > 300 || s.includes('..') || s.includes('\0')) return null;
  return s.startsWith('/') ? s : `/${s}`;
}

async function load(id: string) {
  const session = await requireUser();
  if (!session) return { err: fail('Silakan masuk terlebih dahulu.', 401) };
  if (!/^[A-Za-z0-9_-]{1,60}$/.test(id)) return { err: fail('Id tidak valid.') };
  const order = await get<Order>(`orders/${id}`);
  if (!order || order.userId !== session.username.toLowerCase() && order.userId !== session.username) {
    return { err: fail('Pesanan tidak ditemukan.', 404) };
  }
  if (order.kind !== 'panel' || !order.panelId || !order.panelServerUuid) {
    return { err: fail('Pesanan ini bukan server panel aktif.') };
  }
  const panelDoc = await get<PanelDoc & { capiKeyEnc?: string }>(`panels/${order.panelId}`);
  if (!panelDoc) return { err: fail('Panel tidak ditemukan.', 404) };
  if (!panelDoc.capiKeyEnc) {
    return { err: fail('Client API key panel belum diatur admin (admin → Panel → Client API key).', 409) };
  }
  const panel: C.ClientPanel = { baseUrl: panelDoc.baseUrl, capiKey: decryptSecret(panelDoc.capiKeyEnc) };
  const expired = typeof order.expiresAt === 'number' && order.expiresAt < Date.now();
  return { session, order, panel, sid: order.panelServerUuid, expired };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const ctx = await load(id);
  if ('err' in ctx && ctx.err) return ctx.err;
  const { order, panel, sid, expired } = ctx as Exclude<typeof ctx, { err: Response }>;
  const url = new URL(request.url);
  const view = url.searchParams.get('view') ?? 'status';
  try {
    if (view === 'status') {
      const st = await C.getResources(panel, sid).catch(() => null);
      return Response.json({ state: st, expiresAt: order.expiresAt ?? null, expired });
    }
    if (expired) return fail('Panel sudah kedaluwarsa — perpanjang dulu.', 403);
    if (view === 'console') return Response.json({ lines: await C.fetchConsole(panel, sid) });
    if (view === 'files') {
      const dir = safePath(url.searchParams.get('dir'));
      if (!dir) return fail('Path tidak valid.');
      return Response.json({ dir, files: await C.listFiles(panel, sid, dir) });
    }
    if (view === 'file') {
      const file = safePath(url.searchParams.get('file'));
      if (!file) return fail('Path tidak valid.');
      const content = await C.readFile(panel, sid, file);
      if (content.length > 500_000) return fail('File terlalu besar untuk diedit di sini.');
      return Response.json({ file, content });
    }
    return fail('View tidak dikenal.');
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Gagal menghubungi panel.', 502);
  }
}

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('power'), signal: z.enum(['start', 'stop', 'restart', 'kill']) }),
  z.object({ action: z.literal('command'), command: z.string().min(1).max(500) }),
  z.object({ action: z.literal('write'), file: z.string(), content: z.string().max(500_000) }),
  z.object({ action: z.literal('delete'), dir: z.string(), name: z.string().min(1).max(200) }),
  z.object({ action: z.literal('rename'), dir: z.string(), from: z.string().min(1).max(200), to: z.string().min(1).max(200) }),
  z.object({ action: z.literal('mkdir'), dir: z.string(), name: z.string().min(1).max(200) }),
  z.object({ action: z.literal('download'), file: z.string() }),
  z.object({ action: z.literal('renew') }),
  z.object({ action: z.literal('upload'), file: z.string(), dir: z.string() }),
]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const ctx = await load(id);
  if ('err' in ctx && ctx.err) return ctx.err;
  const { session, order, panel, sid, expired } = ctx as Exclude<typeof ctx, { err: Response }>;

  const contentType = request.headers.get('content-type') ?? '';
  let parsed: z.SafeParseReturnType<unknown, { action: string; [key: string]: unknown }>;

  if (contentType.includes('multipart/form-data')) {
    // Handle ZIP upload (multipart/form-data)
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const dir = (formData.get('dir') as string) ?? '/';
    const action = formData.get('action') as string;

    if (action !== 'upload' || !file) return fail('Permintaan upload tidak valid.');
    if (!file.name.endsWith('.zip')) return fail('Hanya file .zip yang diperbolehkan.');
    if (file.size > 50 * 1024 * 1024) return fail('File terlalu besar (maks 50MB).');

    const userKey = session.username.toLowerCase();
    if (expired) return fail('Panel sudah kedaluwarsa — perpanjang dulu.', 403);

    try {
      // Upload ZIP
      await C.uploadFile(panel, sid, file, dir);
      // Auto-extract
      const zipName = file.name;
      await C.decompressFile(panel, sid, zipName, dir);
      // Optionally delete the zip after extraction
      await C.deleteFiles(panel, sid, dir, [zipName]).catch(() => {});
      return Response.json({ ok: true });
    } catch (e) {
      return fail(e instanceof Error ? e.message : 'Gagal upload/ekstrak ZIP.', 502);
    }
  } else {
    // Handle JSON actions
    parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail('Permintaan tidak valid.');
    const b = parsed.data;
    const userKey = session.username.toLowerCase();

    try {
      if (b.action === 'renew') {
        const product = await get<{ price?: number; durationDays?: number; name?: string }>(`products/${order.productId}`);
        if (!product || typeof product.price !== 'number') return fail('Produk asal tidak ditemukan.', 404);
        const price = product.price;
        const days = product.durationDays && product.durationDays > 0 ? product.durationDays : 30;
        let saldo: number | null = 0;
        if (price > 0) saldo = await adjustSaldo(userKey, -price);
        if (saldo === null) return fail('Saldo tidak cukup untuk perpanjang.', 402);
        const now = Date.now();
        const from = Math.max(now, order.expiresAt ?? 0);
        const expiresAt = from + days * DAY;
        await update('/', {
          [`orders/${id}/expiresAt`]: expiresAt,
          [`orders/${id}/updatedAt`]: now,
          [`transactions/renew_${id}_${now}`]: {
            userId: userKey, type: 'renew', amount: price, balanceAfter: saldo,
            note: `Perpanjang panel ${id} (+${days} hari)`, orderId: id, createdAt: now,
          },
        } as Record<string, Json>);
        await writeLog({ actor: userKey, action: 'panel.renew', detail: `${id} · +${days}h · Rp${price}` });
        return Response.json({ ok: true, expiresAt, saldo });
      }

      const needsActive =
        b.action !== 'power' || b.signal === 'start' || b.signal === 'restart';
      if (expired && needsActive) return fail('Panel sudah kedaluwarsa — perpanjang dulu.', 403);

      switch (b.action) {
        case 'power':
          await C.sendPower(panel, sid, b.signal);
          break;
        case 'command':
          await C.sendCommand(panel, sid, b.command);
          break;
        case 'write': {
          const f = safePath(b.file);
          if (!f) return fail('Path tidak valid.');
          await C.writeFile(panel, sid, f, b.content);
          break;
        }
        case 'delete': {
          const d = safePath(b.dir);
          if (!d || b.name.includes('/')) return fail('Path tidak valid.');
          await C.deleteFiles(panel, sid, d, [b.name]);
          break;
        }
        case 'rename': {
          const d = safePath(b.dir);
          if (!d || b.from.includes('/') || b.to.includes('/')) return fail('Path tidak valid.');
          await C.renameFile(panel, sid, d, b.from, b.to);
          break;
        }
        case 'mkdir': {
          const d = safePath(b.dir);
          if (!d || b.name.includes('/')) return fail('Path tidak valid.');
          await C.createFolder(panel, sid, d, b.name);
          break;
        }
        case 'download': {
          const f = safePath(b.file);
          if (!f) return fail('Path tidak valid.');
          return Response.json({ url: await C.getDownloadUrl(panel, sid, f) });
        }
      }
      return Response.json({ ok: true });
    } catch (e) {
      return fail(e instanceof Error ? e.message : 'Gagal menghubungi panel.', 502);
    }
  }
}