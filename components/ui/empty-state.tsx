import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'glass flex flex-col items-center justify-center gap-3 rounded-2xl px-6 py-12 text-center',
        className
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-content/5 text-content-faint">
        <Icon aria-hidden size={22} />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-content">{title}</p>
        {description ? <p className="text-sm text-content-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
