import { Wrench } from 'lucide-react';

export function MaintenanceScreen({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="glass flex h-14 w-14 items-center justify-center rounded-2xl text-accent">
        <Wrench aria-hidden size={26} />
      </span>
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="text-xl font-semibold text-content">Situs dalam pemeliharaan</h1>
        <p className="text-sm leading-relaxed text-content-muted">{message}</p>
      </div>
    </main>
  );
}
