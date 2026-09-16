// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/svelte';
import { expect, it, vi } from 'vitest';
import UtkastStatus from '../UtkastStatus.svelte';

it('viser slettingskonflikt med et valg som bevarer brukerens tekst', async () => {
  const behold = vi.fn();
  render(UtkastStatus, {
    status: 'konflikt',
    konflikt: null,
    sistEndretAv: null,
    behold,
    hentInn: vi.fn(),
  });
  expect(screen.getByRole('alert').textContent).toContain('slettet');
  await fireEvent.click(screen.getByRole('button', { name: 'Lagre min tekst på nytt' }));
  expect(behold).toHaveBeenCalledOnce();
  expect(screen.queryByRole('button', { name: 'Hent inn deres' })).toBeNull();
});
