/**
 * Vekten og blekket per lag i målestokken, og skalaen (#2180 R1-1 og R2-3, U-2 i BF-44 og BF-45).
 * Kilden er tabellen i #2180 med verdiene fra prototypen `docs/design/prototyper/lagene.html`: det
 * første laget som gjelder, står i `--ink`, og lagene under dempes bare med blekk og vekt, i samme
 * størrelse. jsdom leser ikke stilen i en Svelte-komponent, så prøven kompilerer stilen og setter
 * den inn uten avgrensningen.
 */

import { readFileSync } from 'node:fs';
import { compile } from 'svelte/compiler';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';
import Maalrad, { maalestokken } from '#lib/components/varden/Maalrad.svelte';

afterEach(cleanup);

let stil: HTMLStyleElement;
beforeAll(() => {
  const fil = 'src/lib/components/varden/Maalrad.svelte';
  const css = compile(readFileSync(fil, 'utf8'), { css: 'external', filename: fil }).css!.code;
  stil = document.createElement('style');
  stil.textContent = css.replace(/:where\(\.svelte-\w+\)|\.svelte-\w+/g, '');
  document.head.append(stil);
});
afterAll(() => stil.remove());

function raden(props: Record<string, unknown>) {
  const { container } = render(Maalrad, {
    navn: 'Laget',
    verdi: '110 000 kr',
    andel: '50%',
    ...props,
  });
  const s = (sel: string) => getComputedStyle(container.querySelector(sel)!);
  return {
    navn: [s('.navn').color, s('.navn').fontWeight, s('.navn').fontSize],
    verdi: [s('.verdi b').color, s('.verdi b').fontWeight, s('.verdi b').fontSize],
    maal: s('.maal i').getPropertyValue('background'),
  };
}

describe('Blekket og vekten per lag i Maalrad (#2180 R1-1, U-2)', () => {
  it('det første laget som gjelder, har navnet og verdien i --ink med vekt 600 og målet fylt med --ink', () => {
    expect(raden({})).toEqual({
      navn: ['var(--ink)', '600', '14px'],
      verdi: ['var(--ink)', '600', '20px'],
      maal: 'var(--ink)',
    });
  });

  it('et lag under har navnet i --ink-2 med vekt 500, verdien i --ink-2 i samme størrelse og målet fylt med --ink-3', () => {
    expect(raden({ dempet: true })).toEqual({
      navn: ['var(--ink-2)', '500', '14px'],
      verdi: ['var(--ink-2)', '600', '20px'],
      maal: 'var(--ink-3)',
    });
  });

  it('i fristen er verdien 16 px i alle lagene', () => {
    expect(raden({ kompakt: true }).verdi).toEqual(['var(--ink)', '600', '16px']);
    expect(raden({ kompakt: true, dempet: true }).verdi).toEqual(['var(--ink-2)', '600', '16px']);
  });

  it('kravet har et åpent mål: rammen uten fyll', () => {
    const { container } = render(Maalrad, {
      navn: 'Krevd',
      verdi: '190 000 kr',
      andel: '95%',
      aapen: true,
    });
    // jsdom bryter ikke opp `border` med var(), så bare fyllet prøves her.
    expect(
      getComputedStyle(container.querySelector('.maal i.ramme')!).getPropertyValue('background')
    ).toBe('transparent');
  });
});

describe('Én regel for skalaen i begge sporene (#2180 R2-3)', () => {
  it('vederlaget: 190 000 kr gir trinn til 200 000, så kravet ikke fyller målet, og trinnet ved enden står', () => {
    const m = maalestokken(190000, true);
    expect(m.trinn).toEqual([0, 50000, 100000, 150000, 200000]);
    expect(m.andel(190000)).toBe('95%');
    expect(m.ende).toBe(true);
  });

  it('fristen: 25 dager gir trinn til 30', () => {
    const m = maalestokken(25, true);
    expect(m.trinn).toEqual([0, 10, 20, 30]);
    expect(m.ende).toBe(true);
  });

  it('et krav på et helt trinn får neste trinn som ende', () => {
    expect(maalestokken(200000, true).trinn.at(-1)).toBe(250000);
  });
});
