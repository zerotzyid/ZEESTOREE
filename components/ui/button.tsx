import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-[filter,background-color,color,transform] duration-200 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] min-h-[44px]',
  {
    variants: {
      variant: {
        default: 'btn-accent shadow-soft hover:brightness-105',
        outline: 'border border-line bg-transparent text-content hover:bg-content/5',
        ghost: 'text-content-muted hover:bg-content/5 hover:text-content',
        danger: 'bg-red-600 text-white hover:bg-red-500',
        link: 'text-accent underline-offset-4 hover:underline min-h-0 p-0 h-auto',
      },
      size: {
        default: 'h-11 px-6',
        sm: 'h-9 px-4 text-xs min-h-[36px]',
        lg: 'h-12 px-8 text-base',
        icon: 'h-11 w-11 min-h-[44px] p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';
