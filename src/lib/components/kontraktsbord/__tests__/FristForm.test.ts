/**
 * BHs svar på et fristkrav i den gamle flyten. Forventningen: KA-U41 (begrunnelsen er bare teksten
 * BH skriver, og i den gamle flyten må den finnes før sendingen).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { userEvent } from '@testing-library/user-event';
import WorkspaceHarness from './WorkspaceHarness.svelte';
import { createDemoStore } from '$lib/mockup/store.svelte';
import { DEFAULT_SCENARIO } from '$lib/mockup/scenarios';
import { setDraftOwner } from '$lib/utils/draftOwner';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  setDraftOwner('user');
});
afterEach(cleanup);

describe('BHs svar på et fristkrav', () => {
  it('KA-U41: viser en tom begrunnelse når vurderingen er ferdig, og slipper sendingen fram først når BH har skrevet', async () => {
    const screen = render(WorkspaceHarness, {
      workspace: createDemoStore(structuredClone(DEFAULT_SCENARIO)),
      view: { track: 'frist', role: 'BH', mode: 'form' },
    });
    for (const gruppe of await screen.findAllByRole('radiogroup')) {
      const ja = within(gruppe).queryByRole('radio', { name: /^Ja/ });
      if (ja) await fireEvent.click(ja);
    }
    const dager = screen.getByRole('textbox', { name: /fristforlengelse/ });
    await fireEvent.input(dager, { target: { value: '5' } });

    const send = screen.getByRole('button', { name: /Ferdigstill vurdering|Se brev og send/ });
    const begrunnelse = await screen.findByRole('textbox', { name: 'Begrunnelse' });
    expect(begrunnelse.textContent).toBe('');
    expect(send).toBeDisabled();

    begrunnelse.focus();
    await userEvent.setup().keyboard('Begrunnelse fra BH.');
    await waitFor(() => expect(send).toBeEnabled());
  });
});
