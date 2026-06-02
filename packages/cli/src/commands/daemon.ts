// commands/daemon.ts — `ssot daemon <start|stop|status|restart|log> <ssotDir> [--port N]`
// Clawket 과 동형인 데몬 lifecycle. 데몬 프로세스는 @repo/daemon 의 entry 를 detached 로 띄운다.

import { spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  createReadStream,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { cacheDir, pidFile, logFile, metaFile, DEFAULT_PORT } from '../config.js';
import {
  probeDaemon,
  waitForHealthy,
  requestShutdown,
  type DaemonMeta,
} from '../daemon-client.js';
import { intOption, type ParsedArgs } from '../args.js';

const require = createRequire(import.meta.url);

/** @repo/daemon 의 실행 진입점(dist) 경로를 해석한다. */
function resolveDaemonEntry(): string {
  // exports 의 import 조건이 require.resolve 와 안 맞으므로 package.json 의 main 으로 해석한다.
  const pkgPath = require.resolve('@repo/daemon/package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { main?: string };
  return join(dirname(pkgPath), pkg.main ?? 'dist/index.js');
}

function readMeta(ssotDir: string): DaemonMeta | null {
  const f = metaFile(ssotDir);
  if (!existsSync(f)) return null;
  try {
    return JSON.parse(readFileSync(f, 'utf8')) as DaemonMeta;
  } catch {
    return null;
  }
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** 데몬을 detached 로 spawn 한다. health 가 뜰 때까지 대기 후 meta 반환. */
export async function startDaemon(ssotDir: string, port: number): Promise<DaemonMeta | null> {
  const existing = await probeDaemon(port);
  if (existing) return existing;

  mkdirSync(cacheDir(ssotDir), { recursive: true });
  const out = openSync(logFile(ssotDir), 'a');
  const err = openSync(logFile(ssotDir), 'a');

  const entry = resolveDaemonEntry();
  const child = spawn(process.execPath, [entry, ssotDir, String(port)], {
    detached: true,
    stdio: ['ignore', out, err],
    env: { ...process.env },
  });
  child.unref();

  return waitForHealthy(port);
}

async function cmdStart(ssotDir: string, port: number): Promise<number> {
  const meta = await startDaemon(ssotDir, port);
  if (!meta) {
    process.stderr.write(`데몬이 ${port} 에서 health 응답을 안 합니다. 로그: ${logFile(ssotDir)}\n`);
    return 1;
  }
  process.stdout.write(`daemon up: pid=${meta.pid} port=${meta.port} ssotDir=${meta.ssotDir}\n`);
  return 0;
}

async function cmdStop(ssotDir: string, port: number): Promise<number> {
  const meta = readMeta(ssotDir);
  const ok = await requestShutdown(meta?.port ?? port);
  if (ok) {
    process.stdout.write('daemon stop: 요청됨\n');
    return 0;
  }
  // health 도 없고 종료 요청도 실패 → pid 로 폴백 종료.
  if (meta && isAlive(meta.pid)) {
    try {
      process.kill(meta.pid, 'SIGTERM');
      process.stdout.write(`daemon stop: SIGTERM → pid=${meta.pid}\n`);
      return 0;
    } catch {
      /* fallthrough */
    }
  }
  process.stdout.write('daemon stop: 실행 중인 데몬 없음\n');
  if (existsSync(pidFile(ssotDir))) rmSync(pidFile(ssotDir));
  return 0;
}

async function cmdStatus(ssotDir: string, port: number): Promise<number> {
  const meta = readMeta(ssotDir);
  const live = await probeDaemon(meta?.port ?? port);
  if (live) {
    process.stdout.write(`daemon: running (pid=${live.pid} port=${live.port})\n`);
    return 0;
  }
  if (meta && isAlive(meta.pid)) {
    process.stdout.write(`daemon: pid=${meta.pid} 살아있으나 health 무응답 (포트 ${meta.port})\n`);
    return 1;
  }
  process.stdout.write('daemon: stopped\n');
  return 1;
}

async function cmdRestart(ssotDir: string, port: number): Promise<number> {
  await cmdStop(ssotDir, port);
  // 종료가 반영될 시간을 짧게 준다.
  await new Promise((r) => setTimeout(r, 300));
  return cmdStart(ssotDir, port);
}

function cmdLog(ssotDir: string): Promise<number> {
  const f = logFile(ssotDir);
  if (!existsSync(f)) {
    process.stdout.write('(로그 없음)\n');
    return Promise.resolve(0);
  }
  return new Promise((resolve) => {
    const rs = createReadStream(f, { encoding: 'utf8' });
    rs.on('data', (chunk) => process.stdout.write(chunk));
    rs.on('end', () => resolve(0));
    rs.on('error', () => resolve(1));
  });
}

export async function runDaemon(args: ParsedArgs): Promise<number> {
  const sub = args.positionals[0];
  const ssotDir = args.positionals[1];
  const port = intOption(args, 'port', DEFAULT_PORT);
  if (!sub || !ssotDir) {
    process.stderr.write('usage: ssot daemon <start|stop|status|restart|log> <ssotDir> [--port N]\n');
    return 2;
  }
  switch (sub) {
    case 'start':
      return cmdStart(ssotDir, port);
    case 'stop':
      return cmdStop(ssotDir, port);
    case 'status':
      return cmdStatus(ssotDir, port);
    case 'restart':
      return cmdRestart(ssotDir, port);
    case 'log':
      return cmdLog(ssotDir);
    default:
      process.stderr.write(`unknown daemon subcommand: ${sub}\n`);
      return 2;
  }
}
