import { expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import CaseListTable from '../CaseListTable.svelte';
import { lagSakslinje } from '$lib/mocks/sakslinje';

it('sakene står etter siste hendelse i journalen, nyeste først, som i Python-lista (#1023)', () => {
  const saker = [
    lagSakslinje({ sak_id: 'ELDST', siste_hendelse: '2026-01-01T08:00:00Z' }),
    lagSakslinje({ sak_id: 'NYEST', siste_hendelse: '2026-03-01T08:00:00Z' }),
    lagSakslinje({ sak_id: 'MIDT', siste_hendelse: '2026-02-01T08:00:00Z' }),
  ];
  render(CaseListTable, { saker, prosjektId: 'P001' });
  expect(screen.getAllByRole('link').map((a) => a.textContent?.trim())).toEqual([
    'NYEST',
    'MIDT',
    'ELDST',
  ]);
});
