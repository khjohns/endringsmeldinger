/**
 * Målingen i `faarPlass` (#2130). jsdom har ingen `ResizeObserver`, så testen gir en som måler
 * med en gang. Ellers står ikke målingen i noen komponenttest.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import { faarPlass } from '../fastlinje.svelte';

class StraksObservator {
  constructor(private kall: () => void) {}
  observe() {
    this.kall();
  }
  disconnect() {}
}

function element(hoeyde: number) {
  const el = document.createElement('div');
  Object.defineProperty(el, 'offsetHeight', { value: hoeyde });
  return el;
}

describe('faarPlass', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', StraksObservator);
    vi.stubGlobal('innerHeight', 900);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('måler elementene over hverandre med 16 px mellom og 32 px luft, uten at målingen utløser seg selv', () => {
    const elementer = $state([element(400), element(436)]);
    let plass: ReturnType<typeof faarPlass> | undefined;
    const stopp = $effect.root(() => {
      plass = faarPlass(() => elementer);
    });
    flushSync();
    // 400 + 16 + 436 + 32 = 884 ≤ 900.
    expect(plass!.faarPlass).toBe(true);
    expect(plass!.hoeyder).toEqual([400, 436]);
    elementer[1] = element(437);
    flushSync();
    // 400 + 16 + 437 + 32 = 885 ≤ 900; med 453 er det 901.
    expect(plass!.faarPlass).toBe(true);
    elementer[1] = element(453);
    flushSync();
    expect(plass!.faarPlass).toBe(false);
    stopp();
  });
});
