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
import { tomtSvar, vederlagssvaret, type Svarvalg } from '../kommandoer';

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

const svar = (journal: Journalrad[], valg: Partial<Svarvalg>) =>
  vederlagssvaret(
    { ...tomtSvar(), iTide: true, metode: true, ...valg },
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
    expect(kommando.svar[0].resultat).toEqual({ resultat: 'godkjent', godkjent_beloep: 150_000 });
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
