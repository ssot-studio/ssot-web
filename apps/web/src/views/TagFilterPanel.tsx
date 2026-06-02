import { NAMESPACE_LABELS, type TagNamespaceGroup } from '@/domain/tags';
import { namespaceColorVar } from '@/lib/tokens';
import { Badge } from '@/components/Badge';

export interface TagFilterPanelProps {
  /** 네임스페이스별 태그 그룹 (domain/tags.ts 의 collectTagGroups 결과). */
  groups: TagNamespaceGroup[];
  /** 카탈로그 전체 노드 수 (초기화 시 표시용). */
  totalCount: number;
  /** 선택된 태그 raw("namespace:value") 집합. */
  selected: ReadonlySet<string>;
  onToggle: (raw: string) => void;
  onClear: () => void;
  /** 현재 필터 통과 노드 수 (null = 필터 비활성, 전체). */
  matchedCount: number | null;
}

/**
 * 태그 네임스페이스 필터.
 *  - 네임스페이스별 섹션 → 각 태그를 칩(Badge)으로 토글.
 *  - 같은 네임스페이스 내 OR, 네임스페이스 간 AND (domain/tags.ts 가 판정).
 */
export function TagFilterPanel({
  groups,
  totalCount,
  selected,
  onToggle,
  onClear,
  matchedCount,
}: TagFilterPanelProps): React.JSX.Element {
  const active = selected.size > 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[var(--foreground-subtle)]">
          같은 그룹은 OR · 다른 그룹은 AND
        </span>
        {active && (
          <button
            type="button"
            onClick={onClear}
            className="text-[10px] text-[var(--foreground-subtle)] underline-offset-2 hover:text-foreground hover:underline"
          >
            초기화 ({matchedCount ?? totalCount}개)
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {groups.map((group) => {
          const accent = namespaceColorVar(group.namespace);
          return (
            <div key={group.namespace}>
              <div className="mb-1 flex items-center gap-1">
                <span className="size-1.5 rounded-full" style={{ background: accent }} aria-hidden />
                <span className="text-[10px] uppercase tracking-wide text-[var(--foreground-subtle)]">
                  {NAMESPACE_LABELS[group.namespace] ?? group.namespace}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {group.tags.map((tag) => {
                  const on = selected.has(tag.raw);
                  return (
                    <button
                      key={tag.raw}
                      type="button"
                      onClick={() => onToggle(tag.raw)}
                      aria-pressed={on}
                      title={`${tag.raw} · ${tag.count}개 노드`}
                    >
                      <Badge accent={accent} tone={on ? 'soft' : 'outline'} size="xs" dot={on}>
                        {tag.value}
                        <span className="ml-0.5 text-[var(--foreground-subtle)]">{tag.count}</span>
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
