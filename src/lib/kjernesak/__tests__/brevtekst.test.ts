/** Typevakten for et brev med tekst (#2071 punkt 2), og datoen brevkontrollen lager teksten med. */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { brevFor, harTekst, type Brev, type BrevMedTekst } from '#lib/kjernesak/brevtekst.ts';
import type { Avsnitt } from '#kjerne/typer.ts';
import { KJERNE } from '#kjerne/versjon.ts';
import { KOE_17, SAK, VEDERLAG_DELVIS, sakMedKrav, svar } from '#kjerne/tester/brevsak.ts';

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

/**
 * U-5 i BF-46 og svar 1 A (oppdragsgiver 24.11): brevkontrollen bruker datoen i basen, i norsk
 * tid, og klokka på brukerens maskin avgjør ikke teksten. Setningen om aksept etter akseptfristen
 * kommer fra HF-U23 punkt 7.
 */
describe('datoen brevkontrollen lager teksten med (U-5 i BF-46)', () => {
  afterEach(() => vi.useRealTimers());

  // Byggherrens svar sendes 5. oktober med akseptfrist samme dag.
  const sakMedFrist = () => {
    const s = sakMedKrav();
    const delvis = svar('vederlag', s.krav('vederlag'), VEDERLAG_DELVIS[0], VEDERLAG_DELVIS[1]);
    s.send('BH', { type: 'brev', svar: [{ ...delvis, akseptfrist: '2026-10-05' }] });
    return s;
  };
  const akseptMed = (nettleserklokke: string, dagensDato: string) => {
    vi.useFakeTimers({ now: new Date(nettleserklokke), toFake: ['Date'] });
    const s = sakMedFrist();
    const aksept = {
      type: 'aksept',
      spor: 'vederlag',
      svar: s.u().spor.vederlag.gjeldendeSvar!.id,
      regelversjon: KJERNE.regler.versjon,
    };
    const merking = { sakskode: KOE_17, kontraktsforkortelse: 'K201', dagensDato };
    const brev = brevFor(aksept, SAK, 'TE', merking, s.journal, KJERNE, new Map(), true);
    expect(harTekst(brev), 'Forutsetning: kjernen lager brevet').toBe(true);
    return (brev as BrevMedTekst).avsnitt.map((a) => a.laast).join('\n');
  };

  it('nettleseren viser akseptfristen og basen dagen etter: brevet sier at aksepten er sendt etter fristen', () => {
    expect(akseptMed('2026-10-05T21:00:00Z', '2026-10-06')).toContain(
      'Aksepten er sendt etter akseptfristen 5. oktober 2026 i byggherrens svar.'
    );
  });

  it('nettleseren viser dagen etter akseptfristen og basen fristen: brevet sier ingenting om fristen (kontrollsak)', () => {
    expect(akseptMed('2026-10-06T08:00:00Z', '2026-10-05')).not.toContain('akseptfristen');
  });
});
