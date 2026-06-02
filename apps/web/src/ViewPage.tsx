import { useCallback } from 'react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useCatalog } from '@/hooks/useCatalog';
import { detectStructure, type CatalogIndex } from '@/domain/catalog';
import { GraphViewer } from '@/views/GraphViewer';
import { TreeViewer } from '@/views/TreeViewer';
import { MatrixViewer } from '@/views/MatrixViewer';
import { NodeDetail } from '@/views/NodeDetail';
import { useResizablePanel } from '@/hooks/useResizablePanel';
import type { ViewName } from '@/router';

export function ViewPage(): React.JSX.Element {
  const { view } = useParams({ from: '/$view' });
  const { node: selectedId } = useSearch({ from: '/$view' });
  const navigate = useNavigate();
  const query = useCatalog();
  const { width, startDrag } = useResizablePanel();

  // 노드 선택 = search param 갱신(딥링크/뒤로가기 호환). 뷰 전환 시 선택 유지.
  const selectNode = useCallback(
    (id: string) => {
      navigate({ to: '/$view', params: { view }, search: { node: id } });
    },
    [navigate, view],
  );
  const closeDetail = useCallback(() => {
    navigate({ to: '/$view', params: { view }, search: {} });
  }, [navigate, view]);

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
      <section className="min-w-0 flex-1">
        <ViewSwitch view={view} index={index} selectedId={selectedId ?? null} onNodeSelect={selectNode} />
      </section>
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
          />
        )}
      </aside>
    </div>
  );
}

function ViewSwitch({
  view,
  index,
  selectedId,
  onNodeSelect,
}: {
  view: ViewName;
  index: CatalogIndex;
  selectedId: string | null;
  onNodeSelect: (id: string) => void;
}): React.JSX.Element {
  const props = { index, selectedId, onNodeSelect };
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
}: {
  nodeCount: number;
  edgeCount: number;
  recommendation: string;
}): React.JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 bg-[var(--surface)] p-6 text-center">
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
