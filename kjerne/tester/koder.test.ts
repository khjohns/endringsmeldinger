/**
 * Kodene i formatet (#335, arbeidsvalget 10.10 i issuet, HF-U2) og predikatet
 * for endringsordre i et svarutkast på grunnlaget (#351, GR-U12).
 */

import { describe, expect, it } from 'vitest';
import {
  HOVEDKATEGORIER,
  HOVEDKATEGORI_FRA_KATALOGEN,
  KATEGORIER,
  UNDERKATEGORI_FRA_KATALOGEN,
  fraKatalogen,
  tilKatalogen,
} from '../koder.ts';
import { formfeil } from '../kommando.ts';
import { lesJournal } from '../leser.ts';
import { erPaalegg, gyldigeResultater } from '../regler/grunnlag.ts';
import { GJELDENDE_REGLER } from '../regler/regelsett.ts';
import { GRUNNLAGSRESULTATER } from '../regler/typer.ts';
import { gjelderVarslingspliktenForVederlag } from '../regler/vederlag.ts';
import { svaretBlirEndringsordre } from '../skriving.ts';
import type { Journalrad } from '../typer.ts';
import { utled } from '../utled.ts';
import { KJERNE } from '../versjon.ts';
import { minnebane } from './bane.ts';
import { bygg } from './baner.ts';
import { Kjoering } from './kjoerer.ts';

const PAR = HOVEDKATEGORIER.flatMap((h) => KATEGORIER[h].map((u) => [h, u] as const));

const grunnlagskrav = (innhold: Record<string, unknown>) => ({
  type: 'krav',
  spor: 'grunnlag',
  innhold,
});

describe('kategorien i grunnlagskravet er et par fra den lukkede listen (#335, HF-U1)', () => {
  it.each(PAR)('godtar %s/%s', (hovedkategori, underkategori) => {
    expect(formfeil(grunnlagskrav({ hovedkategori, underkategori }))).toEqual([]);
  });

  it.each([
    ['katalogens koder', 'ENDRING', 'IRREG'],
    ['en ukjent underkategori', 'endring', 'noe_annet'],
    ['en underkategori under feil hovedkategori', 'svikt', 'irregulaer_endring'],
    ['force majeure, som ikke har noen underkategori', 'force_majeure', 'annet_forhold'],
  ])('avviser %s', (_navn, hovedkategori, underkategori) => {
    expect(formfeil(grunnlagskrav({ hovedkategori, underkategori }))).not.toEqual([]);
  });

  it('en lagret rad med katalogens koder er ikke forstått; kontrollsak: kjernens koder', async () => {
    const bane = minnebane();
    await bygg(bane, [{ handling: 'krav', spor: 'grunnlag', underkategori: 'irregulaer_endring' }]);
    const journal = await bane.journal();
    const forstaatt = (rader: Journalrad[]) =>
      utled(lesJournal(rader, KJERNE.leserformat), GJELDENDE_REGLER).forstaatt;
    const medKategori = (hovedkategori: string, underkategori: string): Journalrad[] =>
      journal.map((r) => {
        const krav = r.data.krav as Record<string, unknown>[] | undefined;
        if (!krav) return r;
        return {
          ...r,
          data: { ...r.data, krav: krav.map((k) => ({ ...k, hovedkategori, underkategori })) },
        };
      });
    expect(forstaatt(medKategori('endring', 'irregulaer_endring'))).toBe(true);
    expect(forstaatt(medKategori('ENDRING', 'IRREG'))).toBe(false);
    expect(forstaatt(medKategori('svikt', 'irregulaer_endring'))).toBe(false);
  });
});

describe('metoden i vederlagskravet (#335, § 34.2.1)', () => {
  const vederlagskrav = (metode: string) => ({
    type: 'krav',
    spor: 'vederlag',
    innhold: { metode, beloep: 1000 },
  });

  it('godtar tilbud', () => expect(formfeil(vederlagskrav('tilbud'))).toEqual([]));

  it.each(['FASTPRIS_TILBUD', 'regningsarbeid'])('avviser %s', (metode) => {
    expect(formfeil(vederlagskrav(metode))).not.toEqual([]);
  });
});

describe('reglene med kjernens koder', () => {
  it.each(PAR)('%s/%s', (h, u) => {
    // GR-U11: § 32.2 gjelder alle underkategorier under endring unntatt endringsordre.
    expect(GJELDENDE_REGLER.gjelderVarslingsplikten(h, u)).toBe(
      h === 'endring' && u !== 'endringsordre'
    );
    // § 32.3 første ledd c: frafall gjelder et pålegg (GR-U3).
    const paalegg = h === 'endring' && (u === 'irregulaer_endring' || u === 'valg_av_loesning');
    expect(erPaalegg(h, u)).toBe(paalegg);
    expect(gyldigeResultater(h, u).includes('paalegg_frafalt')).toBe(paalegg);
  });

  it.each(HOVEDKATEGORIER)('varslingsplikten for vederlaget i %s (§ 34.1.2)', (h) => {
    expect(gjelderVarslingspliktenForVederlag(h)).toBe(h === 'svikt' || h === 'andre_forhold');
  });
});

describe('oversettelsen fra katalogen', () => {
  it('går begge veier uten tap', () => {
    for (const tabell of [HOVEDKATEGORI_FRA_KATALOGEN, UNDERKATEGORI_FRA_KATALOGEN])
      for (const [gammel, ny] of Object.entries(tabell)) {
        expect(fraKatalogen(tabell, gammel)).toBe(ny);
        expect(tilKatalogen(tabell, ny)).toBe(gammel);
      }
  });

  it('dekker hver kode i den lukkede listen', () => {
    expect(Object.values(HOVEDKATEGORI_FRA_KATALOGEN).sort()).toEqual([...HOVEDKATEGORIER].sort());
    expect(Object.values(UNDERKATEGORI_FRA_KATALOGEN).sort()).toEqual(
      PAR.map(([, u]) => u as string).sort()
    );
  });

  it('gir en ukjent kode tilbake uendret, så formatet avviser den', () => {
    expect(fraKatalogen(HOVEDKATEGORI_FRA_KATALOGEN, 'UKJENT')).toBe('UKJENT');
    expect(fraKatalogen(HOVEDKATEGORI_FRA_KATALOGEN, null)).toBe(null);
  });
});

describe('svarutkastet blir en endringsordre som brevet det gir (#351, GR-U12)', () => {
  const VARSLET = [true, false, undefined] as const;
  const sammenliknet = new Set<boolean>();
  const tilfeller = PAR.flatMap(([h, u]) =>
    GRUNNLAGSRESULTATER.flatMap((resultat) =>
      VARSLET.map((varslet) => [h, u, resultat, varslet] as const)
    )
  );

  it.each(tilfeller)('%s/%s, %s, varslet i tide: %s', async (h, u, resultat, varslet) => {
    const vurderinger = {
      resultat,
      ...(varslet === undefined ? {} : { grunnlag_varslet_i_tide: varslet }),
    };
    const predikat = svaretBlirEndringsordre(
      vurderinger,
      { hovedkategori: h, underkategori: u },
      GJELDENDE_REGLER
    );
    const k = new Kjoering(minnebane());
    const krav = await k.send({
      handling: 'krav',
      spor: 'grunnlag',
      hovedkategori: h,
      underkategori: u,
    });
    if (!krav?.godtatt) throw new Error('Forutsetning: kravet ble avvist');
    const brev = await k.send({
      handling: 'brev',
      svar: [
        {
          spor: 'grunnlag',
          resultat,
          ...(varslet === undefined ? {} : { varslet_i_tide: varslet }),
        },
      ],
    });
    // Et svar kjernen avviser, blir ikke noe brev; predikatet sier da bare hva utkastet ville gitt.
    if (!brev?.godtatt) return;
    expect(predikat).toBe((await k.utledning()).endringsordre === 'ja');
    sammenliknet.add(predikat);
  });

  it('kontrollsak: begge utfallene er sammenliknet med et brev', () => {
    expect([...sammenliknet].sort()).toEqual([false, true]);
  });

  it.each([undefined, 'GODKJENT', 'avslatt'])(
    'et ukjent resultat (%s) er ingen endringsordre',
    (resultat) => {
      expect(
        svaretBlirEndringsordre(
          { resultat, grunnlag_varslet_i_tide: true },
          { hovedkategori: 'endring', underkategori: 'irregulaer_endring' },
          GJELDENDE_REGLER
        )
      ).toBe(false);
    }
  );
});
