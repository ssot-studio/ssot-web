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

export interface NodeSearch {
  node?: string;
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
  validateSearch: (search: Record<string, unknown>): NodeSearch => ({
    node: typeof search.node === 'string' ? search.node : undefined,
  }),
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
