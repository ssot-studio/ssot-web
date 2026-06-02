import { useMemo, useState } from 'react';
import type { CatalogIndex } from '@/domain/catalog';
import { neighbors } from '@/domain/catalog';
import { KIND_LABELS, KIND_RANK, type CatalogNode, type NodeKind } from '@/domain/types';
import { confidenceColorVar, kindColorVar } from '@/lib/tokens';
import { Badge } from '@/components/Badge';
import { cn } from '@/lib/cn';

export interface MatrixViewerProps {
  index: CatalogIndex;
  selectedId: string | null;
  onNodeSelect: (id: string) => void;
}

type SortKey = 'title' | 'kind' | 'confidence' | 'lifecycle' | 'relCount' | 'lastVerified';
type SortDir = 'asc' | 'desc';

const CONFIDENCE_ORDER: Record<string, number> = { high: 0, inferred: 1, unverified: 2 };

interface Row {
  node: CatalogNode;
  relCount: number;
}

export function MatrixViewer({ index, selectedId, onNodeSelect }: MatrixViewerProps): React.JSX.Element {
  const allKinds = useMemo(
    () => [...index.kindCounts.keys()].sort((a, b) => KIND_RANK[a] - KIND_RANK[b]),
    [index],
  );
  // 디폴트: 가장 균질한(최다) kind 만 — 균질 비교가 표의 핵심.
  const dominantKind = useMemo(() => {
    let best: NodeKind | null = null;
    let max = 0;
    for (const [k, c] of index.kindCounts) {
      if (c > max) {
        max = c;
        best = k;
      }
    }
    return best;
  }, [index]);
  const [kindFilter, setKindFilter] = useState<NodeKind | 'all'>(dominantKind ?? 'all');
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'title', dir: 'asc' });

  const rows = useMemo<Row[]>(() => {
    const list = index.catalog.nodes
      .filter((n) => kindFilter === 'all' || n.kind === kindFilter)
      .map<Row>((node) => ({ node, relCount: neighbors(index, node.id).size }));

    const dir = sort.dir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      switch (sort.key) {
        case 'title':
          return a.node.title.localeCompare(b.node.title) * dir;
        case 'kind':
          return (KIND_RANK[a.node.kind] - KIND_RANK[b.node.kind]) * dir;
        case 'confidence':
          return (
            ((CONFIDENCE_ORDER[a.node.confidence] ?? 9) - (CONFIDENCE_ORDER[b.node.confidence] ?? 9)) * dir
          );
        case 'lifecycle':
          return a.node.lifecycle.localeCompare(b.node.lifecycle) * dir;
        case 'relCount':
          return (a.relCount - b.relCount) * dir;
        case 'lastVerified':
          return a.node.lastVerified.localeCompare(b.node.lastVerified) * dir;
        default:
          return 0;
      }
    });
    return list;
  }, [index, kindFilter, sort]);

  const toggleSort = (key: SortKey): void =>
    setSort((prev) => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-3 py-2">
        <button type="button" onClick={() => setKindFilter('all')}>
          <Badge tone={kindFilter === 'all' ? 'soft' : 'outline'} size="xs">
            전체 {index.catalog.nodes.length}
          </Badge>
        </button>
        {allKinds.map((kind) => (
          <button key={kind} type="button" onClick={() => setKindFilter(kind)}>
            <Badge
              accent={kindColorVar(kind)}
              tone={kindFilter === kind ? 'soft' : 'outline'}
              size="xs"
              dot
            >
              {KIND_LABELS[kind]} {index.kindCounts.get(kind)}
            </Badge>
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-[var(--surface-raised)] text-xs text-[var(--foreground-muted)]">
            <tr className="border-b border-border">
              <Th label="제목" sortKey="title" sort={sort} onSort={toggleSort} />
              <Th label="kind" sortKey="kind" sort={sort} onSort={toggleSort} />
              <Th label="confidence" sortKey="confidence" sort={sort} onSort={toggleSort} />
              <Th label="lifecycle" sortKey="lifecycle" sort={sort} onSort={toggleSort} />
              <Th label="관계 수" sortKey="relCount" sort={sort} onSort={toggleSort} align="right" />
              <Th label="owner" />
              <Th label="lastVerified" sortKey="lastVerified" sort={sort} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ node, relCount }) => (
              <tr
                key={node.id}
                onClick={() => onNodeSelect(node.id)}
                className={cn(
                  'cursor-pointer border-b border-border transition-colors',
                  node.id === selectedId ? 'bg-[var(--surface-hover)]' : 'hover:bg-[var(--surface-hover)]',
                )}
              >
                <td className="px-3 py-2">
                  <div className="font-medium text-foreground">{node.title}</div>
                  <code className="text-[10px] text-[var(--foreground-subtle)]">{node.id}</code>
                </td>
                <td className="px-3 py-2">
                  <Badge accent={kindColorVar(node.kind)} size="xs" dot>
                    {KIND_LABELS[node.kind]}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <Badge accent={confidenceColorVar(node.confidence)} size="xs">
                    {node.confidence}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-[var(--foreground-muted)]">{node.lifecycle}</td>
                <td className="px-3 py-2 text-right font-mono text-foreground">{relCount}</td>
                <td className="px-3 py-2 text-[var(--foreground-muted)]">{node.owner || '—'}</td>
                <td className="px-3 py-2 text-[var(--foreground-muted)]">{node.lastVerified}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-4 text-sm text-[var(--foreground-muted)]">표시할 노드가 없습니다.</p>
        )}
      </div>
    </div>
  );
}

function Th({
  label,
  sortKey,
  sort,
  onSort,
  align = 'left',
}: {
  label: string;
  sortKey?: SortKey;
  sort?: { key: SortKey; dir: SortDir };
  onSort?: (key: SortKey) => void;
  align?: 'left' | 'right';
}): React.JSX.Element {
  const active = sortKey && sort?.key === sortKey;
  return (
    <th className={cn('px-3 py-2 font-medium', align === 'right' ? 'text-right' : 'text-left')}>
      {sortKey && onSort ? (
        <button
          type="button"
          onClick={() => onSort(sortKey)}
          className={cn('inline-flex items-center gap-1 hover:text-foreground', active && 'text-foreground')}
        >
          {label}
          {active && <span>{sort?.dir === 'asc' ? '▲' : '▼'}</span>}
        </button>
      ) : (
        label
      )}
    </th>
  );
}
