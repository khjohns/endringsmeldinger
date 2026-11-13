/**
 * Verdien fullmakten for byggherrens svar regnes av (S-1a, #818). Forventningene er
 * GFK-06 med presiseringen 24.09 og GFK-U3. Kjeden prøves mot hierarkiet i
 * `godkjenning.test.ts` (GFK-U8).
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
import { brevverdi } from '../fullmakt.ts';

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
const KRAV_FRIST = { type: 'krav', spor: 'frist', innhold: { dager: 20 }, utdypning: UTDYPNING };
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
      kontraktsfrister: [],
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
            dager_maatte_forstaa: h.maatte_forstaa,
            vilkar_oppfylt: h.hindring,
            dager: h.dager ?? u.spor.frist.gjeldendeKrav?.innhold.dager,
          };
  return {
    spor,
    gjelder: u.spor[spor].gjeldendeKrav?.id ?? 'ingen',
    regelversjon: regler.versjon,
    vurderinger,
    resultat: {},
  };
}

const verdi = async (krav: object[], svar: Record<string, unknown>[], sats: number | null) => {
  const u = utledning(krav);
  return brevverdi(
    svar.map((h) => svarutkast(h, u)),
    u,
    sats,
    regler
  );
};

describe('verdien av brevet (GFK-06, presiseringen 24.09)', () => {
  it('godkjent forhold uten svar på kravsporene har verdien i TEs krav, dagene ganget med satsen', async () => {
    expect(
      await verdi([KRAV_PAABEROPELSE, KRAV_VEDERLAG, KRAV_FRIST], [FORHOLD_GODKJENT], SATS)
    ).toEqual({ beloep: 100000 + 20 * SATS, gulv: 200000 });
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

  it('GFK-U3: fristdager uten dagmulktssats kan ikke verdsettes', async () => {
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
    ).toEqual({ beloep: 15 * SATS, gulv: 15 * SATS });
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
    expect(brevverdi([svar], u, SATS, regler)).toEqual({ beloep: 130000, gulv: 130000 });
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
    expect(brevverdi([svar({ vurdering: 'godkjent', aksepterer: true })], u, SATS, regler)).toEqual(
      { beloep: 120000, gulv: 120000 }
    );
    // KA-U72: svaret tar ikke stilling til beløpet for P2, så summen er 80 000 kr. Hvordan
    // fullmakten skal regnes når byggherren mener en beregningsregel for en kravpost med fast
    // sum, er ikke avgjort (FK, #1663). Forventningen fastholder dagens atferd.
    expect(
      brevverdi(
        [svar({ aksepterer: false, oensket_oppgjoersform: 'regningsarbeid' })],
        u,
        SATS,
        regler
      )
    ).toEqual({ beloep: 80000, gulv: 80000 });
  });
});
