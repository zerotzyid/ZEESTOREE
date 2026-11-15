import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wider',
  {
    variants: {
      variant: {
        default: 'border-accent-soft bg-accent-soft text-accent',
        neutral: 'border-line bg-content/5 text-content-muted',
        success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500',
        warning: 'border-amber-500/30 bg-amber-500/10 text-amber-500',
        danger: 'border-red-500/30 bg-red-500/10 text-red-500',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
