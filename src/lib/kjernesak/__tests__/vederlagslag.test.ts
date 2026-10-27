/**
 * Lagene skjemaet viser i BHs svar på vederlaget, mot lagene i brevet kjernen skriver (#1261).
 * Skjemaet leser lagene av kjernens forhåndsvisning og regner dem ikke ut på nytt. Hvert forløp
 * har forventningen fra vedtaket og prøver i tillegg at skjemaet og brevet sier det samme:
 * etiketten foran hvert beløp i brevet er etiketten skjemaet viser for beløpet.
 */
import { describe, expect, it } from 'vitest';
import { laastTekst, utledJournal } from '$kjerne/kommandoer/skriving';
import { kroner } from '$kjerne/frosset/standpunkt';
import { KJERNE } from '$kjerne/versjon';
import type { Journalrad } from '$kjerne/typer';
import { beregnAlt, buildEventData, type VederlagFormState } from '$lib/domain/vederlagDomain';
import { utledetMed } from '../brevtekst';
import {
  FORBEHOLDET,
  grunnlagetForSvaret,
  vederlagConfigFraKjernen,
  vederlagslag,
  vederlagssvarFraSkjema,
} from '../vederlagssvar';
import { SAK, medGrunnlag, opprettet, skrevet } from './provejournal';

const state = (o: Partial<VederlagFormState> = {}): VederlagFormState => ({
  hovedkravVarsletITide: true,
  riggVarsletITide: undefined,
  produktivitetVarsletITide: true,
  akseptererMetode: true,
  holdTilbake: false,
  hovedkravVurdering: 'delvis',
  hovedkravGodkjentBelop: 150_000,
  begrunnelse: '<p>Begrunnelsen.</p>',
  ...o,
});

const grunnlagssvar = (journal: Journalrad[], vurderinger: Record<string, unknown>) =>
  skrevet(journal, 'BH', {
    type: 'brev',
    svar: [
      {
        spor: 'grunnlag',
        gjelder: utledJournal(journal, KJERNE).spor.grunnlag.gjeldendeKrav!.id,
        regelversjon: KJERNE.regler.versjon,
        vurderinger,
        resultat: {},
        utdypning: 'Svaret på grunnlaget.',
      },
    ],
  });

const medVederlagskrav = (journal: Journalrad[], innhold: Record<string, unknown>) =>
  skrevet(journal, 'TE', {
    type: 'krav',
    spor: 'vederlag',
    innhold: { metode: 'tilbud', ...innhold },
    utdypning: 'Tilbudet gjelder pelingen.',
  });

/** Det skjemaet viser for svaret, og brevet kjernen skriver for det samme svaret. */
function skjemaOgBrev(journal: Journalrad[], s: VederlagFormState) {
  const foer = utledJournal(journal, KJERNE);
  const config = vederlagConfigFraKjernen(foer)!;
  const computed = beregnAlt(s, config);
  const { data } = buildEventData(
    s,
    config,
    computed,
    { vederlagKravId: 'krav', isUpdateMode: false },
    computed.subsidiaerTriggers
  );
  const kommando = vederlagssvarFraSkjema(data, foer, KJERNE.regler);
  const etter = utledetMed(kommando, SAK, 'BH', journal, KJERNE);
  expect(etter, 'kjernen godtar svaret').not.toBeNull();
  const lag = vederlagslag(foer, etter!)!;
  const brev = laastTekst(skrevet(journal, 'BH', kommando).at(-1)!)!.join(' ');
  return { lag, grunnlaget: grunnlagetForSvaret(foer), brev };
}

/** Etiketten brevet har satt for setningen med beløpet, eller `null` uten etikett. */
function etikettIBrevet(brev: string, beloep: number): string | null {
  const ved = brev.indexOf(kroner(beloep));
  expect(ved, `brevet nevner ${kroner(beloep)}`).toBeGreaterThan(-1);
  const foran = [...brev.slice(0, ved).matchAll(/(Prinsipalt|Videre subsidiært|Subsidiært): /g)];
  return foran.at(-1)?.[1].toLowerCase() ?? null;
}

/** Begynnelsen av leddet i brevet for en rad uten beløp. */
const LEDDET: Record<string, string> = {
  prekludert: 'byggherren har gjort gjeldende i',
  avslaatt: 'byggherren har avslått grunnlaget',
  varsel_34_1_2:
    'byggherren gjør gjeldende at varselet om vederlagsjustering etter NS 8407 § 34.1.2',
};

/** Hver rad står under samme etikett som i brevet, og en rad uten beløp først under etiketten. */
function sammeLagSomBrevet(lag: ReturnType<typeof skjemaOgBrev>['lag'], brev: string) {
  for (const gruppe of lag.lag)
    for (const [i, rad] of gruppe.rader.entries()) {
      if ('beloep' in rad) expect(etikettIBrevet(brev, rad.beloep)).toBe(gruppe.etikett);
      else {
        const leddet = LEDDET[rad.art === 'grunnlag' ? rad.grunn : rad.art];
        expect(i, 'raden uten beløp står først under etiketten').toBe(0);
        const etikett = gruppe.etikett!;
        expect(brev).toContain(`${etikett[0].toUpperCase()}${etikett.slice(1)}: ${leddet}`);
      }
    }
}

/** Lagene som etikett og radenes art, med beløpet når raden har et. */
const kort = (lag: ReturnType<typeof skjemaOgBrev>['lag']) =>
  lag.lag.map((g) => [
    g.etikett,
    g.rader.map((r) =>
      'beloep' in r ? `${r.art} ${r.beloep}` : r.art === 'grunnlag' ? r.grunn : r.art
    ),
  ]);

const vederlag = medVederlagskrav(medGrunnlag, { beloep: 250_000 });

// § 34.1.2 gjelder ikke en endring (§ 34.1.1), så forløpene med den bruker svikt.
const svikt = skrevet([opprettet], 'TE', {
  type: 'krav',
  spor: 'grunnlag',
  innhold: {
    hovedkategori: 'svikt',
    underkategori: 'grunnforhold',
    klar_over_forholdet: '2026-10-01',
  },
  utdypning: 'Leire der rapporten sa fjell.',
});

describe('skjemaet har lagene i brevet', () => {
  it('OV-U33: grunnlaget avslått gir ett lag foran, så beløpet står subsidiært', () => {
    const journal = medVederlagskrav(
      grunnlagssvar(medGrunnlag, { resultat: 'avslaatt', grunnlag_varslet_i_tide: true }),
      { beloep: 250_000 }
    );
    const { lag, grunnlaget, brev } = skjemaOgBrev(journal, state());
    expect(grunnlaget).toEqual({ grunner: ['avslaatt'], forbehold: false });
    expect(kort(lag)).toEqual([
      ['prinsipalt', ['avslaatt']],
      ['subsidiært', ['hovedkrav 150000']],
    ]);
    expect(lag.sammenfall).toBe(false);
    sammeLagSomBrevet(lag, brev);
  });

  it('OV-U32, OV-U33: preklusjon etter § 32.2 påberopt gir ett lag foran, så beløpet står subsidiært', () => {
    const journal = medVederlagskrav(
      grunnlagssvar(medGrunnlag, { resultat: 'godkjent', grunnlag_varslet_i_tide: false }),
      { beloep: 250_000 }
    );
    const { lag, grunnlaget, brev } = skjemaOgBrev(journal, state());
    expect(grunnlaget).toEqual({ grunner: ['prekludert'], forbehold: false });
    expect(kort(lag)).toEqual([
      ['prinsipalt', ['prekludert']],
      ['subsidiært', ['hovedkrav 150000']],
    ]);
    sammeLagSomBrevet(lag, brev);
  });

  it('OV-U32: preklusjon etter § 32.2 og avslag gir to lag foran, så beløpet står videre subsidiært', () => {
    const journal = medVederlagskrav(
      grunnlagssvar(medGrunnlag, { resultat: 'avslaatt', grunnlag_varslet_i_tide: false }),
      { beloep: 250_000 }
    );
    const { lag, grunnlaget, brev } = skjemaOgBrev(journal, state());
    expect(grunnlaget.grunner).toEqual(['prekludert', 'avslaatt']);
    expect(kort(lag)).toEqual([
      ['prinsipalt', ['prekludert']],
      ['subsidiært', ['avslaatt']],
      ['videre subsidiært', ['hovedkrav 150000']],
    ]);
    sammeLagSomBrevet(lag, brev);
  });

  it('OV-U32: grunnlaget avslått og § 34.1.2 påberopt flytter beløpet ett lag til ned', () => {
    const journal = medVederlagskrav(grunnlagssvar(svikt, { resultat: 'avslaatt' }), {
      beloep: 250_000,
    });
    const { lag, brev } = skjemaOgBrev(journal, state({ hovedkravVarsletITide: false }));
    expect(kort(lag)).toEqual([
      ['prinsipalt', ['avslaatt']],
      ['subsidiært', ['varsel_34_1_2']],
      ['videre subsidiært', ['hovedkrav 150000']],
    ]);
    sammeLagSomBrevet(lag, brev);
  });

  it('GR-U26: grunnlaget ubesvart gir forbeholdet og ingen lag foran, så beløpet står uten etikett', () => {
    const { lag, grunnlaget, brev } = skjemaOgBrev(vederlag, state());
    expect(grunnlaget).toEqual({ grunner: [], forbehold: true });
    expect(kort(lag)).toEqual([[null, ['hovedkrav 150000']]]);
    // Varselet i skjemaet har ordene fra brevet kjernen lager.
    for (const del of FORBEHOLDET) expect(brev).toContain(del);
    sammeLagSomBrevet(lag, brev);
  });

  it('GR-U26: med grunnlaget ubesvart står § 34.1.2 prinsipalt og beløpet subsidiært, uten lag fra grunnlaget', () => {
    const { lag, brev } = skjemaOgBrev(
      medVederlagskrav(svikt, { beloep: 250_000 }),
      state({ hovedkravVarsletITide: false })
    );
    expect(kort(lag)).toEqual([
      ['prinsipalt', ['varsel_34_1_2']],
      ['subsidiært', ['hovedkrav 150000']],
    ]);
    sammeLagSomBrevet(lag, brev);
  });

  it('GR-U7, GR-U23: frafall etter § 32.3 c flytter ikke lagene og gir ikke forbeholdet', () => {
    const journal = medVederlagskrav(
      grunnlagssvar(medGrunnlag, { resultat: 'paalegg_frafalt', grunnlag_varslet_i_tide: true }),
      { beloep: 250_000 }
    );
    const { lag, grunnlaget, brev } = skjemaOgBrev(journal, state());
    expect(grunnlaget).toEqual({ grunner: [], forbehold: false });
    expect(kort(lag)).toEqual([[null, ['hovedkrav 150000']]]);
    expect(brev).not.toContain(FORBEHOLDET[0]);
    sammeLagSomBrevet(lag, brev);
  });

  it('OV-U28, VS-U5: med grunnlaget avslått står begrensningen etter § 34.1.3 og posten hver i sitt lag', () => {
    const journal = medVederlagskrav(
      grunnlagssvar(medGrunnlag, { resultat: 'avslaatt', grunnlag_varslet_i_tide: true }),
      { beloep: 250_000, saerskilt: { produktivitet: { beloep: 80_000 } } }
    );
    const { lag, brev } = skjemaOgBrev(
      journal,
      state({
        produktivitetVurdering: 'godkjent',
        produktivitetVarsletITide: false,
        produktivitetBegrensetBelop: 30_000,
      })
    );
    expect(kort(lag)).toEqual([
      ['prinsipalt', ['avslaatt']],
      ['subsidiært', ['hovedkrav 150000', 'begrenset 30000']],
      ['videre subsidiært', ['post 80000']],
    ]);
    sammeLagSomBrevet(lag, brev);
  });

  it('VS-U5, OV-U28: grunnlaget godkjent og § 34.1.3 påberopt gir begrensningen prinsipalt og posten subsidiært', () => {
    const journal = medVederlagskrav(
      grunnlagssvar(medGrunnlag, { resultat: 'godkjent', grunnlag_varslet_i_tide: true }),
      { beloep: 250_000, saerskilt: { produktivitet: { beloep: 80_000 } } }
    );
    const { lag, brev } = skjemaOgBrev(
      journal,
      state({
        produktivitetVurdering: 'godkjent',
        produktivitetVarsletITide: false,
        produktivitetBegrensetBelop: 20_000,
      })
    );
    // Beløpet er upåvirket og står uten etikett foran den første, som i brevet (#1267 punkt 4).
    expect(kort(lag)).toEqual([
      [null, ['hovedkrav 150000']],
      ['prinsipalt', ['begrenset 20000']],
      ['subsidiært', ['post 80000']],
    ]);
    expect(lag.ingenBeloep).toBe(false);
    sammeLagSomBrevet(lag, brev);
  });

  it('GR-U7: hele kravet godkjent gir sammenfall og ett lag uten etikett', () => {
    const journal = medVederlagskrav(
      grunnlagssvar(medGrunnlag, { resultat: 'godkjent', grunnlag_varslet_i_tide: true }),
      { beloep: 250_000 }
    );
    const { lag } = skjemaOgBrev(journal, state({ hovedkravVurdering: 'godkjent' }));
    expect(lag.sammenfall).toBe(true);
    expect(kort(lag)).toEqual([[null, ['hovedkrav 250000']]]);
  });

  it('#1317, OV-U59: 124 999,60 av 125 000 kr er ikke sammenfall, og skjemaet sender ikke sitt eget resultat', () => {
    const journal = medVederlagskrav(
      grunnlagssvar(medGrunnlag, { resultat: 'godkjent', grunnlag_varslet_i_tide: true }),
      { beloep: 125_000 }
    );
    const s = state({ hovedkravGodkjentBelop: 124_999.6 });
    const config = vederlagConfigFraKjernen(utledJournal(journal, KJERNE))!;
    const computed = beregnAlt(s, config);
    // Skjemaets egen utregning til nærmeste krone sier «godkjent» (B-13) …
    expect(computed.prinsipaltResultat).toBe('godkjent');
    const { data } = buildEventData(
      s,
      config,
      computed,
      { vederlagKravId: 'krav', isUpdateMode: false },
      computed.subsidiaerTriggers
    );
    expect(data).not.toHaveProperty('beregnings_resultat');
    expect(data).not.toHaveProperty('total_godkjent_belop');
    // … men det skjemaet viser, er kjernens: ikke hele kravet.
    const { lag } = skjemaOgBrev(journal, s);
    expect(lag.sammenfall).toBe(false);
    expect(kort(lag)).toEqual([[null, ['hovedkrav 124999.6']]]);
  });
});
