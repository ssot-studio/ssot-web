import { useMemo } from 'react';
import type { MouseEvent } from 'react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib';
import type { MarkdownViewProps } from './markdown-view.types';

/**
 * 토큰 스타일을 적용한 마크다운 렌더러 (react-markdown + remark-gfm).
 * 모든 요소는 시맨틱 토큰을 참조하는 React 컴포넌트로 매핑된다 (raw HTML 주입 없음).
 * 도메인 무지 — 원문 문자열만 받는다. 내부 id 링크화는 호출부가 원문 가공으로 처리하고,
 * 클릭 가로채기는 onLinkClick 으로 위임받는다.
 */
export function MarkdownView({
  children,
  onLinkClick,
  density = 'comfortable',
  className,
  'data-uid': dataUid,
}: MarkdownViewProps): React.JSX.Element {
  const gap = density === 'compact' ? 'space-y-2' : 'space-y-3';

  const components = useMemo<Components>(
    () => ({
      h1: ({ node: _node, ...props }) => (
        <h1 className="mt-4 mb-2 text-lg font-semibold text-(--markdown-heading-fg) first:mt-0" {...props} />
      ),
      h2: ({ node: _node, ...props }) => (
        <h2 className="mt-4 mb-2 text-base font-semibold text-(--markdown-heading-fg) first:mt-0" {...props} />
      ),
      h3: ({ node: _node, ...props }) => (
        <h3 className="mt-3 mb-1.5 text-sm font-semibold text-(--markdown-heading-fg) first:mt-0" {...props} />
      ),
      h4: ({ node: _node, ...props }) => (
        <h4 className="mt-3 mb-1.5 text-sm font-medium text-(--markdown-heading-fg) first:mt-0" {...props} />
      ),
      p: ({ node: _node, ...props }) => (
        <p className="text-sm leading-relaxed text-(--markdown-fg)" {...props} />
      ),
      a: ({ node: _node, href, children: linkChildren, ...props }) => {
        const handleClick = (event: MouseEvent<HTMLAnchorElement>): void => {
          if (!href || !onLinkClick) return;
          const handled = onLinkClick(href);
          if (handled === true) event.preventDefault();
        };
        return (
          <a
            href={href}
            onClick={handleClick}
            className="font-medium text-(--markdown-link-fg) underline decoration-from-font underline-offset-2 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xs"
            {...props}
          >
            {linkChildren}
          </a>
        );
      },
      ul: ({ node: _node, ...props }) => (
        <ul className="ml-5 list-disc space-y-1 text-sm text-(--markdown-fg) marker:text-(--markdown-muted-fg)" {...props} />
      ),
      ol: ({ node: _node, ...props }) => (
        <ol className="ml-5 list-decimal space-y-1 text-sm text-(--markdown-fg) marker:text-(--markdown-muted-fg)" {...props} />
      ),
      li: ({ node: _node, ...props }) => <li className="leading-relaxed" {...props} />,
      blockquote: ({ node: _node, ...props }) => (
        <blockquote
          className="border-l-2 border-(--markdown-blockquote-border) pl-3 text-sm text-(--markdown-muted-fg) italic"
          {...props}
        />
      ),
      hr: ({ node: _node, ...props }) => (
        <hr className="border-(--markdown-border)" {...props} />
      ),
      code: ({ node: _node, className: codeClassName, ...props }) => {
        const isBlock = /language-/.test(codeClassName ?? '');
        return (
          <code
            className={cn(
              'rounded bg-(--markdown-code-bg) font-mono text-[0.85em] text-(--markdown-code-fg)',
              isBlock ? 'block' : 'px-1 py-0.5',
              codeClassName
            )}
            {...props}
          />
        );
      },
      pre: ({ node: _node, ...props }) => (
        <pre
          className="overflow-auto rounded-md border border-(--markdown-border) bg-(--markdown-pre-bg) p-3 text-xs leading-relaxed"
          {...props}
        />
      ),
      table: ({ node: _node, ...props }) => (
        <div className="overflow-auto rounded-md border border-(--markdown-border)">
          <table className="w-full border-collapse text-sm text-(--markdown-fg)" {...props} />
        </div>
      ),
      thead: ({ node: _node, ...props }) => (
        <thead className="bg-(--markdown-table-header-bg)" {...props} />
      ),
      th: ({ node: _node, ...props }) => (
        <th className="border-b border-(--markdown-border) px-3 py-1.5 text-left font-medium" {...props} />
      ),
      td: ({ node: _node, ...props }) => (
        <td className="border-b border-(--markdown-border) px-3 py-1.5 align-top" {...props} />
      ),
      strong: ({ node: _node, ...props }) => (
        <strong className="font-semibold text-(--markdown-heading-fg)" {...props} />
      ),
      em: ({ node: _node, ...props }) => <em className="italic" {...props} />,
    }),
    [onLinkClick]
  );

  return (
    <div data-uid={dataUid} className={cn(gap, 'text-(--markdown-fg)', className)}>
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </Markdown>
    </div>
  );
}
