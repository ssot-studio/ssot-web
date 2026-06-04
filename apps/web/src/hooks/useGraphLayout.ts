import { useEffect, useRef, useState } from 'react';
import type { Edge, Node } from '@xyflow/react';
import type { LayoutDirection } from '@/domain/layout';
import LayoutWorker from '@/domain/layout.worker?worker';
import type { LayoutResponse } from '@/domain/layout.worker';

export interface GraphLayout {
  /** dagre 좌표가 적용된 노드. 첫 결과 도착 전에는 빈 배열. */
  nodes: Node[];
  /** 워커가 좌표를 계산 중인지 — true 동안 "레이아웃 계산 중" 오버레이를 띄운다. */
  layouting: boolean;
  /** 레이아웃 실패 메시지(예: 노드 과다로 dagre 콜스택 초과). 정상이면 null. */
  error: string | null;
}

/**
 * dagre 레이아웃을 Web Worker 에서 계산한다. 입력(노드/엣지/방향)이 바뀔 때마다 재요청하고,
 * 가장 최근 요청 결과만 반영한다(빠르게 토글했을 때 늦게 온 stale 좌표 무시).
 * 메인 스레드는 막히지 않으므로 노드가 많아도 초기 진입이 프리징되지 않는다.
 */
export function useGraphLayout(
  flowNodes: Node[],
  flowEdges: Edge[],
  direction: LayoutDirection,
): GraphLayout {
  const workerRef = useRef<Worker | null>(null);
  const reqId = useRef(0);
  const [result, setResult] = useState<GraphLayout>({ nodes: [], layouting: true, error: null });

  useEffect(() => {
    const worker = new LayoutWorker();
    workerRef.current = worker;
    worker.onmessage = (e: MessageEvent<LayoutResponse>) => {
      if (e.data.id !== reqId.current) return; // 최신 요청 결과만 반영
      if (e.data.error) setResult({ nodes: [], layouting: false, error: e.data.error });
      else setResult({ nodes: e.data.nodes ?? [], layouting: false, error: null });
    };
    worker.onerror = (ev) => {
      setResult({ nodes: [], layouting: false, error: ev.message || '레이아웃 워커 오류' });
    };
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const worker = workerRef.current;
    if (!worker) return;
    const id = ++reqId.current;
    setResult((prev) => ({ ...prev, layouting: true, error: null }));
    worker.postMessage({ id, nodes: flowNodes, edges: flowEdges, direction });
  }, [flowNodes, flowEdges, direction]);

  return result;
}
