// @repo/ui — 디자인 시스템 / 공통 React 컴포넌트.
// SSOT 도메인에 완전히 무지하다 — 도메인 타입(NormalizedNode 등)을 받지 않고
// 범용 view-model prop(label, tone, kind-string 등)만 받는다.
// 색상은 CVA variants + 시맨틱 토큰(globals.css)으로만 표현한다.
//
// 도메인 매핑(confidence/authority/kind/rel → tone/variant)은 소비자(web)의 책임이다.

// 라이브러리 진입점에서 토큰 + xyflow 스타일을 포함시켜 빌드 시 style.css 산출물을 만든다.
import './styles/globals.css';

export { cn } from './lib';

export { Panel } from './components/Panel';
export type {
  PanelRootProps,
  PanelHeaderProps,
  PanelBodyProps,
  PanelFooterProps,
  PanelTone,
  PanelPadding,
} from './components/Panel';

export { Badge } from './components/Badge';
export type {
  BadgeProps,
  BadgeTone,
  BadgeVariant,
  BadgeSize,
} from './components/Badge';

export { NodeCard } from './components/NodeCard';
export type { NodeCardProps, NodeCardTone } from './components/NodeCard';

export { TreeView } from './components/TreeView';
export type { TreeNode, TreeViewProps } from './components/TreeView';

export { GraphCanvas } from './components/GraphCanvas';
export type {
  GraphCanvasProps,
  GraphCanvasNode,
  GraphCanvasEdge,
  GraphLayoutDirection,
  GraphColorMode,
} from './components/GraphCanvas';

export { DetailPanel } from './components/DetailPanel';
export type {
  DetailPanelRootProps,
  DetailPanelHeaderProps,
  DetailPanelSectionProps,
  DetailPanelFieldProps,
} from './components/DetailPanel';

export { MarkdownView } from './components/MarkdownView';
export type { MarkdownViewProps } from './components/MarkdownView';
