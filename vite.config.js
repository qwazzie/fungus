import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    proxy: { '/api': 'http://localhost:10000' }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
