#!/usr/bin/env node
// ssot CLI 진입점. 명령 라우팅은 dist 산출물(@repo/cli)의 run() 에 위임한다.
import { run } from '../dist/index.js';

run(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
  });
