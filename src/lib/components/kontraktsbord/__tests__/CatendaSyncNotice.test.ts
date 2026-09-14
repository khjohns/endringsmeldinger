import { render, screen } from '@testing-library/svelte';
import { expect, it } from 'vitest';
import CatendaSyncNotice from '../CatendaSyncNotice.svelte';

it('keeps failed delivery visible until the server confirms no outstanding deliveries', async () => {
  const { rerender } = render(CatendaSyncNotice, { status: 'failed' });
  expect(screen.getByRole('status')).toHaveTextContent(
    'Lagret i appen, men ikke synkronisert til Catenda'
  );
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  await rerender({ status: 'unknown' });
  expect(screen.getByRole('status')).toHaveTextContent('ikke bekreftet');
  await rerender({ status: 'pending' });
  expect(screen.getByRole('status')).toHaveTextContent('ikke bekreftet');
  await rerender({ status: 'clear' });
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
