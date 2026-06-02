import type { HTMLAttributes, ReactNode } from 'react';

export interface DetailPanelRootProps extends HTMLAttributes<HTMLDivElement> {
  /** 내부 스크롤 + 남은 높이 채우기. 기본 true. */
  scroll?: boolean;
  children: ReactNode;
}

export interface DetailPanelHeaderProps {
  /** 주 제목. */
  title: ReactNode;
  /** 부제 (예: id). */
  subtitle?: ReactNode;
  /** 좌측 마커/아이콘. */
  leading?: ReactNode;
  /** 우측 액션 슬롯. */
  actions?: ReactNode;
  /** 제목 하단 배지 행 (예: confidence/authority/lifecycle). */
  badges?: ReactNode;
  className?: string;
}

export interface DetailPanelSectionProps {
  /** 섹션 라벨 (예: 정의 / 관계 / 메타). */
  label?: ReactNode;
  children: ReactNode;
  className?: string;
}

export interface DetailPanelFieldProps {
  /** 항목 라벨. */
  label: ReactNode;
  /** 항목 값. */
  children: ReactNode;
  /** 라벨/값 배치. 기본 'row'. */
  layout?: 'row' | 'stack';
  className?: string;
}
