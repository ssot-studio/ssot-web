import { cva } from 'class-variance-authority';
import { useCallback, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { cn } from '@/lib';
import type { TreeNode, TreeViewProps } from './tree-view.types';

const marker = cva('size-1.5 shrink-0 rounded-full', {
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

const row = cva(
  'flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  {
    variants: {
      selected: {
        true: 'bg-(--tree-row-selected-bg) text-(--tree-row-selected-fg) font-medium',
        false: 'text-foreground hover:bg-(--tree-row-hover-bg)',
      },
    },
    defaultVariants: { selected: false },
  }
);

interface TreeRowsProps {
  nodes: TreeNode[];
  depth: number;
  selectedId?: string;
  isExpanded: (id: string) => boolean;
  onSelect?: (id: string) => void;
  toggle: (id: string) => void;
}

function TreeRows({
  nodes,
  depth,
  selectedId,
  isExpanded,
  onSelect,
  toggle,
}: TreeRowsProps): React.JSX.Element {
  return (
    <ul role={depth === 0 ? 'tree' : 'group'} className="flex flex-col">
      {nodes.map((node) => {
        const hasChildren = !!node.children && node.children.length > 0;
        const expanded = hasChildren && isExpanded(node.id);
        const selected = node.id === selectedId;

        const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect?.(node.id);
          } else if (event.key === 'ArrowRight' && hasChildren && !expanded) {
            event.preventDefault();
            toggle(node.id);
          } else if (event.key === 'ArrowLeft' && hasChildren && expanded) {
            event.preventDefault();
            toggle(node.id);
          }
        };

        return (
          <li key={node.id} role="treeitem" aria-selected={selected} aria-expanded={hasChildren ? expanded : undefined}>
            <div
              tabIndex={0}
              onKeyDown={handleKeyDown}
              onClick={() => onSelect?.(node.id)}
              className={row({ selected })}
              // 들여쓰기는 깊이에 따른 런타임 계산값 → 인라인 padding 허용 (색상/정적 레이아웃 아님)
              style={{ paddingLeft: `${depth * 14 + 4}px` }}
            >
              {hasChildren ? (
                <button
                  type="button"
                  aria-label={expanded ? 'Collapse' : 'Expand'}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggle(node.id);
                  }}
                  className="flex size-4 shrink-0 items-center justify-center rounded text-(--tree-toggle-fg) hover:text-(--tree-toggle-hover-fg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <svg
                    viewBox="0 0 16 16"
                    className={cn('size-3 transition-transform', expanded && 'rotate-90')}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ) : (
                <span className="size-4 shrink-0" aria-hidden />
              )}

              {node.icon ? (
                <span className="shrink-0 text-muted-foreground">{node.icon}</span>
              ) : (
                <span aria-hidden className={marker({ tone: node.tone ?? 'neutral' })} />
              )}

              <span className="min-w-0 flex-1 truncate">{node.label}</span>
              {node.trailing ? <span className="shrink-0">{node.trailing}</span> : null}
            </div>

            {expanded && node.children ? (
              <TreeRows
                nodes={node.children}
                depth={depth + 1}
                selectedId={selectedId}
                isExpanded={isExpanded}
                onSelect={onSelect}
                toggle={toggle}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * 범용 계층 트리. controlled(expandedIds + onToggle) 또는 uncontrolled(defaultExpandedIds) 로 동작.
 * 도메인 무지 — TreeNode view-model 만 받는다. DAG → tree 투영은 호출부 책임.
 */
export function TreeView({
  nodes,
  selectedId,
  expandedIds,
  defaultExpandedIds,
  onSelect,
  onToggle,
  emptyState,
  className,
  'data-uid': dataUid,
}: TreeViewProps): React.JSX.Element {
  const controlled = expandedIds !== undefined;
  const [internalExpanded, setInternalExpanded] = useState<Set<string>>(
    () => new Set(defaultExpandedIds ?? [])
  );

  const isExpanded = useCallback(
    (id: string): boolean =>
      controlled ? expandedIds.has(id) : internalExpanded.has(id),
    [controlled, expandedIds, internalExpanded]
  );

  const toggle = useCallback(
    (id: string): void => {
      const next = !isExpanded(id);
      if (!controlled) {
        setInternalExpanded((prev) => {
          const draft = new Set(prev);
          if (next) draft.add(id);
          else draft.delete(id);
          return draft;
        });
      }
      onToggle?.(id, next);
    },
    [controlled, isExpanded, onToggle]
  );

  if (nodes.length === 0) {
    return (
      <div data-uid={dataUid} className={cn('p-4 text-sm text-muted-foreground', className)}>
        {emptyState ?? 'No items'}
      </div>
    );
  }

  return (
    <div data-uid={dataUid} className={cn('w-full', className)}>
      <TreeRows
        nodes={nodes}
        depth={0}
        selectedId={selectedId}
        isExpanded={isExpanded}
        onSelect={onSelect}
        toggle={toggle}
      />
    </div>
  );
}
