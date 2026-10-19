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
import { oppgittDato } from '../format/format.ts';
import { regnUtSvar } from '../frosset/standpunkt.ts';
import { UgyldigVurdering } from '../regler/feil.ts';
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
import type { Journalrad, Krav } from '../typer.ts';
import { utled } from '../utledning/utled.ts';
import { KJERNE } from '../versjon.ts';
import { minnebane } from './bane.ts';
import { bygg } from './baner.ts';
import { Kjoering } from './kjoerer.ts';
import { NESTE_REGLER } from './klient.ts';

const PAR = HOVEDKATEGORIER.flatMap((h) => KATEGORIER[h].map((u) => [h, u] as const));

const grunnlagskrav = (innhold: Record<string, unknown>) => ({
  type: 'krav',
  spor: 'grunnlag',
  innhold,
});

/**
 * VS-U26: datoen varslingsplikten løper fra, i feltet kategorien har etter formatet, så
 * testene prøver paret og ikke feltet (#698). Regelen for feltet prøves for seg under.
 */
const datoen = (hovedkategori: string, underkategori: string) => {
  const felt = oppgittDato(hovedkategori, underkategori);
  return felt ? { [felt]: '2026-10-01' } : {};
};

/** Meldingen formkontrollen gir når innholdet ikke er et av kategoriparene (#335). */
const ikkeEtPar = (innhold: Record<string, unknown>) =>
  `$.innhold: ${JSON.stringify(innhold)} passer ingen av alternativene`;

describe('kategorien i grunnlagskravet er et par fra den lukkede listen (#335, HF-U1)', () => {
  it.each(PAR)('godtar %s/%s', (hovedkategori, underkategori) => {
    // GR-U16: et krav som følger av en endringsordre, identifiserer den.
    const eo = underkategori === 'endringsordre' ? { endringsordre: 'EO 12' } : {};
    expect(
      formfeil(
        grunnlagskrav({
          hovedkategori,
          underkategori,
          ...eo,
          ...datoen(hovedkategori, underkategori),
        })
      )
    ).toEqual([]);
  });

  // Kontrollsakene er «godtar»-testene over, som skiller seg bare i feltet (#698).
  it('avviser et krav i underkategorien endringsordre uten endringsordrens dato eller nummer (GR-U16)', () => {
    const innhold = { hovedkategori: 'endring', underkategori: 'endringsordre' };
    expect(formfeil(grunnlagskrav(innhold))).toEqual([ikkeEtPar(innhold)]);
  });

  it('avviser endringsordrens dato eller nummer i en annen underkategori (GR-U16)', () => {
    const innhold = {
      hovedkategori: 'endring',
      underkategori: 'irregulaer_endring',
      endringsordre: 'EO 12',
      paalegg_mottatt: '2026-10-01',
    };
    expect(formfeil(grunnlagskrav(innhold))).toEqual([ikkeEtPar(innhold)]);
  });

  // Paret avviser de to siste alene; de to første avvises også av listen over koder (#698).
  it.each([
    ['katalogens koder', 'ENDRING', 'IRREG', true],
    ['en ukjent underkategori', 'endring', 'noe_annet', true],
    ['en underkategori under feil hovedkategori', 'svikt', 'irregulaer_endring', false],
    ['force majeure, som ikke har noen underkategori', 'force_majeure', 'annet_forhold', false],
  ])('avviser %s', (_navn, hovedkategori, underkategori, ukjentKode) => {
    // Med datoen avvises kravet ikke fordi datoen mangler.
    const innhold = { hovedkategori, underkategori, ...datoen(hovedkategori, underkategori) };
    const feil = formfeil(grunnlagskrav(innhold));
    expect(feil[0]).toBe(ikkeEtPar(innhold));
    expect(feil.length > 1).toBe(ukjentKode);
  });

  // #367: om force majeure skal kunne skrives uten underkategori, er ikke avgjort. I dag
  // avvises det både fordi underkategorien er påkrevd og fordi det ikke er et par.
  it('avviser force majeure uten underkategori, både som manglende felt og som par, som før #335', () => {
    const innhold = { hovedkategori: 'force_majeure' };
    expect(formfeil(grunnlagskrav(innhold))).toEqual([
      ikkeEtPar(innhold),
      '$.innhold.underkategori: mangler',
    ]);
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
    expect(GJELDENDE_REGLER.gyldigeGrunnlagsresultater(h, u).includes('paalegg_frafalt')).toBe(
      paalegg
    );
  });

  // VS-U26: datoen pålegget ble mottatt, oppgis der § 32.2 gjelder. Brevteksten skriver
  // setningen om § 32.2 etter regelsettet og datosetningen etter feltet (T2 i #770, #698).
  it.each(PAR)('feltet for datoen i %s/%s følger § 32.2 i regelsettet', (h, u) => {
    expect(oppgittDato(h, u) === 'paalegg_mottatt').toBe(
      GJELDENDE_REGLER.gjelderVarslingsplikten(h, u)
    );
  });

  // GR-U18 er en tolkning av § 32.3 c, ikke av § 32.2, så testregelsettet endrer dem hver
  // for seg (T4 i #770, #514).
  it('regelsettet n+1 endrer frafallet og § 32.2 hver for seg', () => {
    expect(NESTE_REGLER.gjelderVarslingsplikten('endring', 'samordning')).toBe(false);
    expect(NESTE_REGLER.gyldigeGrunnlagsresultater('endring', 'samordning')).toContain(
      'paalegg_frafalt'
    );
    expect(NESTE_REGLER.gjelderVarslingsplikten('endring', 'valg_av_loesning')).toBe(true);
    expect(NESTE_REGLER.gyldigeGrunnlagsresultater('endring', 'valg_av_loesning')).not.toContain(
      'paalegg_frafalt'
    );
  });

  it('utregningen av svaret på grunnlaget leser frafallet av regelsettet (#514)', () => {
    const krav = { innhold: { hovedkategori: 'endring', underkategori: 'valg_av_loesning' } };
    const regn = (regler: typeof GJELDENDE_REGLER) => () =>
      regnUtSvar(
        'grunnlag',
        { resultat: 'paalegg_frafalt', grunnlag_varslet_i_tide: true },
        { krav: krav as unknown as Krav, grunnlagskrav: null },
        regler
      );
    expect(regn(GJELDENDE_REGLER)).not.toThrow();
    expect(regn(NESTE_REGLER)).toThrow(UgyldigVurdering);
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

describe('datoen varslingsplikten løper fra, i grunnlagskravet (VS-U26)', () => {
  const krav = (innhold: Record<string, unknown>) => formfeil(grunnlagskrav(innhold));

  it.each(PAR.filter(([, u]) => u !== 'endringsordre'))(
    'et krav fra appen i %s/%s uten datoen avvises',
    (hovedkategori, underkategori) => {
      const felt = Object.keys(datoen(hovedkategori, underkategori))[0];
      expect(krav({ hovedkategori, underkategori })).toEqual([
        expect.stringMatching(new RegExp(`^\\$\\.innhold\\.${felt}: TE må oppgi datoen`)),
      ]);
    }
  );

  it.each([
    ['pålegget mottatt i svikt', 'svikt', 'grunnforhold', { paalegg_mottatt: '2026-10-01' }],
    [
      'klar over forholdet der § 32.2 gjelder',
      'endring',
      'irregulaer_endring',
      { klar_over_forholdet: '2026-10-01' },
    ],
    [
      'pålegget mottatt i endringsordre',
      'endring',
      'endringsordre',
      { paalegg_mottatt: '2026-10-01' },
    ],
    [
      'klar over forholdet i endringsordre',
      'endring',
      'endringsordre',
      { klar_over_forholdet: '2026-10-01' },
    ],
  ])('avviser datoen for %s', (_n, hovedkategori, underkategori, felt) => {
    const riktig = {
      hovedkategori,
      underkategori,
      ...(underkategori === 'endringsordre' ? { endringsordre: 'EO 12' } : {}),
      ...datoen(hovedkategori, underkategori),
    };
    expect(krav(riktig), 'kontrollsak').toEqual([]);
    expect(krav({ ...riktig, ...felt })).not.toEqual([]);
  });

  it.each(['2026-02-30', '2026-10-1', '1. oktober 2026'])(
    'avviser %s, som ikke er en dato',
    (d) => {
      expect(
        krav({ hovedkategori: 'svikt', underkategori: 'grunnforhold', klar_over_forholdet: d })
      ).toEqual([expect.stringContaining('klar_over_forholdet')]);
    }
  );

  it('et registrert krav uten datoen er forstått; datoen i feil kategori er det ikke', () => {
    const rad = (innhold: Record<string, unknown>): Journalrad => ({
      event_id: 'e2',
      sak_id: 's',
      event_type: 'dokument_registrert',
      versjon: 2,
      tidsstempel: '2026-10-02T08:00:00.000Z',
      aktor_id: 'te',
      aktor_rolle: 'TE',
      aktor_team_id: null,
      refererer_til_event_id: null,
      format: 1,
      data: {
        krav: [{ id: 'k', spor: 'grunnlag', ...innhold }],
        opplysninger: [{ id: 'o', hva: 'sendt', dato: '2026-10-01' }],
      },
    });
    const art = (innhold: Record<string, unknown>) =>
      lesJournal([rad(innhold)], KJERNE.leserformat)[0].art;
    expect(art({ hovedkategori: 'svikt', underkategori: 'grunnforhold' })).toBe('dokument');
    expect(
      art({
        hovedkategori: 'svikt',
        underkategori: 'grunnforhold',
        klar_over_forholdet: '2026-10-01',
      })
    ).toBe('dokument');
    expect(
      art({ hovedkategori: 'svikt', underkategori: 'grunnforhold', paalegg_mottatt: '2026-10-01' })
    ).toBe('ukjent');
  });
});
