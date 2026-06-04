import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@repo/ui/styles.css';
import './styles/app.css';
import { App } from './App';

// W3C ResizeObserver loop-detection 은 콜백이 동기로 호출됐을 때만 트립된다 —
// 콜백을 다음 frame 으로 미루면 spec 의 loop 가 형성되지 않아 브라우저가
// `error` 를 dispatch 하지 않는다. capture-phase 로 일찍 등록된 instrumentation
// (agent-devtools 등) 의 사후 차단 race 자체가 필요 없어진다.
const NativeResizeObserver = window.ResizeObserver;
if (NativeResizeObserver) {
  window.ResizeObserver = class extends NativeResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      super((entries, observer) => {
        window.requestAnimationFrame(() => {
          try {
            callback(entries, observer);
          } catch {
            /* disconnect 된 observer 가 한 tick 늦게 호출되는 경우 보호. */
          }
        });
      });
    }
  };
}

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
