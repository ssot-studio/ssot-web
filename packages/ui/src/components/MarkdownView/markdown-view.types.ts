export interface MarkdownViewProps {
  /** 마크다운 원문. */
  children: string;
  /**
   * 링크 클릭 가로채기 (선택). href 를 받아 내부 라우팅으로 처리할지 결정한다.
   * true 를 반환하면 기본 네비게이션을 막는다(preventDefault). 도메인 id 링크 이동 등에 사용.
   */
  onLinkClick?: (href: string) => boolean | void;
  /** 본문 폭/타이포 밀도. 기본 'comfortable'. */
  density?: 'compact' | 'comfortable';
  className?: string;
  'data-uid'?: string;
}
