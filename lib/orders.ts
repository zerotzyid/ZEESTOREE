/** Tipe & aturan status order (katalog × checkout). */

export type OrderStatus = 'pending' | 'paid' | 'active' | 'completed' | 'failed' | 'refunded' | 'cancelled';

export type OrderDoc = {
  userId: string;
  productId: string;
  productName: string;
  price: number;
  kind: 'panel' | 'digital' | 'vps_trial' | 'lainnya';
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
  failReason?: string | null;
  panelId?: string | null;
  panelServerId?: number | null;
  panelServerUuid?: string | null;
  panelPassword?: string | null;
  panelUrl?: string | null;
  expiresAt?: number | null;
  refundedAt?: number | null;
  paidAt?: number | null;
  completedAt?: number | null;
};

export const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'paid',
  'active',
  'completed',
  'failed',
  'refunded',
  'cancelled',
];

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as string[]).includes(value);
}

/** Status yang saldonya masih terpotong — boleh dikembalikan lewat refund. */
export const REFUNDABLE_STATUSES: OrderStatus[] = ['pending', 'paid', 'active', 'completed'];
