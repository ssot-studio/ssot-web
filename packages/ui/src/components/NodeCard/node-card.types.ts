import type { ReactNode } from 'react';
import type { BadgeTone } from '@/components/Badge';

/** 좌측 액센트 바 톤. 도메인 kind 색상은 호출부가 톤으로 매핑한다. */
export type NodeCardTone = BadgeTone;

export interface NodeCardProps {
  /** 주 제목 (예: 노드 title). */
  title: ReactNode;
  /** 식별자/카테고리 등 부제 (예: id 또는 kind 라벨). */
  subtitle?: ReactNode;
  /** 한 줄 요약/설명. */
  description?: ReactNode;
  /** 좌측 액센트 바 톤. 미지정 시 중립. */
  tone?: NodeCardTone;
  /** 우상단 배지 슬롯 (예: confidence/authority Badge 들). */
  badges?: ReactNode;
  /** 하단 메타 슬롯 (예: owner / lastVerified / 관계 수). */
  meta?: ReactNode;
  /** 좌측 아이콘/마커 슬롯. */
  leading?: ReactNode;
  /** 선택 상태. */
  selected?: boolean;
  /** 클릭 시 호출. 지정되면 카드가 버튼처럼 동작(키보드 접근 포함). */
  onSelect?: () => void;
  /** 레이아웃 밀도. 기본 'comfortable'. */
  density?: 'compact' | 'comfortable';
  className?: string;
  'data-uid'?: string;
}
