/**
 * Den lokale rutingen (F0b-8, #662): hele `/api` og webhooken går til TS-serveren,
 * også stiene Python hadde (#1026). TS-serveren gir 404 for en sti den ikke har.
 */

import { describe, expect, it } from 'vitest';
import { tilTsServeren } from '../ruting.ts';

describe('den lokale rutingen til TS-serveren', () => {
  it.each([
    '/api/auth/catenda/callback?state=x&code=y',
    '/api/csrf-token',
    '/api/projects?aktive=1',
    '/api/kjerne/saker/1/kommandoer',
    '/api/projects/p1/members/m1',
    '/api/projects/p1/saker',
    '/api/projects/p1/deactivate',
    '/api/cases/1/state',
    '/api/forsering/1',
    '/api/health',
    '/api/',
    '/api',
    '/webhook/catenda',
    '/webhook/catenda/hemmelig',
  ])('%s går til TS', (url) => {
    expect(tilTsServeren(url)).toBe(true);
  });

  it.each(['/apix/saker', '/saker/1?x=/api/', '/webhook/catendax/hemmelig', '/'])(
    '%s er SPA-en',
    (url) => {
      expect(tilTsServeren(url)).toBe(false);
    }
  );
});
