import type { ReactNode } from 'react';

/**
 * 시맨틱 톤. 도메인 어휘(confidence/authority/kind)를 직접 받지 않는다.
 * 호출부가 도메인 값을 톤으로 매핑한다 (예: confidence=unverified → tone='warning').
 */
export type BadgeTone =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'accent';

/** 시각 표현 방식. */
export type BadgeVariant = 'solid' | 'soft' | 'outline' | 'dot';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  /** 시맨틱 톤. 기본 'neutral'. */
  tone?: BadgeTone;
  /** 표현 방식. 기본 'soft'. */
  variant?: BadgeVariant;
  /** 크기. 기본 'md'. */
  size?: BadgeSize;
  /** 라벨 텍스트/노드. */
  children: ReactNode;
  /** 선행 아이콘/마커 슬롯 (선택). */
  leading?: ReactNode;
  className?: string;
  'data-uid'?: string;
}
