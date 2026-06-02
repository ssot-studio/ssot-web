// commands/coverage.ts — `ssot coverage <ssotDir> --surface <tsv> [--scaffold] [--root <dir>]`
// 정본 coverage.mjs 를 실행해 _coverage.md 를 만든다(갭 0=exit 0, 갭 있음=1).
// coverage.mjs 는 _catalog.json 을 요구하므로 build-graph 를 먼저 돌린다.

import { existsSync } from 'node:fs';
import { runScript } from '../ssot-scripts.js';
import type { ParsedArgs } from '../args.js';

export async function runCoverage(args: ParsedArgs): Promise<number> {
  const ssotDir = args.positionals[0];
  const surfaceFile = args.options.surface;
  if (!ssotDir || !surfaceFile) {
    process.stderr.write('usage: ssot coverage <ssotDir> --surface <tsv> [--scaffold] [--root <dir>]\n');
    return 2;
  }
  if (!existsSync(ssotDir)) {
    process.stderr.write(`not found: ${ssotDir}\n`);
    return 2;
  }
  if (!existsSync(surfaceFile)) {
    process.stderr.write(`surface not found: ${surfaceFile}\n`);
    return 2;
  }
  const buildCode = await runScript('build-graph', [ssotDir]);
  if (buildCode !== 0) return buildCode;

  // coverage.mjs 인자: <ssotDir> --surface <tsv> [--scaffold] [--root <dir>]
  const scriptArgs: string[] = [ssotDir, '--surface', surfaceFile];
  if (args.flags.has('scaffold')) scriptArgs.push('--scaffold');
  if (args.options.root) scriptArgs.push('--root', args.options.root);
  return runScript('coverage', scriptArgs);
}
