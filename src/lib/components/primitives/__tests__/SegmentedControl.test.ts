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

  it('clears an optional boolean answer without treating false as unanswered', async () => {
    const onchange = vi.fn();
    const onclear = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(SegmentedControl, {
      value: false,
      options: [
        { id: true, label: 'Ja' },
        { id: false, label: 'Nei' },
      ],
      onchange,
      onclear,
      variant: 'mockup',
      label: 'Varslet i tide',
    });
    const no = screen.getByRole('radio', { name: 'Nei' });
    expect(no).toHaveAttribute('aria-checked', 'true');
    expect(no).toHaveAttribute('tabindex', '0');
    await user.click(no);
    expect(onclear).toHaveBeenCalledOnce();
    expect(onchange).not.toHaveBeenCalled();
    await rerender({ value: undefined });
    expect(no).toHaveAttribute('aria-checked', 'false');
    await user.click(no);
    expect(onchange).toHaveBeenCalledWith(false);
  });

  it('keeps a fixed choice selected when activated again', async () => {
    const onchange = vi.fn();
    const user = userEvent.setup();
    render(SegmentedControl, { value: 'poeng', options, onchange });
    await user.click(screen.getByRole('radio', { name: 'Poengmodell' }));
    expect(onchange).toHaveBeenCalledWith('poeng');
  });

  it('navigates by keyboard, wraps and supports Home and End', async () => {
    const onchange = vi.fn();
    const user = userEvent.setup();
    render(SegmentedControl, { value: undefined, options, onchange, label: 'Modell' });
    const first = screen.getByRole('radio', { name: 'Poengmodell' });
    const last = screen.getByRole('radio', { name: 'Prismodell' });
    await user.tab();
    expect(first).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(last).toHaveFocus();
    expect(onchange).toHaveBeenLastCalledWith('pris');
    await user.keyboard('{ArrowDown}');
    expect(first).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(last).toHaveFocus();
    await user.keyboard('{Home}');
    expect(first).toHaveFocus();
    await user.keyboard('{End}');
    expect(last).toHaveFocus();
  });

  it('prevents changes and clearing while disabled', async () => {
    const onchange = vi.fn();
    const onclear = vi.fn();
    const user = userEvent.setup();
    render(SegmentedControl, { value: 'poeng', options, onchange, onclear, disabled: true });
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toBeDisabled();
      await user.click(radio);
    }
    expect(onchange).not.toHaveBeenCalled();
    expect(onclear).not.toHaveBeenCalled();
  });
});
