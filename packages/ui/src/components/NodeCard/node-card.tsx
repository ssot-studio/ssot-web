import { cva } from 'class-variance-authority';
import type { KeyboardEvent } from 'react';
import { cn } from '@/lib';
import type { NodeCardProps } from './node-card.types';

const card = cva(
  'group relative flex w-full flex-col gap-1.5 overflow-hidden rounded-lg border bg-(--node-card-bg) text-left text-foreground shadow-[var(--node-card-shadow)] transition-colors',
  {
    variants: {
      selected: {
        true: 'border-(--node-card-selected-border) ring-2 ring-(--node-card-selected-ring)',
        false: 'border-(--node-card-border)',
      },
      interactive: {
        true: 'cursor-pointer hover:border-(--node-card-hover-border) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        false: '',
      },
      density: {
        compact: 'px-3 py-2',
        comfortable: 'px-4 py-3',
      },
    },
    defaultVariants: {
      selected: false,
      interactive: false,
      density: 'comfortable',
    },
  }
);

const accentBar = cva('absolute inset-y-0 left-0 w-1', {
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

/**
 * 범용 노드 카드. 그래프 노드를 리스트/그리드에서 표현하는 데 쓴다.
 * 도메인 무지 — title/subtitle/description/badges/meta 슬롯을 받고 레이아웃만 한다.
 * 좌측 액센트 바 톤은 호출부가 kind 등을 매핑해 전달한다.
 */
export function NodeCard({
  title,
  subtitle,
  description,
  tone = 'neutral',
  badges,
  meta,
  leading,
  selected = false,
  onSelect,
  density = 'comfortable',
  className,
  'data-uid': dataUid,
}: NodeCardProps): React.JSX.Element {
  const interactive = typeof onSelect === 'function';

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (!interactive) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect?.();
    }
  };

  return (
    <div
      data-uid={dataUid}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? selected : undefined}
      onClick={interactive ? onSelect : undefined}
      onKeyDown={handleKeyDown}
      className={cn(card({ selected, interactive, density }), 'pl-5', className)}
    >
      <span aria-hidden className={accentBar({ tone })} />

      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          {leading ? <span className="mt-0.5 shrink-0 text-muted-foreground">{leading}</span> : null}
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{title}</div>
            {subtitle ? (
              <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
            ) : null}
          </div>
        </div>
        {badges ? <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">{badges}</div> : null}
      </div>

      {description ? (
        <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
      ) : null}

      {meta ? (
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {meta}
        </div>
      ) : null}
    </div>
  );
}
