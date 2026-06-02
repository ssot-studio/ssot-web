import dagre from '@dagrejs/dagre';
import { Position, type Edge, type Node } from '@xyflow/react';
import type {
  GraphCanvasEdge,
  GraphCanvasNode,
  GraphLayoutDirection,
} from './graph-canvas.types';

/** SSOT 뷰어 커스텀 노드가 받는 data 형태. */
export interface SsotNodeData extends Record<string, unknown> {
  label: string;
  sublabel?: string;
  tone: string;
  /** focus mode 에서 흐릿하게 처리할지. */
  dimmed: boolean;
  selected: boolean;
}

const NODE_WIDTH = 200;
const NODE_HEIGHT = 56;

const dirToPositions: Record<
  GraphLayoutDirection,
  { source: Position; target: Position }
> = {
  LR: { source: Position.Right, target: Position.Left },
  RL: { source: Position.Left, target: Position.Right },
  TB: { source: Position.Bottom, target: Position.Top },
  BT: { source: Position.Top, target: Position.Bottom },
};

/**
 * dagre 로 방향성 계층(layered DAG) 레이아웃을 계산해 xyflow Node/Edge 를 만든다.
 * 색상은 노드 data.tone → 커스텀 노드 CVA 가 토큰으로 매핑하므로 여기서 색을 다루지 않는다.
 */
export function layoutGraph(
  nodes: GraphCanvasNode[],
  edges: GraphCanvasEdge[],
  direction: GraphLayoutDirection,
  options: { selectedId?: string; dimmedIds?: ReadonlySet<string> }
): { nodes: Node<SsotNodeData>[]; edges: Edge[] } {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: direction, nodesep: 32, ranksep: 64 });

  for (const node of nodes) {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
      graph.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(graph);

  const { source: sourcePosition, target: targetPosition } =
    dirToPositions[direction];

  const layoutNodes: Node<SsotNodeData>[] = nodes.map((node) => {
    const pos = graph.node(node.id);
    const dimmed = options.dimmedIds?.has(node.id) ?? false;
    const selected = node.id === options.selectedId;
    return {
      id: node.id,
      type: 'ssot',
      position: {
        // dagre 는 중심 좌표 → xyflow 는 좌상단 기준이므로 절반 만큼 보정
        x: (pos?.x ?? 0) - NODE_WIDTH / 2,
        y: (pos?.y ?? 0) - NODE_HEIGHT / 2,
      },
      data: {
        label: node.label,
        sublabel: node.sublabel,
        tone: node.tone ?? 'neutral',
        dimmed,
        selected,
      },
      sourcePosition,
      targetPosition,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    };
  });

  const layoutEdges: Edge[] = edges.map((edge) => {
    const dimmed =
      (options.dimmedIds?.has(edge.source) ?? false) ||
      (options.dimmedIds?.has(edge.target) ?? false);
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      // 톤별 색상은 클래스로 처리할 수 없는 SVG stroke → CSS 변수 클래스 + 데이터 속성으로 토큰화
      className: `ssot-edge ssot-edge-tone-${edge.tone ?? 'neutral'}`,
      data: { tone: edge.tone ?? 'neutral' },
      animated: false,
      style: dimmed ? { opacity: 'var(--graph-node-dim-opacity)' } : undefined,
      labelShowBg: true,
    };
  });

  return { nodes: layoutNodes, edges: layoutEdges };
}

/**
 * 선택 노드 기준 1-hop 이웃을 제외한 노드 id 집합(dim 대상)을 반환한다.
 * 선택 노드 자신과 인접 노드는 dim 대상에서 제외.
 */
export function computeDimmedIds(
  nodes: GraphCanvasNode[],
  edges: GraphCanvasEdge[],
  selectedId: string
): Set<string> {
  const neighbors = new Set<string>([selectedId]);
  for (const edge of edges) {
    if (edge.source === selectedId) neighbors.add(edge.target);
    if (edge.target === selectedId) neighbors.add(edge.source);
  }
  const dimmed = new Set<string>();
  for (const node of nodes) {
    if (!neighbors.has(node.id)) dimmed.add(node.id);
  }
  return dimmed;
}
