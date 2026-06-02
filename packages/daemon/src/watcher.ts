// watcher.ts — chokidar 로 docs/ssot 의 .md 변경을 감시한다(설계 결정 #8).
// '_' 시작 산출물(_catalog.json/_gaps.md/_coverage.md)과 .cache/ 는 무시 — 자기 산출물에
// 의한 무한 재빌드 루프를 끊는다. 변경 신호는 BuildQueue.schedule()(200ms 디바운스)로 합친다.

import chokidar, { type FSWatcher } from 'chokidar';
import { basename, sep } from 'node:path';
import type { BuildQueue } from './build-queue.js';

export function startWatcher(ssotDir: string, queue: BuildQueue): FSWatcher {
  const watcher = chokidar.watch(ssotDir, {
    persistent: true,
    ignoreInitial: true,
    // 산출물/캐시/숨김 파일 무시 (재빌드 루프 차단).
    ignored: (p: string): boolean => {
      const name = basename(p);
      if (name.startsWith('_')) return true; // _catalog.json, _gaps.md, _coverage.md
      if (name.startsWith('.')) return true; // .DS_Store 등
      if (p.includes(`${sep}.cache${sep}`)) return true; // daemon-owned 캐시 디렉토리
      return false;
    },
  });

  const onChange = (): void => queue.schedule();
  watcher.on('add', onChange).on('change', onChange).on('unlink', onChange);
  return watcher;
}
