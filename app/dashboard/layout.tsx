import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { DashboardSidebar } from '@/components/dashboard-sidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession().catch(() => null);
  if (!session) {
    redirect('/login?next=/dashboard');
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <DashboardSidebar username={session!.username} />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">{children}</main>
    </div>
  );
}
