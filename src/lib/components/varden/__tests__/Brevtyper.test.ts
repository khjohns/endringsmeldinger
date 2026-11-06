/**
 * «Andre handlinger» i Varden: lista vises bare når kjernen tilbyr en handling (MM-U25). Hver
 * rad har tittelen, virkningen og pila, og en brevtype som ikke er bygget i prøven, åpner dagens
 * visning (#1391, oppdragsgiver 06.11 i #1631).
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import Brevtyper from '$lib/components/varden/Brevtyper.svelte';
import { HANDLINGENE, innsigelsen, innsigelsensVirkning } from '$lib/components/varden/tekster';

afterEach(cleanup);

const lag = (handlinger: string[], bygget: string[] = [], dagensVisning?: string) =>
  render(Brevtyper, {
    tittel: 'Andre handlinger',
    handlinger,
    bygget,
    dagensVisning,
    beskrivelseFor: (n: string) =>
      n === 'trekke:vederlag' ? 'Kravet kan ikke tas opp igjen.' : null,
    onvelg: () => {},
  });

describe('Brevtyper', () => {
  it('lista vises ikke når kjernen ikke tilbyr noen handling (MM-U25)', () => {
    lag([]);
    expect(screen.queryByText('Andre handlinger')).toBeNull();
  });

  it('en brevtype som ikke er bygget, er en lenke til dagens visning, og hver handling står én gang i fast rekkefølge', () => {
    lag(
      ['svare:vederlag', 'krav:vederlag', 'trekke:vederlag', 'varsle:vederlag'],
      ['svare'],
      '/p/s/kjerne'
    );
    expect(screen.getByRole('button', { name: 'Svar på kravet' })).toBeInTheDocument();
    const trekk = screen.getByRole('link', { name: /^Trekk kravet/ });
    expect(trekk).toHaveAttribute('href', '/p/s/kjerne');
    expect(trekk).toHaveTextContent('Kravet kan ikke tas opp igjen.');
    expect(trekk).not.toHaveTextContent(/dagens visning/);
    expect(
      [...document.querySelectorAll('[data-handling]')].map((e) => e.getAttribute('data-handling'))
    ).toEqual(['svare:vederlag', 'krav:vederlag', 'varsle:vederlag', 'trekke:vederlag']);
  });

  it('uten dagens visning står en brevtype som ikke er bygget, uten lenke og uten pil', () => {
    lag(['trekke:vederlag'], []);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Kravet kan ikke tas opp igjen.')).toBeInTheDocument();
  });

  it('innsigelsen sier med egne ord hva som kom for sent, uten henvisning til kontrakten (oppdragsgiver 06.11, #1631)', () => {
    expect(innsigelsen('svar', 2)).toBe('Gjør gjeldende at svaret i brev 2 kom for sent');
    expect(innsigelsen('varsel', null)).toBe('Gjør gjeldende at varselet kom for sent');
    // Fristen i § 5 tredje ledd, med ordene fra dagens visning (`InnsigelseModal.svelte`).
    expect(innsigelsensVirkning('svar')).toBe(
      'Sendes uten ugrunnet opphold. Ellers regnes svaret som gitt i tide.'
    );
  });

  it('ny versjon sier hvilket brev den erstatter, og at svaret ikke kan godtas, uten å si at det er avslått (MM-U34 punkt 1 og 2)', () => {
    const brev = (nummer: number) => ({
      id: `b${nummer}`,
      nummer,
      registrert: '2026-11-06T10:00:00Z',
      omtale: null,
      art: 'krav' as const,
    });
    expect(HANDLINGENE.virkning.nyVersjon('forhold', brev(1), brev(2))).toBe(
      'Erstatter påberopelsen i brev 1. Svaret i brev 2 kan da ikke godtas her, og byggherren svarer på nytt.'
    );
    expect(HANDLINGENE.virkning.nyVersjon('vederlag', brev(3), null)).toBe(
      'Erstatter kravet i brev 3. Byggherren svarer på den nye versjonen.'
    );
  });

  it('korrigeringen av datoen har en tekst, så nøkkelen aldri vises rå (#1615)', () => {
    lag(['korrigere:abc'], []);
    expect(screen.getByText('Korriger datoen')).toBeInTheDocument();
    expect(screen.queryByText(/korrigere:/)).toBeNull();
  });
});
