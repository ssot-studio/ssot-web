import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_WIDTH = 300;
const MAX_WIDTH = 1000;

/**
 * 우측 고정 패널의 너비를 좌측 경계 드래그로 조절한다. 너비는 localStorage 에 유지된다.
 * 패널은 viewport 우측 가장자리에 붙어 있으므로 너비 = innerWidth - pointer.clientX 다.
 */
export function useResizablePanel(
  defaultWidth = 380,
  storageKey = 'ssot.detailWidth',
): { width: number; startDrag: (e: React.PointerEvent) => void } {
  const [width, setWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return defaultWidth;
    const saved = Number(window.localStorage.getItem(storageKey));
    return Number.isFinite(saved) && saved >= MIN_WIDTH && saved <= MAX_WIDTH ? saved : defaultWidth;
  });
  const widthRef = useRef(width);
  widthRef.current = width;
  const dragging = useRef(false);

  useEffect(() => {
    function onMove(e: PointerEvent): void {
      if (!dragging.current) return;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, window.innerWidth - e.clientX));
      setWidth(next);
    }
    function onUp(): void {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.localStorage.setItem(storageKey, String(widthRef.current));
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [storageKey]);

  const startDrag = useCallback((e: React.PointerEvent): void => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  return { width, startDrag };
}
