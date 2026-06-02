// ssot-scripts.ts — 결정적 SSOT 검증 스크립트(build-graph / verify / coverage)의 단일 진실
// 위치 해석 + 서브프로세스 실행.
//
// 왜 서브프로세스인가:
//   - 이 스크립트들이 _catalog.json / _gaps.md / _coverage.md 와 종료코드(치명=1)의 정본
//     구현이다(스킬 /ssot 의 결정적 경로). 검증 규칙을 cli 에 재구현하면 의미 드리프트가
//     생긴다(설계 결정 #4: 재구현 금지). 스크립트는 의존성 0 의 self-contained CLI 라
//     import 가 아니라 spawn 으로만 소비 가능(argv 읽고 즉시 실행/exit).
//   - 결과 _catalog.json 은 @repo/core 의 normalize(RawCatalog) 입력과 동형이므로 daemon 이
//     그대로 정규화한다 — core 소비는 daemon 인덱스 단계에서 일어난다.
//
// 위치: 환경변수 SSOT_SCRIPTS_DIR 우선, 없으면 ~/.claude/skills/ssot/scripts.

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export type SsotScript = 'build-graph' | 'verify' | 'coverage';

/** 스크립트 디렉토리 해석. SSOT_SCRIPTS_DIR > 기본 스킬 경로. */
export function resolveScriptsDir(): string {
  const env = process.env.SSOT_SCRIPTS_DIR;
  if (env && existsSync(env)) return env;
  return join(homedir(), '.claude', 'skills', 'ssot', 'scripts');
}

export function scriptPath(name: SsotScript): string {
  return join(resolveScriptsDir(), `${name}.mjs`);
}

/**
 * 스크립트를 동기 stdio 상속으로 실행하고 종료코드를 반환한다.
 * stdout/stderr 는 부모에 그대로 흘려 보내 결정적 명령의 출력/exit 의미를 보존한다.
 */
export function runScript(name: SsotScript, args: string[]): Promise<number> {
  const path = scriptPath(name);
  if (!existsSync(path)) {
    process.stderr.write(
      `SSOT 스크립트를 찾을 수 없습니다: ${path}\n` +
        `SSOT_SCRIPTS_DIR 로 위치를 지정하거나 /ssot 스킬이 설치돼 있는지 확인하세요.\n`,
    );
    return Promise.resolve(2);
  }
  return new Promise<number>((resolve) => {
    const child = spawn(process.execPath, [path, ...args], {
      stdio: 'inherit',
      env: process.env,
    });
    child.on('close', (code) => resolve(code ?? 1));
    child.on('error', (err) => {
      process.stderr.write(`${name} 실행 실패: ${err.message}\n`);
      resolve(1);
    });
  });
}
