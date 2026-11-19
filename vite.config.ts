import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'esnext',
    outDir: 'docs',
  },
  server: {
    port: 3000,
    open: false,
  },
});
