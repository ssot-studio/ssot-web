// @repo/cli — SSOT CLI. cli→daemon 은 런타임 HTTP(thin client, 설계 결정 #1).
//
// 결정적 1회성 명령(build-graph / verify / coverage)은 정본 SSOT 스크립트를 서브프로세스로
// 실행해 _catalog.json / _gaps.md / _coverage.md 와 종료코드를 그대로 산출한다(설계 결정 #4:
// 검증 규칙 재구현 금지 — 스크립트가 정본). 산출된 _catalog.json 은 @repo/core 의
// normalize(RawCatalog) 입력과 동형이며, core 소비는 daemon 의 인덱스 단계에서 일어난다.
// daemon lifecycle(start/stop/status/restart/log)과 편의 진입점 serve 는 장기 실행
// @repo/daemon 프로세스를 detached 로 다룬다.

import { parseArgs } from './args.js';
import { runBuildGraph } from './commands/build-graph.js';
import { runVerify } from './commands/verify.js';
import { runCoverage } from './commands/coverage.js';
import { runDaemon } from './commands/daemon.js';
import { runServe } from './commands/serve.js';

const HELP = `ssot — SSOT 뷰어 CLI

사용법:
  ssot build-graph <ssotDir>                                  카탈로그(_catalog.json) 빌드
  ssot verify <ssotDir> [--cadence N] [--root <dir>]          완전성 검증 → _gaps.md
  ssot coverage <ssotDir> --surface <tsv> [--scaffold] [--root <dir>]   코드→SSOT 커버리지 → _coverage.md
  ssot serve <ssotDir> [--port 7777] [--no-open]              데몬 기동 + 뷰어 오픈
  ssot daemon <start|stop|status|restart|log> <ssotDir> [--port 7777]   데몬 lifecycle

종료코드: 0=성공, 1=verify 치명 결함/데몬 실패, 2=사용법 오류 (정본 스크립트 종료코드 패스스루)
`;

export async function run(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  const args = parseArgs(rest);

  switch (command) {
    case 'build-graph':
      return runBuildGraph(args);
    case 'verify':
      return runVerify(args);
    case 'coverage':
      return runCoverage(args);
    case 'serve':
      return runServe(args);
    case 'daemon':
      return runDaemon(args);
    case undefined:
    case 'help':
    case '--help':
    case '-h':
      process.stdout.write(HELP);
      return command === undefined ? 2 : 0;
    default:
      process.stderr.write(`unknown command: ${command}\n\n${HELP}`);
      return 2;
  }
}
