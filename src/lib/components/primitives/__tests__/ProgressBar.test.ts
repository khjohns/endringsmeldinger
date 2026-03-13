import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ProgressBar from '../ProgressBar.svelte';

describe('ProgressBar', () => {
  it('renders with progressbar role', () => {
    render(ProgressBar, { props: { value: 50 } });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('sets aria-valuenow', () => {
    render(ProgressBar, { props: { value: 75 } });
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75');
  });

  it('clamps value to 0-100', () => {
    render(ProgressBar, { props: { value: 150 } });
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('renders label when provided', () => {
    render(ProgressBar, { props: { value: 60, label: 'Fremdrift' } });
    expect(screen.getByText('Fremdrift')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('applies correct tier class — high', () => {
    const { container } = render(ProgressBar, { props: { value: 80 } });
    expect(container.querySelector('.progress-high')).not.toBeNull();
  });

  it('applies correct tier class — mid', () => {
    const { container } = render(ProgressBar, { props: { value: 55 } });
    expect(container.querySelector('.progress-mid')).not.toBeNull();
  });

  it('applies correct tier class — low', () => {
    const { container } = render(ProgressBar, { props: { value: 20 } });
    expect(container.querySelector('.progress-low')).not.toBeNull();
  });
});
