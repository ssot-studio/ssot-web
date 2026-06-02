import { useCallback, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from '@xyflow/react';
import type { CatalogIndex } from '@/domain/catalog';
import { egoGraph } from '@/domain/catalog';
import { applyDagreLayout, type LayoutDirection } from '@/domain/layout';
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

function GraphInner({ index, selectedId, onNodeSelect, allowedIds }: GraphViewerProps): React.JSX.Element {
  const allKinds = useMemo(
    () => [...index.kindCounts.keys()].sort((a, b) => KIND_RANK[a] - KIND_RANK[b]),
    [index],
  );
  // Concept(94) 편중 완화: 기본은 전체 표시, 사용자가 토글로 끌 수 있음.
  const [hiddenKinds, setHiddenKinds] = useState<Set<NodeKind>>(new Set());
  const [direction, setDirection] = useState<LayoutDirection>('LR');
  const [focusMode, setFocusMode] = useState(true);
  const [depth, setDepth] = useState(1);

  const toggleKind = useCallback((kind: NodeKind) => {
    setHiddenKinds((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }, []);

  // depth>=1 + 선택 노드 → ego-graph 로 화면을 좁힌다(focus 탐색).
  // 선택 없으면 전체 그래프(kind 필터 적용).
  const ego = useMemo(
    () => (selectedId && depth >= 1 ? egoGraph(index, selectedId, depth) : null),
    [index, selectedId, depth],
  );

  const { nodes, edges } = useMemo(() => {
    const visibleNodeIds = new Set<string>();
    for (const n of index.catalog.nodes) {
      if (allowedIds && !allowedIds.has(n.id)) continue;
      if (hiddenKinds.has(n.kind)) continue;
      if (ego && !ego.nodeIds.has(n.id)) continue;
      visibleNodeIds.add(n.id);
    }

    // focus(1-hop 이웃) 집합 — 선택 노드 + 직접 이웃.
    const focusSet = new Set<string>();
    if (focusMode && selectedId && visibleNodeIds.has(selectedId)) {
      focusSet.add(selectedId);
      for (const e of index.outgoing.get(selectedId) ?? []) focusSet.add(e.to);
      for (const e of index.incoming.get(selectedId) ?? []) focusSet.add(e.from);
    }

    const flowNodes: SsotFlowNode[] = [];
    for (const n of index.catalog.nodes) {
      if (!visibleNodeIds.has(n.id)) continue;
      const dimmed = focusSet.size > 0 && !focusSet.has(n.id);
      flowNodes.push({
        id: n.id,
        type: 'ssot',
        position: { x: 0, y: 0 },
        data: { title: n.title, kind: n.kind, dimmed, isRoot: n.id === selectedId },
      });
    }

    const flowEdges: Edge[] = [];
    for (const e of index.catalog.edges) {
      if (!visibleNodeIds.has(e.from) || !visibleNodeIds.has(e.to)) continue;
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

    const laidOut = applyDagreLayout(flowNodes, flowEdges, direction);
    return { nodes: laidOut as Node[], edges: flowEdges };
  }, [index, hiddenKinds, ego, focusMode, selectedId, direction, allowedIds]);

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
            onClick={() => setFocusMode((v) => !v)}
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
