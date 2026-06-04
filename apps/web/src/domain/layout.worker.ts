// layout.worker.ts — dagre 계층 레이아웃을 메인 스레드 밖에서 계산한다.
//
// 노드가 많을수록 dagre rank 계산은 무거운 동기 CPU 작업이라, 메인 스레드에서 돌리면
// 초기 진입 시 첫 페인트가 멈춘다(노드 수에 비례). 워커로 옮겨 UI 를 막지 않는다.
// 좌표 계산 로직은 domain/layout.ts(applyDagreLayout)를 그대로 재사용한다 — 중복 0.

import type { Edge, Node } from '@xyflow/react';
import { applyDagreLayout, type LayoutDirection } from './layout';

export interface LayoutRequest {
  /** 최신 요청 식별 — 늦게 도착한 stale 결과를 버리기 위함. */
  id: number;
  nodes: Node[];
  edges: Edge[];
  direction: LayoutDirection;
}

export interface LayoutResponse {
  id: number;
  /** 성공 시 좌표가 입혀진 노드. 실패 시 생략. */
  nodes?: Node[];
  /** dagre 가 실패하면(예: 노드가 너무 많아 브라우저 콜스택 초과) 메시지를 담아 보낸다. */
  error?: string;
}

// DOM lib 과의 self 타입 충돌을 피하려고 워커 컨텍스트를 명시적으로 좁혀 잡는다.
const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<LayoutRequest>) => void) | null;
  postMessage: (msg: LayoutResponse) => void;
};

ctx.onmessage = (e) => {
  const { id, nodes, edges, direction } = e.data;
  // 실패를 조용히 삼키지 않는다 — 빈 화면 대신 호출 측이 원인을 표시할 수 있도록 보고한다.
  try {
    ctx.postMessage({ id, nodes: applyDagreLayout(nodes, edges, direction) });
  } catch (err) {
    ctx.postMessage({ id, error: err instanceof Error ? err.message : String(err) });
  }
};
