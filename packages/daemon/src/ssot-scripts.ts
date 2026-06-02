// ssot-scripts.ts — 정본 SSOT 스크립트(build-graph / verify) 위치 해석 + 서브프로세스 실행.
// daemon 의 빌드 큐가 _catalog.json / _gaps.md 를 정본 규칙으로 생성하기 위해 사용한다
// (설계 결정 #4: 검증 규칙 재구현 금지). 위치: SSOT_SCRIPTS_DIR > ~/.claude/skills/ssot/scripts.

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export type SsotScript = 'build-graph' | 'verify' | 'coverage';

export function resolveScriptsDir(): string {
  const env = process.env.SSOT_SCRIPTS_DIR;
  if (env && existsSync(env)) return env;
  return join(homedir(), '.claude', 'skills', 'ssot', 'scripts');
}

export function scriptPath(name: SsotScript): string {
  return join(resolveScriptsDir(), `${name}.mjs`);
}

export interface ScriptRun {
  code: number;
  stdout: string;
  stderr: string;
}

/** 스크립트를 실행하고 결과(종료코드/출력)를 캡처한다. 출력은 데몬 로그로 흘린다. */
export function runScriptCaptured(name: SsotScript, args: string[]): Promise<ScriptRun> {
  const path = scriptPath(name);
  if (!existsSync(path)) {
    return Promise.resolve({
      code: 2,
      stdout: '',
      stderr: `SSOT 스크립트 없음: ${path} (SSOT_SCRIPTS_DIR 로 지정 가능)`,
    });
  }
  return new Promise<ScriptRun>((resolve) => {
    const child = spawn(process.execPath, [path, ...args], { env: process.env });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d: Buffer) => {
      stderr += d.toString();
    });
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
    child.on('error', (err) => resolve({ code: 1, stdout, stderr: stderr + err.message }));
  });
}
