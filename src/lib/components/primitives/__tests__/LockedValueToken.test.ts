import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import LockedValueToken from '../LockedValueToken.svelte';

describe('LockedValueToken', () => {
  it('renders display text', () => {
    render(LockedValueToken, { props: { type: 'belop', display: 'kr 150 000,-' } });
    expect(screen.getByText('kr 150 000,-')).toBeInTheDocument();
  });

  it('applies type-specific class for dager', () => {
    const { container } = render(LockedValueToken, {
      props: { type: 'dager', display: '20 dager' },
    });
    expect(container.querySelector('.token-dager')).not.toBeNull();
  });

  it('applies type-specific class for prosent', () => {
    const { container } = render(LockedValueToken, { props: { type: 'prosent', display: '67%' } });
    expect(container.querySelector('.token-prosent')).not.toBeNull();
  });

  it('applies type-specific class for paragraf', () => {
    const { container } = render(LockedValueToken, {
      props: { type: 'paragraf', display: '§ 32.2' },
    });
    expect(container.querySelector('.token-paragraf')).not.toBeNull();
  });

  it('has title attribute with type and display', () => {
    render(LockedValueToken, { props: { type: 'belop', display: 'kr 100' } });
    expect(screen.getByText('kr 100')).toHaveAttribute('title', 'belop: kr 100');
  });
});
