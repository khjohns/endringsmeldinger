/**
 * Brevhodet, stempelet, infotipset og meldingen i Varden (#1466, #1467). Kildene er
 * `godkjenning-vederlagssvar.html:276-283` og LV-U23 for brevhodet, system.md («Mønstre»,
 * raden Stempel) for stempelet, OV-U81 og `grunnlagsoversikt.html:644` for infotipset, og
 * `innlogging.html:306` og system.md («Hver farge betyr én ting») for meldingen.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import Brev from '$lib/components/varden/Brev.svelte';
import Infotips from '$lib/components/varden/Infotips.svelte';

afterEach(cleanup);

const brev = (ekstra: Record<string, unknown> = {}) =>
  render(Brev, {
    avsender: 'BH',
    sak: 'Ny peling',
    nummer: '6',
    dato: '20. oktober 2026',
    tittel: 'Svar på krav om vederlagsjustering',
    avsnitt: [{ laast: 'Byggherren svarer.' }],
    ...ekstra,
  });

describe('Brevhodet', () => {
  it('har avsender, mottaker, referansene og datoen, med partene skrevet fullt ut (prototypen, LV-U23, sprak.md «Partene»)', () => {
    brev({ svarerPaa: 'Brev 5' });
    const hode = screen.getByRole('article').querySelector('header')!;
    const tekst = hode.textContent!.replace(/\s+/g, ' ');
    expect(tekst).toContain('Byggherren');
    expect(tekst).toContain('Totalentreprenøren');
    expect(tekst).toContain('Deres ref.: Brev 5');
    expect(tekst).toContain('Vår ref.: Brev 6');
    expect(tekst).toContain('Dato: 20. oktober 2026');
    expect(tekst).not.toMatch(/\((TE|BH)\)/);
  });

  it('et sendt brev har stempelet «Sendt …», og et utkast har det ikke (system.md, raden Stempel)', () => {
    brev({ sendt: '2026-10-20T08:12:00Z' });
    expect(screen.getByTestId('stempel').textContent).toBe('Sendt 20. oktober 2026');
    cleanup();
    brev({ dato: 'Settes ved sending' });
    expect(screen.queryByTestId('stempel')).toBeNull();
  });
});

describe('Infotipset', () => {
  it('har et tilgjengelig navn, åpnes med tastatur og lukkes med Escape med fokus tilbake på knappen (OV-U81, WCAG 2.1.1)', async () => {
    render(Infotips, { navn: 'Om brevet', tekst: 'Teksten kan ikke endres her.' });
    const knapp = screen.getByRole('button', { name: 'Om brevet' });
    expect(knapp.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByText('Teksten kan ikke endres her.').hidden).toBe(true);

    knapp.focus();
    await fireEvent.click(knapp);
    expect(knapp.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('note').textContent).toBe('Teksten kan ikke endres her.');

    await fireEvent.keyDown(knapp, { key: 'Escape' });
    expect(knapp.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(knapp);
  });
});
