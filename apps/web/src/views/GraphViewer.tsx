import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type NodeMouseHandler,
} from '@xyflow/react';
import type { CatalogIndex } from '@/domain/catalog';
import { egoGraph } from '@/domain/catalog';
import { NODE_SIZE, type LayoutDirection } from '@/domain/layout';
import { useGraphLayout } from '@/hooks/useGraphLayout';
import type { ViewSearch } from '@/router';
import { KIND_LABELS, KIND_RANK, REL_LABELS, type NodeKind } from '@/domain/types';
import { kindColorVar, relColorVar } from '@/lib/tokens';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { SsotNode, type SsotFlowNode } from './graph/SsotNode';

export interface GraphViewerProps {
  index: CatalogIndex;
  selectedId: string | null;
  onNodeSelect: (id: string) => void;
  /** 태그 필터 통과 노드 id (null = 필터 비활성, 전체 표시). */
  allowedIds: Set<string> | null;
}

const nodeTypes = { ssot: SsotNode };

// 개요(선택 없음)에서 dagre 에 넣는 노드 상한 — 평소 무제한, 크래시 시에만 발동하는 최후 안전망.
//
// 첫 칸 Infinity = 전체 노드를 그대로 레이아웃한다(노드 수 제한 없음). 렌더는 react-flow 의
// onlyRenderVisibleElements(viewport culling)가, 좌표 계산은 워커가 메인 스레드 밖에서 맡아
// 수백 노드도 멈춤 없이 처리한다. dagre 도 acyclicer:'greedy'(layout.ts)로 사이클 많은 그래프의
// 재귀 콜스택 폭주를 피한다 — 현 데이터(451 노드·2353 엣지·814 사이클) 전체가 안정적으로 그려짐.
//
// 그럼에도 범용 뷰어라 훨씬 큰(수천 노드) 데이터에서 dagre 가 콜스택을 넘길 수 있다. 그때만
// 워커가 실패를 보고하고 ladder 를 한 칸씩 내려(구조적 중요도·연결수 상위) 재시도한다 —
// "기본은 전부 보여주되, 절대 깨지지 않는다".
const CAP_LADDER = [Infinity, 600, 350, 200] as const;

function GraphInner({ index, selectedId, onNodeSelect, allowedIds }: GraphViewerProps): React.JSX.Element {
  const allKinds = useMemo(
    () => [...index.kindCounts.keys()].sort((a, b) => KIND_RANK[a] - KIND_RANK[b]),
    [index],
  );

  // 그래프 뷰 상태(방향/포커스/깊이/kind 필터)의 진실은 URL — 새로고침·공유 시 그대로 복원된다.
  const navigate = useNavigate();
  const { view } = useParams({ from: '/$view' });
  const search = useSearch({ from: '/$view' });
  const direction: LayoutDirection = search.dir ?? 'LR';
  const focusMode = search.focus ?? true;
  const depth = search.depth ?? 1;
  // Concept(94) 편중 완화: 기본은 전체 표시, 사용자가 kind 토글로 끌 수 있음(숨긴 kind 만 URL 에 실림).
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
  const setDirection = useCallback(
    (d: LayoutDirection) => patch({ dir: d === 'LR' ? undefined : d }),
    [patch],
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

  // adaptive cap — ladder 의 현재 칸. 레이아웃이 실패하면 한 칸 낮춰 재시도(아래 effect).
  // 입력(데이터/필터/선택)이 바뀌면 다시 가장 높은 칸부터 시도한다.
  const [capIdx, setCapIdx] = useState(0);
  const overviewCap = CAP_LADDER[Math.min(capIdx, CAP_LADDER.length - 1)];
  useEffect(() => {
    setCapIdx(0);
  }, [index, hiddenKinds, allowedIds, ego]);

  // 화면 구성(가시 노드/엣지)만 계산한다 — 좌표(dagre)는 워커에서 별도로 입힌다.
  // 그래서 deps 에 direction 이 없다(방향 변경은 재구성이 아니라 재배치이므로 워커가 처리).
  const { flowNodes, flowEdges, totalVisible } = useMemo(() => {
    const visibleNodeIds = new Set<string>();
    for (const n of index.catalog.nodes) {
      if (allowedIds && !allowedIds.has(n.id)) continue;
      if (hiddenKinds.has(n.kind)) continue;
      if (ego && !ego.nodeIds.has(n.id)) continue;
      visibleNodeIds.add(n.id);
    }
    const totalVisible = visibleNodeIds.size;

    // 개요(선택 없음)에서 노드가 상한을 넘으면 구조적 중요도(KIND_RANK)·연결수 상위만 남긴다.
    // dagre 브라우저 콜스택 한계 회피 + 초기 로드 비용 절감. 선택(ego) 시엔 적용하지 않는다.
    let renderIds = visibleNodeIds;
    if (!ego && visibleNodeIds.size > overviewCap) {
      const degree = (id: string) =>
        (index.outgoing.get(id)?.length ?? 0) + (index.incoming.get(id)?.length ?? 0);
      renderIds = new Set(
        [...visibleNodeIds]
          .map((id) => ({ id, kind: index.nodeById.get(id)!.kind }))
          .sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind] || degree(b.id) - degree(a.id))
          .slice(0, overviewCap)
          .map((x) => x.id),
      );
    }

    // focus(1-hop 이웃) 집합 — 선택 노드 + 직접 이웃.
    const focusSet = new Set<string>();
    if (focusMode && selectedId && renderIds.has(selectedId)) {
      focusSet.add(selectedId);
      for (const e of index.outgoing.get(selectedId) ?? []) focusSet.add(e.to);
      for (const e of index.incoming.get(selectedId) ?? []) focusSet.add(e.from);
    }

    const flowNodes: SsotFlowNode[] = [];
    for (const n of index.catalog.nodes) {
      if (!renderIds.has(n.id)) continue;
      const dimmed = focusSet.size > 0 && !focusSet.has(n.id);
      flowNodes.push({
        id: n.id,
        type: 'ssot',
        position: { x: 0, y: 0 },
        // 치수 힌트 — 매 렌더 새로 만드는 plain 노드라 react-flow 가 measured 를 역기입하지 못한다.
        // 이게 없으면 MiniMap 이 nodeHasDimensions 검사에서 전 노드를 걸러 미리보기가 빈다.
        initialWidth: NODE_SIZE.width,
        initialHeight: NODE_SIZE.height,
        data: { title: n.title, kind: n.kind, dimmed, isRoot: n.id === selectedId },
      });
    }

    const flowEdges: Edge[] = [];
    for (const e of index.catalog.edges) {
      if (!renderIds.has(e.from) || !renderIds.has(e.to)) continue;
      const onFocus = focusSet.size === 0 || (focusSet.has(e.from) && focusSet.has(e.to));
      flowEdges.push({
        id: `${e.from}__${e.rel}__${e.to}`,
        source: e.from,
        target: e.to,
        label: REL_LABELS[e.rel] ?? e.rel,
        labelShowBg: false,
        style: { stroke: relColorVar(e.rel), strokeWidth: 1.5, opacity: onFocus ? 0.9 : 0.12 },
        labelStyle: {
          fill: 'var(--foreground-muted)',
          fontSize: 10,
          opacity: onFocus ? 1 : 0.15,
        },
      });
    }

    return { flowNodes, flowEdges, totalVisible };
  }, [index, hiddenKinds, ego, focusMode, selectedId, allowedIds, overviewCap]);
  const cappedOverview = !ego && totalVisible > overviewCap;

  // 좌표 계산은 Web Worker 로 오프로드 — 노드가 많아도 메인 스레드가 멈추지 않는다.
  const { nodes, layouting, error } = useGraphLayout(flowNodes, flowEdges, direction);
  const edges = flowEdges;

  // adaptive 핵심 — 레이아웃이 실패하면(브라우저 콜스택 초과 등) cap 을 한 칸 낮춰 재시도한다.
  // 마지막 칸까지 내려가도 실패하면 더 낮추지 않고 error 오버레이를 띄운다(무한 루프 방지).
  useEffect(() => {
    if (error && capIdx < CAP_LADDER.length - 1) setCapIdx((i) => i + 1);
  }, [error, capIdx]);
  const downshifting = Boolean(error) && capIdx < CAP_LADDER.length - 1;

  // 레이아웃이 갱신될 때마다(비동기 도착) 뷰를 맞춘다. fitView prop 은 최초 1회만 동작하므로
  // 워커가 늦게 돌려주는 좌표에는 직접 다시 맞춰야 노드가 화면 밖에 그려지지 않는다.
  const { fitView } = useReactFlow();
  useEffect(() => {
    if (!layouting && nodes.length > 0) {
      void fitView({ padding: 0.2, duration: 200 });
    }
  }, [layouting, nodes, fitView]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => onNodeSelect(node.id),
    [onNodeSelect],
  );

  const maxDepth = ego ? Math.max(...ego.depthOf.values(), 1) : 4;

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        onlyRenderVisibleElements
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => kindColorVar((n.data as SsotFlowNode['data']).kind)}
        />
      </ReactFlow>

      {/* 컨트롤 패널 */}
      <div className="absolute left-3 top-3 z-10 w-64 rounded-lg border border-border bg-[var(--surface)]/95 p-3 text-sm shadow-md backdrop-blur">
        <div className="mb-2 flex items-center gap-1.5">
          <Button size="sm" active={direction === 'LR'} onClick={() => setDirection('LR')}>
            가로
          </Button>
          <Button size="sm" active={direction === 'TB'} onClick={() => setDirection('TB')}>
            세로
          </Button>
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

      {cappedOverview && !layouting && !downshifting && !error && (
        <div className="absolute bottom-3 right-3 z-10 max-w-[280px] rounded-md border border-border bg-[var(--surface)]/95 px-2.5 py-1.5 text-[11px] text-[var(--foreground-muted)] shadow-md backdrop-blur">
          전체 {totalVisible}개 중 중요도 상위 {overviewCap}개만 표시 중. 노드를 선택(또는 검색)하면
          주변을 펼치고, kind 필터로 더 좁힐 수 있습니다.
        </div>
      )}

      {/* 레이아웃 계산 중 + adaptive 단계 축소 재시도 중에는 같은 오버레이를 보여준다(깜빡임 방지). */}
      {(layouting || downshifting) && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <span className="rounded-md border border-border bg-[var(--surface)]/90 px-3 py-1.5 text-xs text-[var(--foreground-muted)] shadow-md backdrop-blur">
            레이아웃 계산 중…
          </span>
        </div>
      )}

      {/* ladder 마지막 칸까지 내려가도 실패한 경우에만 노출(그 전까지는 자동 축소로 흡수). */}
      {error && !downshifting && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-6">
          <div className="max-w-sm rounded-lg border border-border bg-[var(--surface)]/95 px-4 py-3 text-center text-xs text-[var(--foreground-muted)] shadow-md backdrop-blur">
            <div className="mb-1 font-medium text-foreground">그래프 레이아웃을 그리지 못했습니다</div>
            <p>
              표시할 노드가 너무 많아 레이아웃 계산이 실패했습니다. kind 필터로 종류를 줄이거나,
              노드를 선택해 주변만 펼쳐 보세요.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function GraphViewer(props: GraphViewerProps): React.JSX.Element {
  return (
    <ReactFlowProvider>
      <GraphInner {...props} />
    </ReactFlowProvider>
  );
}
