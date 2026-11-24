/**
 * Brevhodet, stempelet og meldingen i Varden (#1466, #1467). Kildene er
 * `godkjenning-vederlagssvar.html:276-283` og LV-U23 for brevhodet, system.md («Mønstre»,
 * raden Stempel) for stempelet, og `innlogging.html:306` og system.md («Hver farge betyr én ting»)
 * for meldingen.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import Brev from '#lib/components/varden/Brev.svelte';
import { SKJEMA, brevrefFra } from '#lib/components/varden/tekster/index.ts';

afterEach(cleanup);

const brev = (ekstra: Record<string, unknown> = {}) =>
  render(Brev, {
    avsender: 'BH',
    sak: 'Ny peling',
    merking: 'K201-KOE-005-06',
    dato: '20. oktober 2026',
    tittel: 'Svar på krav om vederlagsjustering',
    avsnitt: [{ gjelder: 'svar', laast: 'Byggherren svarer.' }],
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
    expect(screen.getByTestId('stempel').textContent).toBe('Sendt 20. oktober 2026 kl.\u00a010.12');
    cleanup();
    brev({ dato: 'Settes ved sending' });
    expect(screen.queryByTestId('stempel')).toBeNull();
  });
});

describe('Henvisningen til kravbrevet i svarskjemaet', () => {
  const kravbrev = {
    id: 'k1',
    nummer: 2,
    registrert: '2026-10-02T08:00:00Z',
    omtale: 'brev K201-KOE-017-02 av 2. oktober 2026',
    art: 'krav' as const,
    avsender: 'TE' as const,
    sendt: null,
  };
  const epost = {
    ...kravbrev,
    nummer: null,
    registrert: '2026-10-05T08:00:00Z',
    omtale: 'totalentreprenørens e-post av 1. oktober 2026',
    art: 'registrert' as const,
  };

  it('viser til brevet i kortform med nummeret i saken, ikke med merkingen brevteksten bruker (oppdragsgiver 05.11 i #1631)', () => {
    expect(SKJEMA.svarerPaa(kravbrev)).toBe(
      'Svarer på brev 2 fra totalentreprenøren, 2. oktober 2026'
    );
    expect(SKJEMA.kravSendt(kravbrev.registrert, kravbrev)).toBe(
      'Kravet om vederlagsjustering ble sendt 2. oktober 2026 (brev 2).'
    );
  });

  it('registrert korrespondanse nevner parten og datoen TE oppgir én gang, som avstanden regnes til (LV-U45, #1596)', () => {
    expect(SKJEMA.svarerPaa(epost)).toBe('Svarer på totalentreprenørens e-post av 1. oktober 2026');
    expect(SKJEMA.kravSendt(epost.registrert, epost)).toBe(
      'Kravet om vederlagsjustering står i totalentreprenørens e-post av 1. oktober 2026.'
    );
    expect(brevrefFra(epost, 'TE')).toBe('totalentreprenørens e-post av 1. oktober 2026');
    expect(brevrefFra(kravbrev, 'TE')).toBe('brev 2 fra TE');
  });

  it('et brev uten omtale får nummeret, parten og datoen', () => {
    expect(SKJEMA.svarerPaa({ ...kravbrev, omtale: null })).toMatch(
      /^Svarer på brev 2 fra totalentreprenøren, /
    );
  });
});

describe('Punktene i brevet (#1824, prototype v4 i BF-14)', () => {
  it('hvert punkt har overskriften som overskrift, hvert avsnitt for seg, og utdypningen under punktet sitt', () => {
    brev({
      avsender: 'TE',
      avsnitt: [
        {
          punkt: 'innledning',
          laast: 'Kravet erstatter totalentreprenørens krav i brev K201-KOE-005-03.',
        },
        {
          punkt: 'P1',
          overskrift: '1. Vederlagsjustering',
          laast: '1. Vederlagsjustering\n\nP1 Graving.',
          utdypning: 'Begrunnelsen for P1.',
        },
        { punkt: 'P2', laast: 'P2 Rør.' },
        {
          punkt: 'forbehold',
          overskrift: '2. Forbehold',
          laast: '2. Forbehold',
          utdypning: 'Forbeholdet.',
        },
      ],
    });
    const overskrifter = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(overskrifter).toEqual(['1. Vederlagsjustering', '2. Forbehold']);
    const tekst = screen.getByTestId('laast-tekst');
    expect([...tekst.querySelectorAll('p')].map((p) => p.textContent)).toEqual([
      'Kravet erstatter totalentreprenørens krav i brev K201-KOE-005-03.',
      'P1 Graving.',
      'Begrunnelsen for P1.',
      'P2 Rør.',
      'Forbeholdet.',
    ]);
  });

  it('står overskriften ikke først i den låste delen, vises hele den låste delen, så ingen tekst faller bort', () => {
    brev({
      avsender: 'TE',
      avsnitt: [{ punkt: 'P1', overskrift: '1. Vederlagsjustering', laast: 'P1 Graving.' }],
    });
    const tekst = screen.getByTestId('laast-tekst');
    expect([...tekst.querySelectorAll('p')].map((p) => p.textContent)).toEqual(['P1 Graving.']);
  });

  it('et avsnitt uten punkter står som før, med den låste teksten (kontrollsak)', () => {
    brev();
    expect(screen.queryAllByRole('heading', { level: 3 })).toEqual([]);
    expect(screen.getByTestId('laast-tekst').textContent).toContain('Byggherren svarer.');
  });

  // Kravposten er avsnittet kjernen finner først i punktet (`punkteneMedBegrunnelse`, KA-U53).
  const kravpostlinjen = () =>
    [...document.querySelectorAll('.postlinje')].map((p) => [
      p.querySelector('b')?.textContent,
      p.textContent,
    ]);

  it('et punkt for en kravpost har kravposten først, med betegnelsen i fet skrift (KA-U53)', () => {
    brev({
      avsnitt: [
        {
          gjelder: 'svar',
          punkt: 'P1',
          overskrift: 'Spunt',
          laast: 'Spunt\n\nP1 Spunt langs nordveggen\n\nByggherren godkjenner enhetsprisene.',
        },
      ],
    });
    expect(kravpostlinjen()).toEqual([['P1', 'P1 Spunt langs nordveggen']]);
  });

  it('to punkter med samme kravpost har hver sin linje for kravposten (#2131)', () => {
    brev({
      avsnitt: ['Spunt langs nordveggen', 'Spunt langs sørveggen'].map((post) => ({
        gjelder: 'svar',
        punkt: 'P1',
        overskrift: 'Spunt',
        laast: `Spunt\n\nP1 ${post}\n\nByggherren godkjenner enhetsprisene.`,
      })),
    });
    expect(kravpostlinjen()).toEqual([
      ['P1', 'P1 Spunt langs nordveggen'],
      ['P1', 'P1 Spunt langs sørveggen'],
    ]);
  });

  it('et punkt for en kravpost uten kravposten først har ingen linje for kravposten (kontrollsak)', () => {
    brev({
      avsnitt: [
        {
          gjelder: 'svar',
          punkt: 'P1',
          overskrift: 'Spunt',
          laast: 'Spunt\n\nByggherren godkjenner enhetsprisene.',
        },
      ],
    });
    expect(kravpostlinjen()).toEqual([]);
  });
});
