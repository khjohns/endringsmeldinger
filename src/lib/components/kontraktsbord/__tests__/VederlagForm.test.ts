/**
 * BHs svar på et vederlagskrav som bare har produktivitetstapet etter § 34.1.3 annet ledd.
 * Forventningene: OV-U23 (ingen vurdering av justeringen ellers uten beløp for den), VS-U5 og
 * OV-U22 (beløpet etter begrensningen prinsipalt, det godkjente subsidiært), MM-U23 (skjemaet sier
 * ikke «prekludert»), #1088 (et svar tatt tilbake fra godkjenningen åpnes med det som var fylt ut) og
 * KA-U41 (begrunnelsen er bare teksten BH skriver; i den gamle flyten må den finnes før sendingen).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen as dokument,
  waitFor,
  within,
} from '@testing-library/svelte';
import { userEvent } from '@testing-library/user-event';
import WorkspaceHarness from './WorkspaceHarness.svelte';
import { createDemoStore } from '$lib/mockup/store.svelte';
import { SCENARIOS } from '$lib/mockup/scenarios';
import { setDraftOwner } from '$lib/utils/draftOwner';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  setDraftOwner('user');
});
afterEach(cleanup);

const arbeidsflate = () =>
  createDemoStore(structuredClone(SCENARIOS.find((s) => s.id === 'scenario1prod')!));

async function velg(gruppe: string, valg: string) {
  const radiogruppe = await dokument.findByRole('radiogroup', { name: gruppe });
  await fireEvent.click(within(radiogruppe).getByRole('radio', { name: valg }));
}

async function skrivBegrunnelse(tekst = 'Begrunnelse fra BH.') {
  const flate = await dokument.findByRole('textbox', { name: 'Begrunnelse' });
  flate.focus();
  await userEvent.setup().keyboard(tekst);
}

describe('BHs svar på et krav som bare har produktivitetstapet', () => {
  it('viser ingen vurdering av hovedkravet og sier ikke «prekludert»', async () => {
    const screen = render(WorkspaceHarness, {
      workspace: arbeidsflate(),
      view: { track: 'vederlag', role: 'BH', mode: 'form' },
    });
    await screen.findByRole('radiogroup', { name: 'Varsling produktivitetstap' });
    expect(screen.queryByRole('radiogroup', { name: 'Hovedkrav' })).toBeNull();
    expect(screen.queryByText(/prekludert/i)).toBeNull();
    // Grunnforhold (SVIKT): § 34.1.2 gjelder hele kravet, også uten hovedbeløp (OV-U27).
    const varsling = screen.getByRole('radiogroup', { name: 'Varsling av kravet' });
    expect(within(varsling).getByRole('radio', { name: 'Nei, for sent' })).toBeTruthy();
  });

  it('krever beløpet etter begrensningen, og gjenoppretter skjemaet når vurderingen revideres', async () => {
    const screen = render(WorkspaceHarness, {
      workspace: arbeidsflate(),
      view: { track: 'vederlag', role: 'BH', mode: 'form' },
    });
    await velg('Varsling av kravet', 'Ja, i tide');
    await velg('Varsling produktivitetstap', 'Nei, for sent');
    await velg('Beregningsmetode', 'Ja');
    await velg('Produktivitetstap', 'Fullt beløp');

    const send = screen.getByRole('button', { name: 'Ferdigstill vurdering' });
    const begrenset = await screen.findByRole('textbox', { name: 'Godtas etter begrensningen' });
    expect(send).toBeDisabled();
    await fireEvent.input(begrenset, { target: { value: '200000' } });
    await fireEvent.blur(begrenset);
    // Over det byggherren godtar for posten (VS-U5) står beløpet urørt med en feil (#1285).
    expect((begrenset as HTMLInputElement).value).toBe('200000');
    expect(
      await screen.findByText('Beløpet er høyere enn det som godtas for posten, 180 000 kr.', {
        normalizer: (t) => t.replace(/\s/g, ' '),
      })
    ).toBeTruthy();
    expect(send).toBeDisabled();
    await fireEvent.input(begrenset, { target: { value: '45000' } });
    // KA-U41: appen fyller ikke inn begrunnelsen, så svaret venter på BHs tekst.
    expect(screen.queryByText('Hentet fra vurderingen')).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Begrunnelse' }).textContent).toBe('');
    expect(send).toBeDisabled();
    await skrivBegrunnelse();
    await waitFor(() => expect(send).toBeEnabled());
    // VS-U5: BH oppgir hva BH godtar etter begrensningen, og avslår ikke prinsipalt.
    expect(
      screen.getByText(/^BH godtar 45\s000 kr prinsipalt etter begrensningen \(§ 34\.1\.3\)$/)
    ).toBeTruthy();

    await fireEvent.click(send);

    const revider = await screen.findByRole('button', { name: 'Revider vurdering' });
    await fireEvent.click(revider);

    const gjenopprettet = await screen.findByRole('textbox', {
      name: 'Godtas etter begrensningen',
    });
    expect((gjenopprettet as HTMLInputElement).value).toBe((45000).toLocaleString('nb-NO'));
    const varsling = screen.getByRole('radiogroup', { name: 'Varsling produktivitetstap' });
    expect(within(varsling).getByRole('radio', { name: 'Nei, for sent' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('senker beløpet etter begrensningen når det godtatte for posten senkes etterpå (VS-U5)', async () => {
    const screen = render(WorkspaceHarness, {
      workspace: arbeidsflate(),
      view: { track: 'vederlag', role: 'BH', mode: 'form' },
    });
    await velg('Varsling av kravet', 'Ja, i tide');
    await velg('Varsling produktivitetstap', 'Nei, for sent');
    await velg('Beregningsmetode', 'Ja');
    await velg('Produktivitetstap', 'Fullt beløp');
    const begrenset = await screen.findByRole('textbox', { name: 'Godtas etter begrensningen' });
    await fireEvent.input(begrenset, { target: { value: '150000' } });
    await fireEvent.blur(begrenset);
    await skrivBegrunnelse();

    await velg('Produktivitetstap', 'Redusert beløp');
    const godkjent = await screen.findByRole('textbox', {
      name: 'Subsidiært vurdert beløp for produktivitetstap',
    });
    for (const verdi of ['1', '10', '100', '1000', '10000', '100000']) {
      await fireEvent.input(godkjent, { target: { value: verdi } });
    }
    // Under inntastingen står beløpet etter begrensningen urørt.
    expect((begrenset as HTMLInputElement).value).toBe((150000).toLocaleString('nb-NO'));
    await fireEvent.blur(godkjent);

    await waitFor(() =>
      expect((begrenset as HTMLInputElement).value).toBe((100000).toLocaleString('nb-NO'))
    );
    expect(screen.getByRole('button', { name: 'Ferdigstill vurdering' })).toBeEnabled();
  });

  it('avslår hele kravet prinsipalt når § 34.1.2 er påberopt, også med begrensningen (OV-U27)', async () => {
    const screen = render(WorkspaceHarness, {
      workspace: arbeidsflate(),
      view: { track: 'vederlag', role: 'BH', mode: 'form' },
    });
    await velg('Varsling av kravet', 'Nei, for sent');
    await velg('Varsling produktivitetstap', 'Nei, for sent');
    await velg('Beregningsmetode', 'Ja');
    await velg('Produktivitetstap', 'Fullt beløp');
    const begrenset = await screen.findByRole('textbox', { name: 'Godtas etter begrensningen' });
    await fireEvent.input(begrenset, { target: { value: '45000' } });

    expect(await screen.findByText('BH avslår kravet prinsipalt')).toBeTruthy();
    expect(screen.queryByText(/etter begrensningen \(§ 34\.1\.3\)/)).toBeNull();
  });
});
