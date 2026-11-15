import { destroySession, getSession } from '@/lib/session';
import { writeLog } from '@/lib/log';

export const dynamic = 'force-dynamic';

export async function POST(): Promise<Response> {
  const session = await getSession();
  await destroySession();
  if (session) {
    await writeLog({ actor: session.username, action: 'auth.logout' });
  }
  return Response.json({ ok: true });
}
