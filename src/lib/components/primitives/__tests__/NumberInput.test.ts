import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { userEvent } from '@testing-library/user-event';
import NumberInput from '../NumberInput.svelte';

describe('NumberInput', () => {
  it('renders with value', () => {
    render(NumberInput, { props: { value: 1500, onchange: () => {} } });
    expect(screen.getByRole('textbox')).toHaveValue('1\u00a0500');
  });

  it('renders label', () => {
    render(NumberInput, { props: { value: undefined, label: 'Beløp', onchange: () => {} } });
    expect(screen.getByText('Beløp')).toBeInTheDocument();
  });

  it('renders suffix', () => {
    render(NumberInput, { props: { value: 100, suffix: 'kr', onchange: () => {} } });
    expect(screen.getByText('kr')).toBeInTheDocument();
  });

  it('calls onchange on input', async () => {
    const onchange = vi.fn();
    const user = userEvent.setup();
    render(NumberInput, { props: { value: undefined, onchange } });
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '250');
    expect(onchange).toHaveBeenCalled();
  });

  it('shows diff when referenceValue is provided', () => {
    render(NumberInput, { props: { value: 150, referenceValue: 100, onchange: () => {} } });
    expect(screen.getByText('+50.0%')).toBeInTheDocument();
  });

  it('shows negative diff', () => {
    render(NumberInput, { props: { value: 50, referenceValue: 100, onchange: () => {} } });
    expect(screen.getByText('-50.0%')).toBeInTheDocument();
  });
});
