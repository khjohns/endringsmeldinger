/**
 * Spørsmålet om varselet etter punkt 34.1.2 i byggherrens svar på vederlagskravet (#1842), med
 * kjernen i minnet. Der TE krever endring etter punkt 34.1.1, er det ikke krav om varsel, og
 * byggherren tar ikke stilling til rettidigheten (OV-U15, D-6 i BF-14). Ved svikt spør skjemaet
 * (kontrollsaken).
 */

import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { lagKjernesak } from '$lib/kjernesak/kontekst.svelte';
import type { Journalrad } from '$kjerne/typer';
import {
  MERKING,
  SAK,
  linje,
  medVederlag,
  opprettet,
  skrevet,
} from '$lib/kjernesak/__tests__/provejournal';
import Vederlagssvar from '$lib/components/varden/Vederlagssvar.svelte';

const svikt = skrevet(
  skrevet([opprettet], 'TE', {
    type: 'krav',
    spor: 'forhold',
    innhold: {
      hovedkategori: 'svikt',
      underkategori: 'grunnforhold',
      klar_over_forholdet: '2026-10-01',
    },
    utdypning: 'Leire der rapporten sa fjell.',
  }),
  'TE',
  {
    type: 'krav',
    spor: 'vederlag',
    innhold: {
      kravposter: [{ beskrivelse: 'Kravposten', oppgjoersform: 'tilbud', beloep: 250000 }],
    },
    utdypning: 'Tilbudet gjelder pumpingen.',
  }
);

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
  const sendt: { kommando: Record<string, unknown>; tekst: string[] }[] = [];
  render(Vederlagssvar, {
    kjernesak,
    u: kjernesak.utledning!,
    onbrevkontroll: (k: { kommando: Record<string, unknown>; tekst: string[] }) => sendt.push(k),
    onforkast: () => {},
  });
  return sendt;
}

const radio = (navn: string) => fireEvent.click(screen.getByRole('radio', { name: navn }));
const godkjennHele = async () => {
  await radio('Godkjenner fast sum (punkt 34.2.1)');
  await radio('Hele beløpet');
};
const seBrevet = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
const spoersmaalet = () => screen.queryByRole('group', { name: 'Kom varselet om kravet i tide?' });
const vurderingen = (sendt: { kommando: Record<string, unknown> }[]) =>
  (sendt[0]!.kommando as { svar: { vurderinger: Record<string, unknown> }[] }).svar[0]!.vurderinger;

afterEach(cleanup);

describe('varselet etter punkt 34.1.2 i byggherrens svar (#1842)', () => {
  it('ved endring etter punkt 34.1.1 spør skjemaet ikke om varselet, og brevet kan lages uten svaret (OV-U15, D-6)', async () => {
    const sendt = await svarskjemaet(medVederlag);
    expect(spoersmaalet()).toBeNull();
    await godkjennHele();
    await seBrevet();
    expect(screen.queryByText('Velg om varselet kom i tide.')).toBeNull();
    expect(sendt).toHaveLength(1);
    expect(vurderingen(sendt)).not.toHaveProperty('hovedkrav_varslet_i_tide');
  });

  it('ved svikt spør skjemaet om varselet, og svaret står i kommandoen (OV-U15, kontrollsak)', async () => {
    const sendt = await svarskjemaet(svikt);
    expect(spoersmaalet()).toBeInTheDocument();
    await godkjennHele();
    await seBrevet();
    expect(sendt).toHaveLength(0);
    expect(screen.getByRole('link', { name: 'Velg om varselet kom i tide.' })).toBeInTheDocument();
    await radio('Varslet i tide');
    await seBrevet();
    expect(sendt).toHaveLength(1);
    expect(vurderingen(sendt)).toMatchObject({ hovedkrav_varslet_i_tide: true });
  });
});
