import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { exclude: ['**/node_modules/**', '**/.worktrees/**', '**/dist/**', '**/server-dist/**'] },
  server: { port: 5173, proxy: { '/api': 'http://127.0.0.1:4310' } },
  build: { target: 'es2022' },
});
