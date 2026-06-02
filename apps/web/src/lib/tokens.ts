// 시맨틱 의미색 토큰 매핑 — kind/rel/confidence → CSS 변수 참조.
// 컴포넌트는 이 함수가 반환한 var() 를 동적 CSS 변수로 주입한다(--accent).
// (05-styling: 팔레트 직접참조·하드코딩 금지. 여기서는 시맨틱 토큰 var() 만 반환.)

import type { Confidence, NodeKind, RelType } from '@/domain/types';

const KIND_VAR: Record<NodeKind, string> = {
  Platform: 'var(--kind-platform)',
  Persona: 'var(--kind-persona)',
  Domain: 'var(--kind-domain)',
  Capability: 'var(--kind-capability)',
  Screen: 'var(--kind-screen)',
  Endpoint: 'var(--kind-endpoint)',
  Flow: 'var(--kind-flow)',
  SystemComponent: 'var(--kind-component)',
  Integration: 'var(--kind-integration)',
  Concept: 'var(--kind-concept)',
  Invariant: 'var(--kind-invariant)',
  EngineeringRule: 'var(--kind-rule)',
  Decision: 'var(--kind-decision)',
};

const REL_VAR: Record<string, string> = {
  realizedBy: 'var(--rel-realizedby)',
  servesPersona: 'var(--rel-servespersona)',
  governedBy: 'var(--rel-governedby)',
  governs: 'var(--rel-governs)',
  impacts: 'var(--rel-impacts)',
  dependsOn: 'var(--rel-dependson)',
  decidedBy: 'var(--rel-decidedby)',
  relatesTo: 'var(--rel-relatesto)',
  'relatesTo:owns': 'var(--rel-relatesto)',
};

const CONFIDENCE_VAR: Record<Confidence, string> = {
  high: 'var(--confidence-high)',
  inferred: 'var(--confidence-inferred)',
  unverified: 'var(--confidence-unverified)',
};

// 태그 네임스페이스 → 시맨틱 의미색. 새 토큰을 만들지 않고 기존 kind/rel/confidence
// 토큰을 재사용한다(05-styling: 팔레트 직접참조·하드코딩 금지 — var() 만 반환).
const NAMESPACE_VAR: Record<string, string> = {
  domain: 'var(--kind-domain)',
  area: 'var(--kind-capability)',
  status: 'var(--rel-realizedby)',
  team: 'var(--kind-persona)',
  version: 'var(--kind-flow)',
  type: 'var(--kind-component)',
  risk: 'var(--confidence-unverified)',
};

export function kindColorVar(kind: NodeKind): string {
  return KIND_VAR[kind];
}

export function relColorVar(rel: RelType | string): string {
  return REL_VAR[rel] ?? 'var(--rel-default)';
}

export function confidenceColorVar(confidence: Confidence): string {
  return CONFIDENCE_VAR[confidence] ?? 'var(--rel-default)';
}

export function namespaceColorVar(namespace: string): string {
  return NAMESPACE_VAR[namespace] ?? 'var(--rel-default)';
}
