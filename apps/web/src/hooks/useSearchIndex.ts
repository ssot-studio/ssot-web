import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type MiniSearch from 'minisearch';
import { nodeDocUrl } from '@/domain/catalog';
import { parseNodeDoc } from '@/domain/frontmatter';
import { buildSearchIndex, type SearchDoc } from '@/domain/search';
import type { CatalogIndex } from '@/domain/catalog';

/** 카탈로그의 모든 노드 .md 를 로딩해 SearchDoc[] 로 만든다 (실패 노드는 본문 없이 포함). */
async function loadSearchDocs(index: CatalogIndex): Promise<SearchDoc[]> {
  return Promise.all(
    index.catalog.nodes.map(async (node): Promise<SearchDoc> => {
      try {
        const res = await fetch(nodeDocUrl(node.file));
        if (!res.ok) return { node, frontmatter: {}, body: '' };
        const parsed = parseNodeDoc(node.id, await res.text());
        return { node, frontmatter: parsed.frontmatter, body: parsed.body };
      } catch {
        // 개별 노드 로드 실패는 검색 전체를 막지 않는다 — 카탈로그 요약만으로 인덱싱.
        return { node, frontmatter: {}, body: '' };
      }
    }),
  );
}

/**
 * 전문 검색 인덱스. enabled 일 때만 모든 노드 .md 를 로딩·색인한다
 * (초기 페이지 로드에 전체 문서를 끌어오지 않도록 lazy — 검색창 활성 시 1회 빌드 후 캐시).
 */
export function useSearchIndex(
  index: CatalogIndex | undefined,
  enabled: boolean,
): UseQueryResult<MiniSearch> {
  return useQuery({
    queryKey: ['ssot', 'searchIndex', index?.catalog.generatedFrom, index?.catalog.nodes.length],
    enabled: Boolean(index) && enabled,
    staleTime: Infinity,
    queryFn: async () => buildSearchIndex(await loadSearchDocs(index!)),
  });
}
