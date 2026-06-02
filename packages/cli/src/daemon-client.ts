// daemon-client.ts — cli → daemon 의 thin HTTP client (설계 결정 #1).
//
// serve / daemon 명령이 데몬 lifecycle 을 제어할 때 쓰는 최소 클라이언트: health 프로브,
// 기동 대기, 정상 종료 요청. 데몬의 read-only 데이터 엔드포인트(/api/graph 등, 설계 결정 #6)
// 는 뷰어(web)가 직접 호출하므로 cli 에는 두지 않는다(cli 는 데이터 소비자가 아님).

import { daemonUrl } from './config.js';

export interface DaemonMeta {
  pid: number;
  port: number;
  ssotDir: string;
  startedAt: string;
}

/** 데몬이 살아있고 응답하면 meta 반환, 아니면 null. */
export async function probeDaemon(port: number, timeoutMs = 1000): Promise<DaemonMeta | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${daemonUrl(port)}/api/health`, { signal: ctrl.signal });
    if (!res.ok) return null;
    return (await res.json()) as DaemonMeta;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** 데몬이 health 응답할 때까지 대기. 시간초과면 false. */
export async function waitForHealthy(
  port: number,
  totalMs = 10000,
  intervalMs = 250,
): Promise<DaemonMeta | null> {
  const deadline = Date.now() + totalMs;
  for (;;) {
    const meta = await probeDaemon(port, intervalMs);
    if (meta) return meta;
    if (Date.now() >= deadline) return null;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

/** 데몬에 정상 종료를 요청. */
export async function requestShutdown(port: number): Promise<boolean> {
  try {
    const res = await fetch(`${daemonUrl(port)}/api/shutdown`, { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}
