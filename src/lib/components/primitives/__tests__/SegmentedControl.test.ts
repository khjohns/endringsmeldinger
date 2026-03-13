import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { userEvent } from '@testing-library/user-event';
import SegmentedControl from '../SegmentedControl.svelte';

const options = [
  { id: 'poeng', label: 'Poengmodell' },
  { id: 'pris', label: 'Prismodell' },
];

describe('SegmentedControl', () => {
  it('renders all options', () => {
    render(SegmentedControl, { props: { value: 'poeng', options, onchange: () => {} } });
    expect(screen.getByText('Poengmodell')).toBeInTheDocument();
    expect(screen.getByText('Prismodell')).toBeInTheDocument();
  });

  it('marks active option with aria-checked', () => {
    render(SegmentedControl, { props: { value: 'poeng', options, onchange: () => {} } });
    expect(screen.getByText('Poengmodell')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Prismodell')).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onchange when option clicked', async () => {
    const onchange = vi.fn();
    const user = userEvent.setup();
    render(SegmentedControl, { props: { value: 'poeng', options, onchange } });
    await user.click(screen.getByText('Prismodell'));
    expect(onchange).toHaveBeenCalledWith('pris');
  });

  it('has radiogroup role', () => {
    render(SegmentedControl, { props: { value: 'poeng', options, onchange: () => {} } });
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });
});
