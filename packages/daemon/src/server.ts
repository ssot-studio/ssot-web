// server.ts — REST + SSE HTTP 서버. 설계 결정 #6:
//   REST: GET /api/graph /api/node/:id /api/search?q= /api/neighbors/:id?dir=&depth=
//         /api/gaps
//   SSE : GET /api/events (catalog-rebuilt / verify-done / node-changed / coverage-done)
//   운영: GET /api/health, POST /api/shutdown, POST /api/reindex
// web 은 read-only — 역방향 쓰기 경로 없음(설계 결정 #9).

import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize as normalizePath, sep } from 'node:path';
import type { SsotStore } from './store.js';
import type { SseHub } from './sse.js';
import type { BuildQueue } from './build-queue.js';
import type { DaemonMeta } from './types.js';

export interface ServerDeps {
  store: SsotStore;
  hub: SseHub;
  queue: BuildQueue;
  meta: DaemonMeta;
  onShutdown: () => void;
  /** 뷰어 정적 산출물(apps/web/dist) 디렉토리. 있으면 / 에서 서빙(SPA fallback). */
  webDir?: string;
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/** webDir 안에서 안전하게(디렉토리 탈출 방지) 파일을 서빙. SPA fallback=index.html. */
function serveStatic(webDir: string, urlPath: string, res: ServerResponse): boolean {
  const rel = decodeURIComponent(urlPath).replace(/^\/+/, '');
  const target = normalizePath(join(webDir, rel));
  if (!target.startsWith(webDir + sep) && target !== webDir) return false; // traversal 차단

  let file = target;
  if (urlPath === '/' || !existsSync(file) || statSync(file).isDirectory()) {
    file = join(webDir, 'index.html');
  }
  if (!existsSync(file)) return false;

  res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
  return true;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    // 로컬 뷰어(vite dev 등)에서의 read-only 호출 허용.
    'Access-Control-Allow-Origin': '*',
  });
  res.end(payload);
}

export function createDaemonServer(deps: ServerDeps): Server {
  const { store, hub, queue, meta, onShutdown, webDir } = deps;

  return createServer((req: IncomingMessage, res: ServerResponse) => {
    const method = req.method ?? 'GET';
    const url = new URL(req.url ?? '/', `http://127.0.0.1:${meta.port}`);
    const path = url.pathname;

    // --- 운영 엔드포인트 ---
    if (path === '/api/health' && method === 'GET') {
      return sendJson(res, 200, meta);
    }
    if (path === '/api/shutdown' && method === 'POST') {
      sendJson(res, 200, { ok: true });
      setTimeout(onShutdown, 50);
      return;
    }
    if (path === '/api/reindex' && method === 'POST') {
      void queue.trigger().then((r) => {
        hub.broadcast('node-changed', { reason: 'manual-reindex', at: new Date().toISOString() });
        return r;
      });
      return sendJson(res, 202, { ok: true });
    }

    // --- SSE ---
    if (path === '/api/events' && method === 'GET') {
      hub.add(res);
      return;
    }

    // --- REST 읽기 ---
    if (path === '/api/graph' && method === 'GET') {
      return sendJson(res, 200, store.graph());
    }
    if (path === '/api/search' && method === 'GET') {
      const q = url.searchParams.get('q') ?? '';
      return sendJson(res, 200, { q, hits: store.search(q) });
    }
    if (path === '/api/gaps' && method === 'GET') {
      const last = queue.lastResult;
      if (!last) return sendJson(res, 200, { ready: false });
      // 구조화 verify 규칙은 정본 verify.mjs 소유 → _gaps.md 가 정본 산출물.
      // 여기서는 마지막 실행의 종료코드/요약 + parseErrors 만 제공한다.
      return sendJson(res, 200, {
        ready: true,
        at: last.at,
        ok: last.verify.ok,
        code: last.verify.code,
        summary: last.verify.summary,
        parseErrors: last.graph.parseErrors,
      });
    }
    const nodeMatch = path.match(/^\/api\/node\/(.+)$/);
    if (nodeMatch && method === 'GET') {
      const id = decodeURIComponent(nodeMatch[1]);
      const node = store.node(id);
      if (!node) return sendJson(res, 404, { error: 'not found', id });
      return sendJson(res, 200, node);
    }
    const neighborMatch = path.match(/^\/api\/neighbors\/(.+)$/);
    if (neighborMatch && method === 'GET') {
      const id = decodeURIComponent(neighborMatch[1]);
      const dirParam = url.searchParams.get('dir') ?? 'both';
      const dir = dirParam === 'out' || dirParam === 'in' ? dirParam : 'both';
      const depth = Number(url.searchParams.get('depth') ?? '1') || 1;
      return sendJson(res, 200, { id, dir, depth, neighbors: store.neighbors(id, dir, depth) });
    }

    // --- 정적 뷰어(read-only) ---
    if (method === 'GET' && !path.startsWith('/api/')) {
      if (webDir && serveStatic(webDir, path, res)) return;
      // 뷰어 빌드가 없으면 API 안내(serve 가 최소한 동작 확인 가능하도록).
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(
        `<!doctype html><meta charset="utf-8"><title>SSOT daemon</title>` +
          `<body style="font-family:system-ui;padding:2rem">` +
          `<h1>SSOT 데몬 가동 중</h1>` +
          `<p>뷰어 정적 빌드(apps/web/dist)가 없습니다. REST API 는 동작합니다:</p>` +
          `<ul>` +
          `<li><a href="/api/graph">/api/graph</a></li>` +
          `<li><a href="/api/gaps">/api/gaps</a></li>` +
          `<li>/api/node/:id · /api/search?q= · /api/neighbors/:id?dir=both&depth=2</li>` +
          `<li>/api/events (SSE)</li>` +
          `</ul></body>`,
      );
      return;
    }

    sendJson(res, 404, { error: 'not found', path });
  });
}
