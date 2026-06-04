import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useCatalog } from '@/hooks/useCatalog';
import { useSearchIndex } from '@/hooks/useSearchIndex';
import { searchNodes, type SearchHit } from '@/domain/search';
import { KIND_LABELS } from '@/domain/types';
import type { ViewName } from '@/router';

const FIELD_LABELS: Record<string, string> = {
  title: '제목',
  idText: 'ID',
  tags: '태그',
  kindLabel: '종류',
  owner: '담당',
  definition: '정의',
  purpose: '목적',
  value: '가치',
  authority: '근거',
  source: '출처',
  body: '본문',
};

/**
 * 전역 전문 검색창 — 헤더에 상주.
 *  - 첫 포커스 시에만 본문 인덱스를 lazy 빌드 (초기 로드 비용 0).
 *  - 결과 클릭/Enter → 현재 뷰에 node=id 딥링크로 선택.
 *  - 키보드: ↑/↓ 이동, Enter 선택, Esc 닫기.
 */
export function SearchBox(): React.JSX.Element {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const view = ((params as { view?: ViewName }).view ?? 'graph') as ViewName;

  const catalog = useCatalog();
  const [activated, setActivated] = useState(false);
  const search = useSearchIndex(catalog.data, activated);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const hits: SearchHit[] = useMemo(() => {
    if (!search.data || !catalog.data || !query.trim()) return [];
    return searchNodes(search.data, catalog.data.nodeById, query);
  }, [search.data, catalog.data, query]);

  useEffect(() => setActive(0), [query]);

  // 바깥 클릭 시 닫기.
  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent): void {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [open]);

  const select = useCallback(
    (hit: SearchHit | undefined): void => {
      if (!hit) return;
      navigate({ to: '/$view', params: { view }, search: { node: hit.node.id } });
      setOpen(false);
      setQuery('');
    },
    [navigate, view],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((i) => Math.min(hits.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        select(hits[active]);
      } else if (e.key === 'Escape') {
        setOpen(false);
        (e.target as HTMLInputElement).blur();
      }
    },
    [hits, active, select],
  );

  const showPanel = open && query.trim().length > 0;

  return (
    <div ref={rootRef} className="relative w-64">
      <input
        type="search"
        value={query}
        placeholder="검색 (제목·본문·태그…)"
        aria-label="SSOT 전문 검색"
        autoComplete="off"
        onFocus={() => {
          setActivated(true);
          setOpen(true);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className="h-7 w-full rounded-md border border-border bg-[var(--surface)] px-2.5 text-xs text-foreground placeholder:text-[var(--foreground-subtle)] focus:border-primary focus:outline-none"
      />

      {showPanel && (
        <div className="absolute left-0 top-full z-30 mt-1 max-h-[70vh] w-[22rem] overflow-y-auto rounded-lg border border-border bg-[var(--surface)] shadow-lg">
          {search.isLoading ? (
            <div className="px-3 py-3 text-xs text-[var(--foreground-muted)]">본문 색인 중…</div>
          ) : search.isError ? (
            <div className="px-3 py-3 text-xs text-[var(--confidence-unverified)]">색인 실패</div>
          ) : hits.length === 0 ? (
            <div className="px-3 py-3 text-xs text-[var(--foreground-muted)]">결과 없음</div>
          ) : (
            <ul role="listbox">
              {hits.map((hit, i) => (
                <li key={hit.node.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => select(hit)}
                    className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left ${
                      i === active ? 'bg-[var(--surface-hover)]' : ''
                    }`}
                  >
                    <span className="flex w-full items-center gap-2">
                      <span className="truncate text-xs font-medium text-foreground">{hit.node.title}</span>
                      <span className="ml-auto shrink-0 rounded bg-[var(--surface-hover)] px-1.5 py-0.5 text-[10px] text-[var(--foreground-muted)]">
                        {KIND_LABELS[hit.node.kind] ?? hit.node.kind}
                      </span>
                    </span>
                    <span className="flex w-full items-center gap-1.5">
                      <span className="truncate font-mono text-[10px] text-[var(--foreground-subtle)]">
                        {hit.node.id}
                      </span>
                      {hit.fields.length > 0 && (
                        <span className="ml-auto shrink-0 text-[10px] text-[var(--foreground-subtle)]">
                          {hit.fields.map((f) => FIELD_LABELS[f] ?? f).join(' · ')}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
