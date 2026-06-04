import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router';
import { RootLayout } from '@/RootLayout';
import { ViewPage } from '@/ViewPage';
import { buildIndex, catalogUrl, detectStructure } from '@/domain/catalog';
import type { Catalog } from '@/domain/types';

export type ViewName = 'graph' | 'tree' | 'matrix';
const VALID_VIEWS: readonly ViewName[] = ['graph', 'tree', 'matrix'];

export type LayoutDir = 'LR' | 'TB';

/**
 * /$view 의 URL 검색 파라미터 — 필터·그래프 뷰 상태의 단일 진실(SoT).
 * 컴포넌트 로컬 state 가 아니라 URL 이 진실이므로 새로고침·공유·뒤로가기가 그대로 복원된다.
 * 기본값과 같은 값은 URL 에 싣지 않는다(undefined) → 기본 URL(`/graph`)은 깨끗하게 유지.
 */
export interface ViewSearch {
  /** 선택된 노드(상세 패널). */
  node?: string;
  /** 선택된 태그 raw("ns:value") — 태그 필터(모든 뷰 공통). */
  tags?: string[];
  /** 숨긴 노드 kind — 그래프 kind 필터(없음 = 전체 표시). */
  hideKinds?: string[];
  /** 그래프 레이아웃 방향(기본 'LR'). */
  dir?: LayoutDir;
  /** 포커스 모드 — 선택 노드 1-hop 강조(기본 true; off 일 때만 false 로 실림). */
  focus?: boolean;
  /** ego-graph 탐색 깊이 1~4(기본 1). */
  depth?: number;
}

/** 검색 파라미터의 문자열 배열 필드를 정규화 — 비어 있으면 undefined(=URL 에서 제거). */
function strArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const arr = v.filter((x): x is string => typeof x === 'string');
  return arr.length ? arr : undefined;
}

const rootRoute = createRootRoute({ component: RootLayout });

// 인덱스(/) — 카탈로그 형상을 판별해 추천 뷰로 자동 redirect(구조 자동 라우팅).
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  loader: async () => {
    const res = await fetch(catalogUrl());
    if (!res.ok) throw new Error(`카탈로그 로드 실패: ${res.status}`);
    const index = buildIndex((await res.json()) as Catalog);
    const recommended = detectStructure(index).recommended;
    throw redirect({ to: '/$view', params: { view: recommended } });
  },
});

const viewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/$view',
  parseParams: (params): { view: ViewName } => {
    const v = params.view as ViewName;
    return { view: VALID_VIEWS.includes(v) ? v : 'graph' };
  },
  validateSearch: (search: Record<string, unknown>): ViewSearch => {
    const depthRaw = Number(search.depth);
    const depth =
      Number.isFinite(depthRaw) && depthRaw >= 1 && depthRaw <= 4 ? Math.floor(depthRaw) : undefined;
    return {
      node: typeof search.node === 'string' ? search.node : undefined,
      tags: strArray(search.tags),
      hideKinds: strArray(search.hideKinds),
      dir: search.dir === 'TB' || search.dir === 'LR' ? search.dir : undefined,
      focus: typeof search.focus === 'boolean' ? search.focus : undefined,
      depth,
    };
  },
  component: ViewPage,
});

const routeTree = rootRoute.addChildren([indexRoute, viewRoute]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
