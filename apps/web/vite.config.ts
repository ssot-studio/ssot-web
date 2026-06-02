import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { agentDevtools } from '@agent-devtools/vite';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * SSOT 데이터(`public/ssot`)는 빌드 입력이 아니라 런타임 자산이다.
 * vite 는 publicDir 전체를 dist 로 복사하므로 심볼릭 링크된 `public/ssot` 도
 * dist/ssot 로 베이킹된다 — 이러면 데이터가 `web#build` 산출물에 섞여
 * (1) 데이터가 빌드 해시와 무관(gitignored)해 turbo 가 stale 캐시를 적중시키고
 * (2) 데이터 변경마다 빌드를 강제하게 된다.
 * 그래서 빌드 산출물에서 dist/ssot 를 제거해 build 를 데이터-프리로 만들고,
 * 데이터 주입은 별도 `sync-data` 단계가 단독으로 소유한다(배포 inject 와 동일 사상).
 */
function stripDataFromBuild(): Plugin {
  return {
    name: 'ssot-strip-data-from-build',
    apply: 'build',
    closeBundle() {
      rmSync(resolve(__dirname, 'dist/ssot'), { recursive: true, force: true });
    },
  };
}

/**
 * agent-devtools — SSOT 뷰어 실행 중 브라우저에서 노드/코드를 Claude Code
 * (로컬 OAuth)로 편집하는 진입점.
 *
 * Dev-only 누출 차단은 플러그인 자체의 2-layer guard 에 위임한다:
 *   - Layer 1 (build-time exclusion): 플러그인이 `apply: 'serve'` 를 선언하므로
 *     `vite build` 는 플러그인을 통째로 무시한다 — `transformIndexHtml` 이 호출되지
 *     않아 위젯 bootstrap 도, pairing-token inline <script> 도 프로덕션 HTML 에
 *     섞이지 않는다. 위젯 코드는 프로덕션 module graph 에 애초에 진입하지 않는다.
 *   - Layer 2 (runtime NODE_ENV gate): Layer 1 이 우회돼도 `mountAgentDevtools` /
 *     `startAgentDevtoolsServer` 가 `NODE_ENV === 'production'` 에서 throw 한다.
 *
 * 그래서 앱 코드(`src/main.tsx`)에는 별도 mount 호출을 두지 않는다 — 위젯 마운트
 * 전 lifecycle(에이전트 서버 spawn, in-process pairing-token 발급, dev HTML 주입)을
 * 플러그인이 전적으로 소유한다. examples/react-vite 와 동일한 통합 형태다.
 * framework 는 host package.json(`react`)으로 auto-detect → `@agent-devtools/react`.
 *
 * workspace: 에이전트(Claude Code child process)의 cwd + picker source-slice 가
 * read/edit 할 수 있는 경계. SSOT 문서·소스는 monorepo 루트 아래에 있으므로 루트로
 * 잡는다(apps/web 기준 두 단계 위).
 *
 * TODO(SSOT 특화): 1차는 agent-devtools 기본 위젯 통합까지다. SSOT 노드 → 문서 편집
 * 특화 매핑(그래프 노드 클릭 → 해당 frontmatter/문서 파일을 picked evidence 로 패키징,
 * 노드 id ↔ 문서 경로 resolver)은 후속 작업에서 picker preamble / 커스텀 transport
 * 단에 얹는다. 그 매핑이 들어갈 자리가 이 plugin 옵션(workspace/importFrom)과
 * @agent-devtools/core 의 context-preamble seam 이다.
 */
const agentDevtoolsPlugin = agentDevtools({
  // SSOT 문서/소스가 사는 monorepo 루트를 에이전트 작업 경계로 둔다.
  workspace: resolve(__dirname, '..', '..'),
});

export default defineConfig({
  plugins: [react(), tailwindcss(), agentDevtoolsPlugin, stripDataFromBuild()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5180,
  },
});
