import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { nodeDocUrl } from '@/domain/catalog';
import { parseNodeDoc } from '@/domain/frontmatter';
import type { NodeDoc } from '@/domain/types';

async function fetchNodeDoc(id: string, file: string): Promise<NodeDoc> {
  const res = await fetch(nodeDocUrl(file));
  if (!res.ok) throw new Error(`노드 문서 로드 실패(${id}): ${res.status}`);
  const raw = await res.text();
  return parseNodeDoc(id, raw);
}

export function useNodeDoc(
  id: string | null,
  file: string | undefined,
): UseQueryResult<NodeDoc> {
  return useQuery({
    queryKey: ['ssot', 'node', id],
    queryFn: () => fetchNodeDoc(id!, file!),
    enabled: Boolean(id && file),
    staleTime: Infinity,
  });
}
