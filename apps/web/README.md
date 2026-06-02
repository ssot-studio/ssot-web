# SSOT Studio

Single Source of Truth(SSOT) 그래프 뷰어. `docs/ssot/` 의 노드 markdown + `_catalog.json` 을
파싱·정규화·구조판별하여 그래프/트리/매트릭스/노드상세 4개 뷰로 시각화한다.

## 모노레포 구조

| 위치 | 책임 |
|------|------|
| `packages/core` | SSOT 도메인 단일 진실 — 파서 · 정규화 모델 · 엣지 추출 · 구조 판별 · verify · coverage. 의존성 0, framework-agnostic 순수 TS (Node + 브라우저 공통) |
| `packages/ui` | 디자인 시스템. SSOT 도메인 무지 — 범용 view-prop 만 받는다. CVA + 시맨틱 토큰(Tailwind v4 @theme) |
| `packages/cli` | `ssot` CLI. core 소비. 결정적 1회성 명령(build-graph / verify / coverage) + serve 진입점 |
| `packages/daemon` | 파일워처 데몬. core 소비. chokidar watch → 증분 재파싱 → SQLite 인덱스 → REST/SSE push |
| `apps/web` | 뷰어. ui + core 소비. React 19 + Vite + TanStack Router/Query. 정적 모드(_catalog.json) + 라이브 모드(daemon) |

## 의존 방향 (단방향 강제)

```
web ──▶ ui, core
cli ──▶ core
daemon ──▶ core
core ──▶ (없음 — 그래프 최하단)
```

- `ui ↔ core` 상호 무지. `core` 는 어떤 패키지도 import 하지 않는다.
- tsconfig project references + ESLint 경계 룰로 컴파일타임 강제.

## 스택

- pnpm workspace + Turborepo
- React 19 / TypeScript strict / Vite
- Tailwind v4 (CSS-first `@theme` 시맨틱 토큰 — `tailwind.config` 토큰 정의 금지)
- TanStack Router (라우팅) / TanStack Query (정적 fetch + daemon SSE 상태)

## 개발

```bash
pnpm install
pnpm dev        # ui watch + core watch + web dev server
pnpm typecheck
pnpm build
```

> 현재는 골조(빈 구조 + 설정)만 존재한다. 비즈니스 로직은 다음 단계에서 구현한다.
