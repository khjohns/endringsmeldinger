import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import SkjemaStatus from '../SkjemaStatus.svelte';

afterEach(cleanup);

it('annonserer innsending som status og feilen som varsel', () => {
  render(SkjemaStatus, { sender: true, feil: 'Saken er endret av en annen bruker' });
  expect(screen.getByText('Sender …')).toHaveAttribute('role', 'status');
  expect(screen.getByRole('alert')).toHaveTextContent('Saken er endret av en annen bruker');
});

it('viser verken status eller feil når ingenting skjer', () => {
  render(SkjemaStatus, { sender: false, feil: null });
  expect(screen.queryByRole('status')).toBeNull();
  expect(screen.queryByRole('alert')).toBeNull();
});
