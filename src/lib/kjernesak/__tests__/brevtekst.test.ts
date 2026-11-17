/** Typevakten for et brev med tekst (#2071 punkt 2). */

import { describe, expect, it } from 'vitest';
import { harTekst, type Brev } from '#lib/kjernesak/brevtekst.ts';
import type { Avsnitt } from '#kjerne/typer.ts';

const hode = { brevnummer: 1, brevtittel: null, merking: null, deresRef: [] };

describe('harTekst', () => {
  it('et brev med avsnitt har tekst', () => {
    expect(harTekst({ ...hode, avsnitt: [] as Avsnitt[] })).toBe(true);
  });

  it('et registrert brev, der kjernen ikke lager tekst (`avsnitt: null`), har ikke tekst', () => {
    expect(harTekst({ ...hode, avsnitt: null })).toBe(false);
  });

  it('en avvisning, en programfeil og et manglende brev har ikke tekst', () => {
    const avvisning = { avvisning: { regel: 'X', melding: 'Nei.' } } as unknown as Brev;
    expect(harTekst(avvisning)).toBe(false);
    expect(harTekst({ programfeil: 'feil' })).toBe(false);
    expect(harTekst(null)).toBe(false);
  });
});
