/**
 * Panelet med hovedlinjene i et svarskjema følger rullingen bare når det får plass i vinduet.
 * Ellers vises en kompakt linje nederst når panelet er ute av syne (skjerm E). Linja gjengis bare
 * for det siste skjemaet som vil vise den, så flere skjemaer på samme side ikke legger linjene oppå
 * hverandre (showcasen viser flere skjemaer, både for vederlaget og fristen).
 */

import { untrack } from 'svelte';

const vilHaLinja = $state<string[]>([]);

/**
 * Kalles mens komponenten initialiseres. `panel` er elementet som måles, og bindes på nytt når
 * det settes inn igjen. `skjult` er når linja aldri skal vises, som når brevet leses ved siden av.
 */
export function fastLinje(
  uid: string,
  panel: () => HTMLElement | null,
  skjult: () => boolean
): { readonly faarPlass: boolean; readonly visKompakt: boolean } {
  const tilstand = $state({ faarPlass: true, iSyne: true });
  $effect(() => {
    const el = panel();
    if (!el || typeof ResizeObserver === 'undefined') return;
    const maal = () => (tilstand.faarPlass = el.offsetHeight + 32 <= window.innerHeight);
    const ro = new ResizeObserver(maal);
    ro.observe(el);
    window.addEventListener('resize', maal);
    const io =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([e]) => (tilstand.iSyne = e.isIntersecting));
    io?.observe(el);
    maal();
    return () => {
      ro.disconnect();
      io?.disconnect();
      window.removeEventListener('resize', maal);
    };
  });
  const vilVise = $derived(!skjult() && !tilstand.faarPlass && !tilstand.iSyne);
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
      return tilstand.faarPlass;
    },
    get visKompakt() {
      return vilVise && vilHaLinja.at(-1) === uid;
    },
  };
}
