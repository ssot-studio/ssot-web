// commands/serve.ts — `ssot serve <ssotDir> [--port N] [--no-open]`
// 설계 결정 #5: serve 는 daemon lifecycle 위의 편의 진입점이다. 데몬이 없으면 detached
// 로 띄우고, health-check 후 브라우저로 뷰어를 연다.

import { spawn } from 'node:child_process';
import { startDaemon } from './daemon.js';
import { probeDaemon } from '../daemon-client.js';
import { daemonUrl, DEFAULT_PORT } from '../config.js';
import { intOption, type ParsedArgs } from '../args.js';

/** OS별 기본 브라우저로 URL 을 연다. 실패해도 치명 아님. */
function openBrowser(url: string): void {
  const platform = process.platform;
  const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'cmd' : 'xdg-open';
  const cmdArgs = platform === 'win32' ? ['/c', 'start', '', url] : [url];
  try {
    const child = spawn(cmd, cmdArgs, { stdio: 'ignore', detached: true });
    child.unref();
  } catch {
    /* 브라우저 자동 오픈 실패는 무시 — URL 은 stdout 에 이미 출력됨 */
  }
}

export async function runServe(args: ParsedArgs): Promise<number> {
  const ssotDir = args.positionals[0];
  if (!ssotDir) {
    process.stderr.write('usage: ssot serve <ssotDir> [--port N] [--no-open]\n');
    return 2;
  }
  const port = intOption(args, 'port', DEFAULT_PORT);
  const noOpen = args.flags.has('no-open');

  let meta = await probeDaemon(port);
  if (!meta) {
    process.stdout.write(`데몬 기동 중… (port ${port})\n`);
    meta = await startDaemon(ssotDir, port);
  }
  if (!meta) {
    process.stderr.write(`데몬 health-check 실패 (port ${port}).\n`);
    return 1;
  }

  const url = daemonUrl(meta.port);
  process.stdout.write(`SSOT 뷰어: ${url}\n`);
  if (!noOpen) openBrowser(url);
  return 0;
}
