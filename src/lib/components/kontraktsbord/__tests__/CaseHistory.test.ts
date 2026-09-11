import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { userEvent } from '@testing-library/user-event';
import CaseHistory from '../CaseHistory.svelte';
import type { TimelineEvent } from '$lib/types/timeline';

const events: TimelineEvent[] = [
  {
    specversion: '1.0',
    id: 'created',
    source: '/',
    type: 'no.oslo.koe.sak_opprettet',
    time: '2026-01-13T09:00:00Z',
    actorrole: 'TE',
    summary: 'Sak opprettet av TE',
  },
  {
    specversion: '1.0',
    id: 'late',
    source: '/',
    type: 'no.oslo.koe.frist_krav_oppdatert',
    spor: 'frist',
    time: '2026-01-28T14:00:00Z',
    actorrole: 'TE',
    summary: 'Ny fremdriftsanalyse',
  },
  {
    specversion: '1.0',
    id: 'early',
    source: '/',
    type: 'no.oslo.koe.frist_krav_sendt',
    time: '2026-01-20T10:00:00Z',
    actorrole: 'TE',
    summary: '45 dager krevd',
  },
  {
    specversion: '1.0',
    id: 'other',
    source: '/',
    type: 'no.oslo.koe.vederlag_krav_sendt',
    spor: 'vederlag',
    time: '2026-01-22T10:00:00Z',
    actorrole: 'TE',
    summary: 'Kostnader dokumentert',
  },
];
it('filters by track, sorts by time and keeps all case events readable in case scope', async () => {
  const user = userEvent.setup();
  const result = render(CaseHistory, { props: { events, sel: 'frist' } });
  expect(screen.getByRole('button', { name: 'Dette sporet' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
  expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Ny fremdriftsanalyse');
  await user.click(screen.getByRole('button', { name: 'Hele saken' }));
  const items = screen.getAllByRole('listitem');
  expect(items).toHaveLength(4);
  expect(items[1]).toHaveTextContent('Kostnader dokumentert');
  expect(screen.queryByText('Sak opprettet av TE')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Dette sporet' }));
  await result.rerender({ sel: 'ansvar' });
  expect(screen.getByText('Ingen registrerte hendelser på dette sporet ennå.')).toBeInTheDocument();
});
it('supports keyboard selection and separate letter actions', async () => {
  const user = userEvent.setup();
  const select = vi.fn();
  const letter = vi.fn();
  render(CaseHistory, {
    props: { events, sel: 'frist', oneventclick: select, onletterclick: letter },
  });
  const title = screen.getByRole('button', { name: 'Fristkrav oppdatert' });
  title.focus();
  await user.keyboard('{Enter}');
  expect(select).toHaveBeenCalledWith(events[1]);
  await user.click(screen.getByRole('button', { name: 'Vis brev: Fristkrav oppdatert' }));
  expect(letter).toHaveBeenCalledWith(events[1]);
  expect(select).toHaveBeenCalledTimes(1);
});
