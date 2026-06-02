// 카탈로그 인덱싱 · 그래프 질의 · 구조 자동 판별.
// 순수 함수 + 인덱스 — 렌더링/React 무관 (core 로 승격 가능한 형태).

import type { Catalog, CatalogEdge, CatalogNode, NodeKind, RelType } from './types';
import { KIND_RANK } from './types';

export interface CatalogIndex {
  catalog: Catalog;
  nodeById: Map<string, CatalogNode>;
  /** from → 나가는 엣지. */
  outgoing: Map<string, CatalogEdge[]>;
  /** to → 들어오는 엣지. */
  incoming: Map<string, CatalogEdge[]>;
  kindCounts: Map<NodeKind, number>;
  relCounts: Map<RelType, number>;
}

export function buildIndex(catalog: Catalog): CatalogIndex {
  const nodeById = new Map<string, CatalogNode>();
  for (const n of catalog.nodes) nodeById.set(n.id, n);

  const outgoing = new Map<string, CatalogEdge[]>();
  const incoming = new Map<string, CatalogEdge[]>();
  const relCounts = new Map<RelType, number>();

  for (const e of catalog.edges) {
    // 카탈로그에 양끝이 모두 존재하는 엣지만 인덱싱 (dangling 무시).
    if (!nodeById.has(e.from) || !nodeById.has(e.to)) continue;
    (outgoing.get(e.from) ?? outgoing.set(e.from, []).get(e.from)!).push(e);
    (incoming.get(e.to) ?? incoming.set(e.to, []).get(e.to)!).push(e);
    relCounts.set(e.rel, (relCounts.get(e.rel) ?? 0) + 1);
  }

  const kindCounts = new Map<NodeKind, number>();
  for (const n of catalog.nodes) {
    kindCounts.set(n.kind, (kindCounts.get(n.kind) ?? 0) + 1);
  }

  return { catalog, nodeById, outgoing, incoming, kindCounts, relCounts };
}

/** 한 노드의 1-hop 이웃 (방향 무관). */
export function neighbors(index: CatalogIndex, id: string): Set<string> {
  const set = new Set<string>();
  for (const e of index.outgoing.get(id) ?? []) set.add(e.to);
  for (const e of index.incoming.get(id) ?? []) set.add(e.from);
  return set;
}

export interface EgoGraph {
  nodeIds: Set<string>;
  edges: CatalogEdge[];
  /** id → root 로부터의 hop 거리 (root = 0). */
  depthOf: Map<string, number>;
}

/** 선택 노드 기준 N-hop ego-graph (방향 무관 BFS). */
export function egoGraph(index: CatalogIndex, rootId: string, depth: number): EgoGraph {
  const depthOf = new Map<string, number>([[rootId, 0]]);
  const queue: string[] = [rootId];
  while (queue.length) {
    const cur = queue.shift()!;
    const d = depthOf.get(cur)!;
    if (d >= depth) continue;
    for (const nb of neighbors(index, cur)) {
      if (!depthOf.has(nb)) {
        depthOf.set(nb, d + 1);
        queue.push(nb);
      }
    }
  }
  const nodeIds = new Set(depthOf.keys());
  const edges = index.catalog.edges.filter(
    (e) => nodeIds.has(e.from) && nodeIds.has(e.to),
  );
  return { nodeIds, edges, depthOf };
}

// ── 구조 자동 판별 (라우팅 디폴트 결정) ───────────────────────────────

export type StructureKind = 'graph' | 'tree' | 'matrix';

export interface StructureSignal {
  recommended: StructureKind;
  reason: string;
  /** 가장 많은 kind 와 그 비율 (matrix 추천 근거). */
  dominantKind: NodeKind | null;
  dominantRatio: number;
  /** 트리 투영 시 사이클 발생 여부 (tree 적합도). */
  hasCycle: boolean;
}

/**
 * 카탈로그의 형상을 보고 디폴트 뷰를 추천한다.
 *  - 단일 kind 가 압도적(>=60%)이고 노드 수가 많으면 → matrix (균질 비교).
 *  - 계층 엣지(realizedBy/governs/servesPersona 등)가 지배적이고 사이클이 없으면 → tree.
 *  - 그 외(혼합 관계 그래프) → graph.
 * 어느 경우든 사용자는 탭으로 전환할 수 있다 — 추천은 첫 진입 디폴트일 뿐.
 */
export function detectStructure(index: CatalogIndex): StructureSignal {
  const total = index.catalog.nodes.length;
  let dominantKind: NodeKind | null = null;
  let dominantCount = 0;
  for (const [kind, count] of index.kindCounts) {
    if (count > dominantCount) {
      dominantCount = count;
      dominantKind = kind;
    }
  }
  const dominantRatio = total === 0 ? 0 : dominantCount / total;
  const hasCycle = detectCycle(index);

  if (dominantRatio >= 0.6 && dominantCount >= 20) {
    return {
      recommended: 'matrix',
      reason: `단일 kind(${dominantKind})가 ${Math.round(dominantRatio * 100)}% 로 압도적 — 균질 항목 비교는 표가 우월합니다.`,
      dominantKind,
      dominantRatio,
      hasCycle,
    };
  }
  if (!hasCycle) {
    return {
      recommended: 'tree',
      reason: '방향성 계층 관계가 지배적이고 사이클이 없어 트리 펼침이 자연스럽습니다.',
      dominantKind,
      dominantRatio,
      hasCycle,
    };
  }
  return {
    recommended: 'graph',
    reason: '혼합 관계 그래프 — 그래프 뷰로 전체 구조를 탐색합니다.',
    dominantKind,
    dominantRatio,
    hasCycle,
  };
}

/** outgoing 방향 그래프에 사이클이 있는지 DFS 로 판정. */
function detectCycle(index: CatalogIndex): boolean {
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  for (const n of index.catalog.nodes) color.set(n.id, WHITE);

  const stack: { id: string; iter: Iterator<CatalogEdge> }[] = [];
  for (const start of index.catalog.nodes) {
    if (color.get(start.id) !== WHITE) continue;
    color.set(start.id, GRAY);
    stack.push({ id: start.id, iter: (index.outgoing.get(start.id) ?? [])[Symbol.iterator]() });
    while (stack.length) {
      const frame = stack[stack.length - 1];
      const next = frame.iter.next();
      if (next.done) {
        color.set(frame.id, BLACK);
        stack.pop();
        continue;
      }
      const to = next.value.to;
      const c = color.get(to);
      if (c === GRAY) return true;
      if (c === WHITE) {
        color.set(to, GRAY);
        stack.push({ id: to, iter: (index.outgoing.get(to) ?? [])[Symbol.iterator]() });
      }
    }
  }
  return false;
}

// ── 트리 투영 (DAG → tree, visited set 으로 사이클 차단) ──────────────

export interface TreeNode {
  id: string;
  node: CatalogNode;
  /** 이 노드로 들어온 rel (루트는 null). */
  via: RelType | null;
  children: TreeNode[];
  /** 이미 다른 가지에서 펼쳐진 노드면 true (중복 표시 억제용). */
  isRevisit: boolean;
}

/**
 * 지정 rel 을 따라 forest 를 만든다.
 *  - 루트 = 해당 rel 의 incoming 이 없는(또는 kind rank 가 가장 높은) 노드.
 *  - visited set 으로 DAG 를 tree 로 투영 — 사이클/중복 진입을 isRevisit 로 표시.
 */
export function projectTree(index: CatalogIndex, rel: RelType): TreeNode[] {
  const adjacency = new Map<string, CatalogEdge[]>();
  const hasIncoming = new Set<string>();
  for (const e of index.catalog.edges) {
    if (e.rel !== rel) continue;
    if (!index.nodeById.has(e.from) || !index.nodeById.has(e.to)) continue;
    (adjacency.get(e.from) ?? adjacency.set(e.from, []).get(e.from)!).push(e);
    hasIncoming.add(e.to);
  }

  // 루트 후보: 이 rel 로 나가지만 들어오지 않는 노드. 없으면 kind rank 최상위.
  const roots: CatalogNode[] = [];
  for (const n of index.catalog.nodes) {
    const goesOut = adjacency.has(n.id);
    if (goesOut && !hasIncoming.has(n.id)) roots.push(n);
  }
  if (roots.length === 0) {
    // fallback: rel 을 가진 노드 중 kind rank 가 가장 높은 것들.
    const participants = [...adjacency.keys()].map((id) => index.nodeById.get(id)!);
    const minRank = Math.min(...participants.map((n) => KIND_RANK[n.kind]));
    roots.push(...participants.filter((n) => KIND_RANK[n.kind] === minRank));
  }
  roots.sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind] || a.title.localeCompare(b.title));

  const visited = new Set<string>();
  const build = (id: string, via: RelType | null): TreeNode => {
    const node = index.nodeById.get(id)!;
    const isRevisit = visited.has(id);
    visited.add(id);
    const children: TreeNode[] = [];
    if (!isRevisit) {
      for (const e of adjacency.get(id) ?? []) {
        children.push(build(e.to, e.rel));
      }
    }
    return { id, node, via, children, isRevisit };
  };

  return roots.map((r) => build(r.id, null));
}

/**
 * SSOT 데이터 베이스 경로 (BASE_URL 으로 prefix, 양끝 슬래시 정규화).
 * VITE_SSOT_DATA 로 마운트 위치를 바꿀 수 있다 (기본 '/ssot').
 */
function dataBase(): string {
  const raw = import.meta.env.VITE_SSOT_DATA ?? '/ssot';
  const trimmed = raw.replace(/^\/+/, '').replace(/\/+$/, '');
  return `${import.meta.env.BASE_URL}${trimmed}/`;
}

/** 카탈로그 file 경로 → public fetch 경로. */
export function nodeDocUrl(file: string): string {
  return `${dataBase()}${file}`;
}

export function catalogUrl(): string {
  return `${dataBase()}_catalog.json`;
}
