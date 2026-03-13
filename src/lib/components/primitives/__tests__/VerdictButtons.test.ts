import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { userEvent } from '@testing-library/user-event';
import VerdictButtonsTest from './VerdictButtonsTest.svelte';

describe('VerdictButtons', () => {
  it('renders all option labels', () => {
    render(VerdictButtonsTest);
    expect(screen.getByText('Godkjent')).toBeInTheDocument();
    expect(screen.getByText('Delvis')).toBeInTheDocument();
    expect(screen.getByText('Avslått')).toBeInTheDocument();
  });

  it('marks selected option as active', () => {
    render(VerdictButtonsTest, { props: { value: 'delvis' } });
    expect(screen.getByText('Delvis')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Godkjent')).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onchange with option id when clicked', async () => {
    const onchange = vi.fn();
    const user = userEvent.setup();
    render(VerdictButtonsTest, { props: { onchange } });
    await user.click(screen.getByText('Avslått'));
    expect(onchange).toHaveBeenCalledWith('avslatt');
  });

  it('no option active when value is null', () => {
    render(VerdictButtonsTest, { props: { value: null } });
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn).toHaveAttribute('aria-pressed', 'false');
    });
  });
});
