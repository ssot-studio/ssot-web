import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

interface Point {
  x: number;
  y: number;
}

const MARGIN = 12;
const DRAG_THRESHOLD = 3;

/**
 * relative 컨테이너 안에서 패널을 헤더 드래그로 자유 이동시킨다.
 *  - 위치는 컨테이너 경계 안으로 clamp 되고 localStorage 에 유지된다.
 *  - 최초 위치(저장값 없음)는 우상단 — 기존 고정 위치를 그대로 계승한다.
 *  - didDrag 로 "드래그 후 발생하는 click" 을 호출측이 억제할 수 있다
 *    (예: <summary> 토글이 드래그 종료 클릭으로 열리고/닫히는 것 방지).
 *
 * useResizablePanel 과 같은 hand-rolled 포인터 드래그 패턴 — 별도 의존성 없음.
 */
export function useDraggablePanel(storageKey: string): {
  position: Point | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  panelRef: React.RefObject<HTMLDivElement | null>;
  startDrag: (e: React.PointerEvent) => void;
  didDrag: React.RefObject<boolean>;
} {
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [position, setPosition] = useState<Point | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const p = JSON.parse(saved) as Point;
        if (Number.isFinite(p.x) && Number.isFinite(p.y)) return p;
      }
    } catch {
      /* 저장값 파싱 실패 시 디폴트(우상단)로 폴백 */
    }
    return null;
  });
  const posRef = useRef<Point | null>(position);
  posRef.current = position;

  const grab = useRef<Point>({ x: 0, y: 0 });
  const start = useRef<Point>({ x: 0, y: 0 });
  const dragging = useRef(false);
  const didDrag = useRef(false);

  const clamp = useCallback((p: Point): Point => {
    const c = containerRef.current;
    const panel = panelRef.current;
    if (!c || !panel) return p;
    const maxX = Math.max(0, c.clientWidth - panel.offsetWidth);
    const maxY = Math.max(0, c.clientHeight - panel.offsetHeight);
    return { x: Math.min(maxX, Math.max(0, p.x)), y: Math.min(maxY, Math.max(0, p.y)) };
  }, []);

  // 최초 배치: 저장값이 있으면 경계 안으로 clamp, 없으면 우상단으로.
  useLayoutEffect(() => {
    const c = containerRef.current;
    const panel = panelRef.current;
    if (!c || !panel) return;
    setPosition(
      posRef.current
        ? clamp(posRef.current)
        : { x: Math.max(0, c.clientWidth - panel.offsetWidth - MARGIN), y: MARGIN },
    );
    // 마운트 1회만 — 의존성 의도적으로 비움.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onMove(e: PointerEvent): void {
      if (!dragging.current) return;
      const c = containerRef.current;
      if (!c) return;
      if (Math.abs(e.clientX - start.current.x) > DRAG_THRESHOLD || Math.abs(e.clientY - start.current.y) > DRAG_THRESHOLD) {
        didDrag.current = true;
      }
      const rect = c.getBoundingClientRect();
      setPosition(clamp({ x: e.clientX - rect.left - grab.current.x, y: e.clientY - rect.top - grab.current.y }));
    }
    function onUp(): void {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (posRef.current) window.localStorage.setItem(storageKey, JSON.stringify(posRef.current));
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [storageKey, clamp]);

  const startDrag = useCallback((e: React.PointerEvent): void => {
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    grab.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    start.current = { x: e.clientX, y: e.clientY };
    didDrag.current = false;
    dragging.current = true;
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  }, []);

  return { position, containerRef, panelRef, startDrag, didDrag };
}
