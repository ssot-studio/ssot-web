import { cva } from 'class-variance-authority';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { cn } from '@/lib';
import type { SsotNodeData } from './graph-layout';

const nodeBox = cva(
  'flex h-full w-full flex-col justify-center gap-0.5 rounded-md border-2 bg-(--graph-node-bg) px-3 py-2 text-(--graph-node-fg) shadow-[var(--node-card-shadow)] transition-opacity',
  {
    variants: {
      selected: {
        true: 'border-(--graph-node-selected-border) ring-2 ring-(--node-card-selected-ring)',
        false: '',
      },
      dimmed: { true: '', false: '' },
    },
    defaultVariants: { selected: false, dimmed: false },
  }
);

/** 좌측 톤 표시 막대 색. 선택되지 않은 노드의 보더 톤도 함께. */
const toneBorder = cva('', {
  variants: {
    tone: {
      neutral: 'border-(--tone-neutral-border)',
      info: 'border-(--tone-info-border)',
      success: 'border-(--tone-success-border)',
      warning: 'border-(--tone-warning-border)',
      danger: 'border-(--tone-danger-border)',
      accent: 'border-(--tone-accent-border)',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

const toneDot = cva('size-2 shrink-0 rounded-full', {
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

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';

function asTone(value: string): Tone {
  const tones: Tone[] = ['neutral', 'info', 'success', 'warning', 'danger', 'accent'];
  return (tones as string[]).includes(value) ? (value as Tone) : 'neutral';
}

/** xyflow 커스텀 노드. 색상은 전부 시맨틱 토큰 + CVA (인라인 hex 금지). */
export function SsotNode({
  data,
  sourcePosition,
  targetPosition,
}: NodeProps<Node<SsotNodeData>>): React.JSX.Element {
  const tone = asTone(data.tone);
  return (
    <div
      className={cn(
        nodeBox({ selected: data.selected, dimmed: data.dimmed }),
        !data.selected && toneBorder({ tone })
      )}
      // dim 정도는 토큰 기반 런타임 값 → 인라인 opacity 허용 (정적 색상 아님)
      style={data.dimmed ? { opacity: 'var(--graph-node-dim-opacity)' } : undefined}
    >
      <Handle
        type="target"
        position={targetPosition ?? Position.Left}
        className="!bg-(--graph-node-border) !border-(--graph-node-bg)"
      />
      <div className="flex items-center gap-1.5">
        <span aria-hidden className={toneDot({ tone })} />
        <span className="truncate text-sm font-semibold">{data.label}</span>
      </div>
      {data.sublabel ? (
        <span className="truncate pl-3.5 text-xs text-muted-foreground">{data.sublabel}</span>
      ) : null}
      <Handle
        type="source"
        position={sourcePosition ?? Position.Right}
        className="!bg-(--graph-node-border) !border-(--graph-node-bg)"
      />
    </div>
  );
}
