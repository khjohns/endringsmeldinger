/**
 * Byggherrens svar på et varsel etter punkt 34.3.3 eller 34.4 som står alene (G-9 i BF-14,
 * #2177), med kjernen i minnet. Svaret er et vanlig svar i vederlaget med varselet som `gjelder`
 * (VS-U79), med standpunktene etter VS-U77 punkt 30, 31 og 33.
 */

import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { lagKjernesak } from '#lib/kjernesak/kontekst.svelte.ts';
import { varseletSvaretPaa } from '#lib/kjernesak/vederlagskrav.ts';
import { utledJournal } from '#kjerne/kommandoer/skriving.ts';
import { KJERNE } from '#kjerne/versjon.ts';
import type { Journalrad } from '#kjerne/typer.ts';
import {
  MERKING,
  SAK,
  linje,
  medGrunnlag,
  skrevet,
} from '#lib/kjernesak/__tests__/provejournal.ts';
import type { TilBrevkontrollen } from '#lib/components/varden/Brevkontroll.svelte';
import Varselsvar from '#lib/components/varden/Varselsvar.svelte';
import Vardensak from '#lib/components/varden/Vardensak.svelte';

const medVarsel = (hjemmel: '34.3.3' | '34.4') =>
  skrevet(medGrunnlag, 'TE', { type: 'send_varsel', spor: 'vederlag', hjemmel });
const varselI = (journal: Journalrad[]) =>
  utledJournal(journal, KJERNE).spor.vederlag.kravpostvarsler.at(-1)!.id;

const kjernesakFor = (journal: Journalrad[]) =>
  lagKjernesak({
    sakId: SAK,
    prosjektId: 'p-1',
    part: 'BH',
    hent: async () => ({
      versjon: journal.at(-1)!.versjon,
      part: 'BH',
      visning: null as never,
      journal: journal.map(linje),
      leveringsoppdrag: [],
      catenda_lenke: null,
      sakskode: null,
      kontraktsforkortelse: null,
      kan_foreslaa_sakskode: false,
      merking: MERKING,
    }),
  });

async function svarskjemaet(journal: Journalrad[]) {
  const kjernesak = kjernesakFor(journal);
  await kjernesak.last();
  const u = kjernesak.utledning!;
  const sendt: TilBrevkontrollen[] = [];
  render(Varselsvar, {
    kjernesak,
    u,
    varselet: varseletSvaretPaa(u, varselI(journal))!,
    onbrevkontroll: (k: TilBrevkontrollen) => sendt.push(k),
    onforkast: () => {},
  });
  return sendt;
}

const radio = (navn: string) => fireEvent.click(screen.getByRole('radio', { name: navn }));
const seBrevet = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
const svaret = (k: TilBrevkontrollen) =>
  k.kommando as {
    type: string;
    erstatter?: string;
    svar: Record<string, unknown>[] | Record<string, unknown>;
  };

afterEach(cleanup);

describe('svaret på varselet etter punkt 34.3.3 som står alene (VS-U77 punkt 30, VS-U79)', () => {
  it('justeringen må besvares før brevet lages, og svaret gjelder varselet uten resultat', async () => {
    const journal = medVarsel('34.3.3');
    const sendt = await svarskjemaet(journal);
    expect(
      screen.getByRole('heading', { name: /Svar på varsel om justering av enhetsprisene/ })
    ).toBeInTheDocument();
    await seBrevet();
    expect(sendt).toHaveLength(0);
    expect(
      screen.getByRole('link', { name: 'Velg om du godtar justeringen av enhetsprisene.' })
    ).toBeInTheDocument();
    await radio('Godtar justeringen');
    await seBrevet();
    expect(sendt).toHaveLength(1);
    expect(svaret(sendt[0]!)).toMatchObject({
      type: 'brev',
      svar: [
        {
          spor: 'vederlag',
          gjelder: varselI(journal),
          vurderinger: { godtar_justering: true },
          resultat: {},
        },
      ],
    });
  });

  it('med innsigelsen mot varselet står justeringen subsidiært, med «Gjelder hvis» (VS-U4, VS-U77 punkt 30)', async () => {
    const sendt = await svarskjemaet(medVarsel('34.3.3'));
    expect(screen.queryByText('Gjelder hvis')).toBeNull();
    await radio('Kom for sent');
    expect(screen.getByText('Gjelder hvis')).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: /^innsigelsen om at varselet etter punkt.34\.3\.3 kom for sent$/,
      })
    ).toBeInTheDocument();
    await radio('Bestrider justeringen');
    await seBrevet();
    expect(sendt).toHaveLength(1);
    expect(svaret(sendt[0]!).svar).toMatchObject([
      { vurderinger: { varslet_i_tide: false, godtar_justering: false } },
    ]);
  });

  it('«Kom i tide» sendes uttrykkelig (svar 3 A i VS-U77)', async () => {
    const sendt = await svarskjemaet(medVarsel('34.3.3'));
    await radio('Kom i tide');
    await radio('Godtar justeringen');
    await seBrevet();
    expect(svaret(sendt[0]!).svar).toMatchObject([
      { vurderinger: { varslet_i_tide: true, godtar_justering: true } },
    ]);
  });
});

describe('svaret på varselet etter punkt 34.4 som står alene (VS-U77 punkt 31)', () => {
  it('uten innsigelse er det ikke noe å sende, og skjemaet sier at byggherren ikke trenger å svare', async () => {
    const sendt = await svarskjemaet(medVarsel('34.4'));
    expect(screen.getByText(/^Ingen innsigelse\.$/, { selector: 'p *, p' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /Justeringen/ })).toBeNull();
    await seBrevet();
    expect(sendt).toHaveLength(0);
    expect(screen.getByRole('link', { name: /trenger du ikke svare/ })).toBeInTheDocument();
  });

  it('«Varselet kom for sent» gir innsigelsen, ikke «ikke ble gitt» (VS-U77 punkt 31)', async () => {
    const sendt = await svarskjemaet(medVarsel('34.4'));
    await fireEvent.click(screen.getByRole('button', { name: 'Varselet kom for sent' }));
    expect(screen.getByText(/Du gjør gjeldende at varselet kom for sent\./)).toBeInTheDocument();
    await seBrevet();
    expect(sendt).toHaveLength(1);
    expect(svaret(sendt[0]!).svar).toMatchObject([{ vurderinger: { varslet_i_tide: false } }]);
  });

  it('et nytt svar erstatter det forrige, gjentar innsigelsen som står og kan gi den opp (VS-U77 punkt 31 og 33)', async () => {
    const varslet = medVarsel('34.4');
    const varsel = varselI(varslet);
    const journal = skrevet(varslet, 'BH', {
      type: 'brev',
      svar: [
        {
          spor: 'vederlag',
          gjelder: varsel,
          regelversjon: KJERNE.regler.versjon,
          vurderinger: { varslet_i_tide: false },
          resultat: {},
        },
      ],
    });
    const forrige = utledJournal(journal, KJERNE).spor.vederlag.svarPaaVarsler[0]!.id;
    const sendt = await svarskjemaet(journal);
    expect(
      screen.getByText(/at varselet kom for sent\. Svaret gjentar innsigelsen\./)
    ).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Gi opp innsigelsen' }));
    await seBrevet();
    expect(sendt).toHaveLength(1);
    expect(svaret(sendt[0]!)).toMatchObject({
      type: 'revisjon',
      erstatter: forrige,
      svar: { gjelder: varsel, vurderinger: { varslet_i_tide: true } },
    });
  });
});

describe('svaret på varselet i Varden (G-9 i BF-14)', () => {
  it('byggherren svarer fra varselet i vederlaget, og skjemaet åpnes med brevtittelen for svaret på varselet', async () => {
    const kjernesak = kjernesakFor(medVarsel('34.3.3'));
    await kjernesak.last();
    render(Vardensak, { kjernesak, spor: 'vederlag' });
    await fireEvent.click(
      await screen.findByRole('button', { name: 'Svar på varselet om justering av enhetsprisene' })
    );
    expect(
      await screen.findByRole('heading', { name: /^Svar på varsel om justering av enhetsprisene/ })
    ).toBeInTheDocument();
    await radio('Godtar justeringen');
    await seBrevet();
    expect(
      await screen.findByRole('button', { name: 'Send til totalentreprenøren' })
    ).toBeInTheDocument();
  });
});
