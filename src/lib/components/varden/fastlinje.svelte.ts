/**
 * Panelet med hovedlinjene i et svarskjema følger rullingen bare når det får plass i vinduet.
 * Ellers vises en kompakt linje nederst når panelet er ute av syne (skjerm E). Linja gjengis bare
 * for det siste skjemaet som vil vise den, så flere skjemaer på samme side ikke legger linjene oppå
 * hverandre (showcasen viser flere skjemaer, både for vederlaget og fristen).
 */

import { untrack } from 'svelte';

const vilHaLinja = $state<string[]>([]);

/**
 * Om elementene får plass i vinduet over hverandre, med 16 px mellom, så de kan følge rullingen.
 * Kalles mens komponenten initialiseres. `elementer` gir elementene som måles, og de bindes på
 * nytt når ett settes inn igjen. `hoeyder` er høyden til hvert, i samme rekkefølge.
 */
export function faarPlass(elementer: () => (HTMLElement | null)[]): {
  readonly faarPlass: boolean;
  readonly hoeyder: readonly number[];
} {
  const tilstand = $state({ faarPlass: true, hoeyder: [] as number[] });
  $effect(() => {
    const els = elementer();
    if (els.some((el) => !el) || typeof ResizeObserver === 'undefined') return;
    const maal = () => {
      // Effekten leser ikke tilstanden den skriver, så målingen ikke utløser seg selv.
      const hoeyder = els.map((el) => el!.offsetHeight);
      const samlet = hoeyder.reduce((sum, h) => sum + h, 0) + 16 * (els.length - 1);
      tilstand.hoeyder = hoeyder;
      tilstand.faarPlass = samlet + 32 <= window.innerHeight;
    };
    const ro = new ResizeObserver(maal);
    for (const el of els) ro.observe(el!);
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
  const plass = faarPlass(() => [panel()]);
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
