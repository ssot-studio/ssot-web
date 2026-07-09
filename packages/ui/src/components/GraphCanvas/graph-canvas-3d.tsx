import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { Text as TroikaText } from 'troika-three-text';
import type { Object3D } from 'three';
import { cn } from '@/lib';
import { useSemanticColors } from './use-semantic-color';
import { mixToward, normalizeToken } from './graph-color';
import type { GraphCanvasProps } from './graph-canvas.types';

// DS globals.css 가 :root 에 실제 등록하는 런타임 시맨틱 변수를 기본값으로 쓴다.
// (`--color-*` 는 Tailwind `@theme inline` 매핑이라 런타임 커스텀 프로퍼티로 등록되지 않아
//  getComputedStyle 로 조회하면 빈 문자열이다 — WebGL 색 해석에는 실제 변수를 써야 한다.)
const DEFAULT_BACKGROUND_TOKEN = '--background';
const DEFAULT_RING_TOKEN = '--ring';
const DEFAULT_LINK_TOKEN = '--muted-foreground';

/** dim 강도 — dim 대상 노드/링크 색을 배경 쪽으로 이만큼 보간한다. */
const NODE_DIM = 0.8;
const LINK_DIM = 0.85;

/** react-force-graph-3d 가 소비하는 내부 노드/링크 형태. */
interface FgNode {
  id: string;
  label: string;
  colorToken?: string;
}
interface FgLink {
  source: string | FgNode;
  target: string | FgNode;
  colorToken?: string;
}

function endpointId(end: string | FgNode): string {
  return typeof end === 'object' ? end.id : end;
}

/**
 * 도메인 무지 force-directed 3D 그래프 (react-force-graph-3d + three).
 *
 * - 노드/엣지 색: `colorToken`(시맨틱 토큰) → `useSemanticColors` 로 계산값 해석 (테마 라이브 반응).
 *   DS 는 kind 를 모른다 — 호출부가 kind→토큰 매핑을 소유하고 토큰 이름만 실어 보낸다.
 * - 라벨: troika-three-text `Text` 를 nodeThreeObject 로 실제 렌더 (제거/재생성 시 dispose).
 * - 선택: `selectedId` 노드는 ring 토큰 색으로 강조.
 * - focus: `focusNeighbors` + `selectedId` 시 1-hop 이웃만 강조하고 나머지를 배경 쪽으로 dim.
 * - 크기: ResizeObserver 로 컨테이너 크기 추적 (window 폴백 없음).
 * - 입력 보호: force-graph 가 link.source/target 을 노드 객체로 in-place 변형하므로
 *   호출자 데이터를 오염시키지 않도록 매 데이터마다 새 객체로 복제해 전달한다.
 */
export function GraphCanvas3D({
  nodes,
  edges,
  selectedId,
  onNodeSelect,
  focusNeighbors = false,
  backgroundToken = DEFAULT_BACKGROUND_TOKEN,
  ringToken = DEFAULT_RING_TOKEN,
  linkToken = DEFAULT_LINK_TOKEN,
  className,
}: Omit<GraphCanvasProps, 'emptyState' | 'data-uid'>): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef(new Map<string, TroikaText>());

  const bgKey = useMemo(() => normalizeToken(backgroundToken), [backgroundToken]);
  const ringKey = useMemo(() => normalizeToken(ringToken), [ringToken]);
  const linkKey = useMemo(() => normalizeToken(linkToken), [linkToken]);

  // 해석할 토큰 집합 = 고정 토큰(배경·ring·link) + 데이터가 실어온 distinct colorToken.
  const tokenList = useMemo(() => {
    const set = new Set<string>([bgKey, ringKey, linkKey]);
    for (const n of nodes) if (n.colorToken) set.add(normalizeToken(n.colorToken));
    for (const e of edges) if (e.colorToken) set.add(normalizeToken(e.colorToken));
    return [...set];
  }, [nodes, edges, bgKey, ringKey, linkKey]);

  // 시맨틱 토큰 해석 + 다크 토글/시스템 테마 변경에 라이브 반응.
  const colors = useSemanticColors(containerRef, tokenList);

  // 컨테이너 크기 추적 (width/height prop 없음 — 부모가 레이아웃 소유).
  const [measured, setMeasured] = useState<{ width: number; height: number } | null>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setMeasured({ width: el.clientWidth, height: el.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // deep-clone: force-graph 의 in-place mutation 으로부터 호출자 데이터 보호.
  const graphData = useMemo(
    () => ({
      nodes: nodes.map((n) => ({ id: n.id, label: n.label, colorToken: n.colorToken }) satisfies FgNode),
      links: edges.map(
        (e) => ({ source: e.source, target: e.target, colorToken: e.colorToken }) satisfies FgLink,
      ),
    }),
    [nodes, edges],
  );

  // focus 집합 — 선택 노드 + 직접 이웃(1-hop). null = focus 비활성.
  const focusSet = useMemo(() => {
    if (!focusNeighbors || !selectedId) return null;
    const set = new Set<string>([selectedId]);
    for (const e of edges) {
      if (e.source === selectedId) set.add(e.target);
      if (e.target === selectedId) set.add(e.source);
    }
    return set;
  }, [focusNeighbors, selectedId, edges]);

  // 제거된 노드의 troika Text 리소스 해제.
  useEffect(() => {
    const labels = labelsRef.current;
    const ids = new Set(graphData.nodes.map((n) => n.id));
    for (const [id, label] of labels) {
      if (!ids.has(id)) {
        label.dispose();
        labels.delete(id);
      }
    }
  }, [graphData]);

  // unmount 시 모든 troika Text 리소스 해제 (three 리소스 누수 방지).
  useEffect(() => {
    const labels = labelsRef.current;
    return () => {
      for (const label of labels.values()) label.dispose();
      labels.clear();
    };
  }, []);

  const nodeBaseColor = useCallback(
    (node: FgNode): string => {
      if (!colors) return '';
      const token = node.colorToken ? normalizeToken(node.colorToken) : linkKey;
      return colors[token] || colors[linkKey] || '';
    },
    [colors, linkKey],
  );

  const nodeColor = useCallback(
    (node: FgNode): string => {
      if (!colors) return '';
      if (selectedId !== undefined && node.id === selectedId) return colors[ringKey] || '';
      const base = nodeBaseColor(node);
      if (focusSet && !focusSet.has(node.id)) return mixToward(base, colors[bgKey] ?? '', NODE_DIM);
      return base;
    },
    [colors, selectedId, ringKey, bgKey, focusSet, nodeBaseColor],
  );

  const linkColor = useCallback(
    (link: FgLink): string => {
      if (!colors) return '';
      const token = link.colorToken ? normalizeToken(link.colorToken) : linkKey;
      const base = colors[token] || colors[linkKey] || '';
      if (focusSet) {
        const on = focusSet.has(endpointId(link.source)) && focusSet.has(endpointId(link.target));
        if (!on) return mixToward(base, colors[bgKey] ?? '', LINK_DIM);
      }
      return base;
    },
    [colors, linkKey, bgKey, focusSet],
  );

  // troika 라벨 — 기본 노드 구체 위에 얹는다(nodeThreeObjectExtend). 재생성 시 이전 인스턴스 dispose.
  const nodeThreeObject = useCallback(
    (node: FgNode): Object3D => {
      const previous = labelsRef.current.get(node.id);
      if (previous) previous.dispose();

      const dim = Boolean(focusSet && !focusSet.has(node.id));
      const base = nodeBaseColor(node);
      const label = new TroikaText();
      label.text = node.label;
      label.fontSize = 3;
      label.color = dim && colors ? mixToward(base, colors[bgKey] ?? '', NODE_DIM) : base;
      label.fillOpacity = dim ? 0.5 : 1;
      label.anchorX = 'center';
      label.anchorY = 'bottom';
      label.position.y = 6;
      label.sync();
      labelsRef.current.set(node.id, label);
      return label;
    },
    [colors, bgKey, focusSet, nodeBaseColor],
  );

  const handleNodeClick = useCallback(
    (node: FgNode) => {
      onNodeSelect?.(node.id);
    },
    [onNodeSelect],
  );

  // SSR 가드 — WebGL/window 없는 환경에서는 렌더하지 않는다.
  // (훅은 전부 위에서 무조건 호출되므로 rules-of-hooks 위반 없음)
  if (typeof window === 'undefined') return <div ref={containerRef} className={cn('h-full w-full', className)} />;

  return (
    <div ref={containerRef} className={cn('relative h-full w-full', className)}>
      {colors && colors[bgKey] && measured && (
        <ForceGraph3D<FgNode, FgLink>
          graphData={graphData}
          width={measured.width}
          height={measured.height}
          backgroundColor={colors[bgKey]}
          nodeColor={nodeColor}
          nodeLabel="label"
          nodeThreeObject={nodeThreeObject}
          nodeThreeObjectExtend
          linkColor={linkColor}
          linkOpacity={0.55}
          onNodeClick={handleNodeClick}
        />
      )}
    </div>
  );
}
