import type { HTMLAttributes, ReactNode } from 'react';

export type PanelTone = 'surface' | 'raised' | 'sunken';
export type PanelPadding = 'none' | 'sm' | 'md' | 'lg';

export interface PanelRootProps extends HTMLAttributes<HTMLDivElement> {
  /** 배경 톤. 기본 'surface'. */
  tone?: PanelTone;
  /** 보더 표시. 기본 true. */
  bordered?: boolean;
  /** 그림자 표시. 기본 false. */
  elevated?: boolean;
  /** 내용이 넘칠 때 본문 영역만 스크롤되도록 컬럼 플렉스 + min-h-0 적용. 기본 false. */
  fill?: boolean;
  children: ReactNode;
}

export interface PanelHeaderProps extends HTMLAttributes<HTMLDivElement> {
  padding?: PanelPadding;
  /** 우측 액션 슬롯. */
  actions?: ReactNode;
  children: ReactNode;
}

export interface PanelBodyProps extends HTMLAttributes<HTMLDivElement> {
  padding?: PanelPadding;
  /** 본문이 남은 공간을 차지하고 내부 스크롤. 기본 false. */
  scroll?: boolean;
  children: ReactNode;
}

export interface PanelFooterProps extends HTMLAttributes<HTMLDivElement> {
  padding?: PanelPadding;
  children: ReactNode;
}
