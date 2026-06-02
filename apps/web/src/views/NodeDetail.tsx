import { useMemo } from 'react';
import type { CatalogIndex } from '@/domain/catalog';
import {
  KIND_LABELS,
  REL_LABELS,
  type CatalogNode,
  type Confidence,
  type NodeFrontmatter,
  type RelatesToRef,
} from '@/domain/types';
import { useNodeDoc } from '@/hooks/useNodeDoc';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Markdown } from '@/components/Markdown';
import { confidenceColorVar, kindColorVar, relColorVar } from '@/lib/tokens';

export interface NodeDetailProps {
  index: CatalogIndex;
  node: CatalogNode;
  onNavigate: (id: string) => void;
  onClose?: () => void;
}

// frontmatter 관계 필드 → string[] 정규화 (relatesTo 는 {to,...} 객체 배열).
const RELATION_FIELDS = [
  'realizedBy',
  'dependsOn',
  'governs',
  'governedBy',
  'impacts',
  'servesPersona',
  'consumesApi',
  'providesApi',
  'integratesWith',
  'decidedBy',
  'supersedes',
  'implementedIn',
  'crossesBoundary',
] as const;

const MEANING_FIELDS = [
  ['definition', '정의'],
  ['purpose', '목적'],
  ['value', '가치'],
  ['authority', '권위'],
  ['source', '출처'],
] as const;

export function NodeDetail({ index, node, onNavigate, onClose }: NodeDetailProps): React.JSX.Element {
  const docQuery = useNodeDoc(node.id, node.file);
  const knownIds = useMemo(() => new Set(index.nodeById.keys()), [index]);

  const fm: NodeFrontmatter = docQuery.data?.frontmatter ?? {};

  return (
    <div className="flex h-full flex-col bg-[var(--surface)]">
      {/* 정체성 헤더 */}
      <header className="flex items-start gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <Badge accent={kindColorVar(node.kind)} tone="soft" dot>
              {KIND_LABELS[node.kind]}
            </Badge>
            <ConfidenceBadge confidence={node.confidence} />
            <Badge tone="outline" size="xs">
              {node.lifecycle}
            </Badge>
          </div>
          <h2 className="truncate text-base font-semibold text-foreground" title={node.title}>
            {node.title}
          </h2>
          <code className="text-xs text-[var(--foreground-subtle)]">{node.id}</code>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="닫기">
            ✕
          </Button>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {/* 의미 축 */}
        {MEANING_FIELDS.map(([key, label]) => {
          const v = fm[key];
          if (typeof v !== 'string' || !v) return null;
          return (
            <section key={key} className="mb-3">
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
                {label}
              </h3>
              <p className="text-sm leading-relaxed text-foreground">{v}</p>
            </section>
          );
        })}

        {/* 관계 축 */}
        <RelationGroups fm={fm} index={index} onNavigate={onNavigate} />

        {/* 본문 */}
        <section className="mt-4 border-t border-border pt-3">
          {docQuery.isLoading && <p className="text-sm text-[var(--foreground-muted)]">본문 로딩 중…</p>}
          {docQuery.isError && (
            <p className="text-sm text-[var(--confidence-unverified)]">본문을 불러오지 못했습니다.</p>
          )}
          {docQuery.data?.body && (
            <Markdown source={docQuery.data.body} knownIds={knownIds} onNavigate={onNavigate} />
          )}
        </section>

        {/* 메타 축 */}
        <section className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs">
          <Meta label="owner" value={node.owner} />
          <Meta label="lifecycle" value={node.lifecycle} />
          <Meta label="confidence" value={node.confidence} />
          <Meta label="lastVerified" value={node.lastVerified} />
        </section>
      </div>
    </div>
  );
}

function RelationGroups({
  fm,
  index,
  onNavigate,
}: {
  fm: NodeFrontmatter;
  index: CatalogIndex;
  onNavigate: (id: string) => void;
}): React.JSX.Element | null {
  const groups: { rel: string; refs: RelatesToRef[] }[] = [];

  if (fm.relatesTo?.length) {
    groups.push({ rel: 'relatesTo', refs: fm.relatesTo });
  }
  for (const field of RELATION_FIELDS) {
    const arr = fm[field];
    if (Array.isArray(arr) && arr.length) {
      groups.push({ rel: field, refs: arr.map((to) => ({ to: String(to) })) });
    }
  }
  if (!groups.length) return null;

  return (
    <section className="mb-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
        관계
      </h3>
      <div className="space-y-2">
        {groups.map(({ rel, refs }) => (
          <div key={rel}>
            <div className="mb-1 flex items-center gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{ background: relColorVar(rel) }}
                aria-hidden
              />
              <span className="text-xs font-medium text-[var(--foreground-muted)]">
                {REL_LABELS[rel] ?? rel}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {refs.map((ref, i) => (
                <RelChip key={`${ref.to}-${i}`} ref={ref} index={index} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RelChip({
  ref,
  index,
  onNavigate,
}: {
  ref: RelatesToRef;
  index: CatalogIndex;
  onNavigate: (id: string) => void;
}): React.JSX.Element {
  const target = index.nodeById.get(ref.to);
  const label = target?.title ?? ref.to;
  const title = [ref.type && `유형: ${ref.type}`, ref.note && `메모: ${ref.note}`, !target && '(외부/미등록)']
    .filter(Boolean)
    .join(' · ');

  if (!target) {
    return (
      <span
        className="inline-flex items-center rounded-md border border-dashed border-border px-2 py-0.5 text-xs text-[var(--foreground-subtle)]"
        title={title || undefined}
      >
        {label}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onNavigate(ref.to)}
      title={title || undefined}
      className="inline-flex items-center gap-1 rounded-md border border-border bg-[var(--surface-raised)] px-2 py-0.5 text-xs text-foreground transition-colors hover:border-[var(--primary)] hover:bg-[var(--surface-hover)]"
    >
      <span className="size-1.5 rounded-full" style={{ background: kindColorVar(target.kind) }} aria-hidden />
      {label}
      {ref.type && <span className="text-[var(--foreground-subtle)]">· {ref.type}</span>}
    </button>
  );
}

function ConfidenceBadge({ confidence }: { confidence: Confidence }): React.JSX.Element {
  return (
    <Badge accent={confidenceColorVar(confidence)} tone="soft" size="xs">
      {confidence}
    </Badge>
  );
}

function Meta({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex flex-col">
      <span className="text-[var(--foreground-subtle)]">{label}</span>
      <span className="text-foreground">{value || '—'}</span>
    </div>
  );
}
