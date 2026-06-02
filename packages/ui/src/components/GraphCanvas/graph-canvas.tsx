import { useEffect, useMemo } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type NodeMouseHandler,
  type NodeTypes,
  type Node,
} from '@xyflow/react';
import { cn } from '@/lib';
import { SsotNode } from './ssot-node';
import { computeDimmedIds, layoutGraph, type SsotNodeData } from './graph-layout';
import type { GraphCanvasProps } from './graph-canvas.types';

const nodeTypes: NodeTypes = { ssot: SsotNode };

function GraphCanvasInner({
  nodes,
  edges,
  selectedId,
  onNodeSelect,
  direction = 'LR',
  focusNeighbors = false,
  colorMode = 'light',
  showMiniMap = true,
  showControls = true,
}: Omit<GraphCanvasProps, 'className' | 'data-uid' | 'emptyState'>): React.JSX.Element {
  const { rfNodes, rfEdges } = useMemo(() => {
    const dimmedIds =
      focusNeighbors && selectedId
        ? computeDimmedIds(nodes, edges, selectedId)
        : undefined;
    const laid = layoutGraph(nodes, edges, direction, { selectedId, dimmedIds });
    return { rfNodes: laid.nodes, rfEdges: laid.edges };
  }, [nodes, edges, direction, selectedId, focusNeighbors]);

  const [stateNodes, setStateNodes, onNodesChange] = useNodesState<Node<SsotNodeData>>(rfNodes);
  const [stateEdges, setStateEdges, onEdgesChange] = useEdgesState(rfEdges);

  // 입력/레이아웃이 바뀌면 상태를 재계산된 그래프로 동기화한다.
  useEffect(() => {
    setStateNodes(rfNodes);
  }, [rfNodes, setStateNodes]);
  useEffect(() => {
    setStateEdges(rfEdges);
  }, [rfEdges, setStateEdges]);

  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    onNodeSelect?.(node.id);
  };

  return (
    <ReactFlow
      nodes={stateNodes}
      edges={stateEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      nodeTypes={nodeTypes}
      colorMode={colorMode}
      fitView
      proOptions={{ hideAttribution: true }}
      nodesDraggable
      nodesConnectable={false}
      elementsSelectable
      minZoom={0.1}
      maxZoom={2}
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--graph-dot)" />
      {showControls ? <Controls showInteractive={false} /> : null}
      {showMiniMap ? (
        <MiniMap
          pannable
          zoomable
          nodeColor="var(--graph-node-border)"
          maskColor="var(--graph-minimap-mask)"
        />
      ) : null}
    </ReactFlow>
  );
}

/**
 * @xyflow/react 그래프 시각화 래퍼. dagre 로 방향성 계층 레이아웃을 계산한다.
 * 도메인 무지 — GraphCanvasNode/Edge view-model 과 시맨틱 tone 만 받는다.
 * 색상은 전부 시맨틱 토큰; 라이트/다크는 colorMode + 토큰 재정의로 자동 대응한다.
 *
 * focus mode: focusNeighbors + selectedId 지정 시 선택 노드의 1-hop 이웃만 강조하고
 * 나머지를 dim 처리한다 (편중 그래프 탐색용).
 */
export function GraphCanvas({
  className,
  'data-uid': dataUid,
  emptyState,
  nodes,
  ...rest
}: GraphCanvasProps): React.JSX.Element {
  if (nodes.length === 0) {
    return (
      <div
        data-uid={dataUid}
        className={cn(
          'flex h-full w-full items-center justify-center bg-(--graph-bg) text-sm text-muted-foreground',
          className
        )}
      >
        {emptyState ?? 'No graph data'}
      </div>
    );
  }

  return (
    <div data-uid={dataUid} className={cn('h-full w-full', className)}>
      <ReactFlowProvider>
        <GraphCanvasInner nodes={nodes} {...rest} />
      </ReactFlowProvider>
    </div>
  );
}
