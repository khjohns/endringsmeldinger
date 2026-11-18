import { cleanup, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import Melding from '../Melding.svelte';

const tekst = createRawSnippet(() => ({ render: () => '<p>Kunne ikke sende brevet.</p>' }));

afterEach(cleanup);

describe('Melding i Varden (#2188)', () => {
  it('en sendefeil kunngjøres med teksten og har et dekorativt ikon', () => {
    render(Melding, { art: 'feil', children: tekst });
    const feil = screen.getByRole('alert');
    expect(feil.textContent).toContain('Kunne ikke sende brevet.');
    expect(feil.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('en informasjonsmelding er en status uten ikon', () => {
    render(Melding, { art: 'info', children: tekst });
    const info = screen.getByRole('status');
    expect(info.textContent).toContain('Kunne ikke sende brevet.');
    expect(info.querySelector('svg')).toBeNull();
  });
});
