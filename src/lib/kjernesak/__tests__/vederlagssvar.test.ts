/**
 * BHs vederlagssvar på TS-saken (#1047 C2 del 2): configen fra kjernens utledning, skjemaets
 * utregning og oversettingen til `Svarutkast`, prøvd mot kjernen selv. Kjernen skriver svaret
 * bare når klientens resultat er likt dens eget (ANNET_RESULTAT, B-13). Brevteksten er
 * kjernens etter OV-U28, med hver post for seg og lagetiketten og uten sum. Rigg og drift er
 * ikke med i TS-saken (#1171).
 */
import { describe, expect, it } from 'vitest';
import { laastTekst, utledJournal } from '$kjerne/kommandoer/skriving';
import { KJERNE } from '$kjerne/versjon';
import type { Journalrad } from '$kjerne/typer';
import {
  beregnAlt,
  buildEventData,
  erSubsidiaer,
  getDefaults,
  type VederlagFormState,
} from '$lib/domain/vederlagDomain';
import {
  forrigeVederlagssvar,
  vederlagConfigFraKjernen,
  vederlagssvarFraSkjema,
} from '../vederlagssvar';
import { medGrunnlag, opprettet, skrevet } from './provejournal';

const grunnforhold = skrevet([opprettet], 'TE', {
  type: 'krav',
  spor: 'grunnlag',
  innhold: {
    hovedkategori: 'svikt',
    underkategori: 'grunnforhold',
    klar_over_forholdet: '2026-10-01',
  },
  utdypning: 'Leire der rapporten sa fjell.',
});

const medKrav = (innhold: Record<string, unknown>) =>
  skrevet(grunnforhold, 'TE', {
    type: 'krav',
    spor: 'vederlag',
    innhold: { metode: 'tilbud', ...innhold },
    utdypning: 'Tilbudet gjelder ekstra masseutskifting.',
  });

const BEGGE = medKrav({ beloep: 500_000, saerskilt: { produktivitet: { beloep: 200_000 } } });

const state = (o: Partial<VederlagFormState>): VederlagFormState => ({
  hovedkravVarsletITide: true,
  riggVarsletITide: undefined,
  produktivitetVarsletITide: true,
  akseptererMetode: true,
  holdTilbake: false,
  hovedkravVurdering: 'godkjent',
  produktivitetVurdering: 'godkjent',
  begrunnelse: '<p>Begrunnelsen.</p>',
  ...o,
});

/** Svaret slik `VederlagForm` bygger det, oversatt til kommandoen og skrevet av kjernen. */
function svar(journal: Journalrad[], s: VederlagFormState) {
  const u = utledJournal(journal, KJERNE);
  const config = vederlagConfigFraKjernen(u)!;
  const computed = beregnAlt(s, config);
  const { data } = buildEventData(
    s,
    config,
    computed,
    { vederlagKravId: 'krav', isUpdateMode: false },
    computed.subsidiaerTriggers
  );
  const kommando = vederlagssvarFraSkjema(data, u, KJERNE.regler.versjon);
  const etter = skrevet(journal, 'BH', kommando);
  // Beløpene har hardt mellomrom som tusenskille.
  const tekst = laastTekst(etter.at(-1)!)!.join('\n').replace(/\s/g, ' ');
  return { kommando, journal: etter, tekst };
}

describe('configen fra kjernen', () => {
  it('kravet med begge postene i svikt: tilbud, hovedbeløp, posten og § 34.1.2', () => {
    expect(vederlagConfigFraKjernen(utledJournal(BEGGE, KJERNE))).toEqual({
      metode: 'FASTPRIS_TILBUD',
      harHovedkrav: true,
      hovedkravBelop: 500_000,
      produktivitetBelop: 200_000,
      harRiggKrav: false,
      harProduktivitetKrav: true,
      kreverJustertEp: false,
      hovedkategori: 'SVIKT',
      underkategori: 'GRUNN',
      grunnlagVarsletForSent: false,
      grunnlagStatus: undefined,
      beloepIHeleOere: true,
    });
  });

  it('OV-U23: bare posten gir ingen vurdering av justeringen ellers', () => {
    const c = vederlagConfigFraKjernen(
      utledJournal(medKrav({ saerskilt: { produktivitet: { beloep: 80_000 } } }), KJERNE)
    )!;
    expect(c.harHovedkrav).toBe(false);
    expect(c.hovedkravBelop).toBe(0);
    expect(c.produktivitetBelop).toBe(80_000);
  });

  it('uten vederlagskrav finnes ingen config', () => {
    expect(vederlagConfigFraKjernen(utledJournal(grunnforhold, KJERNE))).toBeNull();
  });

  it('grunnlaget avslått i et tidligere svar gir status avslått', () => {
    const u0 = utledJournal(BEGGE, KJERNE);
    const avslaatt = skrevet(BEGGE, 'BH', {
      type: 'brev',
      svar: [
        {
          spor: 'grunnlag',
          gjelder: u0.spor.grunnlag.gjeldendeKrav!.id,
          regelversjon: KJERNE.regler.versjon,
          vurderinger: { resultat: 'avslaatt' },
          resultat: {},
          utdypning: 'Rapporten viste leire.',
        },
      ],
    });
    expect(vederlagConfigFraKjernen(utledJournal(avslaatt, KJERNE))!.grunnlagStatus).toBe(
      'avslatt'
    );
  });

  // GR-U26: venter en ny versjon av grunnlaget på svar, gjelder forbeholdet for ubesvart
  // grunnlag, ikke preklusjonen byggherren påberopte mot den forrige versjonen.
  it('GR-U26: preklusjonen mot versjon 1 av grunnlaget følger ikke med når versjon 2 venter på svar', () => {
    const prekludert = skrevet(medGrunnlag, 'BH', {
      type: 'brev',
      svar: [
        {
          spor: 'grunnlag',
          gjelder: utledJournal(medGrunnlag, KJERNE).spor.grunnlag.gjeldendeKrav!.id,
          regelversjon: KJERNE.regler.versjon,
          vurderinger: { resultat: 'godkjent', grunnlag_varslet_i_tide: false },
          resultat: {},
          utdypning: 'Varslet for sent.',
        },
      ],
    });
    const vederlag = {
      type: 'krav',
      spor: 'vederlag',
      innhold: { metode: 'tilbud', beloep: 250_000 },
      utdypning: 'Tilbudet gjelder pelingen.',
    };
    const medKravet = skrevet(prekludert, 'TE', vederlag);
    expect(vederlagConfigFraKjernen(utledJournal(medKravet, KJERNE))!.grunnlagVarsletForSent).toBe(
      true
    );
    const besvart = svar(
      medKravet,
      state({ hovedkravVurdering: 'delvis', hovedkravGodkjentBelop: 100_000 })
    ).journal;
    const versjon2 = skrevet(besvart, 'TE', {
      type: 'krav',
      spor: 'grunnlag',
      innhold: {
        hovedkategori: 'endring',
        underkategori: 'irregulaer_endring',
        paalegg_mottatt: '2026-10-01',
      },
      utdypning: 'BH påla ny peling, med tegningene vedlagt.',
    });
    const u = utledJournal(skrevet(versjon2, 'TE', vederlag), KJERNE);
    expect(u.spor.grunnlag.gjeldendeSvar).toBeNull();
    const c = vederlagConfigFraKjernen(u)!;
    expect(c.grunnlagVarsletForSent).toBe(false);
    expect(c.grunnlagStatus).toBeUndefined();
    expect(erSubsidiaer(c)).toBe(false);
  });
});

describe('svaret gjennom kjernen', () => {
  it('OV-U28, bare § 34.1.3 påberopt: justeringen ellers uten etikett, begrensningen prinsipalt, posten subsidiært', () => {
    const { tekst } = svar(
      BEGGE,
      state({ produktivitetVarsletITide: false, produktivitetBegrensetBelop: 45_000 })
    );
    expect(tekst).toMatch(
      /Byggherren godkjenner 500 000 kr eks\. mva\.[^.]*for justeringen ellers\.\s+Prinsipalt: byggherren gjør gjeldende at varselet om særskilt justering/
    );
    expect(tekst).toContain('Byggherren godkjenner 45 000 kr eks. mva. for dette kravet.');
    expect(tekst).toMatch(
      /Subsidiært: byggherren godkjenner 200 000 kr eks\. mva\.[^.]*for særskilt justering etter NS 8407 § 34\.1\.3 annet ledd/
    );
    expect(tekst).not.toMatch(/Til sammen/);
  });

  it('OV-U28, begge påberopt: § 34.1.2 prinsipalt, så justeringen ellers og begrensningen, så posten', () => {
    const { tekst } = svar(
      BEGGE,
      state({
        hovedkravVarsletITide: false,
        produktivitetVarsletITide: false,
        produktivitetBegrensetBelop: 45_000,
      })
    );
    const prinsipalt = tekst.indexOf('Prinsipalt:');
    const subsidiaert = tekst.indexOf('Subsidiært:');
    const videre = tekst.indexOf('Videre subsidiært:');
    expect(prinsipalt).toBeGreaterThan(-1);
    expect(subsidiaert).toBeGreaterThan(prinsipalt);
    expect(videre).toBeGreaterThan(subsidiaert);
    expect(tekst.slice(prinsipalt, subsidiaert)).toContain('§ 34.1.2');
    expect(tekst.slice(subsidiaert, videre)).toContain('for justeringen ellers');
    expect(tekst.slice(subsidiaert, videre)).toContain('45 000 kr eks. mva. for dette kravet');
    expect(tekst.slice(videre)).toContain('§ 34.1.3 annet ledd');
    expect(tekst).not.toMatch(/Til sammen/);
  });

  it('OV-U23: bare posten sender ingen vurdering av justeringen ellers', () => {
    const { kommando } = svar(
      medKrav({ saerskilt: { produktivitet: { beloep: 80_000 } } }),
      state({
        hovedkravVurdering: undefined,
        produktivitetVurdering: 'delvis',
        produktivitetGodkjentBelop: 50_000,
      })
    );
    // `hovedkrav_varslet_i_tide` er varslingen etter § 34.1.2, som gjelder hele kravet (OV-U27).
    expect(kommando.svar[0].vurderinger).not.toHaveProperty('hovedkrav_vurdering');
    expect(kommando.svar[0].vurderinger).not.toHaveProperty('hovedkrav_godkjent_belop');
  });

  it('OV-U23: et krav uten posten etter § 34.1.3 sender ingen vurdering av posten, og kjernen skriver svaret', () => {
    // Skjemaets utgangspunkt har ingen vurdering av posten, og `buildEventData` gir da beløpet 0.
    const { kommando } = svar(
      medKrav({ beloep: 125_000 }),
      state({
        produktivitetVurdering: undefined,
        produktivitetVarsletITide: undefined,
        hovedkravVurdering: 'delvis',
        hovedkravGodkjentBelop: 100_000,
      })
    );
    expect(
      Object.keys(kommando.svar[0].vurderinger).filter((k) => k.startsWith('produktivitet_'))
    ).toEqual([]);
    expect(kommando.svar[0].resultat).toMatchObject({ godkjent_beloep: 100_000 });
  });

  it('#1171: nyttelasten til kjernen har ikke noe rigg_*-felt, heller ikke når skjemadataene har det', () => {
    const u = utledJournal(BEGGE, KJERNE);
    const kommando = vederlagssvarFraSkjema(
      {
        beregnings_resultat: 'godkjent',
        total_godkjent_belop: 700_000,
        hovedkrav_vurdering: 'godkjent',
        produktivitet_vurdering: 'godkjent',
        aksepterer_metode: true,
        rigg_varslet_i_tide: true,
        rigg_vurdering: 'godkjent',
        rigg_godkjent_belop: 10_000,
        begrunnelse: '<p>Godtatt.</p>',
      },
      u,
      KJERNE.regler.versjon
    );
    expect(JSON.stringify(kommando)).not.toMatch(/rigg_/);
  });

  it('en revisjon begynner med standpunktene i det gjeldende svaret', () => {
    const s = state({
      hovedkravVurdering: 'delvis',
      hovedkravGodkjentBelop: 300_000,
      produktivitetVarsletITide: false,
      produktivitetBegrensetBelop: 45_000,
      akseptererMetode: false,
      oensketMetode: 'REGNINGSARBEID',
    });
    const { journal } = svar(BEGGE, s);
    const v = utledJournal(journal, KJERNE).spor.vederlag;
    const forrige = forrigeVederlagssvar(v.gjeldendeSvar!, v.gjeldendeKrav!);
    expect(forrige.eventId).toBe(v.gjeldendeSvar!.id);
    expect(getDefaults({ isUpdateMode: true, lastResponseEvent: forrige })).toEqual({
      ...s,
      riggVarsletITide: true,
      produktivitetGodkjentBelop: 200_000,
      riggGodkjentBelop: undefined,
      riggVurdering: undefined,
      epJusteringAkseptert: undefined,
      epJusteringVarsletITide: undefined,
      begrunnelse: '',
    });
  });
});

describe('skjemaet sammenlikner beløpene i hele øre, som kjernen (OV-U59)', () => {
  it('40 øre under det krevde er «delvis godkjent», og kjernen skriver svaret', () => {
    const { kommando, tekst } = svar(
      medKrav({ beloep: 125_000 }),
      state({
        hovedkravVurdering: 'delvis',
        hovedkravGodkjentBelop: 124_999.6,
        produktivitetVurdering: undefined,
      })
    );
    expect(kommando.svar[0].resultat).toMatchObject({
      resultat: 'delvis_godkjent',
      godkjent_beloep: 124_999.6,
    });
    expect(tekst).toContain('124 999,60 kr');
  });
});
