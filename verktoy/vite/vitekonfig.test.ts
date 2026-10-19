/**
 * Prefiksregelen i `vite.config.ts` (F0b-8, #662) i både `vite dev` og
 * `vite preview`. Preview bruker `server.proxy` bare når `preview.proxy` ikke er
 * satt, og ser bare mellomvaren fra `configurePreviewServer` (#726).
 */

import type { Connect, Plugin } from 'vite';
import { describe, expect, it } from 'vitest';
import konfig from '../../vite.config.ts';

const tsServeren = (konfig.plugins ?? [])
  .flat()
  .find(
    (p): p is Plugin => !!p && typeof p === 'object' && 'name' in p && p.name === 'ts-serveren'
  );

/** URL-en mellomvaren gir forespørselen videre til proxyen. */
function urlEtter(krok: unknown, metode: string, url: string): string | undefined {
  const mellomvarer: Connect.NextHandleFunction[] = [];
  (krok as (s: { middlewares: { use(m: Connect.NextHandleFunction): void } }) => void)({
    middlewares: { use: (m) => mellomvarer.push(m) },
  });
  const req = { method: metode, url } as Connect.IncomingMessage;
  for (const m of mellomvarer) m(req, {} as never, () => {});
  return req.url;
}

describe('ts-serveren i vite.config.ts', () => {
  it('prefikser rutene til TS-serveren både i dev og i preview', () => {
    expect(tsServeren).toBeDefined();
    for (const krok of [tsServeren?.configureServer, tsServeren?.configurePreviewServer]) {
      expect(krok).toBeTypeOf('function');
      expect(urlEtter(krok, 'GET', '/api/csrf-token')).toBe('/__ts-serveren/api/csrf-token');
      expect(urlEtter(krok, 'POST', '/api/projects')).toBe('/api/projects');
    }
  });

  it('preview har ingen egen proxy, så den bruker server.proxy med prefiksregelen', () => {
    expect(konfig.preview?.proxy).toBeUndefined();
    expect(Object.keys(konfig.server?.proxy ?? {})).toContain('/__ts-serveren');
  });
});
