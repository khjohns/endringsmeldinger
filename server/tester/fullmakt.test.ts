/**
 * Verdien fullmakten for byggherrens svar regnes av (S-1a, #818). Forventningene er
 * GFK-06 med presiseringen 24.09 og GFK-U3, og for fristdagene GFK-U17–GFK-U21 og GFK-U24.
 * Kjeden prøves mot hierarkiet i `godkjenning.test.ts` (GFK-U8).
 * Kravene skrives gjennom kjernens `vurder`, så de er kjernens kravversjoner (KA-U2),
 * og beløpene og dagene i svaret er kjernens utregning (B-13).
 */
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { Svarutkast } from '../../kjerne/kommandoer/kommando.ts';
import { kravposterI } from '../../kjerne/spor/vederlag/format.ts';
import {
  forhaandsvis,
  laastTekst,
  utledJournal,
  vurder,
} from '../../kjerne/kommandoer/skriving.ts';
import type { Journalrad, Spor } from '../../kjerne/typer.ts';
import type { Utledning } from '../../kjerne/utledning/utled.ts';
import { KJERNE } from '../../kjerne/versjon.ts';
import { brevverdi, fristgrunnlaget, fullmaktsverdi, type Fristgrunnlag } from '../fullmakt.ts';
import type { Fristtabell } from '../kontraktsfrister.ts';
import { innholdIFristen } from '../../kjerne/spor/frist/format.ts';

const UTDYPNING = 'Byggherren har pålagt en annen fundamentering.';
const KRAV_PAABEROPELSE = {
  type: 'krav',
  spor: 'forhold',
  innhold: {
    hovedkategori: 'endring',
    underkategori: 'irregulaer_endring',
    paalegg_mottatt: '2026-10-01',
  },
  utdypning: UTDYPNING,
};
const KRAV_VEDERLAG = {
  type: 'krav',
  spor: 'vederlag',
  innhold: { kravposter: [{ beskrivelse: 'Kravposten', oppgjoersform: 'tilbud', beloep: 100000 }] },
};
// Overtakelsen er fristen i fristtabellen (KA-U79).
const KRAV_FRIST = {
  type: 'krav',
  spor: 'frist',
  innhold: { frister: [{ frist_id: 1, dager: 20 }] },
  utdypning: UTDYPNING,
};
const FRISTTABELLEN = [
  { fristId: 1, nummer: '2', navn: 'Overtakelse' },
  { fristId: 2, nummer: '3', navn: 'Mekanisk ferdigstillelse' },
];
/**
 * Onsdag 30. september 2026. Dagene etter er hverdager, utenom søndagene 4., 11. og 18. oktober
 * (GFK-U24): 20 kalenderdager er 17 hverdager, og 15 er 13.
 */
const DATOEN = '2026-09-30';
const FORHOLD_GODKJENT = { spor: 'forhold', resultat: 'godkjent', varslet_i_tide: true };
const SATS = 5000;
const { regler } = KJERNE;

function utledning(krav: object[]): Utledning {
  const sakId = randomUUID();
  let klokke = Date.UTC(2026, 9, 2, 8);
  const journal: Journalrad[] = [
    {
      event_id: randomUUID(),
      sak_id: sakId,
      event_type: 'sak_opprettet',
      versjon: 1,
      tidsstempel: new Date(klokke).toISOString(),
      aktor_id: 'te',
      aktor_rolle: 'TE',
      aktor_team_id: null,
      refererer_til_event_id: null,
      format: 1,
      data: { sakstittel: 'Fullmakten', sakstype: 'standard' },
    },
  ];
  for (const k of krav) {
    const kontekst = {
      sakId,
      aktoerId: 'te',
      part: 'TE' as const,
      teamId: 'team-te',
      sakskode: { kode: 'koe' as const, loepenummer: 17 },
      kontraktsforkortelse: 'K201',
      kontraktsfrister: FRISTTABELLEN,
      tidspunkt: () => new Date((klokke += 60_000)),
      nyId: () => randomUUID(),
    };
    // Avsenderen godkjenner teksten kjernen viser (LV-U2).
    const vist = forhaandsvis(structuredClone(k), kontekst, journal, KJERNE);
    const tekst = vist.godtatt ? laastTekst(vist.hendelser[0]) : null;
    const utfall = vurder(
      tekst ? { ...k, brevtekst: tekst } : k,
      kontekst,
      journal,
      KJERNE,
      new Map()
    );
    if (!utfall.godtatt)
      throw new Error(`Forutsetning: kravet ble avvist: ${JSON.stringify(utfall)}`);
    utfall.hendelser.forEach((h) => journal.push({ ...h, versjon: journal.length + 1 }));
  }
  return utledJournal(journal, KJERNE);
}

/** Byggherrens vurderinger i kjernens form (`Svarvurdering`). */
function svarutkast(h: Record<string, unknown>, u: Utledning): Svarutkast {
  const spor = h.spor as Spor;
  const vurderinger =
    spor === 'forhold'
      ? { resultat: h.resultat, grunnlag_varslet_i_tide: h.varslet_i_tide }
      : spor === 'vederlag'
        ? {
            kravposter: [
              {
                gjelder: kravposterI(u.spor.vederlag.gjeldendeKrav!)[0]!.id,
                vurdering: h.vurdering,
                godkjent_beloep: h.godkjent_belop,
                aksepterer: true,
              },
            ],
          }
        : {
            frist_varsel_ok: h.varsel_i_tide,
            spesifisert_krav_ok: h.spesifisering_i_tide,
            vilkar_oppfylt: h.hindring,
            // KA-U74: én vurdering per frist. Kravene i testene har én frist.
            frister: innholdIFristen(u.spor.frist.gjeldendeKrav!).frister.map((f) => ({
              dager: h.dager ?? f.dager,
              dager_maatte_forstaa: h.maatte_forstaa,
            })),
          };
  return {
    spor,
    gjelder: u.spor[spor].gjeldendeKrav?.id ?? 'ingen',
    regelversjon: regler.versjon,
    vurderinger,
    resultat: {},
  };
}

/** Overtakelsen med satsen, regnet fra `DATOEN`. */
const medSats = (sats: number | null): Map<number, Fristgrunnlag> =>
  new Map([[1, { dato: DATOEN, dagmulktbelagt: true, sats, tattMed: [], ikkeTattMed: [] }]]);

const verdi = async (krav: object[], svar: Record<string, unknown>[], sats: number | null) => {
  const u = utledning(krav);
  return brevverdi(
    svar.map((h) => svarutkast(h, u)),
    u,
    medSats(sats),
    regler
  );
};

describe('verdien av brevet (GFK-06, presiseringen 24.09)', () => {
  it('godkjent forhold uten svar på kravsporene har verdien i TEs krav, hverdagene ganget med satsen', async () => {
    expect(
      await verdi([KRAV_PAABEROPELSE, KRAV_VEDERLAG, KRAV_FRIST], [FORHOLD_GODKJENT], SATS)
    ).toEqual({ beloep: 100000 + 17 * SATS, gulv: 185000 });
  });

  it('verdien regnes i hele øre som reglene regner beløp, ikke som flyttallet', async () => {
    // OV-U58: kravet har høyst to desimaler. Som flyttall er 0,1 + 0,2 ikke 0,3.
    const krav = {
      ...KRAV_VEDERLAG,
      innhold: {
        kravposter: [{ beskrivelse: 'Kravposten', oppgjoersform: 'tilbud', beloep: 0.1 }],
        saerskilt: { produktivitet: { beloep: 0.2 } },
      },
    };
    // Fristkravet er ikke sendt, så bare gulvet er verdsatt.
    expect((await verdi([KRAV_PAABEROPELSE, krav], [FORHOLD_GODKJENT], SATS)).gulv).toBe(0.3);
  });

  it('avslått forhold er 0', async () => {
    expect(
      await verdi(
        [KRAV_PAABEROPELSE, KRAV_VEDERLAG, KRAV_FRIST],
        [{ ...FORHOLD_GODKJENT, resultat: 'avslaatt' }],
        SATS
      )
    ).toEqual({ beloep: 0, gulv: 0 });
  });

  it('et spor som besvares i brevet, har verdien i svaret, ikke i kravet', async () => {
    expect(
      await verdi(
        [KRAV_PAABEROPELSE, KRAV_VEDERLAG, KRAV_FRIST],
        [
          FORHOLD_GODKJENT,
          { spor: 'vederlag', vurdering: 'delvis', godkjent_belop: 60000 },
          {
            spor: 'frist',
            varsel_i_tide: true,
            spesifisering_i_tide: true,
            hindring: true,
            dager: 0,
          },
        ],
        SATS
      )
    ).toEqual({ beloep: 60000, gulv: 60000 });
  });

  it('svar bare på vederlag tar ikke med fristkravet', async () => {
    expect(
      await verdi(
        [KRAV_PAABEROPELSE, KRAV_VEDERLAG, KRAV_FRIST],
        [{ spor: 'vederlag', vurdering: 'godkjent' }],
        null
      )
    ).toEqual({ beloep: 100000, gulv: 100000 });
  });

  it('et krav som ikke er sendt, kan ikke verdsettes, og det verdsatte er gulvet', async () => {
    expect(await verdi([KRAV_PAABEROPELSE, KRAV_VEDERLAG], [FORHOLD_GODKJENT], SATS)).toEqual({
      beloep: null,
      gulv: 100000,
    });
  });

  it('GFK-U3: fristdager uten sats kan ikke verdsettes', async () => {
    expect(
      await verdi([KRAV_PAABEROPELSE, KRAV_VEDERLAG, KRAV_FRIST], [FORHOLD_GODKJENT], null)
    ).toEqual({ beloep: null, gulv: 100000 });
  });

  it('GFK-U3: et fristsvar på 0 dager trenger ingen sats', async () => {
    expect(
      await verdi(
        [KRAV_PAABEROPELSE, KRAV_VEDERLAG, KRAV_FRIST],
        [
          {
            spor: 'frist',
            varsel_i_tide: true,
            spesifisering_i_tide: true,
            hindring: true,
            dager: 0,
          },
        ],
        null
      )
    ).toEqual({ beloep: 0, gulv: 0 });
  });

  it('hovedstandpunktet og det subsidiære legges ikke sammen; det største gjelder', async () => {
    // Måtte forstå 5 dager etter § 33.6.1; subsidiært 15.
    expect(
      await verdi(
        [KRAV_PAABEROPELSE, KRAV_VEDERLAG, KRAV_FRIST],
        [
          {
            spor: 'frist',
            varsel_i_tide: true,
            spesifisering_i_tide: false,
            maatte_forstaa: 5,
            dager: 15,
            hindring: true,
          },
        ],
        SATS
      )
    ).toEqual({ beloep: 13 * SATS, gulv: 13 * SATS });
  });
});

// Det særskilte kravet etter § 34.1.3 annet ledd (OV-U23, #1047 B2b).
describe('verdien av et vederlagskrav med posten etter § 34.1.3 annet ledd', () => {
  const medPost = ({ beloep, ...innhold }: { beloep?: number; saerskilt?: object }) => ({
    ...KRAV_VEDERLAG,
    innhold: {
      ...(beloep === undefined
        ? {}
        : { kravposter: [{ beskrivelse: 'Kravposten', oppgjoersform: 'tilbud', beloep }] }),
      ...innhold,
    },
  });
  const post = { saerskilt: { produktivitet: { beloep: 40000 } } };

  it('et ubesvart krav med bare posten har verdien i posten, og med begge beløpene summen (#1189 punkt 1)', async () => {
    expect((await verdi([KRAV_PAABEROPELSE, medPost(post)], [FORHOLD_GODKJENT], SATS)).gulv).toBe(
      40000
    );
    expect(
      (
        await verdi(
          [KRAV_PAABEROPELSE, medPost({ beloep: 100000, ...post })],
          [FORHOLD_GODKJENT],
          SATS
        )
      ).gulv
    ).toBe(140000);
  });

  it('med begrensningen etter § 34.1.3 gjelder det subsidiære beløpet, som er det høyeste (GFK-06, VS-U5)', async () => {
    const u = utledning([KRAV_PAABEROPELSE, medPost({ beloep: 100000, ...post })]);
    const svar: Svarutkast = {
      spor: 'vederlag',
      gjelder: u.spor.vederlag.gjeldendeKrav!.id,
      regelversjon: regler.versjon,
      vurderinger: {
        kravposter: [
          {
            gjelder: kravposterI(u.spor.vederlag.gjeldendeKrav!)[0]!.id,
            vurdering: 'godkjent',
            aksepterer: true,
          },
        ],
        produktivitet_vurdering: 'delvis',
        produktivitet_godkjent_beloep: 30000,
        produktivitet_varslet_i_tide: false,
        produktivitet_begrenset_beloep: 10000,
      },
      resultat: {},
    };
    // Prinsipalt 110 000 kr, subsidiært 130 000 kr (`subsidiaert_godkjent_beloep`).
    expect(brevverdi([svar], u, medSats(SATS), regler)).toEqual({ beloep: 130000, gulv: 130000 });
  });
});

describe('verdien av et vederlagskrav med flere kravposter (KA-U57 (c), OV-U31)', () => {
  const toPoster = {
    ...KRAV_VEDERLAG,
    innhold: {
      kravposter: [
        { beskrivelse: 'Fundamentering', oppgjoersform: 'tilbud', beloep: 100000 },
        { beskrivelse: 'Pumping', oppgjoersform: 'tilbud', beloep: 40000 },
      ],
    },
  };

  it('et ubesvart krav har summen av kravpostene', async () => {
    expect((await verdi([KRAV_PAABEROPELSE, toPoster], [FORHOLD_GODKJENT], SATS)).gulv).toBe(
      140000
    );
  });

  it('svaret per kravpost har summen av postene, og en kravpost der tilbudet ikke er akseptert, regnes ikke med (KA-U72, OV-U73)', async () => {
    const u = utledning([KRAV_PAABEROPELSE, toPoster]);
    const [p1, p2] = kravposterI(u.spor.vederlag.gjeldendeKrav!);
    const svar = (p2svar: Record<string, unknown>): Svarutkast => ({
      spor: 'vederlag',
      gjelder: u.spor.vederlag.gjeldendeKrav!.id,
      regelversjon: regler.versjon,
      vurderinger: {
        kravposter: [
          { gjelder: p1!.id, vurdering: 'delvis', godkjent_beloep: 80000, aksepterer: true },
          { gjelder: p2!.id, ...p2svar },
        ],
      },
      resultat: {},
    });
    expect(
      brevverdi([svar({ vurdering: 'godkjent', aksepterer: true })], u, medSats(SATS), regler)
    ).toEqual({ beloep: 120000, gulv: 120000 });
    // KA-U72: svaret tar ikke stilling til beløpet for P2, så summen er 80 000 kr. Hvordan
    // fullmakten skal regnes når byggherren mener en beregningsregel for en kravpost med fast
    // sum, er ikke avgjort (FK, #1663). Forventningen fastholder dagens atferd.
    expect(
      brevverdi(
        [svar({ aksepterer: false, oensket_oppgjoersform: 'regningsarbeid' })],
        u,
        medSats(SATS),
        regler
      )
    ).toEqual({ beloep: 80000, gulv: 80000 });
  });
});

describe('verdien av dagene per frist (GFK-U17–GFK-U21, GFK-U24)', () => {
  const INGEN = { tattMed: [], ikkeTattMed: [] };
  const tabell = (endret: Partial<Fristtabell['frister'][number]> = {}): Fristtabell => ({
    kontraktssum: null,
    frister: [
      {
        ...FRISTTABELLEN[0]!,
        dato: DATOEN,
        dagmulktbelagt: true,
        satsopplysninger: null,
        sats: SATS,
      },
      {
        ...FRISTTABELLEN[1]!,
        dato: '2026-12-16',
        dagmulktbelagt: true,
        satsopplysninger: null,
        sats: 1000,
        ...endret,
      },
    ],
  });
  const kravet = (frister: object[]) => ({
    ...KRAV_FRIST,
    innhold: { frister },
  });
  /** Verdien av svaret som godkjenner alle dagene i fristkravet. */
  const verdiAv = (frister: object[], g: ReadonlyMap<number, Fristgrunnlag>) => {
    const u = utledning([KRAV_PAABEROPELSE, kravet(frister)]);
    const svar = { spor: 'frist', varsel_i_tide: true, spesifisering_i_tide: true, hindring: true };
    return brevverdi([svarutkast(svar, u)], u, g, regler);
  };

  it('GFK-U21: dagene for hver frist verdsettes med satsen for fristen og summeres', () => {
    // Overtakelsen: 10 kalenderdager fra 30.09 er 9 hverdager. Mekanisk ferdigstillelse: 7 fra
    // 16.12 er 6, uten søndagen 20.12.
    expect(
      verdiAv(
        [
          { frist_id: 1, dager: 10 },
          { frist_id: 2, dager: 7 },
        ],
        fristgrunnlaget(tabell(), INGEN, []).frister
      )
    ).toEqual({ beloep: 9 * SATS + 6 * 1000, gulv: 51000 });
  });

  it('GFK-U19: hverdagene telles fra fristen etter forlengelsene i de andre sakene', () => {
    // Forlenget med 3 + 4 dager til 23.12: av de 7 dagene etter er 25., 26. og 27. desember
    // fridager (hverdager.test.ts).
    const forlengelser = [
      { sakId: 'a', fristId: 2, dager: 3, grunnlag: 'avtalt' as const },
      { sakId: 'b', fristId: 2, dager: 4, grunnlag: 'godkjent' as const },
      { sakId: 'c', fristId: 1, dager: 30, grunnlag: 'godkjent' as const },
    ];
    // GFK-U27: ikke tatt med.
    const ikkeTattMed = [
      { sakId: 'd', fristId: 2, dager: 9, grunnlag: 'subsidiaert_til_forholdet' as const },
    ];
    expect(
      verdiAv(
        [{ frist_id: 2, dager: 7 }],
        fristgrunnlaget(tabell(), { tattMed: forlengelser, ikkeTattMed }, []).frister
      )
    ).toEqual({
      beloep: 4 * 1000,
      gulv: 4 * 1000,
    });
  });

  it('GFK-U20: dager for en frist som ikke er dagmulktbelagt, er et krav som ikke er tallfestet', () => {
    expect(
      verdiAv(
        [
          { frist_id: 1, dager: 10 },
          { frist_id: 2, dager: 7 },
        ],
        fristgrunnlaget(tabell({ dagmulktbelagt: false }), INGEN, []).frister
      )
    ).toEqual({ beloep: null, gulv: 9 * SATS });
  });

  it('GFK-U3: dager for en dagmulktbelagt frist uten sats kan ikke verdsettes', () => {
    expect(
      verdiAv(
        [{ frist_id: 2, dager: 7 }],
        fristgrunnlaget(tabell({ sats: null }), INGEN, []).frister
      )
    ).toEqual({ beloep: null, gulv: 0 });
  });

  it('KA-U79: dager for en frist som ikke er registrert, kan ikke verdsettes uten sats', () => {
    expect(
      verdiAv(
        [
          { frist_id: 1, dager: 10 },
          { nummer: '4', navn: 'Rekkverket', dager: 5 },
        ],
        fristgrunnlaget(tabell(), INGEN, []).frister
      )
    ).toEqual({ beloep: null, gulv: 9 * SATS });
  });

  it('MM-U2: forstår ikke kjernen en annen sak i prosjektet, kan fristdagene ikke verdsettes', () => {
    expect(
      verdiAv(
        [{ frist_id: 1, dager: 10 }],
        fristgrunnlaget(tabell(), INGEN, ['en sak kjernen ikke forstår']).frister
      )
    ).toEqual({
      beloep: null,
      gulv: 0,
    });
  });

  it('spørsmål 4: grunnlaget har dagene i hver sak for fristen, også de som ikke er tatt med, og sakene kjernen ikke forstår', () => {
    const tattMed = [{ sakId: 'a', fristId: 2, dager: 3, grunnlag: 'avtalt' as const }];
    const ikkeTattMed = [
      { sakId: 'd', fristId: 2, dager: 9, grunnlag: 'subsidiaert_til_forholdet' as const },
    ];
    const g = fristgrunnlaget(tabell(), { tattMed, ikkeTattMed }, ['e']);
    expect(g.frister.get(2)).toEqual({
      dato: null,
      dagmulktbelagt: true,
      sats: 1000,
      tattMed,
      ikkeTattMed,
    });
    expect(g.frister.get(1)).toMatchObject({ tattMed: [], ikkeTattMed: [] });
    expect(g.ikkeForstaatt).toEqual(['e']);
  });
});

/**
 * Linjene verdien er regnet av, som pakken til godkjenning viser (U-10 i BF-45): dagene,
 * hverdagene, satsen og verdien for hver frist i rekkefølgen i brevet, fra laget som gir verdien.
 * Kildene er GFK-U17, GFK-U20, GFK-U21, GFK-U3 og KA-U79 for linjene, og presiseringen 24.09
 * («det største gjelder») for laget.
 */
describe('linjene i verdien for fullmakten (U-10 i BF-45)', () => {
  const grunnlag = (dagmulktbelagt: boolean, sats: number | null): Fristgrunnlag => ({
    dato: DATOEN,
    dagmulktbelagt,
    sats,
    tattMed: [],
    ikkeTattMed: [],
  });
  const FRISTSVAR = {
    spor: 'frist',
    varsel_i_tide: true,
    spesifisering_i_tide: true,
    hindring: true,
  };
  const linjene = (krav: object, svar: Record<string, unknown>, g: Map<number, Fristgrunnlag>) => {
    const u = utledning([KRAV_PAABEROPELSE, krav]);
    return fullmaktsverdi([svarutkast(svar, u)], u, g, regler);
  };

  it('GFK-U21, GFK-U20, KA-U79: hver frist står med dagene, hverdagene, satsen og verdien, eller grunnen til at den ikke kan verdsettes', () => {
    const krav = {
      ...KRAV_FRIST,
      innhold: {
        frister: [
          { frist_id: 1, dager: 20 },
          { frist_id: 2, dager: 7 },
          { nummer: '4', navn: 'Rekkverket', dager: 5 },
        ],
      },
    };
    const v = linjene(
      krav,
      FRISTSVAR,
      new Map([
        [1, grunnlag(true, SATS)],
        [2, grunnlag(false, null)],
      ])
    );
    expect(v).toEqual({
      beloep: null,
      gulv: 17 * SATS,
      lag: 'prinsipalt',
      frister: [
        { fristId: 1, dager: 20, hverdager: 17, sats: SATS, verdi: 17 * SATS, ikkeVerdsatt: null },
        {
          fristId: 2,
          dager: 7,
          hverdager: null,
          sats: null,
          verdi: null,
          ikkeVerdsatt: 'ikke_dagmulktbelagt',
        },
        {
          fristId: null,
          dager: 5,
          hverdager: null,
          sats: null,
          verdi: null,
          ikkeVerdsatt: 'ikke_registrert',
        },
      ],
    });
  });

  it('GFK-U3: en dagmulktbelagt frist uten sats står med grunnen, og null dager har verdien 0', () => {
    const krav = {
      ...KRAV_FRIST,
      innhold: {
        frister: [
          { frist_id: 1, dager: 20 },
          { frist_id: 2, dager: 7 },
        ],
      },
    };
    const g = new Map([
      [1, grunnlag(true, null)],
      [2, grunnlag(false, null)],
    ]);
    expect(linjene(krav, FRISTSVAR, g).frister.map((f) => f.ikkeVerdsatt)).toEqual([
      'sats_mangler',
      'ikke_dagmulktbelagt',
    ]);
    const avslag = linjene(krav, { ...FRISTSVAR, dager: 0 }, g);
    expect(avslag).toMatchObject({ beloep: 0, gulv: 0 });
    expect(avslag.frister.map((f) => [f.verdi, f.ikkeVerdsatt])).toEqual([
      [0, null],
      [0, null],
    ]);
  });

  it('presiseringen 24.09: linjene er fra laget som gir den største verdien, her det subsidiære', () => {
    // Som «det største gjelder» over: måtte forstå 5 dager etter § 33.6.1, subsidiært 15.
    const v = linjene(
      KRAV_FRIST,
      { ...FRISTSVAR, spesifisering_i_tide: false, maatte_forstaa: 5, dager: 15 },
      new Map([[1, grunnlag(true, SATS)]])
    );
    expect(v).toEqual({
      beloep: 13 * SATS,
      gulv: 13 * SATS,
      lag: 'subsidiaert',
      frister: [
        { fristId: 1, dager: 15, hverdager: 13, sats: SATS, verdi: 13 * SATS, ikkeVerdsatt: null },
      ],
    });
  });

  it('godkjenner brevet forholdet, står dagene i TEs krav som linjer når fristsporet ikke besvares (presiseringen 24.09)', () => {
    const u = utledning([KRAV_PAABEROPELSE, KRAV_FRIST]);
    const v = fullmaktsverdi(
      [svarutkast(FORHOLD_GODKJENT, u)],
      u,
      new Map([[1, grunnlag(true, SATS)]]),
      regler
    );
    // Vederlagskravet er ikke sendt og kan ikke verdsettes, så bare gulvet er tallfestet.
    expect(v).toEqual({
      beloep: null,
      gulv: 17 * SATS,
      lag: 'prinsipalt',
      frister: [
        { fristId: 1, dager: 20, hverdager: 17, sats: SATS, verdi: 17 * SATS, ikkeVerdsatt: null },
      ],
    });
  });
});
