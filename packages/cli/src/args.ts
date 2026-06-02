// args.ts — 의존성 없는 미니 argv 파서 (ssot CLI 전용).
// 위치 인자 + --flag / --key value 만 지원. 외부 라이브러리 도입 회피.

export interface ParsedArgs {
  positionals: string[];
  /** --key value (문자열) */
  options: Record<string, string>;
  /** --flag (불리언) */
  flags: Set<string>;
}

const VALUE_OPTIONS = new Set(['port', 'root', 'surface', 'cadence']);

export function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const options: Record<string, string> = {};
  const flags = new Set<string>();

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const eq = key.indexOf('=');
      if (eq >= 0) {
        options[key.slice(0, eq)] = key.slice(eq + 1);
      } else if (VALUE_OPTIONS.has(key)) {
        options[key] = argv[++i] ?? '';
      } else {
        flags.add(key);
      }
    } else {
      positionals.push(a);
    }
  }
  return { positionals, options, flags };
}

export function intOption(args: ParsedArgs, key: string, fallback: number): number {
  const v = args.options[key];
  if (v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
