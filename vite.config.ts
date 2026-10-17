import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * Det TS-serveren svarer på (F0b-8, #662): innloggingen, CSRF-tokenet, kjernen og
 * `GET` av prosjektene. Resten av `/api/projects`, som opprettelsen, endringen,
 * deaktiveringen og medlemmene, ligger fortsatt i Python.
 */
export function tilTsServeren(metode: string, url: string): boolean {
  const sti = url.split('?', 1)[0];
  return (
    /^\/api\/(kjerne|auth)(\/|$)/.test(sti) ||
    sti === '/api/csrf-token' ||
    (metode === 'GET' && /^\/api\/projects(\/[^/]+)?\/?$/.test(sti))
  );
}

const TS_PREFIKS = '/__ts-serveren';

/**
 * Vite-proxyen velger regel etter stien alene, så metoden avgjøres her, før
 * proxyen, med et prefiks som regelen for TS-serveren fjerner igjen.
 */
function tsServeren(): Plugin {
  return {
    name: 'ts-serveren',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url && tilTsServeren(req.method ?? 'GET', req.url)) req.url = TS_PREFIKS + req.url;
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [tsServeren(), tailwindcss(), sveltekit()],
  resolve: {
    conditions: ['browser', 'svelte'],
  },
  server: {
    port: 5173,
    // Legges til SvelteKits liste: frontend importerer delte regler fra backend/constants
    // og TS-kjernen fra kjerne/ ($kjerne).
    fs: { allow: ['backend/constants', 'kjerne'] },
    proxy: {
      // TS-serveren (B-18, F0b-8): `npm run server -- 8090` mot testbasen.
      [TS_PREFIKS]: {
        target: 'http://127.0.0.1:8090',
        changeOrigin: true,
        rewrite: (url) => url.slice(TS_PREFIKS.length),
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
      '.claude/hooks/*.test.ts',
    ],
    environmentMatchGlobs: [['src/lib/components/**/*.test.ts', 'jsdom']],
    setupFiles: ['src/test-setup.ts'],
  },
});
