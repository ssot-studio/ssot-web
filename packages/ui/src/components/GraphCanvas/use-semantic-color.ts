import { useEffect, useState, type RefObject } from 'react';

/**
 * 시맨틱 토큰 → 실제 색상 문자열 해석 유틸.
 *
 * WebGL(three.js) 은 CSS `var()` 를 이해하지 못하므로, 캔버스에 넘길 색은
 * 반드시 이 유틸로 시맨틱 토큰을 계산값(hex)으로 해석해 전달한다.
 * 이 경로가 유일한 통로다 — 그래프 코드에 hex 하드코딩 금지 원칙은 그대로 유지된다.
 */
export function resolveSemanticColors(el: HTMLElement, tokens: string[]): Record<string, string> {
  const style = getComputedStyle(el);
  const resolved: Record<string, string> = {};
  for (const token of tokens) {
    resolved[token] = style.getPropertyValue(token).trim();
  }
  return resolved;
}

/**
 * 시맨틱 토큰을 계산값으로 해석하고, 테마 전환에 라이브로 반응하는 훅.
 *
 * 다크 모드는 세 경로로 활성화될 수 있다:
 * - `documentElement` 의 `class` 토글(예: `.dark`) → MutationObserver
 * - `documentElement` 의 `data-theme` 속성 토글(예: `[data-theme='dark']`) → MutationObserver
 * - `prefers-color-scheme: dark` 미디어 쿼리(시스템) → matchMedia change
 *
 * 세 경로 모두 관찰해 토큰을 재해석한다(테마 프로바이더 관습이 class/data-theme 어느 쪽이든
 * 대응). 해석값이 동일하면 상태를 갱신하지 않는다.
 */
export function useSemanticColors(
  ref: RefObject<HTMLElement | null>,
  tokens: string[],
): Record<string, string> | null {
  const [colors, setColors] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const next = resolveSemanticColors(el, tokens);
      setColors((prev) => {
        if (prev && tokens.every((token) => prev[token] === next[token])) return prev;
        return next;
      });
    };

    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', update);

    return () => {
      observer.disconnect();
      media.removeEventListener('change', update);
    };
  }, [ref, tokens]);

  return colors;
}
