// build-queue.ts — 단일 빌드 큐(single-writer). 설계 결정 #8/#9:
//   chokidar watch → 200ms 디바운스 → 직렬 실행:
//     1) build-graph.mjs (정본) → _catalog.json
//     2) _catalog.json 읽기 → @repo/core normalize(RawCatalog) → SsotGraph
//     3) SQLite reindex(SsotGraph)
//     4) verify.mjs (정본) → _gaps.md (결과 종료코드/요약 캡처)
//   → 완료 시에만 SSE push. 직렬 큐로 순서 보장 + 부분 상태 노출 방지.
//   데이터 흐름은 단방향(.md → build-graph → _catalog.json → normalize → SQLite → REST/SSE).

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { normalize, type RawCatalog, type SsotGraph } from '@repo/core';
import { runScriptCaptured } from './ssot-scripts.js';
import type { SsotStore } from './store.js';
import type { SseHub } from './sse.js';

export interface VerifySummary {
  code: number;
  /** verify.mjs stdout 요약(사람용). */
  summary: string;
  /** 치명(구조) 결함 존재 여부 = code===1. */
  ok: boolean;
}

export interface BuildQueueOptions {
  ssotDir: string;
  store: SsotStore;
  hub: SseHub;
  /** verify.mjs --root (멀티레포 provenance 기준). 미지정 시 생략. */
  rootDir?: string;
  /** verify cadenceDays. 미지정 시 스크립트 기본(90). */
  cadenceDays?: number;
  debounceMs?: number;
}

export interface BuildResult {
  graph: SsotGraph;
  verify: VerifySummary;
  nodeCount: number;
  edgeCount: number;
  at: string;
}

export class BuildQueue {
  private readonly opts: Required<Pick<BuildQueueOptions, 'debounceMs'>> & BuildQueueOptions;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private pending = false;
  private last: BuildResult | null = null;

  constructor(options: BuildQueueOptions) {
    this.opts = { debounceMs: 200, ...options };
  }

  get lastResult(): BuildResult | null {
    return this.last;
  }

  /** 파일 변경 신호. 디바운스 후 1회 실행을 예약한다. */
  schedule(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.runOnce();
    }, this.opts.debounceMs);
  }

  /** 외부(예: /api/reindex)에서 디바운스 없이 즉시 실행. */
  trigger(): Promise<BuildResult | null> {
    return this.runOnce();
  }

  private async readCatalog(): Promise<RawCatalog> {
    const text = await readFile(join(this.opts.ssotDir, '_catalog.json'), 'utf8');
    return JSON.parse(text) as RawCatalog;
  }

  /** build → normalize → reindex → verify 를 직렬로 1회 실행. 실행 중 재요청은 1회로 합친다. */
  private async runOnce(): Promise<BuildResult | null> {
    if (this.running) {
      this.pending = true;
      return this.last;
    }
    this.running = true;
    try {
      const { ssotDir, store, hub, rootDir, cadenceDays } = this.opts;

      // 1) build-graph.mjs (정본) → _catalog.json
      const build = await runScriptCaptured('build-graph', [ssotDir]);
      if (build.stderr.trim()) process.stderr.write(`[build-graph] ${build.stderr}`);
      if (build.code !== 0) {
        // 카탈로그를 못 만들면 인덱스 갱신을 건너뛴다(부분 상태 노출 방지).
        return this.last;
      }

      // 2) _catalog.json → core.normalize → SsotGraph (core 소비 지점)
      const raw = await this.readCatalog();
      const graph = normalize(raw);

      // 3) SQLite reindex (파생 캐시 재구성)
      store.reindex(graph);
      hub.broadcast('catalog-rebuilt', {
        nodeCount: graph.nodes.size,
        edgeCount: graph.edges.length,
        parseErrors: graph.parseErrors.length,
      });

      // 4) verify.mjs (정본) → _gaps.md
      const verifyArgs: string[] = [ssotDir];
      if (cadenceDays) verifyArgs.push(String(cadenceDays));
      if (rootDir) verifyArgs.push('--root', rootDir);
      const verifyRun = await runScriptCaptured('verify', verifyArgs);
      if (verifyRun.stderr.trim()) process.stderr.write(`[verify] ${verifyRun.stderr}`);
      const verify: VerifySummary = {
        code: verifyRun.code,
        summary: verifyRun.stdout.trim(),
        ok: verifyRun.code === 0,
      };
      hub.broadcast('verify-done', { ok: verify.ok, code: verify.code });

      const result: BuildResult = {
        graph,
        verify,
        nodeCount: graph.nodes.size,
        edgeCount: graph.edges.length,
        at: new Date().toISOString(),
      };
      this.last = result;
      return result;
    } finally {
      this.running = false;
      if (this.pending) {
        this.pending = false;
        void this.runOnce();
      }
    }
  }
}
