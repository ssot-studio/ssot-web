import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useCatalog } from '@/hooks/useCatalog';
import { detectStructure, type CatalogIndex } from '@/domain/catalog';
import { collectTagGroups, filterNodeIds } from '@/domain/tags';
import { NodeDetail } from '@/views/NodeDetail';
import { TagFilterPanel } from '@/views/TagFilterPanel';
import { useResizablePanel } from '@/hooks/useResizablePanel';
import { useDraggablePanel } from '@/hooks/useDraggablePanel';
import type { ViewName } from '@/router';

// 뷰 컴포넌트는 지연 로딩 — 가장 무거운 의존성(react-flow/dagre)은 그래프 뷰를 실제로 열 때만
// 끌어온다. 트리·표가 추천 뷰인 카탈로그는 react-flow 를 아예 받지 않아 초기 로드가 가볍다.
const GraphViewer = lazy(() =>
  import('@/views/GraphViewer').then((m) => ({ default: m.GraphViewer })),
);
const TreeViewer = lazy(() => import('@/views/TreeViewer').then((m) => ({ default: m.TreeViewer })));
const MatrixViewer = lazy(() =>
  import('@/views/MatrixViewer').then((m) => ({ default: m.MatrixViewer })),
);

export function ViewPage(): React.JSX.Element {
  const { view } = useParams({ from: '/$view' });
  const { node: selectedId, tags } = useSearch({ from: '/$view' });
  const navigate = useNavigate();
  const query = useCatalog();
  const { width, startDrag } = useResizablePanel();
  const filterDrag = useDraggablePanel('ssot.tagFilterPos');

  // 태그 필터 선택은 URL(?tags=...) 이 진실 — 뷰 전환·새로고침·공유 간 그대로 유지된다.
  const selectedTags = useMemo<ReadonlySet<string>>(() => new Set(tags ?? []), [tags]);
  const toggleTag = useCallback(
    (raw: string) => {
      navigate({
        to: '/$view',
        params: { view },
        search: (prev) => {
          const next = new Set(prev.tags ?? []);
          if (next.has(raw)) next.delete(raw);
          else next.add(raw);
          const arr = [...next];
          return { ...prev, tags: arr.length ? arr : undefined };
        },
      });
    },
    [navigate, view],
  );
  const clearTags = useCallback(
    () => navigate({ to: '/$view', params: { view }, search: (prev) => ({ ...prev, tags: undefined }) }),
    [navigate, view],
  );

  // 우측 상세 패널 접기/펼치기. 기본은 닫힘 — 진입 시 그래프가 전체 폭을 쓰도록.
  // 노드를 선택하면(그래프 클릭/검색/딥링크) 자동으로 펼쳐 상세를 보여준다.
  const [panelOpen, setPanelOpen] = useState(false);
  useEffect(() => {
    if (selectedId) setPanelOpen(true);
  }, [selectedId]);

  // 노드 선택 = search param 갱신(딥링크/뒤로가기 호환). 기존 필터(tags 등)는 보존한다.
  const selectNode = useCallback(
    (id: string) => {
      navigate({ to: '/$view', params: { view }, search: (prev) => ({ ...prev, node: id }) });
    },
    [navigate, view],
  );
  const closeDetail = useCallback(() => {
    navigate({ to: '/$view', params: { view }, search: (prev) => ({ ...prev, node: undefined }) });
  }, [navigate, view]);

  const tagGroups = useMemo(
    () => (query.data ? collectTagGroups(query.data.catalog.nodes) : []),
    [query.data],
  );
  const allowedIds = useMemo(
    () => (query.data ? filterNodeIds(query.data.catalog.nodes, selectedTags) : null),
    [query.data, selectedTags],
  );

  if (query.isLoading) {
    return <Centered>카탈로그 로딩 중…</Centered>;
  }
  if (query.isError || !query.data) {
    return <Centered tone="error">카탈로그를 불러오지 못했습니다.</Centered>;
  }

  const index = query.data;
  const selectedNode = selectedId ? (index.nodeById.get(selectedId) ?? null) : null;
  const signal = detectStructure(index);

  return (
    <div className="flex h-full">
      <section ref={filterDrag.containerRef} className="relative min-w-0 flex-1">
        <Suspense fallback={<Centered>뷰 로딩 중…</Centered>}>
          <ViewSwitch
            view={view}
            index={index}
            selectedId={selectedId ?? null}
            onNodeSelect={selectNode}
            allowedIds={allowedIds}
          />
        </Suspense>
        {tagGroups.length > 0 && (
          <div
            ref={filterDrag.panelRef}
            className="pointer-events-none absolute z-10 flex max-h-[calc(100%-1.5rem)] w-60 flex-col"
            style={
              filterDrag.position
                ? { left: filterDrag.position.x, top: filterDrag.position.y }
                : { right: 12, top: 12 }
            }
          >
            <details className="pointer-events-auto rounded-lg border border-border bg-[var(--surface)]/95 shadow-md backdrop-blur" open>
              <summary
                onPointerDown={filterDrag.startDrag}
                onClick={(e) => {
                  // 드래그 종료 클릭이 <details> 토글을 건드리지 않게 억제.
                  if (filterDrag.didDrag.current) e.preventDefault();
                }}
                className="flex cursor-grab list-none items-center justify-between gap-2 px-3 py-2 text-xs font-medium text-foreground select-none active:cursor-grabbing"
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-[var(--foreground-subtle)]" aria-hidden>⠿</span>
                  태그 필터
                </span>
                {allowedIds && (
                  <span className="rounded bg-[var(--surface-hover)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--foreground-muted)]">
                    {allowedIds.size}/{index.catalog.nodes.length}
                  </span>
                )}
              </summary>
              <div className="max-h-[60vh] overflow-y-auto border-t border-border px-3 py-2">
                <TagFilterPanel
                  groups={tagGroups}
                  totalCount={index.catalog.nodes.length}
                  selected={selectedTags}
                  onToggle={toggleTag}
                  onClear={clearTags}
                  matchedCount={allowedIds ? allowedIds.size : null}
                />
              </div>
            </details>
          </div>
        )}
      </section>
      {panelOpen ? (
        <>
          <div
            role="separator"
            aria-orientation="vertical"
            title="드래그하여 상세 패널 너비 조절"
            onPointerDown={startDrag}
            className="w-1 shrink-0 cursor-col-resize bg-border transition-colors hover:bg-primary"
          />
          <aside className="min-w-0 shrink-0 overflow-hidden" style={{ width }}>
            {selectedNode ? (
              <NodeDetail
                index={index}
                node={selectedNode}
                onNavigate={selectNode}
                onClose={closeDetail}
              />
            ) : (
              <EmptyDetail
                nodeCount={index.catalog.nodes.length}
                edgeCount={index.catalog.edges.length}
                recommendation={signal.reason}
                onCollapse={() => setPanelOpen(false)}
              />
            )}
          </aside>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          title="상세 패널 열기"
          aria-label="상세 패널 열기"
          className="flex w-6 shrink-0 cursor-pointer flex-col items-center justify-center gap-2 border-l border-border bg-[var(--surface)] text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-foreground"
        >
          <span aria-hidden>‹</span>
          <span aria-hidden className="text-[10px] [writing-mode:vertical-rl]">
            상세
          </span>
        </button>
      )}
    </div>
  );
}

function ViewSwitch({
  view,
  index,
  selectedId,
  onNodeSelect,
  allowedIds,
}: {
  view: ViewName;
  index: CatalogIndex;
  selectedId: string | null;
  onNodeSelect: (id: string) => void;
  allowedIds: Set<string> | null;
}): React.JSX.Element {
  const props = { index, selectedId, onNodeSelect, allowedIds };
  switch (view) {
    case 'tree':
      return <TreeViewer {...props} />;
    case 'matrix':
      return <MatrixViewer {...props} />;
    case 'graph':
    default:
      return <GraphViewer {...props} />;
  }
}

function EmptyDetail({
  nodeCount,
  edgeCount,
  recommendation,
  onCollapse,
}: {
  nodeCount: number;
  edgeCount: number;
  recommendation: string;
  onCollapse: () => void;
}): React.JSX.Element {
  return (
    <div className="flex h-full flex-col bg-[var(--surface)]">
      <div className="flex justify-end px-2 py-1.5">
        <button
          type="button"
          onClick={onCollapse}
          aria-label="상세 패널 닫기"
          title="상세 패널 닫기"
          className="rounded p-1 text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-foreground"
        >
          ✕
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <div className="text-sm font-medium text-foreground">노드를 선택하세요</div>
        <p className="text-xs text-[var(--foreground-muted)]">
          그래프·트리·표에서 노드를 클릭하면 4축(정체성/의미/관계/메타)과 본문을 봅니다.
        </p>
        <div className="mt-2 flex gap-3 text-xs text-[var(--foreground-subtle)]">
          <span>노드 {nodeCount}</span>
          <span>엣지 {edgeCount}</span>
        </div>
        <p className="mt-2 max-w-[280px] text-[11px] text-[var(--foreground-subtle)]">{recommendation}</p>
      </div>
    </div>
  );
}

function Centered({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: 'error';
}): React.JSX.Element {
  return (
    <div className="flex h-full items-center justify-center">
      <span
        className={tone === 'error' ? 'text-sm text-[var(--confidence-unverified)]' : 'text-sm text-[var(--foreground-muted)]'}
      >
        {children}
      </span>
    </div>
  );
}
