import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  resolve: {
    conditions: ['browser', 'svelte'],
  },
  server: {
    port: 5173,
    // Legges til SvelteKits liste: frontend importerer delte regler fra backend/constants
    // og TS-kjernen fra kjerne/ ($kjerne).
    fs: { allow: ['backend/constants', 'kjerne'] },
    proxy: {
      // TS-serveren (B-18, #347): `npm run server -- 8090` mot testbasen.
      '/api/kjerne': {
        target: 'http://127.0.0.1:8090',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
  test: {
    include: [
      'src/**/*.test.ts',
      'kjerne/**/*.test.ts',
      'sprakprove/**/*.test.ts',
      'server/**/*.test.ts',
    ],
    environmentMatchGlobs: [['src/lib/components/**/*.test.ts', 'jsdom']],
    setupFiles: ['src/test-setup.ts'],
  },
});
