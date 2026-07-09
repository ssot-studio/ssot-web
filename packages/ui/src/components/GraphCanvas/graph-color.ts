/**
 * focus dim 색 계산 유틸.
 *
 * 입력은 `useSemanticColors` 가 시맨틱 토큰에서 해석한 계산값(`#hex` | `rgb()/rgba()`)이다 —
 * 하드코딩 팔레트가 아니라 토큰에서 온 값이므로, 이 값을 배경 쪽으로 섞어 dim 색을 만든다.
 * WebGL 노드/링크는 material opacity 가 전역이라 per-element alpha 를 못 주므로,
 * 색 자체를 배경으로 보간해 "흐려짐"을 표현한다. 파싱 불가한 형식은 원본을 그대로 반환한다.
 */

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function parseColor(value: string): Rgb | null {
  const v = value.trim();
  if (v.startsWith('#')) {
    let hex = v.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    if (hex.length !== 6) return null;
    const n = Number.parseInt(hex, 16);
    if (Number.isNaN(n)) return null;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  const m = v.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    if (parts.length >= 3 && parts.slice(0, 3).every((x) => !Number.isNaN(x))) {
      return { r: parts[0], g: parts[1], b: parts[2] };
    }
  }
  return null;
}

function toRgbString({ r, g, b }: Rgb): string {
  const clamp = (x: number) => Math.max(0, Math.min(255, Math.round(x)));
  return `rgb(${clamp(r)}, ${clamp(g)}, ${clamp(b)})`;
}

/** `color` 를 `target` 쪽으로 `t`(0~1) 비율만큼 섞는다. */
export function mixToward(color: string, target: string, t: number): string {
  const a = parseColor(color);
  const b = parseColor(target);
  if (!a || !b) return color;
  return toRgbString({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  });
}

/** `var(--x)` 또는 `--x` 를 `getPropertyValue` 용 `--x` 로 정규화한다. */
export function normalizeToken(token: string): string {
  const m = token.trim().match(/^var\(\s*(--[^,)\s]+)/);
  return m ? m[1] : token.trim();
}
