// SSOT 도메인 모델 — _catalog.json 스키마의 단일 진실.
// (@repo/core 가 비어 있는 동안 web 앱이 소유. core 가 모델을 export 하면 그쪽으로 승격.)

export type NodeKind =
  | 'Platform'
  | 'Persona'
  | 'Domain'
  | 'Capability'
  | 'Screen'
  | 'Endpoint'
  | 'Flow'
  | 'SystemComponent'
  | 'Integration'
  | 'Concept'
  | 'Invariant'
  | 'EngineeringRule'
  | 'Decision';

export type RelType =
  | 'realizedBy'
  | 'servesPersona'
  | 'governedBy'
  | 'governs'
  | 'impacts'
  | 'dependsOn'
  | 'decidedBy'
  | 'relatesTo'
  | 'relatesTo:owns'
  | 'consumesApi'
  | 'providesApi'
  | 'integratesWith'
  | 'supersedes'
  | 'implementedIn'
  | 'crossesBoundary';

export type Confidence = 'high' | 'inferred' | 'unverified';
export type Lifecycle = 'active' | 'proposed' | 'deprecated';

/** _catalog.json 의 nodes[] 항목 (그래프/인덱스용 요약). */
export interface CatalogNode {
  id: string;
  kind: NodeKind;
  title: string;
  file: string;
  confidence: Confidence;
  owner: string;
  lifecycle: Lifecycle;
  lastVerified: string;
  openCount: number;
  /** 카탈로그가 직렬화한 facet 요약(relatesTo 는 문자열화되어 손실 — 상세는 frontmatter 재파싱). */
  facets: Record<string, unknown>;
}

/** _catalog.json 의 edges[] 항목 — {from, to, rel} 3필드. */
export interface CatalogEdge {
  from: string;
  to: string;
  rel: RelType;
}

export interface CatalogPath {
  from: string;
  field: string;
  raw: string;
}

export interface Catalog {
  generatedFrom: string;
  nodeCount: number;
  edgeCount: number;
  nodes: CatalogNode[];
  edges: CatalogEdge[];
  paths: CatalogPath[];
  parseErrors: unknown[];
}

/** 노드 .md frontmatter 의 relatesTo 항목 (구조화된 관계). */
export interface RelatesToRef {
  to: string;
  type?: string;
  note?: string;
}

/** 노드 .md 를 파싱한 결과 — frontmatter 4축 + 본문. */
export interface NodeDoc {
  id: string;
  /** frontmatter 의 스칼라/배열 필드 (정규화 전 원본). */
  frontmatter: NodeFrontmatter;
  /** frontmatter 다음의 마크다운 본문. */
  body: string;
}

export interface NodeFrontmatter {
  id?: string;
  kind?: NodeKind;
  title?: string;
  // 의미 축
  definition?: string;
  purpose?: string;
  value?: string;
  authority?: string;
  source?: string;
  // 관계 축
  relatesTo?: RelatesToRef[];
  realizedBy?: string[];
  dependsOn?: string[];
  governs?: string[];
  governedBy?: string[];
  impacts?: string[];
  servesPersona?: string[];
  consumesApi?: string[];
  providesApi?: string[];
  integratesWith?: string[];
  decidedBy?: string[];
  supersedes?: string[];
  implementedIn?: string[];
  crossesBoundary?: string[];
  // 메타 축
  owner?: string;
  lifecycle?: Lifecycle;
  confidence?: Confidence;
  lastVerified?: string;
  [key: string]: unknown;
}

/** frontmatter 4축 분류 — NodeDetail 구조화 표시용. */
export const FRONTMATTER_AXES = {
  identity: ['id', 'kind', 'title'] as const,
  meaning: ['definition', 'purpose', 'value', 'authority', 'source'] as const,
  relations: [
    'relatesTo',
    'realizedBy',
    'dependsOn',
    'governs',
    'governedBy',
    'impacts',
    'servesPersona',
    'consumesApi',
    'providesApi',
    'integratesWith',
    'decidedBy',
    'supersedes',
    'implementedIn',
    'crossesBoundary',
  ] as const,
  meta: ['owner', 'lifecycle', 'confidence', 'lastVerified'] as const,
};

/** 관계 필드(및 엣지 rel) → 사람이 읽는 라벨. */
export const REL_LABELS: Record<string, string> = {
  realizedBy: '구현 주체',
  servesPersona: '대상 페르소나',
  governedBy: '규율 받음',
  governs: '규율함',
  impacts: '영향',
  dependsOn: '의존',
  decidedBy: '결정 근거',
  relatesTo: '관련',
  'relatesTo:owns': '소유',
  consumesApi: '소비 API',
  providesApi: '제공 API',
  integratesWith: '연동',
  supersedes: '대체',
  implementedIn: '구현 위치',
  crossesBoundary: '경계 횡단',
};

/** kind → 사람이 읽는 라벨. */
export const KIND_LABELS: Record<NodeKind, string> = {
  Platform: '플랫폼',
  Persona: '페르소나',
  Domain: '도메인',
  Capability: '역량',
  Screen: '화면',
  Endpoint: '엔드포인트',
  Flow: '플로우',
  SystemComponent: '시스템 컴포넌트',
  Integration: '연동',
  Concept: '개념',
  Invariant: '불변식',
  EngineeringRule: '엔지니어링 룰',
  Decision: '결정',
};

/** 계층 순서 (Tree 루트 정렬 / 그래프 rank 힌트). */
export const KIND_RANK: Record<NodeKind, number> = {
  Platform: 0,
  Persona: 1,
  Domain: 2,
  Capability: 3,
  Screen: 4,
  Endpoint: 5,
  Flow: 6,
  Integration: 7,
  SystemComponent: 8,
  Concept: 9,
  Invariant: 10,
  EngineeringRule: 11,
  Decision: 12,
};
