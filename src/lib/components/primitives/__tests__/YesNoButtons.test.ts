import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { userEvent } from '@testing-library/user-event';
import YesNoButtonsTest from './YesNoButtonsTest.svelte';

describe('YesNoButtons', () => {
  it('renders Ja and Nei buttons', () => {
    render(YesNoButtonsTest);
    expect(screen.getByText('Ja')).toBeInTheDocument();
    expect(screen.getByText('Nei')).toBeInTheDocument();
  });

  it('marks Ja as active when value is true', () => {
    render(YesNoButtonsTest, { props: { value: true } });
    expect(screen.getByText('Ja')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Nei')).toHaveAttribute('aria-pressed', 'false');
  });

  it('marks Nei as active when value is false', () => {
    render(YesNoButtonsTest, { props: { value: false } });
    expect(screen.getByText('Ja')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Nei')).toHaveAttribute('aria-pressed', 'true');
  });

  it('neither active when value is null', () => {
    render(YesNoButtonsTest, { props: { value: null } });
    expect(screen.getByText('Ja')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Nei')).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onchange with true when Ja clicked', async () => {
    const onchange = vi.fn();
    const user = userEvent.setup();
    render(YesNoButtonsTest, { props: { onchange } });
    await user.click(screen.getByText('Ja'));
    expect(onchange).toHaveBeenCalledWith(true);
  });

  it('calls onchange with false when Nei clicked', async () => {
    const onchange = vi.fn();
    const user = userEvent.setup();
    render(YesNoButtonsTest, { props: { onchange } });
    await user.click(screen.getByText('Nei'));
    expect(onchange).toHaveBeenCalledWith(false);
  });

  it('renders label and paragrafRef', () => {
    render(YesNoButtonsTest, { props: { label: 'Varslet?', paragrafRef: '§ 32.2' } });
    expect(screen.getByText('Varslet?')).toBeInTheDocument();
    expect(screen.getByText('§ 32.2')).toBeInTheDocument();
  });
});
