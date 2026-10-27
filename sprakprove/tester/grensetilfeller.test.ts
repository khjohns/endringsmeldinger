/** Grensetilfellene i `sprakprove/grensetilfeller.json` mot TS-kjernen, med egne forventninger for vederlaget. */

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

/**
 * Vederlaget i TS-kjernen har egne forventninger, så den felles tabellen bare gjelder Python-stien
 * (DL-U2, #1317). Kjernen avviser brøkdeler av øre (OV-U58) og «delvis» som motsier beløpet
 * (KA-U42), og sammenlikner i hele øre (OV-U59); 0 kr er avslått (B-13, vedtaket 04.10).
 */
const VEDERLAG_I_KJERNEN: Rad[] = [
  { krevd: 100000, vurdering: 'godkjent', resultat: 'godkjent', kilde: 'B-13' },
  {
    krevd: 100000,
    vurdering: 'delvis',
    godkjent: 99999.5,
    resultat: 'delvis_godkjent',
    kilde: 'OV-U59',
  },
  {
    krevd: 100000,
    vurdering: 'delvis',
    godkjent: 99999.49,
    resultat: 'delvis_godkjent',
    kilde: 'OV-U59',
  },
  {
    krevd: 100000,
    vurdering: 'delvis',
    godkjent: 99000,
    resultat: 'delvis_godkjent',
    kilde: 'B-13',
  },
  {
    krevd: 100000,
    vurdering: 'delvis',
    godkjent: 100000,
    feil: 'hovedkrav_godkjent_belop',
    kilde: 'KA-U42',
  },
  {
    krevd: 100000,
    vurdering: 'delvis',
    godkjent: 0,
    feil: 'hovedkrav_godkjent_belop',
    kilde: 'KA-U42',
  },
  {
    krevd: 100000,
    vurdering: 'delvis',
    godkjent: 0.004,
    feil: 'hovedkrav_godkjent_belop',
    kilde: 'OV-U58',
  },
  {
    krevd: 100000,
    vurdering: 'delvis',
    godkjent: 0.005,
    feil: 'hovedkrav_godkjent_belop',
    kilde: 'OV-U58',
  },
  { krevd: 100000, vurdering: 'avslatt', resultat: 'avslatt', kilde: 'B-13' },
  {
    krevd: 100000,
    vurdering: 'delvis',
    godkjent: -1,
    feil: 'hovedkrav_godkjent_belop',
    kilde: 'B-13',
  },
  {
    krevd: 100000,
    vurdering: 'delvis',
    godkjent: 100000.01,
    feil: 'hovedkrav_godkjent_belop',
    kilde: 'B-13',
  },
  { krevd: 100000, vurdering: 'delvis', feil: 'hovedkrav_godkjent_belop', kilde: 'B-13' },
  { krevd: 100000, feil: 'hovedkrav_vurdering', kilde: 'B-13' },
  {
    krevd: 100000,
    vurdering: 'godkjent',
    aksepterer_metode: null,
    feil: 'aksepterer_metode',
    kilde: 'B-13',
  },
  {
    krevd: 100000,
    vurdering: 'godkjent',
    aksepterer_metode: false,
    resultat: 'delvis_godkjent',
    kilde: 'B-13',
  },
  {
    krevd: 100000.4,
    vurdering: 'delvis',
    godkjent: 100000,
    resultat: 'delvis_godkjent',
    kilde: 'OV-U59',
  },
  {
    krevd: 100000.5,
    vurdering: 'delvis',
    godkjent: 100000,
    resultat: 'delvis_godkjent',
    kilde: 'OV-U59',
  },
];

describe('vederlag', () => {
  it.each(VEDERLAG_I_KJERNEN.map((t, i) => [i, t.kilde, t] as const))(
    'tilfelle %i (%s)',
    (_i, _kilde, t) => {
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
