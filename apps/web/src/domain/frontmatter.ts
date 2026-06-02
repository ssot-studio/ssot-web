// 노드 .md 의 frontmatter + 본문 파서.
// SSOT frontmatter 는 제한된 YAML 부분집합만 사용한다:
//   - 스칼라: key: value
//   - 인라인 배열: key: [a, b, c]
//   - 블록 배열: key:\n  - item  /  key:\n  - { to: x, type: y, note: z }
// js-yaml 의존을 피하고 이 부분집합만 정확히 파싱한다 (입력은 우리 생성기 산출물).

import type { NodeDoc, NodeFrontmatter, RelatesToRef } from './types';

const FM_DELIM = /^---\s*$/;

export function parseNodeDoc(id: string, raw: string): NodeDoc {
  const lines = raw.split(/\r?\n/);
  if (!FM_DELIM.test(lines[0] ?? '')) {
    return { id, frontmatter: {}, body: raw.trim() };
  }
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (FM_DELIM.test(lines[i])) {
      end = i;
      break;
    }
  }
  if (end === -1) return { id, frontmatter: {}, body: raw.trim() };

  const fmLines = lines.slice(1, end);
  const body = lines.slice(end + 1).join('\n').trim();
  return { id, frontmatter: parseFrontmatter(fmLines), body };
}

function parseFrontmatter(lines: string[]): NodeFrontmatter {
  const fm: NodeFrontmatter = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) {
      i++;
      continue;
    }
    const m = /^([A-Za-z][\w]*)\s*:\s*(.*)$/.exec(line);
    if (!m) {
      i++;
      continue;
    }
    const key = m[1];
    const rest = m[2];

    if (rest.trim() === '') {
      // 블록 배열 — 후속 들여쓰기 "- ..." 라인 수집.
      const items: string[] = [];
      i++;
      while (i < lines.length && /^\s+-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s+-\s+/, '').trim());
        i++;
      }
      assign(fm, key, items.map(stripQuotes));
      continue;
    }

    if (rest.trim().startsWith('[')) {
      assign(fm, key, parseInlineArray(rest.trim()));
      i++;
      continue;
    }

    // 스칼라.
    assign(fm, key, stripQuotes(rest.trim()));
    i++;
  }
  return fm;
}

function assign(fm: NodeFrontmatter, key: string, value: string | string[]): void {
  if (key === 'relatesTo' && Array.isArray(value)) {
    fm.relatesTo = value.map(parseRelatesTo);
    return;
  }
  (fm as Record<string, unknown>)[key] = value;
}

/** "{ to: concept.x, type: uses, note: foo }" → RelatesToRef. */
function parseRelatesTo(item: string): RelatesToRef {
  const inner = item.replace(/^\{/, '').replace(/\}$/, '').trim();
  const ref: RelatesToRef = { to: '' };
  // 콤마로 분할하되 note 안의 콤마는 흔치 않으므로 단순 분할 후 key 매칭.
  for (const part of splitTopLevel(inner)) {
    const kv = /^([A-Za-z]+)\s*:\s*(.*)$/.exec(part.trim());
    if (!kv) continue;
    const k = kv[1];
    const v = stripQuotes(kv[2].trim());
    if (k === 'to') ref.to = v;
    else if (k === 'type') ref.type = v;
    else if (k === 'note') ref.note = v;
  }
  return ref;
}

/** 인라인 배열 "[a, b, c]" → string[]. */
function parseInlineArray(text: string): string[] {
  const inner = text.replace(/^\[/, '').replace(/\]$/, '').trim();
  if (!inner) return [];
  return splitTopLevel(inner).map((s) => stripQuotes(s.trim())).filter(Boolean);
}

/** 중첩 {}/[] 를 무시하고 최상위 콤마로만 분할. */
function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let buf = '';
  for (const ch of text) {
    if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(buf);
      buf = '';
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) parts.push(buf);
  return parts;
}

function stripQuotes(s: string): string {
  return s.replace(/^["']/, '').replace(/["']$/, '');
}
