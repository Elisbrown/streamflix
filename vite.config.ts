import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // LG webOS 6 uses Chromium 79. Do not emit modern syntax that the TV
  // engine cannot parse.
  build: {
    target: 'chrome79',
    cssTarget: 'chrome79',
    sourcemap: false,
    modulePreload: false,
  },
  esbuild: {
    target: 'chrome79',
  },
  server: {
    host: '0.0.0.0',
    port: 4173,
  },
});
