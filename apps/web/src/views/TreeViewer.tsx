import { useMemo, useState } from 'react';
import type { CatalogIndex } from '@/domain/catalog';
import { projectTree, type TreeNode } from '@/domain/catalog';
import { KIND_LABELS, REL_LABELS, type RelType } from '@/domain/types';
import { kindColorVar } from '@/lib/tokens';
import { Button } from '@/components/Button';
import { cn } from '@/lib/cn';

export interface TreeViewerProps {
  index: CatalogIndex;
  selectedId: string | null;
  onNodeSelect: (id: string) => void;
}

// 계층 펼침에 자연스러운 방향성 rel 후보(가장 많이 쓰이는 순).
const TREE_RELS: RelType[] = ['realizedBy', 'governs', 'servesPersona', 'impacts', 'dependsOn'];

export function TreeViewer({ index, selectedId, onNodeSelect }: TreeViewerProps): React.JSX.Element {
  const availableRels = useMemo(
    () => TREE_RELS.filter((rel) => (index.relCounts.get(rel) ?? 0) > 0),
    [index],
  );
  const [rel, setRel] = useState<RelType>(availableRels[0] ?? 'realizedBy');
  const forest = useMemo(() => projectTree(index, rel), [index, rel]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-3 py-2">
        <span className="mr-1 text-xs text-[var(--foreground-muted)]">관계축:</span>
        {availableRels.map((r) => (
          <Button key={r} size="sm" active={rel === r} onClick={() => setRel(r)}>
            {REL_LABELS[r] ?? r}
            <span className="ml-1 text-[var(--foreground-subtle)]">{index.relCounts.get(r)}</span>
          </Button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {forest.length === 0 ? (
          <p className="text-sm text-[var(--foreground-muted)]">이 관계축에 트리 루트가 없습니다.</p>
        ) : (
          <ul className="space-y-0.5">
            {forest.map((root) => (
              <TreeBranch
                key={root.id}
                node={root}
                index={index}
                selectedId={selectedId}
                onNodeSelect={onNodeSelect}
                level={0}
                defaultOpen
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TreeBranch({
  node,
  index,
  selectedId,
  onNodeSelect,
  level,
  defaultOpen = false,
}: {
  node: TreeNode;
  index: CatalogIndex;
  selectedId: string | null;
  onNodeSelect: (id: string) => void;
  level: number;
  defaultOpen?: boolean;
}): React.JSX.Element {
  const [open, setOpen] = useState(defaultOpen || level < 1);
  const hasChildren = node.children.length > 0;
  const isSelected = node.id === selectedId;

  return (
    <li>
      <div
        className={cn(
          'group flex items-center gap-1 rounded-md py-1 pr-2 transition-colors',
          isSelected ? 'bg-[var(--surface-hover)]' : 'hover:bg-[var(--surface-hover)]',
        )}
        style={{ paddingLeft: `${level * 16 + 4}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex size-4 shrink-0 items-center justify-center text-[var(--foreground-muted)] hover:text-foreground"
            aria-label={open ? '접기' : '펼치기'}
          >
            <span className={cn('transition-transform', open && 'rotate-90')}>▶</span>
          </button>
        ) : (
          <span className="size-4 shrink-0" />
        )}
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ background: kindColorVar(node.node.kind) }}
          aria-hidden
        />
        <button
          type="button"
          onClick={() => onNodeSelect(node.id)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          title={node.node.id}
        >
          <span className={cn('truncate text-sm', isSelected ? 'font-medium text-foreground' : 'text-foreground')}>
            {node.node.title}
          </span>
          <span className="shrink-0 text-[10px] uppercase text-[var(--foreground-subtle)]">
            {KIND_LABELS[node.node.kind]}
          </span>
          {node.isRevisit && (
            <span
              className="shrink-0 text-[10px] text-[var(--foreground-subtle)]"
              title="다른 가지에서 이미 펼쳐진 노드 (사이클 차단)"
            >
              ↺
            </span>
          )}
        </button>
      </div>
      {hasChildren && open && (
        <ul className="space-y-0.5">
          {node.children.map((child, i) => (
            <TreeBranch
              key={`${child.id}-${i}`}
              node={child}
              index={index}
              selectedId={selectedId}
              onNodeSelect={onNodeSelect}
              level={level + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
