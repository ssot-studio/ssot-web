// @repo/daemon — 장기 실행 파일워처 데몬. @repo/core 를 소비한다(단방향).
//
// 흐름(설계 결정 #1/#8/#9): chokidar watch → 200ms 디바운스 → 단일 빌드 큐
//   [build-graph.mjs → _catalog.json → core.normalize → SQLite reindex → verify.mjs] 직렬
//   → 완료 시 SSE push. REST/SSE 로 web 에 read-only 노출. SQLite 는 daemon-owned
//   single-writer 파생 캐시. core 소비는 normalize(RawCatalog→SsotGraph) 인덱스 단계.
//
// 실행: node dist/index.js <ssotDir> [port]  (cli 의 daemon start/serve 가 detached 로 spawn).

import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SsotStore } from './store.js';
import { SseHub } from './sse.js';
import { BuildQueue } from './build-queue.js';
import { startWatcher } from './watcher.js';
import { createDaemonServer } from './server.js';
import type { DaemonMeta } from './types.js';

const DEFAULT_PORT = 7777;

function cacheDir(ssotDir: string): string {
  return join(ssotDir, '.cache');
}

/** 뷰어 정적 빌드(apps/web/dist) 위치 해석. SSOT_WEB_DIR > cwd 기준 apps/web/dist. */
function resolveWebDir(): string | undefined {
  const env = process.env.SSOT_WEB_DIR;
  if (env && existsSync(env)) return resolve(env);
  const guess = resolve(process.cwd(), 'apps', 'web', 'dist');
  return existsSync(guess) ? guess : undefined;
}

export interface StartDaemonOptions {
  ssotDir: string;
  port?: number;
  /** verify provenance 기준 디렉토리(멀티레포 루트). 기본 cwd. */
  rootDir?: string;
  cadenceDays?: number;
}

/** 데몬을 기동한다. 호출 측이 프로세스를 살아있게 유지한다(서버 listen). */
export async function startDaemon(options: StartDaemonOptions): Promise<{ close: () => void }> {
  const { ssotDir } = options;
  const port = options.port ?? DEFAULT_PORT;
  if (!existsSync(ssotDir)) throw new Error(`ssotDir not found: ${ssotDir}`);

  const dir = cacheDir(ssotDir);
  mkdirSync(dir, { recursive: true });

  const store = new SsotStore(join(dir, 'ssot.db'));
  const hub = new SseHub();

  const meta: DaemonMeta = {
    pid: process.pid,
    port,
    ssotDir,
    startedAt: new Date().toISOString(),
  };

  const queue = new BuildQueue({
    ssotDir,
    store,
    hub,
    rootDir: options.rootDir ?? process.cwd(),
    cadenceDays: options.cadenceDays,
    debounceMs: 200,
  });

  // 초기 1회 빌드(시작 즉시 인덱스 채움).
  await queue.trigger();

  const watcher = startWatcher(ssotDir, queue);
  const server = createDaemonServer({
    store,
    hub,
    queue,
    meta,
    webDir: resolveWebDir(),
    onShutdown: () => close(),
  });

  let closed = false;
  const close = (): void => {
    if (closed) return;
    closed = true;
    try {
      void watcher.close();
    } catch {
      /* ignore */
    }
    hub.closeAll();
    server.close();
    store.close();
    try {
      if (existsSync(join(dir, 'daemon.pid'))) rmSync(join(dir, 'daemon.pid'));
      if (existsSync(join(dir, 'daemon.json'))) rmSync(join(dir, 'daemon.json'));
    } catch {
      /* ignore */
    }
  };

  await new Promise<void>((res, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      // listen 성공 후에만 pid/meta 기록 → cli status 가 신뢰 가능.
      writeFileSync(join(dir, 'daemon.pid'), String(process.pid));
      writeFileSync(join(dir, 'daemon.json'), JSON.stringify(meta, null, 2));
      res();
    });
  });

  return { close };
}

// --- standalone 실행 진입점 (cli 가 detached 로 spawn) ---
function isMainModule(): boolean {
  const entry = process.argv[1] ?? '';
  return entry.endsWith('index.js') || entry.endsWith('index.ts');
}

if (isMainModule()) {
  const ssotDir = process.argv[2];
  const port = Number(process.argv[3]) || DEFAULT_PORT;
  if (!ssotDir) {
    process.stderr.write('usage: node dist/index.js <ssotDir> [port]\n');
    process.exit(2);
  }
  startDaemon({ ssotDir, port })
    .then(({ close }) => {
      const onSignal = (): void => {
        close();
        process.exit(0);
      };
      process.on('SIGTERM', onSignal);
      process.on('SIGINT', onSignal);
      process.stdout.write(`daemon listening on http://127.0.0.1:${port} (ssotDir=${ssotDir})\n`);
    })
    .catch((err: unknown) => {
      process.stderr.write(`daemon failed: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exit(1);
    });
}
