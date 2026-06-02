// commands/build-graph.ts — `ssot build-graph <ssotDir>`
// 정본 build-graph.mjs 를 실행해 _catalog.json 을 만든다(결정적, exit 0/1/2 패스스루).

import { existsSync } from 'node:fs';
import { runScript } from '../ssot-scripts.js';
import type { ParsedArgs } from '../args.js';

export async function runBuildGraph(args: ParsedArgs): Promise<number> {
  const ssotDir = args.positionals[0];
  if (!ssotDir) {
    process.stderr.write('usage: ssot build-graph <ssotDir>\n');
    return 2;
  }
  if (!existsSync(ssotDir)) {
    process.stderr.write(`not found: ${ssotDir}\n`);
    return 2;
  }
  return runScript('build-graph', [ssotDir]);
}
