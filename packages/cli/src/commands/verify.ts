// commands/verify.ts — `ssot verify <ssotDir> [--cadence N] [--root <dir>]`
// 정본 verify.mjs 를 실행해 _gaps.md 를 만든다(치명 결함 시 exit 1).
// verify.mjs 는 _catalog.json 을 요구하므로 build-graph 를 먼저 돌린다.

import { existsSync } from 'node:fs';
import { runScript } from '../ssot-scripts.js';
import { intOption, type ParsedArgs } from '../args.js';

export async function runVerify(args: ParsedArgs): Promise<number> {
  const ssotDir = args.positionals[0];
  if (!ssotDir) {
    process.stderr.write('usage: ssot verify <ssotDir> [--cadence N] [--root <dir>]\n');
    return 2;
  }
  if (!existsSync(ssotDir)) {
    process.stderr.write(`not found: ${ssotDir}\n`);
    return 2;
  }
  const buildCode = await runScript('build-graph', [ssotDir]);
  if (buildCode !== 0) return buildCode;

  // verify.mjs 인자: <ssotDir> [cadenceDays] [--root <dir>]
  const scriptArgs: string[] = [ssotDir];
  if (args.options.cadence) scriptArgs.push(String(intOption(args, 'cadence', 90)));
  if (args.options.root) scriptArgs.push('--root', args.options.root);
  return runScript('verify', scriptArgs);
}
