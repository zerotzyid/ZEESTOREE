import { PayPageClient } from './_components/pay-client';

export default async function PayPage({ params }: { params: Promise<{ idtransaksi: string }> }) {
  const { idtransaksi } = await params;
  return <PayPageClient idtransaksi={idtransaksi} />;
}
