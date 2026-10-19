/**
 * Den lokale rutingen (F0b-8, #662): TS-serveren svarer på innloggingen og
 * `/api/csrf-token` (F0b-5a, #659), kjernen, `GET` av prosjektene (F0b-6, #660) og
 * medlemmene (F-1a, #820). Opprettelsen, endringen og deaktiveringen av
 * prosjektene ligger fortsatt i Python (`backend/routes/project_routes.py`), og
 * ville fått 404 fra TS.
 */

import { describe, expect, it } from 'vitest';
import { tilTsServeren } from '../ruting.ts';

describe('den lokale rutingen til TS-serveren', () => {
  it.each([
    ['GET', '/api/auth/catenda/login?return_to=/saker'],
    ['GET', '/api/auth/catenda/callback?state=x&code=y'],
    ['GET', '/api/auth/session'],
    ['POST', '/api/auth/logout'],
    ['GET', '/api/csrf-token'],
    ['GET', '/api/projects'],
    ['GET', '/api/projects?aktive=1'],
    ['GET', '/api/projects/p1'],
    ['GET', '/api/kjerne/saker/1'],
    ['POST', '/api/kjerne/saker/1/kommandoer'],
    ['GET', '/api/projects/p1/members'],
    ['PATCH', '/api/projects/p1/members/m1'],
    ['POST', '/api/projects/p1/members/sync'],
    ['POST', '/webhook/catenda/hemmelig'],
  ])('%s %s går til TS', (metode, url) => {
    expect(tilTsServeren(metode, url)).toBe(true);
  });

  it.each([
    ['POST', '/api/projects'],
    ['PATCH', '/api/projects/p1'],
    ['PATCH', '/api/projects/p1/deactivate'],
    ['GET', '/api/projects/p1/membersx'],
    ['GET', '/api/cases/1/state'],
    ['GET', '/api/authx'],
    ['GET', '/api/csrf-token/x'],
    ['POST', '/webhook/catendax/hemmelig'],
  ])('%s %s blir i Python', (metode, url) => {
    expect(tilTsServeren(metode, url)).toBe(false);
  });
});
