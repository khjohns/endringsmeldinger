import { expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { userEvent } from '@testing-library/user-event';
import ProjectActivity from '../ProjectActivity.svelte';
import { mockSaksoversikt } from '$lib/mocks/saksoversikt';

it('paginates, filters and searches historical events without changing viewer role', async () => {
  const user = userEvent.setup();
  const cases = [
    {
      ...mockSaksoversikt[0],
      sak_id: 'CASE-1',
      hendelser: Array.from({ length: 21 }, (_, i) => ({
        id: String(i),
        type: i === 0 ? ('F' as const) : ('K' as const),
        dato: '2026-09-10T08:00:00Z',
        label: i === 0 ? 'Svarte på fristkrav' : `Varsel ${i}`,
        rolle: 'BH' as const,
      })),
    },
  ];
  render(ProjectActivity, { cases, role: 'TE', projectId: 'P001' });
  expect(screen.getAllByRole('listitem')).toHaveLength(20);
  await user.click(screen.getByRole('button', { name: 'Vis flere hendelser' }));
  expect(screen.getAllByRole('listitem')).toHaveLength(21);
  await user.selectOptions(screen.getByRole('combobox', { name: 'Spor' }), 'F');
  expect(screen.getAllByRole('listitem')).toHaveLength(1);
  expect(screen.getByRole('link')).toHaveAttribute('href', '/P001/CASE-1?spor=frist&rolle=TE');
  expect(screen.getByLabelText('Byggherre')).toBeInTheDocument();
  await user.type(screen.getByRole('searchbox'), 'finnes ikke');
  expect(screen.getByText('Ingen hendelser passer søket og utvalget.')).toBeInTheDocument();
});
