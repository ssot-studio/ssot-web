import type { ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const button = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
  {
    variants: {
      variant: {
        primary: 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90',
        secondary:
          'bg-[var(--surface-raised)] text-foreground border border-border hover:bg-[var(--surface-hover)]',
        ghost: 'text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] hover:text-foreground',
      },
      size: {
        sm: 'h-7 px-2.5 text-xs',
        md: 'h-9 px-3.5 text-sm',
      },
      active: { true: '', false: '' },
    },
    compoundVariants: [
      {
        variant: 'secondary',
        active: true,
        className: 'bg-[var(--surface-hover)] border-[var(--primary)] text-foreground',
      },
      {
        variant: 'ghost',
        active: true,
        className: 'bg-[var(--surface-hover)] text-foreground',
      },
    ],
    defaultVariants: { variant: 'secondary', size: 'md', active: false },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export function Button({
  variant,
  size,
  active,
  className,
  type = 'button',
  ...props
}: ButtonProps): React.JSX.Element {
  return <button type={type} className={cn(button({ variant, size, active }), className)} {...props} />;
}
