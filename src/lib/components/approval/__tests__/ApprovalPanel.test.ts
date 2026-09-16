import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ApprovalPanel from '../ApprovalPanel.svelte';
import { resolveRoute, withLimit } from '$lib/approval/route';

afterEach(cleanup);

describe('ApprovalPanel', () => {
  it('gates the primary action on confirmation and renders the derived chain', async () => {
    const onprimary = vi.fn();
    const { route } = resolveRoute({
      amount: 2930000,
      sender: withLimit({ name: 'Kari Hansen', role: 'Prosjektleder' }),
      chain: [
        withLimit({ name: 'Ola Nilsen', role: 'Prosjektdirektør' }),
        withLimit({ name: 'Anne Berg', role: 'Avdelingsleder' }),
      ],
    });
    const screen = render(ApprovalPanel, {
      eyebrow: 'Krever godkjenning',
      title: 'Avdelingsleder må godkjenne',
      chain: route,
      confirmLabel: 'Jeg har kontrollert brevet og vedleggene.',
      primaryLabel: 'Send til godkjenning',
      onprimary,
      footnote: 'Entreprenøren får tilgang først etter siste godkjenning.',
    });
    const send = screen.getByRole('button', { name: 'Send til godkjenning' });
    expect(send).toBeDisabled();
    expect(screen.getByRole('list', { name: 'Godkjenningskjede' }).children).toHaveLength(3);
    expect(screen.getByText('Avgjør')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('checkbox'));
    await fireEvent.click(send);
    expect(onprimary).toHaveBeenCalledOnce();
  });

  it('omits the chain and the confirm gate when not given', () => {
    const screen = render(ApprovalPanel, { title: 'Du kan sende selv', primaryLabel: 'Send svar' });
    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.getByRole('button', { name: 'Send svar' })).toBeEnabled();
  });
});
