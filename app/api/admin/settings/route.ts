import { set } from '@/lib/rtdb';
import { requireAdmin } from '@/lib/authz';
import { settingsPatchSchema } from '@/lib/validators';
import { writeLog } from '@/lib/log';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const session = await requireAdmin();
  if (!session) {
    return Response.json({ error: 'Hanya admin yang dapat menyimpan pengaturan.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  }

  const parsed = settingsPatchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.errors[0]?.message ?? 'Input tidak valid.' },
      { status: 400 }
    );
  }

  try {
    const sections = Object.keys(parsed.data) as Array<keyof typeof parsed.data>;
    for (const section of sections) {
      const value = parsed.data[section];
      if (value === undefined) continue;
      // Node kosong (FAQ tanpa item) disimpan sebagai null agar tidak ada array kosong menggantung.
      const toWrite = Array.isArray(value) && value.length === 0 ? null : value;
      await set(`settings/${section}`, toWrite as never);
    }
    await writeLog({
      actor: session.username,
      action: 'settings.update',
      detail: sections.join(', '),
    });
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menyimpan pengaturan.';
    return Response.json({ error: message }, { status: 500 });
  }
}
