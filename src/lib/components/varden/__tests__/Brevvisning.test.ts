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
import { SKJEMA, brevrefFra } from '$lib/components/varden/tekster';

afterEach(cleanup);

const brev = (ekstra: Record<string, unknown> = {}) =>
  render(Brev, {
    avsender: 'BH',
    sak: 'Ny peling',
    merking: 'K201-KOE-005-06',
    dato: '20. oktober 2026',
    tittel: 'Svar på krav om vederlagsjustering',
    avsnitt: [{ laast: 'Byggherren svarer.' }],
    ...ekstra,
  });

describe('Brevhodet', () => {
  it('har avsender, mottaker, referansene og datoen, med partene skrevet fullt ut (prototypen, LV-U23, sprak.md «Partene»)', () => {
    brev({ deresRef: ['K201-KOE-005-05'] });
    const hode = screen.getByRole('article').querySelector('header')!;
    const tekst = hode.textContent!.replace(/\s+/g, ' ');
    expect(tekst).toContain('Byggherren');
    expect(tekst).toContain('Totalentreprenøren');
    expect(tekst).toContain('Deres ref.: K201-KOE-005-05');
    expect(tekst).toContain('Vår ref.: K201-KOE-005-06');
    expect(tekst).toContain('Dato: 20. oktober 2026');
    expect(tekst).not.toMatch(/\((TE|BH)\)/);
  });

  it('Deres ref. har én kode per linje, i rekkefølgen kjernen frøs dem (LV-U49, U-2 i BF-07)', () => {
    brev({ deresRef: ['K201-KOE-005-03', 'K201-KOE-005-07'] });
    const dd = screen.getByTestId('deres-ref');
    expect(dd.querySelectorAll('br')).toHaveLength(1);
    expect(dd.textContent!.replace(/\s+/g, ' ').trim()).toBe('K201-KOE-005-03K201-KOE-005-07');
  });

  it('uten koder står ikke «Deres ref.» i hodet (U-3 i BF-07)', () => {
    brev();
    expect(screen.getByRole('article').querySelector('header')!.textContent).not.toContain(
      'Deres ref.'
    );
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

  it('lukkes av et klikk utenfor, også når knappen ikke fikk fokus av klikket (Safari)', async () => {
    render(Infotips, { navn: 'Om brevet', tekst: 'Teksten kan ikke endres her.' });
    const knapp = screen.getByRole('button', { name: 'Om brevet' });
    await fireEvent.click(knapp);
    expect(knapp.getAttribute('aria-expanded')).toBe('true');

    await fireEvent.pointerDown(screen.getByRole('note'));
    expect(knapp.getAttribute('aria-expanded')).toBe('true');
    await fireEvent.pointerDown(document.body);
    expect(knapp.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('Henvisningen til kravbrevet i svarskjemaet', () => {
  const kravbrev = {
    id: 'k1',
    nummer: 2,
    registrert: '2026-10-02T08:00:00Z',
    omtale: 'brev K201-KOE-017-02 av 2. oktober 2026',
    art: 'krav' as const,
  };
  const epost = {
    ...kravbrev,
    nummer: null,
    registrert: '2026-10-05T08:00:00Z',
    omtale: 'totalentreprenørens e-post av 1. oktober 2026',
    art: 'registrert' as const,
  };

  it('viser til brevet i kortform med nummeret i saken, ikke med merkingen brevteksten bruker (oppdragsgiver 05.11 i #1631)', () => {
    expect(SKJEMA.svarerPaa(kravbrev)).toBe('Svar på brev 2 fra TE · 2. okt.');
    expect(SKJEMA.kravSendt(kravbrev.registrert, kravbrev)).toBe(
      'Kravet om vederlagsjustering ble sendt 2. oktober 2026 (brev 2).'
    );
  });

  it('registrert korrespondanse nevner parten én gang, og datoen avstanden regnes til står med (LV-U42)', () => {
    expect(SKJEMA.svarerPaa(epost)).toBe('Svar på totalentreprenørens e-post av 1. oktober 2026');
    expect(SKJEMA.kravSendt(epost.registrert, epost)).toBe(
      'Kravet om vederlagsjustering står i totalentreprenørens e-post av 1. oktober 2026, registrert 5. oktober 2026.'
    );
    expect(brevrefFra(epost, 'TE')).toBe('totalentreprenørens e-post av 1. oktober 2026');
    expect(brevrefFra(kravbrev, 'TE')).toBe('brev 2 fra TE');
  });

  it('et brev uten omtale får nummeret, parten og datoen', () => {
    expect(SKJEMA.svarerPaa({ ...kravbrev, omtale: null })).toMatch(/^Svar på brev 2 fra TE · /);
  });
});
