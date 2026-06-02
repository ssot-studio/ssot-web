import { Fragment, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

// SSOT 본문 마크다운 렌더 + 본문 내 평문 노드 id(예: concept.agent) 링크화.
// react-markdown 이 만든 텍스트 노드를 후처리해 알려진 id 를 클릭 가능 링크로 치환한다.

export interface MarkdownProps {
  source: string;
  /** 링크화 대상이 되는 알려진 노드 id 집합. */
  knownIds: Set<string>;
  /** 노드 id 클릭 시 이동. */
  onNavigate: (id: string) => void;
}

// id 패턴: kind.slug (점 포함 소문자/숫자/하이픈). 단어 경계로 매칭.
const ID_PATTERN = /\b([a-z]+(?:\.[a-z0-9-]+)+)\b/g;

function linkify(
  text: string,
  knownIds: Set<string>,
  onNavigate: (id: string) => void,
): ReactNode {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  for (const match of text.matchAll(ID_PATTERN)) {
    const candidate = match[1];
    const start = match.index ?? 0;
    if (!knownIds.has(candidate)) continue;
    if (start > lastIndex) parts.push(<Fragment key={key++}>{text.slice(lastIndex, start)}</Fragment>);
    parts.push(
      <button
        key={key++}
        type="button"
        className="text-[var(--primary)] underline underline-offset-2 hover:opacity-80"
        onClick={() => onNavigate(candidate)}
      >
        {candidate}
      </button>,
    );
    lastIndex = start + candidate.length;
  }
  if (lastIndex < text.length) parts.push(<Fragment key={key++}>{text.slice(lastIndex)}</Fragment>);
  return parts.length ? parts : text;
}

function processChildren(
  children: ReactNode,
  knownIds: Set<string>,
  onNavigate: (id: string) => void,
): ReactNode {
  if (typeof children === 'string') return linkify(children, knownIds, onNavigate);
  if (Array.isArray(children)) {
    return children.map((child, i) =>
      typeof child === 'string' ? (
        <Fragment key={i}>{linkify(child, knownIds, onNavigate)}</Fragment>
      ) : (
        child
      ),
    );
  }
  return children;
}

export function Markdown({ source, knownIds, onNavigate }: MarkdownProps): React.JSX.Element {
  const components: Components = {
    p: ({ children }) => <p>{processChildren(children, knownIds, onNavigate)}</p>,
    li: ({ children }) => <li>{processChildren(children, knownIds, onNavigate)}</li>,
    // 인라인 code 안의 id 도 링크화(본문에 `concept.x` 형태로 자주 등장).
    code: ({ children }) => <code>{processChildren(children, knownIds, onNavigate)}</code>,
  };
  return (
    <div className="ssot-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
