import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { get } from '@/lib/rtdb';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession().catch(() => null);
    if (!session) {
      return NextResponse.json({ count: 0 });
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    if (!productId) {
      return NextResponse.json({ count: 0 });
    }

    // Get all orders and filter by userId (username)
    const allOrders = await get<Record<string, any>>('orders');
    if (!allOrders) {
      return NextResponse.json({ count: 0 });
    }

    // Count completed/active orders for this product by this user
    let count = 0;
    for (const order of Object.values(allOrders)) {
      if (
        order.userId === session.username &&
        order.productId === productId &&
        (order.status === 'active' || order.status === 'completed' || order.status === 'paid')
      ) {
        count++;
      }
    }

    return NextResponse.json({ count });
  } catch (err) {
    console.error('Error checking purchase count:', err);
    return NextResponse.json({ count: 0 });
  }
}