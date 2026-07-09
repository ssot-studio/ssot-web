import { lazy, Suspense } from 'react';
import { cn } from '@/lib';
import type { GraphCanvasProps } from './graph-canvas.types';

// 무거운 peer(three, react-force-graph-3d, troika)는 이 dynamic import 로만 도달한다 —
// 구현 모듈(graph-canvas-3d)을 정적 재-export 하면 같은 청크로 병합되어 lazy 격리(SCN-1)가
// 무산되므로, 오직 여기서만 import 한다.
const LazyGraphCanvas3D = lazy(() =>
  import('./graph-canvas-3d').then((m) => ({ default: m.GraphCanvas3D })),
);

function GraphFallback({ className }: { className?: string }): React.JSX.Element {
  return <div aria-hidden className={cn('h-full w-full animate-pulse bg-(--graph-bg)', className)} />;
}

/**
 * 도메인 무지 force-directed 3D 그래프 컴포넌트 (WebGL).
 *
 * 무거운 3D peer 는 lazy 경계 뒤에서만 로드되므로, 그래프 뷰를 실제로 열 때만 청크가 내려온다.
 * 색은 kind 가 아니라 노드/엣지의 `colorToken`(시맨틱 토큰)으로만 받아 `useSemanticColors` 로
 * 계산값 해석한다 — 라이트/다크 라이브 반응, hex 하드코딩 없음. kind→토큰 매핑은 호출부 책임.
 */
export function GraphCanvas({
  className,
  'data-uid': dataUid,
  emptyState,
  nodes,
  ...rest
}: GraphCanvasProps): React.JSX.Element {
  if (nodes.length === 0) {
    return (
      <div
        data-uid={dataUid}
        className={cn(
          'flex h-full w-full items-center justify-center bg-(--graph-bg) text-sm text-muted-foreground',
          className,
        )}
      >
        {emptyState ?? 'No graph data'}
      </div>
    );
  }

  return (
    <div data-uid={dataUid} className={cn('h-full w-full', className)}>
      <Suspense fallback={<GraphFallback className={className} />}>
        <LazyGraphCanvas3D nodes={nodes} {...rest} />
      </Suspense>
    </div>
  );
}
