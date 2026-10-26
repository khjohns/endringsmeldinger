/** Grensetilfellene i `sprakprove/grensetilfeller.json` mot TS-kjernen. Python kjører samme tabell. */

import { describe, expect, it } from 'vitest';
import tabell from '../grensetilfeller.json' with { type: 'json' };
import { beloep as belop, tilKrone } from '../../kjerne/regler/beloep.ts';
import { UgyldigVurdering } from '../../kjerne/regler/feil.ts';
import {
  beregnFrist,
  beregnVederlag,
  kontrollerGrunnlagssvar,
  type Fristkrav,
  type Vederlagskrav,
} from '../kjerne/regler.ts';

type Rad = Record<string, unknown>;

const vederlagskrav = (krevd: number): Vederlagskrav => ({
  hovedkrav_belop: krevd,
  metode: 'FASTPRIS_TILBUD',
  rigg_belop: null,
  produktivitet_belop: null,
  krever_justert_ep: false,
  kostnads_overslag: null,
  hovedkategori: 'ENDRING',
  underkategori: 'EO',
  grunnlag_varslet_i_tide: null,
  grunnlag_resultat: 'godkjent',
});

const fristkrav = (krevd: number): Fristkrav => ({
  krevd_dager: krevd,
  varsel_type: 'spesifisert',
  er_svar_paa_foresporsel: false,
  har_innsigelse_mot_varsel: false,
  har_tidligere_varsel_i_tide: false,
  er_grunnlag_subsidiaert: false,
  er_hele_fristen_subsidiaer_pga_grunnlag: false,
});

function feltetSomFeiler(regn: () => unknown): string[] {
  try {
    regn();
  } catch (feil) {
    if (feil instanceof UgyldigVurdering) return Object.keys(feil.feil);
    throw feil;
  }
  return [];
}

describe('beløp i hele øre', () => {
  it.each(tabell.belop.tilfeller.map((t) => [String(t.inn), t] as const))('%s', (_n, t) => {
    expect(belop(t.inn as number | string)).toBe(BigInt(t.ore));
  });

  it('avviser et tall som ikke er endelig', () => {
    expect(() => belop(Number.NaN)).toThrow();
    expect(() => belop(Number.POSITIVE_INFINITY)).toThrow();
  });
});

describe('nærmeste krone', () => {
  it.each(tabell.til_krone.tilfeller.map((t) => [t.ore, t] as const))('%s øre', (_n, t) => {
    expect(tilKrone(BigInt(t.ore))).toBe(BigInt(t.krone));
  });
});

describe('vederlag', () => {
  it.each(tabell.vederlag.tilfeller.map((t, i) => [i, t as Rad] as const))(
    'tilfelle %i',
    (_i, rad) => {
      // OV-U58, OV-U59, KA-U42: kjernen avviser brøkdeler av øre og «delvis» som motsier beløpet, og sammenlikner i hele øre.
      const { kjernen, ...felles } = rad as Rad & { kjernen?: Rad };
      const t: Rad = kjernen
        ? {
            ...Object.fromEntries(Object.entries(felles).filter(([k]) => k !== 'resultat')),
            ...kjernen,
          }
        : felles;
      const vurdering = {
        hovedkrav_vurdering: (t.vurdering ?? null) as never,
        hovedkrav_godkjent_belop: (t.godkjent ?? null) as number | null,
        aksepterer_metode: ('aksepterer_metode' in t ? t.aksepterer_metode : true) as
          | boolean
          | null,
      };
      const regn = () => beregnVederlag(vederlagskrav(t.krevd as number), vurdering);
      if ('feil' in t) expect(feltetSomFeiler(regn)).toContain(t.feil);
      else expect(regn().beregnings_resultat).toBe(t.resultat);
    }
  );
});

describe('frist', () => {
  it.each(tabell.frist.tilfeller.map((t, i) => [i, t as Rad] as const))('tilfelle %i', (_i, t) => {
    const vurdering = {
      frist_varsel_ok: true,
      spesifisert_krav_ok: ('spesifisering_i_tide' in t ? t.spesifisering_i_tide : true) as
        | boolean
        | null,
      vilkar_oppfylt: ('hindring' in t ? t.hindring : true) as boolean | null,
      godkjent_dager: t.dager,
    };
    const regn = () => beregnFrist(fristkrav(t.krevd as number), vurdering);
    if ('feil' in t) {
      expect(feltetSomFeiler(regn)).toContain(t.feil);
      return;
    }
    const r = regn();
    expect(r.beregnings_resultat).toBe(t.resultat);
    if ('subsidiaer_resultat' in t) expect(r.subsidiaer_resultat).toBe(t.subsidiaer_resultat);
  });
});

describe('oversettelsen på grensen mot reglene i kjernen (#335)', () => {
  it('avvisningen viser katalogens kode, som Python', () => {
    expect(() => kontrollerGrunnlagssvar('SVIKT', 'MEDVIRK', 'frafalt', null)).toThrow(
      '«frafalt» kan ikke velges i denne kategorien (§ 32.3 c)'
    );
  });
});
