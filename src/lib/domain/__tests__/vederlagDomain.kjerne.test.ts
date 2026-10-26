/**
 * Skjemaets utregning av byggherrens vederlagssvar mot kjernens `beregnVederlag`, i hele kroner.
 * Testen fastholder at skjemaet og kjernen regner likt. Den bærer ikke TS-saken: der regner kjernen
 * både det skjemaet viser før sending og det som sendes (#1301, #1317), også med øre (OV-U58,
 * OV-U59). Forventningen er kjernen, som bygger på VS-U5, OV-U22, OV-U23 og OV-U27.
 */
import { describe, expect, it } from 'vitest';
import {
  beregnVederlag,
  type Vederlagskrav,
  type Vederlagsvurdering,
} from '$kjerne/regler/vederlag';
import { GJELDENDE_REGLER } from '$kjerne/regler/regelsett';
import { tilTall } from '$kjerne/regler/beloep';
import {
  beregnAlt,
  erBegrensetBelopGyldig,
  type BelopVurdering,
  type VederlagDomainConfig,
  type VederlagFormState,
} from '../vederlagDomain';

const TIL_KJERNEN = { godkjent: 'godkjent', delvis: 'delvis', avslatt: 'avslaatt' } as const;
const vurdering = (v: BelopVurdering | undefined) => (v ? TIL_KJERNEN[v] : undefined);

interface Tilfelle {
  navn: string;
  config: Partial<VederlagDomainConfig>;
  state: Partial<VederlagFormState>;
}

const config = (o: Partial<VederlagDomainConfig>): VederlagDomainConfig => ({
  metode: 'FASTPRIS_TILBUD',
  harHovedkrav: true,
  hovedkravBelop: 500_000,
  harRiggKrav: false,
  harProduktivitetKrav: true,
  produktivitetBelop: 200_000,
  kreverJustertEp: false,
  hovedkategori: 'ENDRING',
  grunnlagVarsletForSent: false,
  ...o,
});

const state = (o: Partial<VederlagFormState>): VederlagFormState => ({
  hovedkravVarsletITide: undefined,
  riggVarsletITide: undefined,
  produktivitetVarsletITide: true,
  akseptererMetode: true,
  holdTilbake: false,
  hovedkravVurdering: 'godkjent',
  produktivitetVurdering: 'godkjent',
  begrunnelse: '',
  ...o,
});

const TILFELLER: Tilfelle[] = [
  { navn: 'alt godkjent, varslet i tide', config: {}, state: {} },
  {
    navn: 'VS-U5: begrensning med beløp etter begrensningen',
    config: {},
    state: { produktivitetVarsletITide: false, produktivitetBegrensetBelop: 60_000 },
  },
  {
    navn: 'VS-U5: beløpet etter begrensningen er 0',
    config: {},
    state: { produktivitetVarsletITide: false, produktivitetBegrensetBelop: 0 },
  },
  {
    navn: 'VS-U5: delvis godkjent post med begrensning',
    config: {},
    state: {
      produktivitetVarsletITide: false,
      produktivitetVurdering: 'delvis',
      produktivitetGodkjentBelop: 150_000,
      produktivitetBegrensetBelop: 150_000,
    },
  },
  {
    navn: 'OV-U23: bare posten, uten hovedkrav',
    config: { harHovedkrav: false, hovedkravBelop: 0 },
    state: {
      hovedkravVurdering: undefined,
      produktivitetVarsletITide: false,
      produktivitetBegrensetBelop: 40_000,
    },
  },
  {
    navn: 'OV-U27: § 34.1.2 påberopt i svikt gjelder også posten',
    config: { hovedkategori: 'SVIKT' },
    state: {
      hovedkravVarsletITide: false,
      produktivitetVarsletITide: false,
      produktivitetBegrensetBelop: 60_000,
    },
  },
  {
    navn: 'metoden ikke akseptert',
    config: {},
    state: { akseptererMetode: false, oensketMetode: 'REGNINGSARBEID' },
  },
];

const KATEGORI = { ENDRING: 'endring', SVIKT: 'svikt', ANDRE: 'andre_forhold' } as const;

function iKjernen(c: VederlagDomainConfig, s: VederlagFormState) {
  const krav: Vederlagskrav = {
    hovedkrav_belop: c.harHovedkrav ? c.hovedkravBelop : null,
    metode: 'tilbud',
    rigg_belop: null,
    produktivitet_belop: c.harProduktivitetKrav ? (c.produktivitetBelop ?? 0) : null,
    krever_justert_ep: false,
    kostnads_overslag: null,
    hovedkategori: KATEGORI[c.hovedkategori as keyof typeof KATEGORI],
    underkategori: null,
    grunnlag_varslet_i_tide: null,
    grunnlag_resultat: 'godkjent',
  };
  const v: Vederlagsvurdering = {
    hovedkrav_vurdering: c.harHovedkrav ? vurdering(s.hovedkravVurdering) : undefined,
    hovedkrav_godkjent_belop: c.harHovedkrav ? s.hovedkravGodkjentBelop : undefined,
    hovedkrav_varslet_i_tide: c.hovedkategori === 'SVIKT' ? s.hovedkravVarsletITide : undefined,
    produktivitet_vurdering: vurdering(s.produktivitetVurdering),
    produktivitet_godkjent_belop: s.produktivitetGodkjentBelop,
    produktivitet_varslet_i_tide: s.produktivitetVarsletITide,
    produktivitet_begrenset_belop:
      s.produktivitetVarsletITide === false ? s.produktivitetBegrensetBelop : undefined,
    aksepterer_metode: s.akseptererMetode,
  };
  return beregnVederlag(krav, v, GJELDENDE_REGLER);
}

const fraKjernen = (r: string | null) => (r === 'avslaatt' ? 'avslatt' : r);

describe('skjemaets utregning er kjernens (#1047)', () => {
  it.each(TILFELLER)('$navn', ({ config: co, state: so }) => {
    const c = config(co);
    const s = state(so);
    const skjema = beregnAlt(s, c);
    const kjerne = iKjernen(c, s);

    expect(erBegrensetBelopGyldig(s, c)).toBe(true);
    expect(skjema.totalGodkjent).toBe(tilTall(kjerne.total_godkjent_belop));
    expect(skjema.totalKrevdInklPrekludert).toBe(tilTall(kjerne.total_krevd_belop));
    expect(skjema.prinsipaltResultat).toBe(fraKjernen(kjerne.beregnings_resultat));
    expect(skjema.visSubsidiaertResultat).toBe(kjerne.subsidiaer_resultat !== null);
    if (kjerne.subsidiaer_godkjent_belop !== null) {
      expect(skjema.totalGodkjentInklPrekludert).toBe(tilTall(kjerne.subsidiaer_godkjent_belop));
      expect(skjema.subsidiaertResultat).toBe(fraKjernen(kjerne.subsidiaer_resultat));
    }
  });
});

describe('beløpet etter begrensningen (VS-U5, kjernens kontroll)', () => {
  const c = config({});
  const begrenset = (b: number | undefined, o: Partial<VederlagFormState> = {}) =>
    state({ produktivitetVarsletITide: false, produktivitetBegrensetBelop: b, ...o });

  it.each([
    ['mangler', begrenset(undefined), false],
    ['er negativt', begrenset(-1), false],
    ['er høyere enn det byggherren godtar for posten', begrenset(200_001), false],
    [
      'er høyere enn det delvis godkjente',
      begrenset(120_000, { produktivitetVurdering: 'delvis', produktivitetGodkjentBelop: 100_000 }),
      false,
    ],
    ['er lik det godkjente', begrenset(200_000), true],
    ['er 0', begrenset(0), true],
  ])('når beløpet %s, er svaret gyldig: %s', (_navn, s, gyldig) => {
    expect(erBegrensetBelopGyldig(s, c)).toBe(gyldig);
    if (!gyldig) {
      expect(() => iKjernen(c, s)).toThrow();
    }
  });
});
