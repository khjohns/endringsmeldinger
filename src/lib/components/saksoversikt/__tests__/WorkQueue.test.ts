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

it('follows up issued orders without duplicating formalized KOE tasks or reporting missing tracks', async () => {
  const track = { status: 'sendt', antall_versjoner: 1 };
  const claim: CaseListItem = {
    ...mockSaksoversikt[0],
    oppfolging: {
      overordnet_status: 'SENDT',
      grunnlag: track,
      vederlag: { ...track, metode: 'enhetspriser' },
      frist: { ...track, varsel_type: 'spesifisert', krevd_dager: 10 },
    },
  };
  const order: CaseListItem = {
    ...mockSaksoversikt[0],
    sak_id: 'EO-1',
    sakstype: 'endringsordre',
    oppfolging: null,
    endringsordre_data: {
      status: 'utstedt',
      eo_nummer: 'EO-001',
      relaterte_koe_saker: [claim.sak_id],
      netto_belop: 100,
      frist_dager: 10,
      er_estimat: false,
    },
  };
  const result = render(WorkQueue, { cases: [claim, order], role: 'BH', projectId: 'P001' });
  expect(screen.queryAllByRole('link')).toHaveLength(0);
  expect(screen.queryByText(/Listen kan være ufullstendig/)).not.toBeInTheDocument();
  await result.rerender({ role: 'TE' });
  expect(screen.getByRole('link', { name: 'Les endringsordren – EO-1' })).toHaveAttribute(
    'href',
    '/P001/EO-1?rolle=TE'
  );
  expect(screen.getByText('1 handling i 1 sak')).toBeInTheDocument();
});
