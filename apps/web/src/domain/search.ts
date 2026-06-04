// 전문(full-text) 검색 — MiniSearch 역색인 + 한글 인지 토크나이저.
// 카탈로그 요약 필드(title/id/kind/tags/owner) + 노드 본문(의미 4축 + 마크다운 body)을 인덱싱한다.
// 순수 모듈 — React 무관 (core 로 승격 가능한 형태). 데이터 무관: 특정 프로젝트 가정 없음.

import MiniSearch, { type SearchResult } from 'minisearch';
import type { CatalogNode, NodeFrontmatter } from './types';
import { KIND_LABELS } from './types';

/** 한 노드의 검색 입력 — 카탈로그 요약 + 파싱된 본문. */
export interface SearchDoc {
  node: CatalogNode;
  frontmatter: NodeFrontmatter;
  body: string;
}

/** 검색 결과 1건 — 카탈로그 노드 + 점수 + 매칭 필드. */
export interface SearchHit {
  node: CatalogNode;
  score: number;
  /** 매칭된 인덱스 필드명 목록 (예: ['title','body']). */
  fields: string[];
}

const CJK_RUN = /[가-힯぀-ヿ一-鿿豈-﫿]+/g;
const LATIN_RUN = /[a-z0-9]+/g;

/**
 * 한글/CJK 인지 토크나이저.
 *  - 라틴/숫자 런은 단어 토큰으로 (점·언더스코어 등 구분자에서 분할 — id 'domain.auth' → domain, auth).
 *  - CJK 런은 overlapping bigram 으로 (한국어는 공백 분절이 불안정 → bigram 이 부분일치·띄어쓰기 변형에 강함).
 *    1글자 런은 그대로 unigram.
 * 색인·질의에 같은 토크나이저를 써야 한다 (MiniSearch tokenize/searchOptions.tokenize 양쪽).
 */
export function tokenize(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const tokens: string[] = [];

  const latin = lower.match(LATIN_RUN);
  if (latin) tokens.push(...latin);

  const cjk = lower.match(CJK_RUN);
  if (cjk) {
    for (const run of cjk) {
      if (run.length === 1) {
        tokens.push(run);
      } else {
        for (let i = 0; i < run.length - 1; i++) tokens.push(run.slice(i, i + 2));
      }
    }
  }
  return tokens;
}

/** 인덱싱 대상 필드 (boost 가중치 순으로 의미 있게 나열). */
const INDEX_FIELDS = [
  'title',
  'idText',
  'tags',
  'kindLabel',
  'owner',
  'definition',
  'purpose',
  'value',
  'authority',
  'source',
  'body',
] as const;

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

interface IndexedDoc {
  id: string;
  title: string;
  idText: string;
  tags: string;
  kindLabel: string;
  owner: string;
  definition: string;
  purpose: string;
  value: string;
  authority: string;
  source: string;
  body: string;
}

function toIndexedDoc(d: SearchDoc): IndexedDoc {
  const fm = d.frontmatter;
  return {
    id: d.node.id,
    title: d.node.title,
    idText: d.node.id,
    tags: (d.node.tags ?? []).join(' '),
    kindLabel: `${d.node.kind} ${KIND_LABELS[d.node.kind] ?? ''}`,
    owner: d.node.owner ?? '',
    definition: str(fm.definition),
    purpose: str(fm.purpose),
    value: str(fm.value),
    authority: str(fm.authority),
    source: str(fm.source),
    body: d.body,
  };
}

/** SearchDoc[] → 질의 가능한 MiniSearch 인덱스. */
export function buildSearchIndex(docs: SearchDoc[]): MiniSearch<IndexedDoc> {
  const mini = new MiniSearch<IndexedDoc>({
    idField: 'id',
    fields: [...INDEX_FIELDS],
    tokenize,
    processTerm: (term) => term.toLowerCase(),
  });
  mini.addAll(docs.map(toIndexedDoc));
  return mini;
}

/** boost: 식별/정의 계열을 본문보다 높게. */
const BOOST: Record<string, number> = {
  title: 5,
  idText: 4,
  tags: 3,
  kindLabel: 2,
  definition: 2,
  purpose: 2,
  owner: 1.5,
};

/**
 * 질의 실행 → 카탈로그 노드로 환원한 결과.
 *  - combineWith OR + tf-idf 랭킹 (bigram 은 띄어쓰기 변형에 약하므로 AND 대신 OR + 랭킹).
 *  - prefix/fuzzy 는 라틴 토큰에만 (CJK bigram 에 fuzzy 는 노이즈).
 */
export function searchNodes(
  mini: MiniSearch<IndexedDoc>,
  nodeById: ReadonlyMap<string, CatalogNode>,
  query: string,
  limit = 30,
): SearchHit[] {
  const q = query.trim();
  if (!q) return [];
  const results = mini.search(q, {
    boost: BOOST,
    combineWith: 'OR',
    prefix: (term) => /[a-z0-9]/.test(term),
    fuzzy: (term) => (/[a-z0-9]/.test(term) ? 0.2 : false),
  });
  const hits: SearchHit[] = [];
  for (const r of results as SearchResult[]) {
    const node = nodeById.get(r.id as string);
    if (!node) continue;
    hits.push({ node, score: r.score, fields: Object.keys(r.match ?? {}).length ? matchedFields(r) : [] });
    if (hits.length >= limit) break;
  }
  return hits;
}

/** MiniSearch match → 매칭된 인덱스 필드명 집합. */
function matchedFields(r: SearchResult): string[] {
  const set = new Set<string>();
  for (const fields of Object.values(r.match)) {
    for (const f of fields) set.add(f);
  }
  return [...set];
}
