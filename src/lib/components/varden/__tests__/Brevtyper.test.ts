/**
 * «Andre handlinger» i Varden: lista vises bare når kjernen tilbyr en handling (MM-U25). Hver
 * rad har tittelen, virkningen og pila, og en brevtype som ikke er bygget i prøven, åpner dagens
 * visning (#1391, oppdragsgiver 06.11 i #1631).
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import Brevtyper from '$lib/components/varden/Brevtyper.svelte';
import { innsigelsen } from '$lib/components/varden/tekster';

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
    // Med en bygget rad i lista står linja om prøven ved hver rad som ikke er bygget.
    expect(trekk).toHaveTextContent('Kravet kan ikke tas opp igjen. Åpnes i dagens visning.');
    expect(
      [...document.querySelectorAll('[data-handling]')].map((e) => e.getAttribute('data-handling'))
    ).toEqual(['svare:vederlag', 'krav:vederlag', 'varsle:vederlag', 'trekke:vederlag']);
  });

  it('uten dagens visning står en brevtype som ikke er bygget, uten lenke og med linja om prøven én gang under lista', () => {
    lag(['trekke:vederlag'], []);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Kravet kan ikke tas opp igjen.')).toBeInTheDocument();
    expect(screen.getAllByText('Bygges ikke i denne prøven.')).toHaveLength(1);
  });

  it('innsigelsen sier med egne ord hva som kom for sent, uten henvisning til kontrakten (oppdragsgiver 06.11, #1631)', () => {
    expect(innsigelsen('svar', 2)).toBe('Gjør gjeldende at svaret i brev 2 kom for sent');
    expect(innsigelsen('varsel', null)).toBe('Gjør gjeldende at varselet kom for sent');
  });
});
