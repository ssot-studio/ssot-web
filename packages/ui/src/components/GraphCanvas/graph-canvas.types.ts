import type { BadgeTone } from '@/components/Badge';

/** 그래프 노드 view-model. 도메인 무지 — 호출부가 정규화 노드를 이 형태로 매핑한다. */
export interface GraphCanvasNode {
  id: string;
  /** 주 라벨 (예: title). */
  label: string;
  /** 부 라벨 (예: kind 또는 id). */
  sublabel?: string;
  /** 노드 톤 (예: kind 매핑). 미지정 시 중립. */
  tone?: BadgeTone;
}

/** 그래프 엣지 view-model. */
export interface GraphCanvasEdge {
  id: string;
  source: string;
  target: string;
  /** 엣지 라벨 (예: rel 타입). */
  label?: string;
  /** 엣지 톤. 미지정 시 중립. */
  tone?: BadgeTone;
}

/** dagre 레이아웃 방향. */
export type GraphLayoutDirection = 'LR' | 'TB' | 'RL' | 'BT';

export type GraphColorMode = 'light' | 'dark';

export interface GraphCanvasProps {
  nodes: GraphCanvasNode[];
  edges: GraphCanvasEdge[];
  /** 선택된 노드 id. */
  selectedId?: string;
  /** 노드 클릭 시. */
  onNodeSelect?: (id: string) => void;
  /** 레이아웃 방향 (dagre rankdir). 기본 'LR'. */
  direction?: GraphLayoutDirection;
  /**
   * focus mode — 선택 노드의 1-hop 이웃만 강조하고 나머지를 dim 처리한다.
   * 기본 false.
   */
  focusNeighbors?: boolean;
  /** 색상 모드. xyflow colorMode + 토큰 자동 대응. 기본 'light'. */
  colorMode?: GraphColorMode;
  /** MiniMap 표시. 기본 true. */
  showMiniMap?: boolean;
  /** Controls 표시. 기본 true. */
  showControls?: boolean;
  /** 빈 상태 슬롯. */
  emptyState?: React.ReactNode;
  className?: string;
  'data-uid'?: string;
}
