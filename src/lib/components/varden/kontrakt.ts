import { getContext, setContext } from 'svelte';
import type { Part } from '$kjerne/typer';

/** Organisasjonene på hver side av kontrakten, slik prosjektet eller demoruta oppgir dem (#1398). */
export type Organisasjoner = Partial<Record<Part, string>>;

const NOEKKEL = Symbol('varden-organisasjoner');

/** Settes av `Vardensak`, så brevhodet kan vise organisasjonene (LV-U23). */
export const settOrganisasjoner = (hent: () => Organisasjoner) => setContext(NOEKKEL, hent);

/**
 * Hentes når komponenten lages (som `getContext`), og gir en funksjon som leser
 * organisasjonene. Utenfor `Vardensak` er det ingen.
 */
export function organisasjonene(): () => Organisasjoner {
  const hent = getContext<(() => Organisasjoner) | undefined>(NOEKKEL);
  return () => hent?.() ?? {};
}
