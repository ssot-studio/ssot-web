/**
 * 그래프 노드 view-model. 도메인 무지 — 호출부가 정규화 노드를 이 형태로 매핑한다.
 * 색은 kind 가 아니라 시맨틱 토큰 이름(colorToken)으로만 전달한다: DS 는 도메인(kind)을 모른다.
 */
export interface GraphCanvasNode {
  id: string;
  /** 주 라벨 (troika-three-text 로 캔버스에 렌더). */
  label: string;
  /** 부 라벨 (예: kind 또는 id) — hover/딥링크 확장 슬롯. */
  sublabel?: string;
  /**
   * 노드 색을 정하는 시맨틱 토큰 이름. `--kind-decision` 또는 `var(--kind-decision)` 형식 모두 허용.
   * WebGL 은 CSS `var()` 를 모르므로 DS 가 `useSemanticColors` 로 계산값(hex)으로 해석한다
   * (hex 하드코딩 금지 원칙 유지, 다크/라이트 라이브 반응). 미지정 시 기본 노드 토큰으로 렌더.
   */
  colorToken?: string;
}

/** 그래프 엣지 view-model (방향 링크). source/target 은 노드 id. */
export interface GraphCanvasEdge {
  id: string;
  source: string;
  target: string;
  /** 엣지 라벨 (예: rel 타입) — 미래 확장 슬롯. */
  label?: string;
  /** 엣지 색 토큰(노드와 동일 규약). 미지정 시 기본 link 토큰. */
  colorToken?: string;
}

export interface GraphCanvasProps {
  nodes: GraphCanvasNode[];
  edges: GraphCanvasEdge[];
  /** 선택된 노드 id — 해당 노드는 ring 토큰 색으로 강조된다. */
  selectedId?: string;
  /** 노드 클릭 시. */
  onNodeSelect?: (id: string) => void;
  /**
   * focus mode — 선택 노드의 1-hop 이웃만 강조하고 나머지 노드/엣지를 dim 처리한다.
   * 기본 false.
   */
  focusNeighbors?: boolean;
  /** 배경 색 토큰. 기본 `--color-background`. */
  backgroundToken?: string;
  /** 선택 강조(ring) 색 토큰. 기본 `--color-ring`. */
  ringToken?: string;
  /** 링크 기본 색 토큰. 기본 `--color-muted-foreground`. */
  linkToken?: string;
  /** 빈 상태 슬롯. */
  emptyState?: React.ReactNode;
  className?: string;
  'data-uid'?: string;
}
