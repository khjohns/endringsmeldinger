/**
 * Fullmakten byggherrens svar krever (S-1a, #818). Forventningene er GFK-06 med
 * presiseringen 24.09, vedtaket 23.09 om ubegrenset fullmakt og B-06 og «svar uten
 * registrerte fullmakter» fra runde 7 (kommentaren «Runde 7: avgjort 18.10» i #764).
 * Sakene bygges gjennom kjernen med klienten fra bevis-sakene, så kravene og
 * utregningen er kjernens (KA-U2, B-13).
 */
import { describe, expect, it } from 'vitest';
import type { Svarutkast } from '../../kjerne/kommandoer/kommando.ts';
import { GJELDENDE_REGLER } from '../../kjerne/regler/regelsett.ts';
import { minnebane } from '../../kjerne/tester/bane.ts';
import { Kjoering } from '../../kjerne/tester/kjoerer.ts';
import { kommandoFor, type Handling } from '../../kjerne/tester/klient.ts';
import type { Utledning } from '../../kjerne/utledning/utled.ts';
import {
  brevverdi,
  godkjenningskjede,
  IngenFullmakter,
  UtilstrekkeligFullmakt,
  type Fullmakt,
} from '../fullmakt.ts';

const KRAV_GRUNNLAG: Handling = {
  handling: 'krav',
  spor: 'grunnlag',
  underkategori: 'irregulaer_endring',
  navn: 'K-g1',
};
const KRAV_VEDERLAG: Handling = { handling: 'krav', spor: 'vederlag', belop: 100000, navn: 'K-v1' };
const KRAV_FRIST: Handling = { handling: 'krav', spor: 'frist', dager: 20, navn: 'K-f1' };
const GRUNNLAG_GODKJENT = { spor: 'grunnlag', resultat: 'godkjent', varslet_i_tide: true };
const SATS = 5000;

async function sak(krav: Handling[], svar: Record<string, unknown>[]) {
  const k = new Kjoering(minnebane());
  for (const h of krav) {
    const utfall = await k.send(h);
    if (!utfall?.godtatt) throw new Error(`Forutsetning: kravet ${String(h.navn)} ble avvist`);
  }
  const u: Utledning = await k.utledning();
  const brev = kommandoFor({ handling: 'brev', svar } as Handling, u, GJELDENDE_REGLER, k.navn);
  if (brev.type !== 'brev') throw new Error('Forutsetning: kommandoen er ikke et brev');
  return { u, svar: brev.svar as Svarutkast[] };
}

const verdi = async (krav: Handling[], svar: Record<string, unknown>[], sats: number | null) => {
  const s = await sak(krav, svar);
  return brevverdi(s.svar, s.u, sats, GJELDENDE_REGLER);
};

describe('verdien av brevet (GFK-06, presiseringen 24.09)', () => {
  it('godkjent grunnlag uten svar på kravsporene har verdien i TEs krav, dagene ganget med satsen', async () => {
    expect(
      await verdi([KRAV_GRUNNLAG, KRAV_VEDERLAG, KRAV_FRIST], [GRUNNLAG_GODKJENT], SATS)
    ).toEqual({ beloep: 100000 + 20 * SATS, gulv: 200000 });
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

  it('B-06: fristdager uten dagmulktssats kan ikke verdsettes', async () => {
    expect(
      await verdi([KRAV_GRUNNLAG, KRAV_VEDERLAG, KRAV_FRIST], [GRUNNLAG_GODKJENT], null)
    ).toEqual({ beloep: null, gulv: 100000 });
  });

  it('B-06: et fristsvar på 0 dager trenger ingen sats', async () => {
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

const fullmakt = (brukerId: string, grense: number | null, plass: number): Fullmakt => ({
  brukerId,
  tittel: brukerId,
  grense,
  plass,
});
const KJEDE = [fullmakt('pl', 200000, 1), fullmakt('sl', 1500000, 2), fullmakt('dir', null, 3)];

describe('godkjenningskjeden', () => {
  it('runde 7: uten registrerte fullmakter kan svaret ikke sendes', () => {
    expect(() => godkjenningskjede({ beloep: 0, gulv: 0 }, 'sb', [])).toThrow(IngenFullmakter);
  });

  it('avsenderens egen fullmakt dekker verdien: ingen godkjenning', () => {
    expect(godkjenningskjede({ beloep: 200000, gulv: 200000 }, 'pl', KJEDE)).toEqual([]);
  });

  it('kjeden går fram til den første som dekker verdien', () => {
    expect(
      godkjenningskjede({ beloep: 200001, gulv: 200001 }, 'sb', KJEDE).map((f) => f.brukerId)
    ).toEqual(['pl', 'sl']);
  });

  it('avsenderen står ikke i sin egen kjede', () => {
    expect(
      godkjenningskjede({ beloep: 1000000, gulv: 1000000 }, 'pl', KJEDE).map((f) => f.brukerId)
    ).toEqual(['sl']);
  });

  it('det som ikke kan verdsettes, krever hele kjeden', () => {
    expect(
      godkjenningskjede({ beloep: null, gulv: 0 }, 'pl', KJEDE).map((f) => f.brukerId)
    ).toEqual(['sl', 'dir']);
  });

  it('ubegrenset fullmakt sender alene også når beløpet ikke kan verdsettes (23.09)', () => {
    expect(godkjenningskjede({ beloep: null, gulv: 5000000 }, 'dir', KJEDE)).toEqual([]);
  });

  it('kjeden må dekke det som lar seg verdsette', () => {
    expect(() =>
      godkjenningskjede({ beloep: null, gulv: 2000000 }, 'sb', KJEDE.slice(0, 2))
    ).toThrow(UtilstrekkeligFullmakt);
    expect(() =>
      godkjenningskjede({ beloep: 2000000, gulv: 2000000 }, 'sb', KJEDE.slice(0, 2))
    ).toThrow(UtilstrekkeligFullmakt);
  });
});
