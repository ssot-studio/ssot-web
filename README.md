# ssot-web

SSOT 뷰어 — 데이터 구조(그래프/트리/매트릭스)별로 SSOT 노드를 시각화한다. 노드 클릭·깊이 탐색·태그 필터·
드래그 리사이즈 상세 패널을 제공한다. **이 레포는 자체 배포하지 않는다** — 데이터가 각 프로젝트 자산(비공개)이라,
각 데이터 레포의 CI 가 이 web 을 빌드해 자기 데이터를 주입한 뒤 gh-pages 로 호스팅한다.

## 구조 (내부 pnpm workspace)

| 위치 | 역할 |
|------|------|
| `apps/web` | 뷰어 앱 (React 19 · TanStack Router/Query · Vite) |
| `packages/ui` | 디자인 시스템 / 그래프 컴포넌트 (@xyflow, dagre) |
| `packages/cli` · `packages/daemon` | 로컬 dev watch 도구 (실시간 미리보기) |
| `vendor/` | `@ssot-studio/core` 빌드물 — `@repo/core` 패키지로 노출(import 무수정) |

## 빌드

```bash
pnpm install
pnpm build        # apps/web 빌드 → dist (데이터 레포 CI 가 가져감)
```

## core 갱신

`ssot-core` 수정 시 래퍼의 `vendor-sync.mjs` 로 `vendor/` 를 갱신한다(직접 수정 금지).

## org

`https://github.com/ssot-studio` (public). 형제: `ssot-core`(로직), `ssot-plugin`(플러그인).
