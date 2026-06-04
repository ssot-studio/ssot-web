import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@repo/ui/styles.css';
import './styles/app.css';
import { App } from './App';

// W3C ResizeObserver 사양이 의도적으로 던지는 회수성 경고 — 실제 예외 아님.
// @xyflow/react 의 Controls/MiniMap/pane 이 같은 tick 에 재측정해 viewport·layout 변화마다 발생한다.
// window error 채널에 새는 것을 차단해 agent-devtools 카운터가 잡지 않게 한다.
const RO_LOOP_MSG = /^ResizeObserver loop (completed with undelivered notifications|limit exceeded)/;
window.addEventListener('error', (event) => {
  if (typeof event.message === 'string' && RO_LOOP_MSG.test(event.message)) {
    event.stopImmediatePropagation();
    event.preventDefault();
  }
});

// agent-devtools 위젯은 여기서 수동 mount 하지 않는다 (의도된 부재).
// `@agent-devtools/vite` 플러그인이 `apply: 'serve'` 로 dev 서버에서만 동작하며
// 위젯 bootstrap 을 dev HTML 에 주입한다 — 즉 dev-only mount 는 플러그인이 소유한다
// (vite.config.ts 의 dev-only 2-layer guard 주석 참조). 프로덕션 build 에는 플러그인이
// 통째로 제외되므로 위젯 심볼이 번들에 진입하지 않는다. 여기에 `import.meta.env.DEV`
// 가드를 둔 별도 mount 를 추가하면 플러그인 주입과 이중 mount 가 되어 금지한다.

const container = document.getElementById('app');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
