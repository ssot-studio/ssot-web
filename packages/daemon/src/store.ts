// store.ts — SQLite 인덱스 (daemon-owned single-writer 파생 캐시).
//
// 설계 결정 #2: SQLite 는 SSOT 가 아니라 정규화 그래프의 파생 캐시다. reindex 로 재구성
// 가능. DB 는 docs/ssot/.cache/ssot.db (gitignore).
// 설계 결정 #3: better-sqlite3 — sync API + single-writer + WAL(동시 read) + FTS5 내장.
// 설계 결정 #7: node / edges / nodes_fts(FTS5) 스키마. neighbors 는 WITH RECURSIVE.
//
// 입력은 @repo/core 의 SsotGraph(정규화 모델) — core 의 normalize(RawCatalog) 결과.

import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { SsotGraph, SsotNode } from '@repo/core';

export interface NodeSummary {
  id: string;
  kind: string;
  title: string;
  confidence: string;
  owner: string;
  lifecycle: string;
  authority: string;
  file: string;
  open_count: number;
}

export interface NodeDetail extends NodeSummary {
  /** 정규화 facet(축①~④). */
  facets: SsotNode['facets'];
  source?: string;
}

export interface EdgeRow {
  from_id: string;
  to_id: string;
  rel: string;
  relation_type: string | null;
}

export interface SearchHit extends NodeSummary {
  /** FTS5 bm25 점수(낮을수록 관련도 높음). */
  score: number;
}

export class SsotStore {
  private readonly db: Database.Database;

  constructor(dbPath: string) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    // WAL: 단일 writer(데몬) + 동시 reader(REST) 양립.
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS node (
        id          TEXT PRIMARY KEY,
        kind        TEXT NOT NULL,
        title       TEXT NOT NULL,
        facets_json TEXT NOT NULL,
        confidence  TEXT NOT NULL DEFAULT '',
        owner       TEXT NOT NULL DEFAULT '',
        lifecycle   TEXT NOT NULL DEFAULT '',
        authority   TEXT NOT NULL DEFAULT 'authored',
        source      TEXT NOT NULL DEFAULT '',
        file        TEXT NOT NULL DEFAULT '',
        open_count  INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS edges (
        from_id       TEXT NOT NULL,
        to_id         TEXT NOT NULL,
        rel           TEXT NOT NULL,
        relation_type TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_edges_from ON edges(from_id);
      CREATE INDEX IF NOT EXISTS idx_edges_to   ON edges(to_id);
      CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(
        id UNINDEXED,
        title,
        definition,
        purpose,
        body
      );
    `);
  }

  /** 정규화 그래프로 인덱스를 통째로 재구성한다(파생 캐시 reindex). 단일 트랜잭션. */
  reindex(graph: SsotGraph): void {
    const replace = this.db.transaction((g: SsotGraph) => {
      this.db.exec('DELETE FROM node; DELETE FROM edges; DELETE FROM nodes_fts;');

      const insNode = this.db.prepare(
        `INSERT INTO node (id, kind, title, facets_json, confidence, owner, lifecycle, authority, source, file, open_count)
         VALUES (@id, @kind, @title, @facets_json, @confidence, @owner, @lifecycle, @authority, @source, @file, @open_count)`,
      );
      const insFts = this.db.prepare(
        `INSERT INTO nodes_fts (id, title, definition, purpose, body)
         VALUES (@id, @title, @definition, @purpose, @body)`,
      );
      const insEdge = this.db.prepare(
        `INSERT INTO edges (from_id, to_id, rel, relation_type) VALUES (@from_id, @to_id, @rel, @relation_type)`,
      );

      for (const n of g.nodes.values()) {
        const def = n.facets.semantics.definition ?? '';
        const purpose = n.facets.purpose.purpose ?? '';
        const value = n.facets.purpose.value ?? '';
        insNode.run({
          id: n.id,
          kind: n.kind,
          title: n.title,
          facets_json: JSON.stringify(n.facets),
          confidence: n.facets.meta.confidence,
          owner: n.facets.meta.owner,
          lifecycle: n.facets.meta.lifecycle,
          authority: n.authority,
          source: n.source ?? '',
          file: n.file,
          open_count: n.openCount,
        });
        insFts.run({
          id: n.id,
          title: n.title,
          definition: def,
          purpose,
          body: [value, n.facets.meta.owner, n.kind].join(' '),
        });
      }
      for (const e of g.edges) {
        insEdge.run({
          from_id: e.from,
          to_id: e.to,
          rel: e.rel,
          relation_type: e.relationType ?? null,
        });
      }
    });
    replace(graph);
  }

  /** /api/graph — 노드 요약 + 엣지. */
  graph(): { nodes: NodeSummary[]; edges: EdgeRow[] } {
    const nodes = this.db
      .prepare(
        `SELECT id, kind, title, confidence, owner, lifecycle, authority, file, open_count FROM node ORDER BY kind, id`,
      )
      .all() as NodeSummary[];
    const edges = this.db
      .prepare(`SELECT from_id, to_id, rel, relation_type FROM edges`)
      .all() as EdgeRow[];
    return { nodes, edges };
  }

  /** /api/node/:id — 정규화 facet 포함 1건. */
  node(id: string): NodeDetail | null {
    const row = this.db
      .prepare(
        `SELECT id, kind, title, facets_json, confidence, owner, lifecycle, authority, source, file, open_count FROM node WHERE id = ?`,
      )
      .get(id) as (NodeSummary & { facets_json: string; source: string }) | undefined;
    if (!row) return null;
    const { facets_json, source, ...rest } = row;
    let facets: SsotNode['facets'];
    try {
      facets = JSON.parse(facets_json) as SsotNode['facets'];
    } catch {
      return null;
    }
    return { ...rest, source: source || undefined, facets };
  }

  /** /api/search?q= — FTS5 MATCH. 토큰 prefix OR 결합으로 안전화. */
  search(q: string, limit = 50): SearchHit[] {
    const trimmed = q.trim();
    if (!trimmed) return [];
    const tokens = trimmed
      .split(/\s+/)
      .map((t) => t.replace(/["*]/g, ''))
      .filter(Boolean)
      .map((t) => `"${t}"*`);
    if (tokens.length === 0) return [];
    const matchExpr = tokens.join(' OR ');
    try {
      return this.db
        .prepare(
          `SELECT n.id, n.kind, n.title, n.confidence, n.owner, n.lifecycle, n.authority, n.file, n.open_count,
                  bm25(nodes_fts) AS score
           FROM nodes_fts f JOIN node n ON n.id = f.id
           WHERE nodes_fts MATCH ?
           ORDER BY score
           LIMIT ?`,
        )
        .all(matchExpr, limit) as SearchHit[];
    } catch {
      return [];
    }
  }

  /**
   * /api/neighbors/:id — depth-N 그래프 트래버설.
   * 설계 결정 #7: WITH RECURSIVE over edges. dir = out|in|both.
   */
  neighbors(id: string, dir: 'out' | 'in' | 'both', depth: number): NodeSummary[] {
    const d = Math.max(1, Math.min(depth, 10));
    const dirFilter =
      dir === 'out'
        ? 'SELECT from_id AS a, to_id AS b FROM edges'
        : dir === 'in'
          ? 'SELECT to_id AS a, from_id AS b FROM edges'
          : 'SELECT from_id AS a, to_id AS b FROM edges UNION ALL SELECT to_id AS a, from_id AS b FROM edges';

    return this.db
      .prepare(
        `WITH RECURSIVE
           dir_edge(a, b) AS (${dirFilter}),
           reach(node_id, depth) AS (
             SELECT @start, 0
             UNION
             SELECT e.b, r.depth + 1
             FROM reach r JOIN dir_edge e ON e.a = r.node_id
             WHERE r.depth < @maxDepth
           )
         SELECT DISTINCT n.id, n.kind, n.title, n.confidence, n.owner, n.lifecycle, n.authority, n.file, n.open_count
         FROM reach r JOIN node n ON n.id = r.node_id
         WHERE r.node_id <> @start
         ORDER BY n.kind, n.id`,
      )
      .all({ start: id, maxDepth: d }) as NodeSummary[];
  }

  close(): void {
    this.db.close();
  }
}
