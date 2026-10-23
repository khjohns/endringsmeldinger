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
const KRAV_GRUNNLAG = {
  type: 'krav',
  spor: 'grunnlag',
  innhold: {
    hovedkategori: 'endring',
    underkategori: 'irregulaer_endring',
    tittel: 'Endret fundamentering',
    paalegg_mottatt: '2026-10-01',
  },
  utdypning: UTDYPNING,
};
const KRAV_VEDERLAG = {
  type: 'krav',
  spor: 'vederlag',
  innhold: { metode: 'tilbud', beloep: 100000 },
};
const KRAV_FRIST = { type: 'krav', spor: 'frist', innhold: { dager: 20 }, utdypning: UTDYPNING };
const GRUNNLAG_GODKJENT = { spor: 'grunnlag', resultat: 'godkjent', varslet_i_tide: true };
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
    spor === 'grunnlag'
      ? { resultat: h.resultat, grunnlag_varslet_i_tide: h.varslet_i_tide }
      : spor === 'vederlag'
        ? {
            hovedkrav_vurdering: h.vurdering,
            hovedkrav_godkjent_belop: h.godkjent_belop,
            aksepterer_metode: true,
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
  it('godkjent grunnlag uten svar på kravsporene har verdien i TEs krav, dagene ganget med satsen', async () => {
    expect(
      await verdi([KRAV_GRUNNLAG, KRAV_VEDERLAG, KRAV_FRIST], [GRUNNLAG_GODKJENT], SATS)
    ).toEqual({ beloep: 100000 + 20 * SATS, gulv: 200000 });
  });

  it('verdien rundes til hele øre som reglene runder beløp, ikke som flyttallet', async () => {
    const krav = { ...KRAV_VEDERLAG, innhold: { metode: 'tilbud', beloep: 1.005 } };
    // Fristkravet er ikke sendt, så bare gulvet er verdsatt.
    expect((await verdi([KRAV_GRUNNLAG, krav], [GRUNNLAG_GODKJENT], SATS)).gulv).toBe(1.01);
  });

  it('avslått grunnlag er 0', async () => {
    expect(
      await verdi(
        [KRAV_GRUNNLAG, KRAV_VEDERLAG, KRAV_FRIST],
        [{ ...GRUNNLAG_GODKJENT, resultat: 'avslaatt' }],
        SATS
      )
    ).toEqual({ beloep: 0, gulv: 0 });
  });

  it('et spor som besvares i brevet, har verdien i svaret, ikke i kravet', async () => {
    expect(
      await verdi(
        [KRAV_GRUNNLAG, KRAV_VEDERLAG, KRAV_FRIST],
        [
          GRUNNLAG_GODKJENT,
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
        [KRAV_GRUNNLAG, KRAV_VEDERLAG, KRAV_FRIST],
        [{ spor: 'vederlag', vurdering: 'godkjent' }],
        null
      )
    ).toEqual({ beloep: 100000, gulv: 100000 });
  });

  it('et krav som ikke er sendt, kan ikke verdsettes, og det verdsatte er gulvet', async () => {
    expect(await verdi([KRAV_GRUNNLAG, KRAV_VEDERLAG], [GRUNNLAG_GODKJENT], SATS)).toEqual({
      beloep: null,
      gulv: 100000,
    });
  });

  it('GFK-U3: fristdager uten dagmulktssats kan ikke verdsettes', async () => {
    expect(
      await verdi([KRAV_GRUNNLAG, KRAV_VEDERLAG, KRAV_FRIST], [GRUNNLAG_GODKJENT], null)
    ).toEqual({ beloep: null, gulv: 100000 });
  });

  it('GFK-U3: et fristsvar på 0 dager trenger ingen sats', async () => {
    expect(
      await verdi(
        [KRAV_GRUNNLAG, KRAV_VEDERLAG, KRAV_FRIST],
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
        [KRAV_GRUNNLAG, KRAV_VEDERLAG, KRAV_FRIST],
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
  const medPost = (innhold: object) => ({
    ...KRAV_VEDERLAG,
    innhold: { metode: 'tilbud', ...innhold },
  });
  const post = { saerskilt: { produktivitet: { beloep: 40000 } } };

  it('et ubesvart krav med bare posten har verdien i posten, og med begge beløpene summen (#1189 punkt 1)', async () => {
    expect((await verdi([KRAV_GRUNNLAG, medPost(post)], [GRUNNLAG_GODKJENT], SATS)).gulv).toBe(
      40000
    );
    expect(
      (
        await verdi(
          [KRAV_GRUNNLAG, medPost({ beloep: 100000, ...post })],
          [GRUNNLAG_GODKJENT],
          SATS
        )
      ).gulv
    ).toBe(140000);
  });

  it('med begrensningen etter § 34.1.3 gjelder det subsidiære beløpet, som er det høyeste (GFK-06, VS-U5)', async () => {
    const u = utledning([KRAV_GRUNNLAG, medPost({ beloep: 100000, ...post })]);
    const svar: Svarutkast = {
      spor: 'vederlag',
      gjelder: u.spor.vederlag.gjeldendeKrav!.id,
      regelversjon: regler.versjon,
      vurderinger: {
        hovedkrav_vurdering: 'godkjent',
        produktivitet_vurdering: 'delvis',
        produktivitet_godkjent_belop: 30000,
        produktivitet_varslet_i_tide: false,
        produktivitet_begrenset_belop: 10000,
        aksepterer_metode: true,
      },
      resultat: {},
    };
    // Prinsipalt 110 000 kr, subsidiært 130 000 kr (`subsidiaert_godkjent_beloep`).
    expect(brevverdi([svar], u, SATS, regler)).toEqual({ beloep: 130000, gulv: 130000 });
  });
});
