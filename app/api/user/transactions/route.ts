import { get } from '@/lib/rtdb';
import { requireUser } from '@/lib/authz';

export const dynamic = 'force-dynamic';

type TransactionDoc = Record<string, unknown>;

export async function GET(): Promise<Response> {
  const session = await requireUser();
  if (!session) {
    return Response.json({ error: 'Silakan masuk terlebih dahulu.' }, { status: 401 });
  }

  try {
    const transactions = await get<Record<string, TransactionDoc>>('transactions');
    const list: Array<{ id: string } & TransactionDoc> = Object.entries(transactions ?? {})
      .filter(([, doc]) => doc && doc.userId === session.username)
      .map(([id, doc]): { id: string } & TransactionDoc => ({ ...doc, id }))
      .sort((a, b) => Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0));

    return Response.json(
      { transactions: list },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat transaksi.';
    return Response.json({ error: message }, { status: 500 });
  }
}
