import { render, waitFor } from '@testing-library/svelte';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NewCaseForm from '../NewCaseForm.svelte';
import { KRAV_STRUKTUR_NS8407 } from '$lib/constants/categories';
import { setDraftOwner } from '$lib/utils/draftOwner';

vi.mock('$lib/api/events', () => ({ submitEvent: vi.fn() }));
vi.mock('$app/environment', () => ({ browser: true }));

const EIER = 'saksbehandler-1';

beforeEach(() => {
  localStorage.clear();
  setDraftOwner(EIER);
  const kontraktsforhold = KRAV_STRUKTUR_NS8407.find((k) => k.kode === 'ENDRING')!;
  localStorage.setItem(
    `koe-draft-kontraktsbord-ny-project::${EIER}`,
    JSON.stringify({
      tittel: 'Endret fundament',
      datoOppdaget: '2026-09-01',
      valgtHjemmel: { kontraktsforhold, hjemmel: kontraktsforhold.hjemler[0] },
      begrunnelseHtml: '',
    })
  );
});

describe('Ny sak, redegjørelsen (#118)', () => {
  it('teller tegn og blir sendbar mens brukeren skriver, uten omlasting', async () => {
    let canSend: boolean | undefined;
    const user = userEvent.setup();
    const screen = render(NewCaseForm, {
      prosjektId: 'project',
      onsend: () => {},
      onactions: (a) => {
        canSend = a.canSend;
      },
    });
    const flate = screen.container.querySelector('.tiptap') as HTMLElement;
    await waitFor(() => expect(canSend).toBe(false));
    expect(screen.getByText('0 tegn')).toBeInTheDocument();

    flate.focus();
    await user.keyboard('Fundamentet ble større');

    await waitFor(() => expect(screen.getByText('22 tegn')).toBeInTheDocument());
    expect(canSend).toBe(true);
  });
});
