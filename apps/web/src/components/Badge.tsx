import type { CSSProperties, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

// 의미색은 --accent CSS 변수로 주입(호출부에서 시맨틱 토큰 var() 전달).
// variant 는 시각 형태(채움/외곽선/점)만 결정 — 색상 하드코딩 없음.
const badge = cva(
  'inline-flex items-center gap-1 rounded-md font-medium leading-none whitespace-nowrap',
  {
    variants: {
      tone: {
        soft: 'bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)] border border-[color-mix(in_srgb,var(--accent)_30%,transparent)]',
        solid: 'bg-[var(--accent)] text-[var(--primary-foreground)]',
        outline: 'border border-[var(--accent)] text-[var(--accent)]',
      },
      size: {
        xs: 'px-1.5 py-0.5 text-[10px]',
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm',
      },
    },
    defaultVariants: { tone: 'soft', size: 'sm' },
  },
);

export interface BadgeProps extends VariantProps<typeof badge> {
  /** 의미색 토큰 var() (예: kindColorVar(kind)). 미지정 시 muted 색. */
  accent?: string;
  /** 선행 점 표시. */
  dot?: boolean;
  className?: string;
  children: ReactNode;
}

export function Badge({ accent, dot, tone, size, className, children }: BadgeProps): React.JSX.Element {
  const style = { '--accent': accent ?? 'var(--foreground-muted)' } as CSSProperties;
  return (
    <span className={cn(badge({ tone, size }), className)} style={style}>
      {dot && <span className="size-1.5 rounded-full bg-[var(--accent)]" aria-hidden />}
      {children}
    </span>
  );
}
