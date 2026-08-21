'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'icon';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gold text-[#12100A] hover:bg-gold-soft active:brightness-95 shadow-[0_1px_0_0_rgb(255_255_255_/_0.25)_inset]',
  secondary:
    'bg-base-raised2 text-ink border border-border hover:border-border-strong hover:bg-base-raised',
  ghost: 'bg-transparent text-ink-muted hover:text-ink hover:bg-base-raised2/80',
  danger: 'bg-transparent text-danger hover:bg-danger/10 border border-danger/30',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-xl',
  icon: 'h-9 w-9 rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = 'secondary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-150',
          'disabled:opacity-40 disabled:pointer-events-none',
          'focus-visible:outline-2 focus-visible:outline-offset-2',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
