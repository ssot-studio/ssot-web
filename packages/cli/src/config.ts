// config.ts — cli 의 경로/포트 규약. daemon lifecycle 과 공유하는 상수의 cli 측 정의.
//
// 데몬은 docs/ssot/.cache/ 아래에 런타임 산출물(pid/log/db)을 둔다 — gitignore 된
// 파생 캐시 디렉토리(설계 결정 #2). DB 는 daemon-owned single-writer.

import { join } from 'node:path';

/** 기본 데몬 포트. serve --port 로 오버라이드. */
export const DEFAULT_PORT = 7777;

/** 데몬 런타임 산출물 디렉토리 (ssotDir 기준). gitignore: docs/ssot/.cache/ */
export function cacheDir(ssotDir: string): string {
  return join(ssotDir, '.cache');
}

/** daemon pid 파일. status/stop/restart 가 읽는다. */
export function pidFile(ssotDir: string): string {
  return join(cacheDir(ssotDir), 'daemon.pid');
}

/** daemon 로그 파일. log 명령이 tail 한다. */
export function logFile(ssotDir: string): string {
  return join(cacheDir(ssotDir), 'daemon.log');
}

// 참고: SQLite DB(docs/ssot/.cache/ssot.db, 설계 결정 #2)는 daemon 이 단독 소유·생성한다.
// CLI 는 DB 를 직접 다루지 않으므로 경로 헬퍼를 두지 않는다.

/** 데몬이 자기 메타(port 등)를 적는 파일. status 가 health 주소를 안다. */
export function metaFile(ssotDir: string): string {
  return join(cacheDir(ssotDir), 'daemon.json');
}

/** 데몬 baseURL. */
export function daemonUrl(port: number): string {
  return `http://127.0.0.1:${port}`;
}
