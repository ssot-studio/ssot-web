import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'node:path';

// 런타임 의존성은 번들에 포함하지 않고 외부화한다 (React/xyflow context 중복 방지 + 번들 경량화).
// 소비자(web)가 워크스페이스에서 동일 인스턴스를 해석한다.
const external = [
  'react',
  'react-dom',
  'react/jsx-runtime',
  '@xyflow/react',
  '@dagrejs/dagre',
  'react-markdown',
  'remark-gfm',
];

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  plugins: [react(), tailwindcss(), dts({ rollupTypes: true })],
  build: {
    cssCodeSplit: false,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'index.js',
      cssFileName: 'style',
    },
    rollupOptions: {
      external,
    },
  },
});
