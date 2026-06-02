import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib';
import type { BadgeProps } from './badge.types';

/*
  톤 × 변형 매트릭스는 전부 CVA variants 로 정의한다 (본문 삼항 클래스 조립 금지).
  색상은 컴포넌트 시맨틱 CSS 변수(--tone-*)만 참조 — 팔레트 직접참조/하드코딩 금지.
  arbitrary value 구문 `bg-(--var)` 은 Tailwind v4 의 컴포넌트 시맨틱 변수 참조 방식이다.
*/
const badge = cva(
  'inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap align-middle',
  {
    variants: {
      tone: {
        neutral: '',
        info: '',
        success: '',
        warning: '',
        danger: '',
        accent: '',
      },
      variant: {
        solid: '',
        soft: '',
        outline: 'bg-transparent border',
        dot: 'bg-transparent',
      },
      size: {
        sm: 'h-5 px-2 text-[11px] leading-none',
        md: 'h-6 px-2.5 text-xs leading-none',
      },
    },
    compoundVariants: [
      // solid: 톤 solid 배경 + 대비 전경
      { tone: 'neutral', variant: 'solid', class: 'bg-(--tone-neutral) text-(--tone-neutral-foreground)' },
      { tone: 'info', variant: 'solid', class: 'bg-(--tone-info) text-(--tone-info-foreground)' },
      { tone: 'success', variant: 'solid', class: 'bg-(--tone-success) text-(--tone-success-foreground)' },
      { tone: 'warning', variant: 'solid', class: 'bg-(--tone-warning) text-(--tone-warning-foreground)' },
      { tone: 'danger', variant: 'solid', class: 'bg-(--tone-danger) text-(--tone-danger-foreground)' },
      { tone: 'accent', variant: 'solid', class: 'bg-(--tone-accent) text-(--tone-accent-foreground)' },
      // soft: 옅은 배경 + 톤 전경
      { tone: 'neutral', variant: 'soft', class: 'bg-(--tone-neutral-soft-bg) text-(--tone-neutral-soft-fg)' },
      { tone: 'info', variant: 'soft', class: 'bg-(--tone-info-soft-bg) text-(--tone-info-soft-fg)' },
      { tone: 'success', variant: 'soft', class: 'bg-(--tone-success-soft-bg) text-(--tone-success-soft-fg)' },
      { tone: 'warning', variant: 'soft', class: 'bg-(--tone-warning-soft-bg) text-(--tone-warning-soft-fg)' },
      { tone: 'danger', variant: 'soft', class: 'bg-(--tone-danger-soft-bg) text-(--tone-danger-soft-fg)' },
      { tone: 'accent', variant: 'soft', class: 'bg-(--tone-accent-soft-bg) text-(--tone-accent-soft-fg)' },
      // outline: 톤 보더 + 톤 전경
      { tone: 'neutral', variant: 'outline', class: 'border-(--tone-neutral-border) text-(--tone-neutral-soft-fg)' },
      { tone: 'info', variant: 'outline', class: 'border-(--tone-info-border) text-(--tone-info-soft-fg)' },
      { tone: 'success', variant: 'outline', class: 'border-(--tone-success-border) text-(--tone-success-soft-fg)' },
      { tone: 'warning', variant: 'outline', class: 'border-(--tone-warning-border) text-(--tone-warning-soft-fg)' },
      { tone: 'danger', variant: 'outline', class: 'border-(--tone-danger-border) text-(--tone-danger-soft-fg)' },
      { tone: 'accent', variant: 'outline', class: 'border-(--tone-accent-border) text-(--tone-accent-soft-fg)' },
      // dot: 전경만 톤, 앞에 점 마커
      { tone: 'neutral', variant: 'dot', class: 'text-(--tone-neutral-soft-fg)' },
      { tone: 'info', variant: 'dot', class: 'text-(--tone-info-soft-fg)' },
      { tone: 'success', variant: 'dot', class: 'text-(--tone-success-soft-fg)' },
      { tone: 'warning', variant: 'dot', class: 'text-(--tone-warning-soft-fg)' },
      { tone: 'danger', variant: 'dot', class: 'text-(--tone-danger-soft-fg)' },
      { tone: 'accent', variant: 'dot', class: 'text-(--tone-accent-soft-fg)' },
    ],
    defaultVariants: {
      tone: 'neutral',
      variant: 'soft',
      size: 'md',
    },
  }
);

const dotMarker = cva('size-1.5 rounded-full shrink-0', {
  variants: {
    tone: {
      neutral: 'bg-(--tone-neutral)',
      info: 'bg-(--tone-info)',
      success: 'bg-(--tone-success)',
      warning: 'bg-(--tone-warning)',
      danger: 'bg-(--tone-danger)',
      accent: 'bg-(--tone-accent)',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

type BadgeCvaProps = VariantProps<typeof badge>;

/**
 * 범용 시맨틱 배지. 도메인 무지 — confidence/authority/kind 같은 어휘를 직접 받지 않고
 * 시맨틱 tone/variant 조합으로 표현한다.
 *
 * SSOT 의미 매핑 예 (호출부 책임):
 *  - confidence: high → tone='success', inferred → 'info', unverified → 'warning'
 *  - authority:  authored → variant='solid', mirrored → variant='outline'
 */
export function Badge({
  tone = 'neutral',
  variant = 'soft',
  size = 'md',
  children,
  leading,
  className,
  'data-uid': dataUid,
}: BadgeProps): React.JSX.Element {
  return (
    <span
      data-uid={dataUid}
      className={cn(
        badge({ tone, variant, size } satisfies BadgeCvaProps),
        className
      )}
    >
      {variant === 'dot' ? <span className={dotMarker({ tone })} /> : leading}
      {children}
    </span>
  );
}
