/**
 * Byggherrens svar på fristkravet i Varden (G-4 i BF-20), med kjernen i minnet: skjemaet spør om
 * hindringen med begge vilkårene (KA-U81), svarer på dagene per frist (KA-U74, U-14) og ber om
 * dagene byggherren måtte forstå per frist når kravet er spesifisert for sent (D-5).
 */

import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { lagKjernesak } from '$lib/kjernesak/kontekst.svelte';
import type { Journalrad } from '$kjerne/typer';
import { MERKING, SAK, linje, medGrunnlag, skrevet } from '$lib/kjernesak/__tests__/provejournal';
import type { TilBrevkontrollen } from '$lib/components/varden/Brevkontroll.svelte';
import Fristsvar from '$lib/components/varden/Fristsvar.svelte';

const medFristkrav = skrevet(medGrunnlag, 'TE', {
  type: 'krav',
  spor: 'frist',
  innhold: {
    frister: [
      { nummer: '5', navn: 'Mekanisk ferdigstillelse', dager: 25 },
      { navn: 'Sluttfristen', dager: 10 },
    ],
  },
  utdypning: 'Pelingen tar fire uker lenger.',
});

async function svarskjemaet(journal: Journalrad[]) {
  const kjernesak = lagKjernesak({
    sakId: SAK,
    prosjektId: 'p-1',
    part: 'BH',
    hent: async () => ({
      versjon: journal.at(-1)!.versjon,
      part: 'BH',
      visning: null as never,
      journal: journal.map(linje),
      leveringsoppdrag: [],
      merking: MERKING,
    }),
  });
  await kjernesak.last();
  const sendt: TilBrevkontrollen[] = [];
  render(Fristsvar, {
    kjernesak,
    u: kjernesak.utledning!,
    onbrevkontroll: (k: TilBrevkontrollen) => sendt.push(k),
    onforkast: () => {},
  });
  return sendt;
}

const radio = (navn: string) => fireEvent.click(screen.getByRole('radio', { name: navn }));
const seBrevet = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
const vurderingen = (sendt: TilBrevkontrollen[]) =>
  (sendt[0]!.kommando as { svar: { vurderinger: Record<string, unknown> }[] }).svar[0]!.vurderinger;

async function svarPaaHeleKravet(spesifisert: 'Spesifisert i tide' | 'Spesifisert for sent') {
  await radio('Varslet i tide');
  await radio('Ja, fremdriften er hindret, og hindringen skyldes forholdet');
  await radio(spesifisert);
}

afterEach(cleanup);

describe('byggherrens svar på fristkravet i Varden (G-4 i BF-20)', () => {
  it('spørsmålet om hindringen og valgene nevner begge vilkårene (KA-U81)', async () => {
    await svarskjemaet(medFristkrav);
    expect(
      screen.getByRole('group', {
        name: 'Legger du til grunn at fremdriften er hindret, og at hindringen skyldes forholdet?',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('radio', {
        name: 'Nei, fremdriften er ikke hindret, eller hindringen skyldes ikke forholdet',
      })
    ).toBeInTheDocument();
  });

  it('ingenting er forhåndsvalgt, og brevet lages ikke før dagene for hver frist er besvart (U-14)', async () => {
    const sendt = await svarskjemaet(medFristkrav);
    expect(screen.getAllByRole('radio').filter((r) => (r as HTMLInputElement).checked)).toEqual([]);
    await svarPaaHeleKravet('Spesifisert i tide');
    await seBrevet();
    expect(sendt).toHaveLength(0);
    expect(
      screen.getByRole('link', {
        name: 'Sluttfristen: Velg hvor mange av dagene du godkjenner.',
      })
    ).toBeInTheDocument();
  });

  it('«Godkjenn dagene som krevd for alle fristene» gir én vurdering per frist med de krevde dagene (KA-U74)', async () => {
    const sendt = await svarskjemaet(medFristkrav);
    await svarPaaHeleKravet('Spesifisert i tide');
    await fireEvent.click(
      screen.getByRole('button', { name: 'Godkjenn dagene som krevd for alle fristene' })
    );
    await seBrevet();
    expect(sendt).toHaveLength(1);
    expect(vurderingen(sendt)).toEqual({
      frist_varsel_ok: true,
      vilkar_oppfylt: true,
      spesifisert_krav_ok: true,
      frister: [{ dager: 25 }, { dager: 10 }],
    });
  });

  it('kravet spesifisert for sent ber om dagene byggherren måtte forstå i fristen, og de står i vurderingen (D-5)', async () => {
    const sendt = await svarskjemaet(medFristkrav);
    await svarPaaHeleKravet('Spesifisert for sent');
    await fireEvent.click(
      screen.getByRole('button', { name: 'Godkjenn dagene som krevd for alle fristene' })
    );
    const felt = screen.getByLabelText(
      'Dagene du måtte forstå at totalentreprenøren hadde krav på'
    );
    await fireEvent.input(felt, { target: { value: '30' } });
    await seBrevet();
    expect(sendt).toHaveLength(0);
    const oppsummering = screen.getByRole('group', { name: 'Dette mangler før brevet kan lages:' });
    expect(
      within(oppsummering).getByText(
        '5 Mekanisk ferdigstillelse: Dagene du måtte forstå kan ikke være flere enn dagene du godkjenner.'
      )
    ).toBeInTheDocument();
    await fireEvent.input(felt, { target: { value: '15' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Endre svaret på Sluttfristen' }));
    await fireEvent.input(
      screen.getByLabelText('Dagene du måtte forstå at totalentreprenøren hadde krav på'),
      { target: { value: '5' } }
    );
    // U-12, D-5: hovedlinjene og leselinjen har dagene byggherren måtte forstå per frist.
    expect(
      screen.getByText(/spesifisert for sent \(punkt 33\.6\.1\): 15 dager for 5 Mekanisk/)
    ).toBeInTheDocument();
    expect(screen.getByText(/15 dager du måtte forstå/)).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'Dagene du godtar hvis kravet ble spesifisert i tide' })
    ).toBeInTheDocument();
    await seBrevet();
    expect(sendt).toHaveLength(1);
    expect(vurderingen(sendt).frister).toEqual([
      { dager: 25, dager_maatte_forstaa: 15 },
      { dager: 10, dager_maatte_forstaa: 5 },
    ]);
  });

  it('«Godkjente dager» står tomt fra start, og tallet velger «Som krevd», «Delvis» eller «Avslått» (U-14)', async () => {
    await svarskjemaet(medFristkrav);
    const felt = screen.getByLabelText('Godkjente dager');
    expect(felt).toHaveValue('');
    await fireEvent.input(felt, { target: { value: '25' } });
    expect(screen.getByRole('radio', { name: 'Som krevd, 25 dager' })).toBeChecked();
    await fireEvent.input(felt, { target: { value: '12' } });
    expect(screen.getByRole('radio', { name: 'Delvis' })).toBeChecked();
    await radio('Avslått');
    expect(felt).toHaveValue('0');
  });

  it('innsigelsen om varselet etter punkt 33.4 står én gang over fristene (U-12)', async () => {
    await svarskjemaet(medFristkrav);
    await radio('Varslet for sent');
    expect(
      screen.getByText(
        'For hele kravet. Prinsipalt: du gjør gjeldende at varselet etter punkt 33.4 kom for sent, og at kravet er tapt for alle fristene.'
      )
    ).toBeInTheDocument();
  });
});
