// sse.ts — SSE(Server-Sent Events) 허브. 설계 결정 #6: read-only 뷰어는 server→client
// 단방향만 필요 → SSE(EventSource). WebSocket 미채택(프록시/방화벽 drop 시 수동 재연결,
// SSE 는 EventSource 자동 재연결 + HTTP/1.1 내장).
//
// 이벤트 타입(설계 결정 #6): catalog-rebuilt / verify-done / node-changed / coverage-done.

import type { ServerResponse } from 'node:http';

export type SseEventType =
  | 'catalog-rebuilt'
  | 'verify-done'
  | 'node-changed'
  | 'coverage-done'
  | 'hello';

export interface SseClient {
  id: number;
  res: ServerResponse;
}

export class SseHub {
  private clients = new Map<number, SseClient>();
  private nextId = 1;
  private heartbeat: ReturnType<typeof setInterval> | null = null;

  /** 새 EventSource 연결 등록. 연결 종료 시 자동 해제. */
  add(res: ServerResponse): SseClient {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    // 즉시 연결 확립 신호 + 재연결 간격 권고(3s).
    res.write('retry: 3000\n\n');

    const client: SseClient = { id: this.nextId++, res };
    this.clients.set(client.id, client);
    this.sendTo(client, 'hello', { clients: this.clients.size });

    res.on('close', () => this.clients.delete(client.id));
    this.ensureHeartbeat();
    return client;
  }

  private ensureHeartbeat(): void {
    if (this.heartbeat) return;
    // 15s 주석 핑 — 프록시 idle timeout 방지.
    this.heartbeat = setInterval(() => {
      for (const c of this.clients.values()) c.res.write(': ping\n\n');
    }, 15000);
    this.heartbeat.unref?.();
  }

  private sendTo(client: SseClient, event: SseEventType, data: unknown): void {
    client.res.write(`event: ${event}\n`);
    client.res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  /** 전체 연결에 이벤트 broadcast. */
  broadcast(event: SseEventType, data: unknown): void {
    for (const c of this.clients.values()) {
      try {
        this.sendTo(c, event, data);
      } catch {
        this.clients.delete(c.id);
      }
    }
  }

  get size(): number {
    return this.clients.size;
  }

  closeAll(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
    for (const c of this.clients.values()) {
      try {
        c.res.end();
      } catch {
        /* ignore */
      }
    }
    this.clients.clear();
  }
}
