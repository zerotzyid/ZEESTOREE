import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="label-mono">404</p>
      <h1 className="text-xl font-semibold text-content">Halaman tidak ditemukan</h1>
      <Link
        href="/"
        className="btn-accent inline-flex min-h-[44px] items-center rounded-full px-6 text-sm font-medium"
      >
        Kembali ke beranda
      </Link>
    </div>
  );
}
