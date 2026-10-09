/**
 * Domenetabellen kjørt mot TS-kjernen i minnet (#274, port 1). Samme bevis-saker
 * som Python-banene; kjente avvik i Python er ikke kjente avvik her, så alle
 * forløp i flyten skal holde.
 */

import { describe, expect, it } from 'vitest';
import { FLYTEN, kjor } from './korpus.ts';
import { RADER } from '../kjerne/kontrakt.ts';

describe('bevis-sakene i flyten mot TS-kjernen', () => {
  it('dekker alle radene i kontrakten', () => {
    const dekket = new Set(FLYTEN.flatMap((f) => f.rader));
    expect(RADER.filter((r) => !dekket.has(r))).toEqual([]);
  });

  it.each(FLYTEN.map((f) => [f.id, f] as const))('%s', (_id, forlop) => {
    kjor(forlop);
  });
});
