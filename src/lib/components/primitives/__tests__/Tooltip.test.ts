import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import TooltipTest from './TooltipTest.svelte';

describe('Tooltip', () => {
  it('renders trigger content', () => {
    render(TooltipTest, { props: { content: 'Info' } });
    expect(screen.getByText('Hover meg')).toBeInTheDocument();
  });
});
