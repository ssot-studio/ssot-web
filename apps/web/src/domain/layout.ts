// 그래프 레이아웃 — @dagrejs/dagre 로 계층(LR/TB) 좌표를 계산한다.
// SSOT 엣지는 realizedBy/governedBy/servesPersona 등 방향성 계층(layered DAG)이
// 지배적이므로 dagre rank 레이아웃이 자연스럽다.

import Dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';

export type LayoutDirection = 'LR' | 'TB';

const NODE_W = 200;
const NODE_H = 56;

export function applyDagreLayout<NodeData extends Record<string, unknown>>(
  nodes: Node<NodeData>[],
  edges: Edge[],
  direction: LayoutDirection,
): Node<NodeData>[] {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  // acyclicer:'greedy' — 사이클 제거를 재귀 DFS 대신 비재귀 greedy FAS 로 한다.
  // 기본(dfs)은 사이클이 많은 그래프(수백 개)에서 깊은 재귀로 브라우저 콜스택을 넘겨 RangeError 로
  // 죽는다. greedy 는 재귀를 쓰지 않아 큰·순환 많은 그래프도 안정적으로 좌표를 만든다.
  g.setGraph({
    rankdir: direction,
    nodesep: 40,
    ranksep: 90,
    marginx: 24,
    marginy: 24,
    acyclicer: 'greedy',
  });

  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_W, height: NODE_H });
  }
  for (const e of edges) {
    // dagre 는 양 끝 노드가 모두 등록돼 있어야 한다.
    if (g.hasNode(e.source) && g.hasNode(e.target)) {
      g.setEdge(e.source, e.target);
    }
  }

  Dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    if (!pos) return n;
    return {
      ...n,
      // dagre 는 중심 좌표를 주므로 좌상단으로 보정.
      position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 },
    };
  });
}

export const NODE_SIZE = { width: NODE_W, height: NODE_H };
