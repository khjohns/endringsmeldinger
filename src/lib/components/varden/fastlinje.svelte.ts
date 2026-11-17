/**
 * Panelet med hovedlinjene i et svarskjema følger rullingen bare når det får plass i vinduet.
 * Ellers vises en kompakt linje nederst når panelet er ute av syne (skjerm E). Linja gjengis bare
 * for det siste skjemaet som vil vise den, så flere skjemaer på samme side ikke legger linjene oppå
 * hverandre (showcasen viser flere skjemaer, både for vederlaget og fristen).
 */

import { untrack } from 'svelte';

const vilHaLinja = $state<string[]>([]);

/**
 * Om panelet får plass i vinduet, så det kan følge rullingen. Kalles mens komponenten
 * initialiseres. `panel` er elementet som måles, og bindes på nytt når det settes inn igjen.
 */
export function faarPlass(panel: () => HTMLElement | null): { readonly faarPlass: boolean } {
  const tilstand = $state({ faarPlass: true });
  $effect(() => {
    const el = panel();
    if (!el || typeof ResizeObserver === 'undefined') return;
    const maal = () => (tilstand.faarPlass = el.offsetHeight + 32 <= window.innerHeight);
    const ro = new ResizeObserver(maal);
    ro.observe(el);
    window.addEventListener('resize', maal);
    maal();
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', maal);
    };
  });
  return tilstand;
}

/**
 * Kalles mens komponenten initialiseres, med `panel` som i `faarPlass`. `skjult` er når linja
 * aldri skal vises, som når brevet leses ved siden av.
 */
export function fastLinje(
  uid: string,
  panel: () => HTMLElement | null,
  skjult: () => boolean
): { readonly faarPlass: boolean; readonly visKompakt: boolean } {
  const plass = faarPlass(panel);
  const tilstand = $state({ iSyne: true });
  $effect(() => {
    const el = panel();
    // Mens linja er skjult, regnes panelet i syne, så linja ikke blinker når den vises igjen.
    if (skjult()) {
      tilstand.iSyne = true;
      return;
    }
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => (tilstand.iSyne = e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  });
  const vilVise = $derived(!skjult() && !plass.faarPlass && !tilstand.iSyne);
  $effect(() => {
    if (!vilVise) return;
    untrack(() => vilHaLinja.push(uid));
    return () =>
      untrack(() => {
        const i = vilHaLinja.indexOf(uid);
        if (i >= 0) vilHaLinja.splice(i, 1);
      });
  });
  return {
    get faarPlass() {
      return plass.faarPlass;
    },
    get visKompakt() {
      return vilVise && vilHaLinja.at(-1) === uid;
    },
  };
}
