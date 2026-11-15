import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { AdminSidebar } from '@/components/admin-sidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession().catch(() => null);
  if (!session || session.role !== 'admin') {
    redirect('/login?next=/admin');
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AdminSidebar username={session.username} />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">{children}</main>
    </div>
  );
}
