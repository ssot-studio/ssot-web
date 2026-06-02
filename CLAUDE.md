# ssot-web — 작업 규칙

SSOT 뷰어. 데이터 무관 범용 — 어느 프로젝트 SSOT 데이터든 렌더한다. 자체 배포 안 함(데이터 레포 CI 가 빌드).

## 불변 규칙

| 규칙 | 사유 |
|------|------|
| **`vendor/` 직접 수정 금지** | `ssot-core` 가 원본. 래퍼 `vendor-sync.mjs` 로 갱신 |
| **`@repo/core` import 유지** | vendor 가 `@repo/core` 패키지로 노출됨(workspace). 경로 재작성 불필요 |
| **데이터/도메인 지식 박지 말 것** | 범용 뷰어. 특정 프로젝트(예: my-project) 가정 금지 |
| **자체 gh-pages 배포 추가 금지** | 호스팅은 각 데이터 레포 CI 책임 (데이터=비공개 자산) |

## 변경 후 필수

- `pnpm typecheck` · `pnpm build` 통과
- core 변경분이 필요하면 래퍼에서 vendor-sync 먼저
