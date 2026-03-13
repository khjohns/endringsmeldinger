import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import AlertTest from './AlertTest.svelte';

describe('Alert', () => {
  it('renders with alert role', () => {
    render(AlertTest, { props: { variant: 'warning', text: 'OBS!' } });
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders content', () => {
    render(AlertTest, { props: { text: 'Viktig melding' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Viktig melding');
  });

  it('applies variant class', () => {
    render(AlertTest, { props: { variant: 'danger', text: 'Feil' } });
    expect(screen.getByRole('alert')).toHaveClass('alert-danger');
  });
});
