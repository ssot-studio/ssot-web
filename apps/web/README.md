# apps/web — SSOT 뷰어 앱

SSOT 데이터를 **그래프·트리·표·노드상세** 뷰로 렌더하는 React 앱. React 19 · Vite · TanStack Router/Query · Tailwind v4(`@theme` 시맨틱 토큰).

데이터는 빌드 입력이 아니라 런타임 자산이다 — `public/<name>` 에 둔 SSOT 의 `_catalog.json` + 노드 `.md` 를 fetch 한다. 읽을 위치는 `VITE_SSOT_DATA`(기본 `/ssot`)로 정한다.

## 실행

```bash
pnpm dev          # 기본 public/ssot, 포트 5180
pnpm typecheck
pnpm build        # tsc + vite build (산출물에서 데이터 제외 — 주입은 별도 단계)
```

여러 SSOT 를 데이터·포트 달리해 동시에 띄우는 법은 루트 [README](../../README.md#로컬-실행-여러-ssot-동시) 참고.
