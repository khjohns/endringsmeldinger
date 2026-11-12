/**
 * BHs svar på vederlagskravet slik Varden sender det (`vederlagssvaret`), fra valgene i
 * skjemaet og til kjernen tar imot kommandoen. Forventningene sto ved den fjernede
 * `vederlagssvarFraSkjema` (#1678) og prøves her mot det Varden faktisk sender.
 */

import { describe, expect, it } from 'vitest';
import { laastTekst, utledJournal } from '$kjerne/kommandoer/skriving';
import { KJERNE } from '$kjerne/versjon';
import type { Journalrad } from '$kjerne/typer';
import { opprettet, skrevet } from '$lib/kjernesak/__tests__/provejournal';
import { kravposterI } from '$kjerne/spor/vederlag/format';
import {
  tomPost,
  tomtSvar,
  utkastForBeloepet,
  vederlagssvaret,
  type Postvalg,
} from '../kommandoer';
import { lagForUtkastet } from '$kjerne/kommandoer/lag';

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
  { begrunnelse = '', ...post }: Partial<Postvalg> & { begrunnelse?: string }
) =>
  vederlagssvaret(
    {
      ...tomtSvar(),
      iTide: true,
      poster: { P1: { ...tomPost(), form: 'godtar', ...post } },
      begrunnelse,
    },
    utledJournal(journal, KJERNE),
    KJERNE.regler
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

  it('utdypningen er bare teksten BH skrev: tom begrunnelse gir ingen utdypning (KA-U41, bindende i KA-U43)', () => {
    const journal = medKrav(125_000);
    expect(svar(journal, { beloep: 'hele', begrunnelse: '   ' }).svar[0]).not.toHaveProperty(
      'utdypning'
    );
    expect(
      svar(journal, { beloep: 'hele', begrunnelse: '  Godtatt etter befaring. ' }).svar[0].utdypning
    ).toBe('Godtatt etter befaring.');
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
        begrunnelse: '',
      },
      u,
      KJERNE.regler
    )!;
    expect(kommando.svar[0].vurderinger.kravposter).toEqual([
      { gjelder: p1!.id, vurdering: 'godkjent', godkjent_beloep: 100_000, aksepterer: true },
      { gjelder: p2!.id, aksepterer: false, oensket_oppgjoersform: 'regningsarbeid' },
    ]);
  });

  it('lagene for beløpet i en kravpost med svar på oppgjørsformen har laget for den, også når en annen kravpost mangler svaret (KA-U57, OV-U33)', () => {
    const u = utledJournal(toPoster, KJERNE);
    const krav = u.spor.vederlag.gjeldendeKrav!;
    const [p1, p2] = kravposterI(krav);
    const valg = {
      iTide: true,
      poster: {
        P1: { ...tomPost(), form: 'regningsarbeid', beloep: 'hele', delbeloep: '' },
        P2: { ...tomPost(), form: null, beloep: 'hele', delbeloep: '' },
      },
      begrunnelse: '',
    } satisfies Parameters<typeof vederlagssvaret>[0];
    const utkast = utkastForBeloepet(vederlagssvaret(valg, u, KJERNE.regler)!.svar[0], valg, krav);
    const [v1, v2] = utkast.vurderinger.kravposter as Record<string, unknown>[];
    expect(v1).toMatchObject({ gjelder: p1!.id, aksepterer: false });
    expect(v2, 'P2 uten valgt form står uten den').not.toHaveProperty('aksepterer');
    const lag = lagForUtkastet(utkast, u, KJERNE.regler);
    expect(
      lag.standpunkter.some((x) => x.art === 'oppgjoersform' && x.gjelder === p1!.id),
      'laget for oppgjørsformen i P1'
    ).toBe(true);
    expect(lag.standpunkter.some((x) => x.art === 'oppgjoersform' && x.gjelder === p2!.id)).toBe(
      false
    );
  });

  it('en kravpost uten valg står uten vurdering, så kjernen avviser svaret', () => {
    const u = utledJournal(toPoster, KJERNE);
    const kommando = vederlagssvaret(
      {
        iTide: true,
        poster: { P1: { ...tomPost(), form: 'godtar', beloep: 'hele', delbeloep: '' } },
        begrunnelse: '',
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

  it('for punkt 34.4 sendes bare «ikke gitt eller kom for sent», og bare når regningsarbeid godkjennes (VS-U63, prototype v4)', () => {
    expect(kravpostene({ form: 'godtar', varsletITide: false })[0]).toMatchObject({
      varslet_i_tide: false,
    });
    expect(kravpostene({ form: 'godtar', varsletITide: true })[0]).not.toHaveProperty(
      'varslet_i_tide'
    );
    expect(kravpostene({ form: 'enhetspriser', varsletITide: false })[0]).not.toHaveProperty(
      'varslet_i_tide'
    );
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

  it('lagene kan regnes før oppgjørsformen er besvart: kravposten står med regelen godtatt (#1756 punkt 1)', () => {
    const valg = valgene({});
    const utkast = utkastForBeloepet(vederlagssvaret(valg, u, KJERNE.regler)!.svar[0], valg, krav);
    expect((utkast.vurderinger.kravposter as Record<string, unknown>[])[0]).toEqual({
      gjelder: p1!.id,
      aksepterer: true,
    });
    const lag = lagForUtkastet(utkast, u, KJERNE.regler);
    expect(lag.standpunkter.some((x) => x.art === 'oppgjoersform' && x.gjelder === p1!.id)).toBe(
      true
    );
  });
});
