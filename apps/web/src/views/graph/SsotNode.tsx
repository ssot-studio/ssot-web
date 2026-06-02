import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { NodeKind } from '@/domain/types';
import { KIND_LABELS } from '@/domain/types';
import { kindColorVar } from '@/lib/tokens';
import { cn } from '@/lib/cn';

export interface SsotNodeData extends Record<string, unknown> {
  title: string;
  kind: NodeKind;
  dimmed: boolean;
  isRoot: boolean;
}

export type SsotFlowNode = Node<SsotNodeData, 'ssot'>;

// xyflow 커스텀 노드 — 색상은 --accent(kind 시맨틱 토큰)로 주입, 하드코딩 없음.
function SsotNodeImpl({ data, selected }: NodeProps<SsotFlowNode>): React.JSX.Element {
  return (
    <div
      style={{ '--accent': kindColorVar(data.kind) } as React.CSSProperties}
      className={cn(
        'rounded-md border bg-[var(--surface)] px-3 py-2 shadow-sm transition-opacity',
        'border-l-4 border-l-[var(--accent)] border-border',
        selected && 'ring-2 ring-[var(--primary)]',
        data.isRoot && 'ring-2 ring-[var(--accent)]',
        data.dimmed && 'opacity-25',
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-[var(--border-strong)]" />
      <div className="text-[10px] font-medium uppercase tracking-wide text-[var(--accent)]">
        {KIND_LABELS[data.kind]}
      </div>
      <div className="max-w-[176px] truncate text-xs font-medium text-foreground" title={data.title}>
        {data.title}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-[var(--border-strong)]" />
    </div>
  );
}

export const SsotNode = memo(SsotNodeImpl);
