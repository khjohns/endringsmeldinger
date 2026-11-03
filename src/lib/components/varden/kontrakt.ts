import { getContext, setContext } from 'svelte';
import type { Part } from '$kjerne/typer';
import { projectStore } from '$lib/stores/project.svelte';

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

/** Prosjektet og partene, fra demoruta eller prosjektet (#1398). */
export type Kontrakt = {
  prosjekt?: string;
  kontraktsform?: string;
  byggherre?: string;
  entreprenoer?: string;
};

/** Prosjektet og partene slik prosjektet oppgir dem. Serveren gir ikke kontraktsformen (#1398). */
export function kontraktFraProsjektet(): Kontrakt {
  const p = projectStore.current;
  const c = p?.settings.contract;
  return {
    prosjekt: p?.name,
    byggherre: c?.byggherre_navn,
    entreprenoer: c?.totalentreprenor_navn,
  };
}
