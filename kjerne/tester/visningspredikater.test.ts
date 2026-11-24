/**
 * Predikatene visningen leser i stedet for en egen kopi (#2120): forseringen etter FO-U1
 * (`prinsipaltAvslaatteDager`), frafallet etter vedtaket 05.10 for #235 (`kanFrafalle`, som også
 * kontrollen av svaret leser), akseptfristen etter HF-U23 og MM-U24 (`akseptfristen`) og
 * innsigelsen i vederlagssvaret (`erInnsigelseIVederlaget`, #2242).
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { minnebane } from './bane.ts';
import { START } from './brukerforloep.ts';
import { kjoer, type Forloep } from './kjoerer.ts';
import type { Handling } from './klient.ts';
import { testklokke } from './testmiljoe.ts';
import { kanFrafalle } from '../regler/forhold.ts';
import { GJELDENDE_REGLER } from '../regler/regelsett.ts';
import { kontrollerForholdet } from '../regler/svarkontroll.ts';
import { prinsipaltAvslaatteDager } from '../spor/frist/utledning.ts';
import { erInnsigelseIVederlaget } from '../spor/vederlag/format.ts';
import type { Standpunkt } from '../typer.ts';
import { akseptfristen, forseringKanVelges } from '../utledning/visning.ts';

const forloep = (navn: string) =>
  JSON.parse(readFileSync(`docs/domenetabell/brukerforlop/${navn}.json`, 'utf8')) as {
    steg: Handling[];
  };
/** BF-44: svaret på vederlaget i steg 4 har akseptfristen 15. oktober 2026. */
const BF44 = forloep('BF-44');
/** BF-45 (G-8): tre frister, tre lag og avslaget for én frist. */
const BF45 = forloep('BF-45');

async function utledning(steg: Handling[]) {
  const f: Forloep = { id: 'predikatene', rader: [], start: null, steg, kontroller: [] };
  const valg = { klokke: testklokke(START) };
  return (await kjoer(f, minnebane({ sakstittel: 'Pelingen' }), { valg })).utledning();
}

const AVSLAG_AV_FORHOLDET: Handling = {
  handling: 'brev',
  navn: 'D-g',
  svar: [{ spor: 'forhold', navn: 'S-g1', resultat: 'avslaatt' }],
};

describe('forseringen leser at byggherren prinsipalt har avslått dager (FO-U1, U-6 og D-12 i BF-45)', () => {
  it('avslaget for én frist i fristen gir valget, og et krav uten svar gir det ikke', async () => {
    expect(prinsipaltAvslaatteDager(await utledning(BF45.steg))).toBe(true);
    expect(prinsipaltAvslaatteDager(await utledning(BF45.steg.slice(0, 3)))).toBe(false);
  });

  it('et avslag av forholdet gir valget også når byggherren godkjenner alle dagene i fristen', async () => {
    const alleDagene: Handling = {
      handling: 'brev',
      navn: 'D-f',
      svar: [
        {
          spor: 'frist',
          navn: 'S-f1',
          varsel_i_tide: true,
          hindring: true,
          spesifisering_i_tide: true,
          frister: [{ dager: 25 }, { dager: 20 }, { dager: 20 }],
        },
      ],
    };
    expect(
      prinsipaltAvslaatteDager(await utledning([...BF45.steg.slice(0, 3), alleDagene])),
      'kontrollsak: alle dagene godkjent og forholdet ikke avslått'
    ).toBe(false);
    expect(
      prinsipaltAvslaatteDager(
        await utledning([...BF45.steg.slice(0, 3), AVSLAG_AV_FORHOLDET, alleDagene])
      )
    ).toBe(true);
  });
});

describe('forseringen kan velges så lenge totalentreprenøren ikke har godtatt avslaget (FO-U1)', () => {
  it('valget står etter avslaget, og ikke etter at totalentreprenøren har godtatt svaret', async () => {
    expect(forseringKanVelges(await utledning(BF45.steg)), 'kontrollsak').toBe(true);
    expect(
      forseringKanVelges(await utledning([...BF45.steg, { handling: 'aksept', spor: 'frist' }]))
    ).toBe(false);
  });

  it.each([
    ['kravet er trukket (KA-U51)', [{ handling: 'trekk', spor: 'frist' }]],
    [
      'en ny kravversjon venter på svar (HF-U23 punkt 9)',
      [
        {
          handling: 'krav',
          spor: 'frist',
          frister: [
            { frist_id: 2, dager: 26 },
            { frist_id: 1, dager: 20 },
            { nummer: '8', navn: 'Overtakelse av utomhusarbeider', dager: 20 },
          ],
          navn: 'K-f2',
        },
      ],
    ],
    [
      'totalentreprenøren har godtatt avslaget av forholdet, og saken er lukket (GR-U27)',
      [AVSLAG_AV_FORHOLDET, { handling: 'aksept', spor: 'forhold' }],
    ],
  ] as [string, Handling[]][])('valget står ikke når %s', async (_n, etter) => {
    expect(forseringKanVelges(await utledning([...BF45.steg, ...etter]))).toBe(false);
  });

  it('valget står ikke uten prinsipalt avslåtte dager', async () => {
    expect(forseringKanVelges(await utledning(BF45.steg.slice(0, 3)))).toBe(false);
  });
});

describe('frafallet kan ikke velges sammen med at varselet etter punkt 32.2 kom for sent (vedtaket 05.10 for #235, GR-U18)', () => {
  const kategorien = (underkategori: string) => ({
    varslingsplikt: GJELDENDE_REGLER.gjelderVarslingsplikten('endring', underkategori),
    resultater: GJELDENDE_REGLER.gyldigeForholdsresultater('endring', underkategori),
  });

  it('en irregulær endring kan frafalles når varselet ikke er påberopt for sent', () => {
    expect(kanFrafalle(kategorien('irregulaer_endring'), false)).toBe(true);
    expect(kanFrafalle(kategorien('irregulaer_endring'), true)).toBe(false);
  });

  it('en endringsordre kan ikke frafalles (GR-U18)', () => {
    expect(kanFrafalle(kategorien('endringsordre'), false)).toBe(false);
  });

  it('kontrollen av svaret avviser frafallet når varselet er påberopt for sent, og godtar det ellers', () => {
    const kontroll = (iTide: boolean) => () =>
      kontrollerForholdet(
        { resultat: 'paalegg_frafalt', grunnlag_varslet_i_tide: iTide },
        'endring',
        'irregulaer_endring',
        GJELDENDE_REGLER
      );
    expect(kontroll(true), 'kontrollsak').not.toThrow();
    expect(kontroll(false)).toThrow();
  });
});

describe('akseptfristen står så lenge totalentreprenøren kan godta svaret (HF-U23 punkt 4, 6 og 9, MM-U24)', () => {
  const svaret = BF44.steg.slice(0, 4);

  it('svaret med akseptfristen gir datoen og brevet', async () => {
    const u = await utledning(svaret);
    expect(akseptfristen(u, 'vederlag')).toEqual({
      brev: u.spor.vederlag.gjeldendeSvar!.dokument,
      dato: '2026-10-15',
    });
  });

  it.each([
    ['kravet er trukket (KA-U51)', [{ handling: 'trekk', spor: 'vederlag' }]],
    [
      'en ny kravversjon venter på svar (HF-U23 punkt 9)',
      [
        {
          handling: 'krav',
          spor: 'vederlag',
          kravposter: [{ post: 'P1', belop: 140000 }],
          produktivitet: 40000,
          navn: 'K-v3',
        },
      ],
    ],
    ['totalentreprenøren har godtatt svaret (GR-U8)', [{ handling: 'aksept', spor: 'vederlag' }]],
    [
      'totalentreprenøren har godtatt avslaget av forholdet, og saken er lukket (GR-U27)',
      [AVSLAG_AV_FORHOLDET, { handling: 'aksept', spor: 'forhold' }],
    ],
  ] as [string, Handling[]][])('akseptfristen står ikke når %s', async (_n, etter) => {
    expect(akseptfristen(await utledning([...svaret, ...etter]), 'vederlag')).toBeNull();
  });
});

// OV-U32 og lagslinjen i LV-U34: et senere lag gjelder hvis innsigelsene i laget foran ikke fører
// frem. Brevteksten i vederlaget leser predikatet, og visningen skal lese det samme (#2242).
describe('innsigelsen i vederlagssvaret (#2242)', () => {
  const rettidighet = (
    hjemmel: '34.1.2' | '34.1.3' | '34.3.3' | '34.4',
    iTide: boolean
  ): Standpunkt => ({
    id: 's',
    art: 'rettidighet',
    gjelder: 'v',
    hjemmel,
    iTide,
  });
  const regel = (aksepterer: boolean): Standpunkt => ({
    id: 's',
    art: 'oppgjoersform',
    gjelder: 'P1',
    hjemmel: '34.3',
    aksepterer,
  });
  const justering = (godtar: boolean): Standpunkt => ({
    id: 's',
    art: 'justering',
    gjelder: 'P1',
    hjemmel: '34.3.2',
    godtar,
  });

  it.each([
    ['varselet etter § 34.1.2 kom for sent', rettidighet('34.1.2', false)],
    ['varselet etter § 34.1.3 kom for sent', rettidighet('34.1.3', false)],
    ['varselet etter § 34.3.3 kom for sent', rettidighet('34.3.3', false)],
    ['byggherren godtar ikke beregningsregelen', regel(false)],
    ['byggherren godtar ikke justeringen av enhetsprisene', justering(false)],
  ] as [string, Standpunkt][])('er en innsigelse når %s', (_n, s) => {
    expect(erInnsigelseIVederlaget(s)).toBe(true);
  });

  it.each([
    ['varselet etter § 34.1.2 kom i tide', rettidighet('34.1.2', true)],
    ['varselet etter § 34.4 kom for sent (KA-U64: ingen virkning)', rettidighet('34.4', false)],
    ['byggherren godtar beregningsregelen', regel(true)],
    ['byggherren godtar justeringen av enhetsprisene', justering(true)],
    [
      'standpunktet er beløpet',
      { id: 's', art: 'beloep', resultat: 'avslaatt', gjelder: 'P1' } as Standpunkt,
    ],
  ] as [string, Standpunkt][])('er ikke en innsigelse når %s', (_n, s) => {
    expect(erInnsigelseIVederlaget(s)).toBe(false);
  });
});
