/**
 * Serveren godtar bare en kommando regnet ut med serverens regelversjon, verken en
 * lavere eller en høyere (B-13, KA-U10; #386). Klienten regner med gjeldende regler,
 * og serveren får en regelversjon én under, lik og én over.
 */

import { describe, expect, it } from 'vitest';
import { GJELDENDE_REGLER } from '../regler/regelsett.ts';
import { minnebane } from './bane.ts';
import { bygg } from './baner.ts';
import { medRegler } from './kjoerer.ts';
import type { Handling } from './klient.ts';

const brev: Handling = {
  handling: 'brev',
  svar: [{ spor: 'grunnlag', navn: 'S-g1', resultat: 'avslaatt', varslet_i_tide: false }],
};

const SERVEREN = [
  ['én høyere enn kommandoens', 1, 'ANNEN_REGELVERSJON'],
  ['lik kommandoens', 0, 'godtatt'],
  ['én lavere enn kommandoens', -1, 'ANNEN_REGELVERSJON'],
] as const;

async function utfall(steg: (Handling | string)[], h: Handling, forskjell: number) {
  const k = await bygg(minnebane(), steg);
  k.kjerne = medRegler(
    { ...GJELDENDE_REGLER, versjon: GJELDENDE_REGLER.versjon + forskjell },
    k.kjerne
  );
  const u = await k.prov({ ...h, klientregler: 'n' });
  return u.godtatt ? 'godtatt' : u.avvisning.regel;
}

describe('regelversjonen i kommandoen må være serverens (B-13, KA-U10)', () => {
  it.each(SERVEREN)('et svar, med serverens regelversjon %s', async (_, forskjell, forventet) => {
    expect(await utfall(['krav_irreg'], brev, forskjell)).toBe(forventet);
  });

  it.each(SERVEREN)(
    'en revisjon av svaret, med serverens regelversjon %s',
    async (_, forskjell, forventet) => {
      const revisjon = {
        handling: 'revisjon',
        spor: 'grunnlag',
        resultat: 'avslaatt',
        varslet_i_tide: true,
      };
      expect(await utfall(['krav_irreg', brev], revisjon, forskjell)).toBe(forventet);
    }
  );

  it.each(SERVEREN)('en aksept, med serverens regelversjon %s', async (_, forskjell, forventet) => {
    expect(
      await utfall(['krav_irreg', brev], { handling: 'aksept', spor: 'grunnlag' }, forskjell)
    ).toBe(forventet);
  });
});
