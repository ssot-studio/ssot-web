import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { buildIndex, catalogUrl, type CatalogIndex } from '@/domain/catalog';
import type { Catalog } from '@/domain/types';

async function fetchCatalog(): Promise<CatalogIndex> {
  const res = await fetch(catalogUrl());
  if (!res.ok) throw new Error(`카탈로그 로드 실패: ${res.status}`);
  const catalog = (await res.json()) as Catalog;
  return buildIndex(catalog);
}

export function useCatalog(): UseQueryResult<CatalogIndex> {
  return useQuery({
    queryKey: ['ssot', 'catalog'],
    queryFn: fetchCatalog,
    staleTime: Infinity,
  });
}
