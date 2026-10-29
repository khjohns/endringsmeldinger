/**
 * Menyen med brevtypene i Varden: den vises bare når kjernen tilbyr en handling (MM-U25), og
 * brevtypene som ikke er bygget i prøven, står samlet under én linje (#1391, kommentaren fra
 * reviewet av #1373).
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/svelte';
import Brevtyper from '$lib/components/varden/Brevtyper.svelte';

afterEach(cleanup);

const lag = (handlinger: string[], bygget: string[] = []) =>
  render(Brevtyper, { tittel: 'Skriv brev i sporet', handlinger, bygget, onvelg: () => {} });

describe('Brevtyper', () => {
  it('menyen vises ikke når kjernen ikke tilbyr noen handling (MM-U25)', () => {
    lag([]);
    expect(screen.queryByText('Skriv brev i sporet')).toBeNull();
  });

  it('brevtypene som ikke er bygget, står under én felles linje, og hver handling står én gang (#1391)', () => {
    lag(['svare:vederlag', 'krav:vederlag', 'trekke:vederlag', 'varsle:vederlag'], ['svare']);
    expect(screen.getAllByText('Bygges ikke i denne prøven. Bruk dagens visning.')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Svar på kravet' })).toBeInTheDocument();
    const ikkeBygget = screen.getByRole('list', {
      name: 'Bygges ikke i denne prøven. Bruk dagens visning.',
    });
    expect(within(ikkeBygget).queryAllByRole('button')).toHaveLength(0);
    expect(
      [...document.querySelectorAll('[data-handling]')].map((e) => e.getAttribute('data-handling'))
    ).toEqual(['svare:vederlag', 'krav:vederlag', 'varsle:vederlag', 'trekke:vederlag']);
  });
});
