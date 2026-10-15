/**
 * Kodene i formatet (#335, arbeidsvalget 10.10 i issuet, HF-U2) og predikatet
 * for endringsordre i et svarutkast på grunnlaget (#351, GR-U12).
 */

import { describe, expect, it } from 'vitest';
import {
  BELOEPSVURDERING_FRA_KATALOGEN,
  GRUNNLAGSRESULTAT_FRA_KATALOGEN,
  HOVEDKATEGORIER,
  HOVEDKATEGORI_FRA_KATALOGEN,
  KATEGORIER,
  METODE_FRA_KATALOGEN,
  RESULTAT_FRA_KATALOGEN,
  UNDERKATEGORI_FRA_KATALOGEN,
  UTLOESER_FRA_KATALOGEN,
  fraKatalogen,
  kategoriFraKatalogen,
  tilKatalogen,
} from '../format/koder.ts';
import { formfeil } from '../kommandoer/kommando.ts';
import { lesJournal } from '../format/leser.ts';
import { erByggherrensPaalegg, gyldigeResultater } from '../regler/grunnlag.ts';
import { GJELDENDE_REGLER } from '../regler/regelsett.ts';
import {
  BELOEPSVURDERINGER,
  FRISTRESULTATER,
  GRUNNLAGSRESULTATER,
  SUBSIDIAERE_UTLOSERE,
  VEDERLAGSRESULTATER,
} from '../regler/typer.ts';
import { gjelderVarslingspliktenForVederlag } from '../regler/vederlag.ts';
import { svaretBlirEndringsordre } from '../frosset/frysing.ts';
import type { Journalrad } from '../typer.ts';
import { utled } from '../utledning/utled.ts';
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
    // GR-U16: et krav som følger av en endringsordre, identifiserer den.
    const eo = underkategori === 'endringsordre' ? { endringsordre: 'EO 12' } : {};
    expect(formfeil(grunnlagskrav({ hovedkategori, underkategori, ...eo }))).toEqual([]);
  });

  it('avviser et krav i underkategorien endringsordre uten endringsordrens dato eller nummer (GR-U16)', () => {
    expect(
      formfeil(grunnlagskrav({ hovedkategori: 'endring', underkategori: 'endringsordre' }))
    ).not.toEqual([]);
  });

  it('avviser endringsordrens dato eller nummer i en annen underkategori (GR-U16)', () => {
    expect(
      formfeil(
        grunnlagskrav({
          hovedkategori: 'endring',
          underkategori: 'irregulaer_endring',
          endringsordre: 'EO 12',
        })
      )
    ).not.toEqual([]);
  });

  it.each([
    ['katalogens koder', 'ENDRING', 'IRREG'],
    ['en ukjent underkategori', 'endring', 'noe_annet'],
    ['en underkategori under feil hovedkategori', 'svikt', 'irregulaer_endring'],
    ['force majeure, som ikke har noen underkategori', 'force_majeure', 'annet_forhold'],
  ])('avviser %s', (_navn, hovedkategori, underkategori) => {
    expect(formfeil(grunnlagskrav({ hovedkategori, underkategori }))).not.toEqual([]);
  });

  // #367: om force majeure skal kunne skrives uten underkategori, er ikke avgjort.
  it('avviser force majeure uten underkategori, som før #335', () => {
    expect(formfeil(grunnlagskrav({ hovedkategori: 'force_majeure' }))).not.toEqual([]);
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
    // GR-U18: frafall etter § 32.3 c der pålegget er byggherrens eget (irregulær endring,
    // valgrett, samordning og svar på varsel), ikke ved offentlig myndighet eller gebyr.
    const paalegg =
      h === 'endring' &&
      ['irregulaer_endring', 'valg_av_loesning', 'samordning', 'svar_paa_varsel'].includes(u);
    expect(erByggherrensPaalegg(h, u)).toBe(paalegg);
    expect(gyldigeResultater(h, u).includes('paalegg_frafalt')).toBe(paalegg);
  });

  it.each(HOVEDKATEGORIER)('varslingsplikten for vederlaget i %s (§ 34.1.2)', (h) => {
    expect(gjelderVarslingspliktenForVederlag(h)).toBe(h === 'svikt' || h === 'andre_forhold');
  });
});

describe('oversettelsen fra katalogen', () => {
  it.each([
    ['grunnlagsresultatene', GRUNNLAGSRESULTAT_FRA_KATALOGEN, GRUNNLAGSRESULTATER],
    ['vederlagsresultatene', RESULTAT_FRA_KATALOGEN, VEDERLAGSRESULTATER],
    ['beløpsvurderingene', BELOEPSVURDERING_FRA_KATALOGEN, BELOEPSVURDERINGER],
    ['utløserne', UTLOESER_FRA_KATALOGEN, SUBSIDIAERE_UTLOSERE],
    ['metodene', METODE_FRA_KATALOGEN, ['enhetspriser', 'regningsarbeid', 'tilbud']],
  ])('dekker %s i kjernen, én til én', (_navn, tabell, verdier) => {
    expect(Object.values(tabell).sort()).toEqual([...verdier].sort());
    expect(new Set(Object.values(tabell)).size).toBe(Object.keys(tabell).length);
  });

  it('dekker fristresultatene', () => {
    for (const r of FRISTRESULTATER) expect(Object.values(RESULTAT_FRA_KATALOGEN)).toContain(r);
  });

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

  it('tar den første av flere underkategorier, som kjernen', () => {
    expect(
      kategoriFraKatalogen({ hovedkategori: 'ENDRING', underkategori: ['EO', 'IRREG'] })
    ).toEqual({ hovedkategori: 'endring', underkategori: 'endringsordre' });
  });

  it('gir en ukjent kode tilbake uendret, så formatet avviser den', () => {
    expect(fraKatalogen(HOVEDKATEGORI_FRA_KATALOGEN, 'UKJENT')).toBe('UKJENT');
    expect(fraKatalogen(HOVEDKATEGORI_FRA_KATALOGEN, null)).toBe(null);
  });
});

describe('svarutkastet blir en endringsordre som brevet det gir (#351, GR-U12)', () => {
  const varsletVerdier = [true, false, undefined] as const;
  const tilfeller = PAR.flatMap(([h, u]) =>
    GRUNNLAGSRESULTATER.flatMap((resultat) =>
      varsletVerdier.map((varslet) => [h, u, resultat, varslet] as const)
    )
  );

  /** Predikatet og utledningen av brevet skrivingen gir, eller avvisningen av brevet. */
  async function sammenlikn(
    h: string,
    u: string,
    resultat: string,
    varslet: boolean | undefined
  ): Promise<{ predikat: boolean; brev: boolean | string }> {
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
    if (!brev?.godtatt) return { predikat, brev: brev?.avvisning.regel ?? 'ingen' };
    return { predikat, brev: (await k.utledning()).endringsordre === 'ja' };
  }

  it.each(tilfeller)('%s/%s, %s, varslet i tide: %s', async (h, u, resultat, varslet) => {
    const { predikat, brev } = await sammenlikn(h, u, resultat, varslet);
    // Et svar skrivingen avviser, blir ikke noe brev. Avvisningen må gjelde vurderingene,
    // ikke formen, ellers sammenliknes ingenting (code-review av #364).
    if (typeof brev === 'string') expect(brev).toBe('UGYLDIG_VURDERING');
    else expect(predikat).toBe(brev);
  });

  it('kontrollsak: begge utfallene sammenliknes med et brev som godtas', async () => {
    const ja = await sammenlikn('endring', 'irregulaer_endring', 'godkjent', true);
    const nei = await sammenlikn('endring', 'irregulaer_endring', 'godkjent', false);
    expect([ja, nei]).toEqual([
      { predikat: true, brev: true },
      { predikat: false, brev: false },
    ]);
  });

  it('predikatet kontrollerer ikke vurderingene: uten svar om § 32.2 gir godkjenningen varselet', () => {
    expect(
      svaretBlirEndringsordre(
        { resultat: 'godkjent' },
        { hovedkategori: 'endring', underkategori: 'irregulaer_endring' },
        GJELDENDE_REGLER
      )
    ).toBe(true);
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
