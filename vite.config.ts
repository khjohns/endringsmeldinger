import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import type { Connect, Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { tilTsServeren } from './server/ruting.ts';

const TS_PREFIKS = '/__ts-serveren';

/**
 * Vite-proxyen velger regel etter stien alene, så metoden avgjøres her, før
 * proxyen, med et prefiks som regelen for TS-serveren fjerner igjen.
 */
function tsServeren(): Plugin {
  const prefiks = (server: { middlewares: Connect.Server }): void => {
    server.middlewares.use((req, _res, next) => {
      if (req.url && tilTsServeren(req.method ?? 'GET', req.url)) req.url = TS_PREFIKS + req.url;
      next();
    });
  };
  // `vite preview` bruker også proxyen i `server.proxy`.
  return { name: 'ts-serveren', configureServer: prefiks, configurePreviewServer: prefiks };
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
  // Ett prosjekt per del, så oppsettet kjøres bare når en fil i delen er med: Testing
  // Library bare for frontenden, og malen for SQL Server-basene bare for serveren (#930, #934).
  test: {
    // Prosjektene arver grensen herfra; `--hookTimeout` når dem ikke (feilinnfoering.ts).
    ...(process.env.KOE_HOOKGRENSE && { hookTimeout: Number(process.env.KOE_HOOKGRENSE) }),
    projects: [
      {
        extends: true,
        test: {
          name: 'frontend',
          include: ['src/**/*.test.ts'],
          exclude: ['src/lib/components/**/*.test.ts'],
          setupFiles: ['src/test-setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'frontend-komponenter',
          include: ['src/lib/components/**/*.test.ts'],
          environment: 'jsdom',
          setupFiles: ['src/test-setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'node',
          include: [
            'kjerne/**/*.test.ts',
            'sprakprove/**/*.test.ts',
            '.claude/hooks/*.test.ts',
            'verktoy/**/*.test.ts',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'server',
          include: ['server/**/*.test.ts'],
          globalSetup: ['server/tester/globalt_oppsett.ts'],
        },
      },
    ],
  },
});
