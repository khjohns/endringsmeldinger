import { expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { userEvent } from '@testing-library/user-event';
import WorkQueue from '../WorkQueue.svelte';
import { mockSaksoversikt } from '$lib/mocks/saksoversikt';
import type { CaseListItem } from '$lib/types/api';

it('limits the list, expands it and updates tasks when the role changes', async () => {
  const track = { status: 'sendt', antall_versjoner: 1 };
  const cases: CaseListItem[] = [0, 1].map((i) => ({
    ...mockSaksoversikt[0],
    sak_id: `CASE-${i}`,
    oppfolging: {
      overordnet_status: 'SENDT',
      grunnlag: track,
      vederlag: { ...track, metode: 'enhetspriser' },
      frist: { ...track, varsel_type: 'spesifisert', krevd_dager: 45 },
    },
  }));
  const result = render(WorkQueue, {
    cases,
    role: 'BH',
    projectId: 'P001',
    scenarios: { 'CASE-0': 'scenario1' },
  });
  expect(screen.getAllByRole('link')).toHaveLength(3);
  expect(screen.getByRole('link', { name: 'Vurder frist – CASE-0' })).toHaveAttribute(
    'href',
    '/mockup?spor=frist&rolle=BH&mode=form&scenario=scenario1'
  );
  await userEvent.click(screen.getByRole('button', { name: 'Se alle 6' }));
  expect(screen.getAllByRole('link')).toHaveLength(6);
  await result.rerender({ role: 'TE' });
  expect(screen.queryAllByRole('link')).toHaveLength(0);
  expect(
    screen.getByText('Ingen registrerte oppfølgingsbehov for denne rollen.')
  ).toBeInTheDocument();
});

it('distinguishes unavailable context from no follow-up', () => {
  render(WorkQueue, { cases: [mockSaksoversikt[0]], role: 'BH', projectId: 'P001' });
  expect(screen.getByText(/Listen kan være ufullstendig/)).toBeInTheDocument();
  expect(
    screen.queryByText('Ingen registrerte oppfølgingsbehov for denne rollen.')
  ).not.toBeInTheDocument();
});
