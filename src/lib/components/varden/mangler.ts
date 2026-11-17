import { tick } from 'svelte';

/** Fokus til elementet når det er tegnet, som oppsummeringen av det som mangler. */
export async function fokuser(element: () => HTMLElement | null | undefined) {
  await tick();
  element()?.focus();
}

/** Det som mangler før brevet kan lages, i et krav- eller svarskjema (MM-U32). */
export interface Mangel {
  /** ID-en til feltet, med starten skjemaet gir ID-ene sine. */
  felt: string;
  /** Posten eller raden feltet står i, som åpnes når brukeren går til feltet, eller `null`. */
  post: string | null;
  /** Teksten i oppsummeringen øverst i skjemaet. */
  tekst: string;
  /** Teksten ved feltet, når den er en annen enn i oppsummeringen. */
  ved?: string;
}

/** Teksten ved feltet: `ved`, og ellers teksten i oppsummeringen. `null` når feltet ikke mangler noe. */
export const feltfeil = (m: Mangel | undefined): string | null => (m ? (m.ved ?? m.tekst) : null);
