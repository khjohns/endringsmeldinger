/**
 * «Andre handlinger» i Varden: lista vises bare når kjernen tilbyr en handling (MM-U25). Hver
 * rad har tittelen, virkningen og pila, og en brevtype som ikke er bygget i Varden, sier ved et
 * klikk at den ikke er bygget (#1636, oppdragsgiver 06.11 i #1631).
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import Brevtyper from '#lib/components/varden/Brevtyper.svelte';
import { HANDLINGENE } from '#lib/components/varden/tekster/index.ts';

afterEach(cleanup);

const lag = (handlinger: string[], bygget: string[] = []) =>
  render(Brevtyper, {
    tittel: 'Andre handlinger',
    handlinger,
    bygget,
    beskrivelseFor: (n: string) =>
      n === 'trekke:vederlag' ? 'Kravet kan ikke tas opp igjen.' : null,
    onvelg: () => {},
  });

describe('Brevtyper', () => {
  it('lista vises ikke når kjernen ikke tilbyr noen handling (MM-U25)', () => {
    lag([]);
    expect(screen.queryByText('Andre handlinger')).toBeNull();
  });

  it('hver handling står én gang i fast rekkefølge, og en brevtype som ikke er bygget, er en knapp med virkningen', () => {
    lag(
      ['svare:vederlag', 'krav:vederlag', 'trekke:vederlag', 'varsle:vederlag'],
      ['svare:vederlag']
    );
    expect(screen.getByRole('button', { name: 'Svar på kravet' })).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
    const trekk = screen.getByRole('button', { name: /^Trekk kravet/ });
    expect(trekk).toHaveTextContent('Kravet kan ikke tas opp igjen.');
    expect(
      [...document.querySelectorAll('[data-handling]')].map((e) => e.getAttribute('data-handling'))
    ).toEqual(['svare:vederlag', 'krav:vederlag', 'varsle:vederlag', 'trekke:vederlag']);
  });

  it('en brevtype som ikke er bygget, ser ut som de andre handlingene, og et klikk sier at den ikke er bygget (oppdragsgiver 06.11, #1636)', async () => {
    lag(['trekke:vederlag'], []);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Kravet kan ikke tas opp igjen.')).toBeInTheDocument();
    expect(screen.queryByText(HANDLINGENE.ikkeBygget)).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: /Kravet kan ikke tas opp igjen/ }));
    expect(screen.getByRole('status')).toHaveTextContent(HANDLINGENE.ikkeBygget);
  });

  it('en handling er bygget bare med hele nøkkelen, så svaret i et annet spor sier at det ikke er bygget (#1663)', async () => {
    lag(['svare:frist'], ['svare:vederlag']);
    await fireEvent.click(screen.getByRole('button', { name: /Svar på kravet/ }));
    expect(screen.getByRole('status')).toHaveTextContent(HANDLINGENE.ikkeBygget);
  });

  it('korrigeringen av datoen har en tekst, så nøkkelen aldri vises rå (#1615)', () => {
    lag(['korrigere:abc'], []);
    expect(screen.getByText('Korriger datoen')).toBeInTheDocument();
    expect(screen.queryByText(/korrigere:/)).toBeNull();
  });
});
