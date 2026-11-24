/**
 * BHs svar på vederlagskravet slik Varden sender det (`vederlagssvaret`), fra valgene i
 * skjemaet og til kjernen tar imot kommandoen. Forventningene sto ved den fjernede
 * `vederlagssvarFraSkjema` (#1678) og prøves her mot det Varden faktisk sender.
 */

import { describe, expect, it } from 'vitest';
import { laastTekst, utledJournal } from '#kjerne/kommandoer/skriving.ts';
import { KJERNE } from '#kjerne/versjon.ts';
import type { Journalrad } from '#kjerne/typer.ts';
import { medVederlag, opprettet, skrevet } from '#lib/kjernesak/__tests__/provejournal.ts';
import { kravposterI } from '#kjerne/spor/vederlag/format.ts';
import { tomPost, tomtSvar, vederlagssvaret, type Postvalg } from '../kommandoer';
import { lagForUtkastet } from '#kjerne/kommandoer/lag.ts';

const grunnforhold = skrevet([opprettet], 'TE', {
  type: 'krav',
  spor: 'forhold',
  innhold: {
    hovedkategori: 'svikt',
    underkategori: 'grunnforhold',
    klar_over_forholdet: '2026-10-01',
  },
  utdypning: 'Leire der rapporten sa fjell.',
});

const medKrav = (beloep: number) =>
  skrevet(grunnforhold, 'TE', {
    type: 'krav',
    spor: 'vederlag',
    innhold: { kravposter: [{ beskrivelse: 'Kravposten', oppgjoersform: 'tilbud', beloep }] },
    utdypning: 'Tilbudet gjelder ekstra masseutskifting.',
  });

const svar = (
  journal: Journalrad[],
  {
    begrunnelser = {},
    forbehold = '',
    punktene = [],
    ...post
  }: Partial<Postvalg> & {
    begrunnelser?: Record<string, string>;
    forbehold?: string;
    punktene?: string[];
  }
) =>
  vederlagssvaret(
    {
      ...tomtSvar(),
      iTide: true,
      poster: { P1: { ...tomPost(), form: 'godtar', ...post } },
      begrunnelser,
      forbehold,
    },
    utledJournal(journal, KJERNE),
    KJERNE.regler,
    punktene
  )!;

describe('resultatet Varden sender, regnes av kjernen (#1301, B-13)', () => {
  it('40 øre under det krevde er «delvis godkjent» etter OV-U59, og kjernen skriver svaret med ørene', () => {
    const journal = medKrav(125_000);
    const kommando = svar(journal, { beloep: 'deler', delbeloep: '124 999,60' });
    expect(kommando.svar[0].resultat).toMatchObject({
      resultat: 'delvis_godkjent',
      godkjent_beloep: 124_999.6,
    });
    // Beløpene har hardt mellomrom som tusenskille.
    const tekst = laastTekst(skrevet(journal, 'BH', kommando).at(-1)!)!
      .join(' ')
      .replace(/\s/g, ' ');
    expect(tekst).toContain('124 999,60 kr');
  });

  it('godkjent hele beløpet gir kjernens resultat for vurderingene', () => {
    const kommando = svar(medKrav(150_000), { beloep: 'hele' });
    expect(kommando.svar[0].resultat).toEqual({
      resultat: 'godkjent',
      godkjent_beloep: 150_000,
      // OV-U31, KA-U57 (e): beløpet for posten i hvert lag; svaret har ett lag.
      poster: [{ gjelder: expect.any(String), lag: [{ lag: 1, beloep: 150_000 }] }],
    });
  });

  it('vurderinger kjernen ikke kan regne ut, gir ikke noe resultat, og kjernen avviser svaret (KA-U42)', () => {
    const journal = medKrav(150_000);
    const kommando = svar(journal, { beloep: 'deler', delbeloep: '0' });
    expect(kommando.svar[0].resultat).toEqual({});
    expect(() => skrevet(journal, 'BH', kommando)).toThrow(
      /Vurderingene kan ikke regnes ut: .*«delvis»/
    );
  });
});

describe('postene i svaret', () => {
  it('et krav uten posten etter § 34.1.3 annet ledd gir ingen vurdering av posten (OV-U23)', () => {
    const kommando = svar(medKrav(125_000), { beloep: 'deler', delbeloep: '100 000' });
    expect(
      Object.keys(kommando.svar[0].vurderinger).filter((f) => f.startsWith('produktivitet_'))
    ).toEqual([]);
    expect(kommando.svar[0].resultat).toMatchObject({ godkjent_beloep: 100_000 });
  });

  it('svaret har ingen felt for rigg og drift, som ikke er i kjernens format (#1171)', () => {
    expect(JSON.stringify(svar(medKrav(125_000), { beloep: 'hele' }))).not.toMatch(/rigg_/);
  });

  it('utdypningen er bare teksten BH skrev: tomt forbehold og tom begrunnelse gir ingen utdypning (KA-U41, bindende i KA-U43)', () => {
    const journal = medKrav(125_000);
    const tomt = svar(journal, {
      beloep: 'hele',
      forbehold: '   ',
      begrunnelser: { P1: '  ' },
      punktene: ['P1'],
    }).svar[0];
    expect(tomt).not.toHaveProperty('utdypning');
    expect(tomt).not.toHaveProperty('utdypninger');
    expect(
      svar(journal, { beloep: 'hele', forbehold: '  Forbehold om mengdene. ' }).svar[0].utdypning
    ).toBe('Forbehold om mengdene.');
  });

  it('begrunnelsen står per punkt, og bare for punktene brevet har (KA-U46, LV-U71)', () => {
    const journal = medKrav(125_000);
    const begrunnelser = { P1: ' Godtatt etter befaring. ', '34.1.2': 'Varselet kom sent.' };
    expect(
      svar(journal, { beloep: 'hele', begrunnelser, punktene: ['P1'] }).svar[0].utdypninger
    ).toEqual({ P1: 'Godtatt etter befaring.' });
  });
});

describe('svaret per kravpost (KA-U57, #1663)', () => {
  const toPoster = skrevet(grunnforhold, 'TE', {
    type: 'krav',
    spor: 'vederlag',
    innhold: {
      kravposter: [
        { beskrivelse: 'Graving', oppgjoersform: 'tilbud', beloep: 100_000 },
        { beskrivelse: 'Rør', oppgjoersform: 'tilbud', beloep: 40_000 },
      ],
    },
    utdypning: 'To kravposter med fast sum.',
  });

  it('hver kravpost får vurderingen BH valgte under betegnelsen, med kravpostens id i `gjelder`, og uten beløp når BH mener en annen oppgjørsform (KA-U72)', () => {
    const u = utledJournal(toPoster, KJERNE);
    const [p1, p2] = kravposterI(u.spor.vederlag.gjeldendeKrav!);
    const kommando = vederlagssvaret(
      {
        iTide: true,
        poster: {
          P1: { ...tomPost(), form: 'godtar', beloep: 'hele', delbeloep: '' },
          P2: { ...tomPost(), form: 'regningsarbeid', beloep: 'deler', delbeloep: '30 000' },
        },
        begrunnelser: {},
        forbehold: '',
      },
      u,
      KJERNE.regler
    )!;
    expect(kommando.svar[0].vurderinger.kravposter).toEqual([
      { gjelder: p1!.id, vurdering: 'godkjent', godkjent_beloep: 100_000, aksepterer: true },
      { gjelder: p2!.id, aksepterer: false, oensket_oppgjoersform: 'regningsarbeid' },
    ]);
  });

  it('lagene i en kravpost står også før oppgjørsformen er besvart, med standpunktet ubesvart, og den besvarte kravposten har sitt eget svar (KA-U57, OV-U33, #1925)', () => {
    const u = utledJournal(toPoster, KJERNE);
    const [p1, p2] = kravposterI(u.spor.vederlag.gjeldendeKrav!);
    const valg = {
      iTide: true,
      poster: {
        P1: { ...tomPost(), form: 'regningsarbeid', beloep: 'hele', delbeloep: '' },
        P2: { ...tomPost(), form: null, beloep: 'hele', delbeloep: '' },
      },
      begrunnelser: {},
      forbehold: '',
    } satisfies Parameters<typeof vederlagssvaret>[0];
    const utkast = vederlagssvaret(valg, u, KJERNE.regler)!.svar[0];
    const [v1, v2] = utkast.vurderinger.kravposter as Record<string, unknown>[];
    expect(v1).toMatchObject({ gjelder: p1!.id, aksepterer: false });
    expect(v2, 'P2 uten valgt form sendes uten den').not.toHaveProperty('aksepterer');
    const formen = (id: string) =>
      lagForUtkastet(utkast, u, KJERNE.regler).standpunkter.find(
        (x) => x.art === 'oppgjoersform' && x.gjelder === id
      );
    expect(formen(p1!.id)?.besvart, 'laget for oppgjørsformen i P1').toBe(true);
    expect(formen(p2!.id)?.besvart, 'laget for oppgjørsformen i P2, ubesvart').toBe(false);
  });

  it('en kravpost uten valg står uten vurdering, så kjernen avviser svaret', () => {
    const u = utledJournal(toPoster, KJERNE);
    const kommando = vederlagssvaret(
      {
        iTide: true,
        poster: { P1: { ...tomPost(), form: 'godtar', beloep: 'hele', delbeloep: '' } },
        begrunnelser: {},
        forbehold: '',
      },
      u,
      KJERNE.regler
    )!;
    expect((kommando.svar[0].vurderinger.kravposter as unknown[])[1]).toEqual({
      gjelder: kravposterI(u.spor.vederlag.gjeldendeKrav!)[1]!.id,
    });
  });
});

describe('svaret på en kravpost etter en beregningsregel (#1756, BF-14 D-7, D-14, D-15)', () => {
  const regelkrav = skrevet(grunnforhold, 'TE', {
    type: 'krav',
    spor: 'vederlag',
    innhold: {
      kravposter: [
        { beskrivelse: 'Pumping', oppgjoersform: 'regningsarbeid' },
        { beskrivelse: 'Spunt', oppgjoersform: 'enhetspriser', justert: true },
      ],
    },
    utdypning: 'To kravposter etter en beregningsregel.',
  });
  const u = utledJournal(regelkrav, KJERNE);
  const krav = u.spor.vederlag.gjeldendeKrav!;
  const [p1, p2] = kravposterI(krav);
  const valgene = (P1: Partial<Postvalg>, P2: Partial<Postvalg> = {}) => ({
    ...tomtSvar(),
    iTide: true,
    poster: { P1: { ...tomPost(), ...P1 }, P2: { ...tomPost(), ...P2 } },
  });
  const kravpostene = (P1: Partial<Postvalg>, P2: Partial<Postvalg> = {}) =>
    vederlagssvaret(valgene(P1, P2), u, KJERNE.regler)!.svar[0].vurderinger.kravposter as Record<
      string,
      unknown
    >[];

  it('en godkjent beregningsregel sendes uten beløp, og kravet om tilbud som står igjen i valgene, sendes ikke (KA-U66, KA-U71, #1756 punkt 3)', () => {
    expect(
      kravpostene(
        { form: 'godtar', kreverTilbud: true, beloep: 'hele' },
        { form: 'godtar', varsletITide: true, godtarJustering: true }
      )
    ).toEqual([
      { gjelder: p1!.id, aksepterer: true },
      { gjelder: p2!.id, aksepterer: true, varslet_i_tide: true, godtar_justering: true },
    ]);
  });

  it('kravet om tilbud uten en annen beregningsregel er at regelen ikke godtas (KA-U71, svar 3 A 10.11)', () => {
    expect(kravpostene({ form: null, kreverTilbud: true })[0]).toEqual({
      gjelder: p1!.id,
      aksepterer: false,
      krever_tilbud: true,
    });
    expect(kravpostene({ form: 'enhetspriser', kreverTilbud: true })[0]).toEqual({
      gjelder: p1!.id,
      aksepterer: false,
      oensket_oppgjoersform: 'enhetspriser',
      krever_tilbud: true,
    });
  });

  it('for punkt 34.4 sendes standpunktet til varselet, også subsidiært når BH mener enhetspriser, og «i tide» avgjør kjernen som oppgivelsen (VS-U63, oppdragsgiver 23.11 i #2171, #2278)', () => {
    expect(kravpostene({ form: 'godtar', varsletITide: false })[0]).toMatchObject({
      varslet_i_tide: false,
    });
    // Kjernen avviser «i tide» uten en innsigelse å gi opp (`kontrollerOppgivelsenEtter344`).
    expect(kravpostene({ form: 'godtar', varsletITide: true })[0]).toMatchObject({
      varslet_i_tide: true,
    });
    expect(kravpostene({ form: 'enhetspriser', varsletITide: false })[0]).toMatchObject({
      aksepterer: false,
      oensket_oppgjoersform: 'enhetspriser',
      varslet_i_tide: false,
    });
  });

  it('med en annen beregningsregel står varselet etter punkt 34.3.3 og justeringen subsidiært, og kjernen tar imot svaret (VS-U56)', () => {
    const kommando = vederlagssvaret(
      valgene(
        { form: 'godtar' },
        { form: 'regningsarbeid', varsletITide: false, godtarJustering: false }
      ),
      u,
      KJERNE.regler
    )!;
    expect(kommando.svar[0].vurderinger.kravposter).toEqual([
      { gjelder: p1!.id, aksepterer: true },
      {
        gjelder: p2!.id,
        aksepterer: false,
        oensket_oppgjoersform: 'regningsarbeid',
        varslet_i_tide: false,
        godtar_justering: false,
      },
    ]);
    const tekst = laastTekst(skrevet(regelkrav, 'BH', kommando).at(-1)!)!.join(' ');
    expect(tekst).toContain('Subsidiært');
  });

  it('lagene kan regnes før oppgjørsformen er besvart: beløpet står med regelen godtatt, og oppgjørsformen ubesvart (#1756 punkt 1, #1925)', () => {
    const utkast = vederlagssvaret(valgene({}), u, KJERNE.regler)!.svar[0];
    expect((utkast.vurderinger.kravposter as Record<string, unknown>[])[0]).toEqual({
      gjelder: p1!.id,
    });
    const lag = lagForUtkastet(utkast, u, KJERNE.regler);
    expect(
      lag.standpunkter.find((x) => x.art === 'oppgjoersform' && x.gjelder === p1!.id)?.besvart
    ).toBe(false);
  });
});

describe('varselet etter punkt 34.1.2 i svaret (#1842)', () => {
  it('ved endring etter punkt 34.1.1 sendes ikke svaret om varselet, selv om valget står fra før (OV-U15)', () => {
    const k = vederlagssvaret(
      { ...tomtSvar(), iTide: true, poster: { P1: { ...tomPost(), form: 'godtar' } } },
      utledJournal(medVederlag, KJERNE),
      KJERNE.regler
    )!;
    expect(k.svar[0]!.vurderinger).not.toHaveProperty('hovedkrav_varslet_i_tide');
  });

  it('ved svikt sendes svaret om varselet (kontrollsak)', () => {
    expect(svar(medKrav(100000), {}).svar[0]!.vurderinger).toMatchObject({
      hovedkrav_varslet_i_tide: true,
    });
  });
});
