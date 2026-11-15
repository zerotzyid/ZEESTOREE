import { UsersClient } from '@/components/admin/users-client';
import { FadeIn } from '@/components/anim';

export const dynamic = 'force-dynamic';

export default function AdminUsersPage() {
  return (
    <div className="flex flex-col gap-6">
      <FadeIn y={8}>
        <div className="flex flex-col gap-1">
          <p className="label-mono">Akun</p>
          <h1 className="text-2xl font-semibold text-content">Pengguna</h1>
          <p className="text-sm text-content-muted">
            Lihat pendaftar, blokir akun bila perlu, dan koreksi saldo manual.
          </p>
        </div>
      </FadeIn>
      <UsersClient />
    </div>
  );
}
