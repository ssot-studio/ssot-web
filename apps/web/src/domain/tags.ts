// 태그 수집·그룹핑·필터 — 순수 함수 (React 무관, core 승격 가능 형태).
// 태그는 "namespace:value" 형식 (예: 'domain:auth'). namespace 누락 시 'etc' 로 귀속.

import type { CatalogNode } from './types';

/** 알려진 네임스페이스 표시 순서 (그 외는 알파벳 순으로 뒤에 붙는다). */
const NAMESPACE_ORDER = ['domain', 'area', 'status', 'team', 'version', 'type', 'risk'] as const;

/** 네임스페이스 → 사람이 읽는 라벨. */
export const NAMESPACE_LABELS: Record<string, string> = {
  domain: '도메인',
  area: '영역',
  status: '상태',
  team: '팀',
  version: '버전',
  type: '유형',
  risk: '리스크',
  etc: '기타',
};

export interface ParsedTag {
  /** 원본 "namespace:value" 문자열 — 필터 선택의 키. */
  raw: string;
  namespace: string;
  value: string;
}

export interface TagNamespaceGroup {
  namespace: string;
  /** 이 네임스페이스에 속한 태그들 (value 기준 정렬). */
  tags: { value: string; raw: string; count: number }[];
}

/** "namespace:value" 파싱. ':' 가 없으면 namespace='etc'. value 에 ':' 가 더 있으면 첫 ':' 만 분리. */
export function parseTag(raw: string): ParsedTag {
  const idx = raw.indexOf(':');
  if (idx <= 0) return { raw, namespace: 'etc', value: raw };
  return { raw, namespace: raw.slice(0, idx), value: raw.slice(idx + 1) };
}

function namespaceRank(ns: string): number {
  const i = (NAMESPACE_ORDER as readonly string[]).indexOf(ns);
  return i === -1 ? NAMESPACE_ORDER.length : i;
}

/**
 * 카탈로그 전체 노드의 tags 를 수집해 네임스페이스별로 그룹핑한다.
 * - 네임스페이스 순서: 알려진 순서(domain/area/status/…) → 그 외 알파벳 → etc 는 항상 마지막.
 * - 각 네임스페이스 내 태그는 value 알파벳 순, 사용 횟수(count) 동반.
 */
export function collectTagGroups(nodes: readonly CatalogNode[]): TagNamespaceGroup[] {
  // namespace → (raw → {value, count})
  const byNamespace = new Map<string, Map<string, { value: string; count: number }>>();

  for (const node of nodes) {
    for (const raw of node.tags ?? []) {
      const { namespace, value } = parseTag(raw);
      const tagMap = byNamespace.get(namespace) ?? new Map();
      if (!byNamespace.has(namespace)) byNamespace.set(namespace, tagMap);
      const entry = tagMap.get(raw);
      if (entry) entry.count += 1;
      else tagMap.set(raw, { value, count: 1 });
    }
  }

  const groups: TagNamespaceGroup[] = [];
  for (const [namespace, tagMap] of byNamespace) {
    const tags = [...tagMap.entries()]
      .map(([raw, { value, count }]) => ({ raw, value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
    groups.push({ namespace, tags });
  }

  groups.sort((a, b) => {
    // etc 는 항상 마지막.
    if (a.namespace === 'etc') return 1;
    if (b.namespace === 'etc') return -1;
    const ra = namespaceRank(a.namespace);
    const rb = namespaceRank(b.namespace);
    return ra - rb || a.namespace.localeCompare(b.namespace);
  });
  return groups;
}

/**
 * 선택된 태그 집합으로 노드를 통과시킬지 판정한다.
 * - 같은 네임스페이스 내 여러 선택 → OR (하나라도 가지면 통과).
 * - 서로 다른 네임스페이스 간 → AND (모든 선택 네임스페이스를 각각 만족해야 통과).
 * - 선택 없음 → 전부 통과.
 */
export function nodeMatchesTags(node: CatalogNode, selected: ReadonlySet<string>): boolean {
  if (selected.size === 0) return true;

  // 선택된 태그를 네임스페이스별로 그룹핑 (한 번만 — 호출부가 자주 부르므로 작은 비용).
  const selectedByNs = new Map<string, Set<string>>();
  for (const raw of selected) {
    const { namespace } = parseTag(raw);
    const set = selectedByNs.get(namespace) ?? new Set();
    if (!selectedByNs.has(namespace)) selectedByNs.set(namespace, set);
    set.add(raw);
  }

  const nodeTags = new Set(node.tags ?? []);
  // 네임스페이스 간 AND: 모든 선택 네임스페이스에 대해 (그 안의 OR) 가 성립해야 한다.
  for (const [, rawSet] of selectedByNs) {
    let hit = false;
    for (const raw of rawSet) {
      if (nodeTags.has(raw)) {
        hit = true;
        break;
      }
    }
    if (!hit) return false;
  }
  return true;
}

/** 선택된 태그 필터를 통과하는 노드 id 집합. selected 비면 null (= 필터 비활성, 전체 표시). */
export function filterNodeIds(
  nodes: readonly CatalogNode[],
  selected: ReadonlySet<string>,
): Set<string> | null {
  if (selected.size === 0) return null;
  const ids = new Set<string>();
  for (const node of nodes) {
    if (nodeMatchesTags(node, selected)) ids.add(node.id);
  }
  return ids;
}
