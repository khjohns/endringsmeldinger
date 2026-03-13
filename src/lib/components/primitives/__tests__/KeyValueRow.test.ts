import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import KeyValueRow from '../KeyValueRow.svelte';

describe('KeyValueRow', () => {
  it('renders label and value', () => {
    render(KeyValueRow, { props: { label: 'Beløp', value: 'kr 150 000' } });
    expect(screen.getByText('Beløp')).toBeInTheDocument();
    expect(screen.getByText('kr 150 000')).toBeInTheDocument();
  });

  it('applies mono class when mono prop is true', () => {
    render(KeyValueRow, { props: { label: 'Dager', value: '20', mono: true } });
    expect(screen.getByText('20')).toHaveClass('kv-mono');
  });

  it('does not apply mono class by default', () => {
    render(KeyValueRow, { props: { label: 'Status', value: 'Godkjent' } });
    expect(screen.getByText('Godkjent')).not.toHaveClass('kv-mono');
  });
});
