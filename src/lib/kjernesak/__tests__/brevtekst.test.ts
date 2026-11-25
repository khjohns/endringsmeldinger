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
 * tid, og klokka på brukerens maskin avgjør ikke teksten. Svar C 25.11 i #2340: klokka i basen
 * pluss tiden som har gått i nettleseren siden lastingen. Setningen om aksept etter akseptfristen
 * kommer fra HF-U23 punkt 7. Midnatt 6. oktober 2026 i norsk tid er 22.00 UTC.
 */
describe('datoen brevkontrollen lager teksten med (U-5 i BF-46)', () => {
  afterEach(() => vi.useRealTimers());

  const SETNINGEN = 'Aksepten er sendt etter akseptfristen 5. oktober 2026 i byggherrens svar.';

  // Byggherrens svar sendes 5. oktober med akseptfrist samme dag.
  const sakMedFrist = () => {
    const s = sakMedKrav();
    const delvis = svar('vederlag', s.krav('vederlag'), VEDERLAG_DELVIS[0], VEDERLAG_DELVIS[1]);
    s.send('BH', { type: 'brev', svar: [{ ...delvis, akseptfrist: '2026-10-05' }] });
    return s;
  };
  /** Aksepten med klokka i basen og nettleserens klokke ved lastingen, og nettleserens klokke nå. */
  const aksept = (iBasen: string, nettleserenVedLastingen: string, nettleserenNaa: string) => {
    vi.useFakeTimers({ now: new Date(nettleserenNaa), toFake: ['Date'] });
    const s = sakMedFrist();
    const kommando = {
      type: 'aksept',
      spor: 'vederlag',
      svar: s.u().spor.vederlag.gjeldendeSvar!.id,
      regelversjon: KJERNE.regler.versjon,
    };
    const merking = {
      sakskode: KOE_17,
      kontraktsforkortelse: 'K201',
      klokka: { iBasen, iNettleserenVedLastingen: Date.parse(nettleserenVedLastingen) },
    };
    const brev = brevFor(kommando, SAK, 'TE', merking, s.journal, KJERNE, new Map(), true);
    expect(harTekst(brev), 'Forutsetning: kjernen lager brevet').toBe(true);
    return (brev as BrevMedTekst).avsnitt.map((a) => a.laast).join('\n');
  };

  it('nettleseren viser akseptfristen og basen dagen etter: brevet sier at aksepten er sendt etter fristen', () => {
    const t = '2026-10-05T21:00:00Z';
    expect(aksept('2026-10-06T08:00:00Z', t, t)).toContain(SETNINGEN);
  });

  it('nettleseren viser dagen etter akseptfristen og basen fristen: brevet sier ingenting om fristen (kontrollsak)', () => {
    const t = '2026-10-06T08:00:00Z';
    expect(aksept('2026-10-05T08:00:00Z', t, t)).not.toContain('akseptfristen');
  });

  // Funn 1b i reviewet av #2340: saken er lastet før midnatt, og datoen skifter før sendingen.
  it('siden står åpen over midnatt: brevet får den nye datoen uten en ny lasting', () => {
    const lastet = '2026-10-05T21:50:00Z';
    expect(aksept(lastet, lastet, '2026-10-05T22:10:00Z')).toContain(SETNINGEN);
  });

  // Funnet fra Codex i #2340: maskinklokka går 20 minutter foran basen.
  it('maskinklokka går foran og har passert midnatt, basen ikke: brevet sier ingenting om fristen', () => {
    expect(
      aksept('2026-10-05T21:30:00Z', '2026-10-05T21:50:00Z', '2026-10-05T22:05:00Z')
    ).not.toContain('akseptfristen');
  });
});
