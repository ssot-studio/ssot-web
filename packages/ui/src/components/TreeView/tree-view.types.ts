import type { ReactNode } from 'react';
import type { BadgeTone } from '@/components/Badge';

/**
 * 트리 노드 view-model. 도메인 무지 — 호출부가 정규화 모델/그래프를
 * 트리로 투영(예: DAG → visited set 평면화)해 이 형태로 전달한다.
 */
export interface TreeNode {
  /** 고유 식별자 (선택/펼침 상태 키). */
  id: string;
  /** 표시 라벨. */
  label: ReactNode;
  /** 좌측 마커 톤 (예: kind 매핑). */
  tone?: BadgeTone;
  /** 라벨 우측 슬롯 (예: 관계 타입 배지). */
  trailing?: ReactNode;
  /** 좌측 아이콘 슬롯. */
  icon?: ReactNode;
  /** 자식 노드. 없거나 빈 배열이면 리프. */
  children?: TreeNode[];
}

export interface TreeViewProps {
  /** 루트 노드들. */
  nodes: TreeNode[];
  /** 선택된 노드 id (controlled). */
  selectedId?: string;
  /** 펼쳐진 노드 id 집합 (controlled). 미지정 시 내부 상태로 관리. */
  expandedIds?: ReadonlySet<string>;
  /** 비제어 모드의 초기 펼침 id. */
  defaultExpandedIds?: Iterable<string>;
  /** 노드 선택 시. */
  onSelect?: (id: string) => void;
  /** 노드 펼침 토글 시 (controlled 모드에서 상태 갱신용). */
  onToggle?: (id: string, expanded: boolean) => void;
  /** 빈 상태 표시. */
  emptyState?: ReactNode;
  className?: string;
  'data-uid'?: string;
}
