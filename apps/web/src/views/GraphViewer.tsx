import { useCallback, useMemo } from 'react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { GraphCanvas, type GraphCanvasEdge, type GraphCanvasNode } from '@repo/ui';
import type { CatalogIndex } from '@/domain/catalog';
import { egoGraph } from '@/domain/catalog';
import type { ViewSearch } from '@/router';
import { KIND_LABELS, KIND_RANK, type NodeKind } from '@/domain/types';
import { kindColorVar, relColorVar } from '@/lib/tokens';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';

export interface GraphViewerProps {
  index: CatalogIndex;
  selectedId: string | null;
  onNodeSelect: (id: string) => void;
  /** 태그 필터 통과 노드 id (null = 필터 비활성, 전체 표시). */
  allowedIds: Set<string> | null;
}

// 개요(선택 없음)에서 force 시뮬레이션에 올리는 노드 상한 — 순수 성능 가드다.
// 2D(dagre)는 브라우저 콜스택 초과로 "실패"할 수 있어 적응형 ladder+재시도가 필요했지만,
// 3D 는 GPU 렌더 + 물리 시뮬레이션이라 그 실패 모드가 없다 — 프레임률만 보호하면 되므로
// 단일 상한으로 충분하다. 초과 시 구조적 중요도(KIND_RANK·연결수) 상위만 개요에 남기고,
// 노드를 선택하면 ego-graph 로 제한 없이 펼친다("기본은 전부, 대형 그래프에서만 상위 우선").
const OVERVIEW_CAP = 1500;

function GraphInner({ index, selectedId, onNodeSelect, allowedIds }: GraphViewerProps): React.JSX.Element {
  const allKinds = useMemo(
    () => [...index.kindCounts.keys()].sort((a, b) => KIND_RANK[a] - KIND_RANK[b]),
    [index],
  );

  // 그래프 뷰 상태(포커스/깊이/kind 필터)의 진실은 URL — 새로고침·공유 시 그대로 복원된다.
  // (3D 는 방향 개념이 없어 2D 의 dir 파라미터는 승계하지 않는다.)
  const navigate = useNavigate();
  const { view } = useParams({ from: '/$view' });
  const search = useSearch({ from: '/$view' });
  const focusMode = search.focus ?? true;
  const depth = search.depth ?? 1;
  // Concept 편중 완화: 기본은 전체 표시, 사용자가 kind 토글로 끌 수 있음(숨긴 kind 만 URL 에 실림).
  const hiddenKinds = useMemo(
    () => new Set<NodeKind>((search.hideKinds ?? []) as NodeKind[]),
    [search.hideKinds],
  );

  // 기본값과 같은 값은 URL 에서 제거(undefined)해 주소를 깨끗하게 유지한다.
  const patch = useCallback(
    (p: Partial<ViewSearch>) =>
      navigate({ to: '/$view', params: { view }, search: (prev) => ({ ...prev, ...p }) }),
    [navigate, view],
  );
  const toggleFocus = useCallback(
    () => patch({ focus: focusMode ? false : undefined }),
    [patch, focusMode],
  );
  const setDepth = useCallback((d: number) => patch({ depth: d === 1 ? undefined : d }), [patch]);
  const toggleKind = useCallback(
    (kind: NodeKind) => {
      const next = new Set(hiddenKinds);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      const arr = [...next];
      patch({ hideKinds: arr.length ? arr : undefined });
    },
    [patch, hiddenKinds],
  );

  // depth>=1 + 선택 노드 → ego-graph 로 화면을 좁힌다(focus 탐색).
  // 선택 없으면 전체 그래프(kind 필터 적용).
  const ego = useMemo(
    () => (selectedId && depth >= 1 ? egoGraph(index, selectedId, depth) : null),
    [index, selectedId, depth],
  );

  // 가시 노드/엣지를 DS view-model(도메인 무지 GraphCanvasNode/Edge)로 매핑한다.
  // 색은 kind/rel → 시맨틱 토큰(colorToken)으로만 넘긴다 — DS 는 kind 를 모른다(도메인 무지 계약).
  const { nodes, edges, totalVisible, capped } = useMemo(() => {
    const visibleNodeIds = new Set<string>();
    for (const n of index.catalog.nodes) {
      if (allowedIds && !allowedIds.has(n.id)) continue;
      if (hiddenKinds.has(n.kind)) continue;
      if (ego && !ego.nodeIds.has(n.id)) continue;
      visibleNodeIds.add(n.id);
    }
    const totalVisible = visibleNodeIds.size;

    // 개요 성능 가드 — 선택(ego) 없이 상한 초과 시 구조적 중요도 상위만 남긴다.
    let renderIds = visibleNodeIds;
    const capped = !ego && visibleNodeIds.size > OVERVIEW_CAP;
    if (capped) {
      const degree = (id: string) =>
        (index.outgoing.get(id)?.length ?? 0) + (index.incoming.get(id)?.length ?? 0);
      renderIds = new Set(
        [...visibleNodeIds]
          .map((id) => index.nodeById.get(id)!)
          .sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind] || degree(b.id) - degree(a.id))
          .slice(0, OVERVIEW_CAP)
          .map((n) => n.id),
      );
    }

    const nodes: GraphCanvasNode[] = [];
    for (const n of index.catalog.nodes) {
      if (!renderIds.has(n.id)) continue;
      nodes.push({
        id: n.id,
        label: n.title,
        sublabel: KIND_LABELS[n.kind],
        colorToken: kindColorVar(n.kind),
      });
    }

    const edges: GraphCanvasEdge[] = [];
    for (const e of index.catalog.edges) {
      if (!renderIds.has(e.from) || !renderIds.has(e.to)) continue;
      edges.push({
        id: `${e.from}__${e.rel}__${e.to}`,
        source: e.from,
        target: e.to,
        colorToken: relColorVar(e.rel),
      });
    }

    return { nodes, edges, totalVisible, capped };
  }, [index, hiddenKinds, ego, allowedIds]);

  const maxDepth = ego ? Math.max(...ego.depthOf.values(), 1) : 4;

  return (
    <div className="relative h-full w-full">
      <GraphCanvas
        nodes={nodes}
        edges={edges}
        selectedId={selectedId ?? undefined}
        onNodeSelect={onNodeSelect}
        focusNeighbors={focusMode}
        emptyState="표시할 노드가 없습니다 — 필터를 조정해 보세요."
      />

      {/* 컨트롤 패널 */}
      <div className="absolute left-3 top-3 z-10 w-64 rounded-lg border border-border bg-[var(--surface)]/95 p-3 text-sm shadow-md backdrop-blur">
        <div className="mb-2 flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            active={focusMode}
            onClick={toggleFocus}
            title="선택 노드의 1-hop 이웃만 강조하고 나머지는 흐리게"
          >
            포커스
          </Button>
        </div>

        <div className="mb-2">
          <label className="mb-1 flex items-center justify-between text-xs text-[var(--foreground-muted)]">
            <span>탐색 뎁스 (ego-graph)</span>
            <span className="font-mono text-foreground">{selectedId ? `${depth}-hop` : '전체'}</span>
          </label>
          <input
            type="range"
            min={1}
            max={4}
            value={depth}
            disabled={!selectedId}
            onChange={(e) => setDepth(Number(e.target.value))}
            className="w-full accent-[var(--primary)] disabled:opacity-40"
          />
          {!selectedId && (
            <p className="mt-0.5 text-[10px] text-[var(--foreground-subtle)]">
              노드를 선택하면 주변 N-hop 만 펼칩니다.
            </p>
          )}
        </div>

        <div>
          <div className="mb-1 text-xs text-[var(--foreground-muted)]">kind 필터</div>
          <div className="flex flex-wrap gap-1">
            {allKinds.map((kind) => {
              const hidden = hiddenKinds.has(kind);
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => toggleKind(kind)}
                  className="transition-opacity"
                  style={{ opacity: hidden ? 0.35 : 1 }}
                  title={`${KIND_LABELS[kind]} ${index.kindCounts.get(kind)}개`}
                >
                  <Badge accent={kindColorVar(kind)} tone={hidden ? 'outline' : 'soft'} size="xs" dot>
                    {KIND_LABELS[kind]} {index.kindCounts.get(kind)}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {ego && (
        <div className="absolute bottom-3 left-3 z-10 rounded-md border border-border bg-[var(--surface)]/95 px-2.5 py-1 text-xs text-[var(--foreground-muted)] backdrop-blur">
          ego-graph: {ego.nodeIds.size}개 노드 (최대 {maxDepth}-hop)
        </div>
      )}

      {capped && (
        <div className="absolute bottom-3 right-3 z-10 max-w-[280px] rounded-md border border-border bg-[var(--surface)]/95 px-2.5 py-1.5 text-[11px] text-[var(--foreground-muted)] shadow-md backdrop-blur">
          전체 {totalVisible}개 중 중요도 상위 {OVERVIEW_CAP}개만 표시 중. 노드를 선택(또는 검색)하면
          주변을 펼치고, kind 필터로 더 좁힐 수 있습니다.
        </div>
      )}
    </div>
  );
}

export function GraphViewer(props: GraphViewerProps): React.JSX.Element {
  return <GraphInner {...props} />;
}
