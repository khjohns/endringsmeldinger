/**
 * Felles arbeidsutkast i en sak.
 *
 * Utkastet ligger på serveren og deles av organisasjonen: alle i samme
 * Catenda-team arbeider i samme tekst, og ingen andre ser den. Backend
 * autoriserer hver forespørsel — Catenda er kilden for teammedlemskapet, men
 * ikke vakten, siden appen snakker med Catenda gjennom sin egen tjenestekonto.
 *
 * Revisjonen er del av identiteten. Et utkast hører til én revisjon av ett spor
 * i én sak, slik at arbeid som fortsetter etter en innsending ikke kan endre
 * grunnlaget som allerede er sendt.
 */

import { apiFetch, ApiError } from './client';
import type { SporType } from '$lib/types/timeline';

export interface ServerUtkast<T> {
  innhold: T;
  /** Teller skrivinger. Sendes tilbake som `forventet_versjon` ved lagring. */
  versjon: number;
  oppdatert_av: string;
  oppdatert: string;
  kontraktsside: 'TE' | 'BH';
}

/**
 * En annen i teamet har skrevet siden vi leste.
 *
 * Bærer teksten som faktisk står lagret, slik at brukeren kan se den i stedet
 * for bare å få vite at lagringen mislyktes.
 */
export class UtkastKonflikt<T = unknown> extends Error {
  constructor(public gjeldende: ServerUtkast<T> | null) {
    super('Utkastet er endret av en annen i teamet.');
    this.name = 'UtkastKonflikt';
  }
}

function sti(sakId: string, spor: SporType): string {
  return `/api/cases/${encodeURIComponent(sakId)}/utkast/${encodeURIComponent(spor)}`;
}

export async function hentUtkast<T>(
  sakId: string,
  spor: SporType,
  revisjon: number
): Promise<ServerUtkast<T> | null> {
  const svar = await apiFetch<{ utkast: ServerUtkast<T> | null }>(
    `${sti(sakId, spor)}?revisjon=${revisjon}`
  );
  return svar.utkast ?? null;
}

/**
 * Skriv utkastet, men bare hvis ingen andre har skrevet imens.
 *
 * @param forventetVersjon Versjonen vi leste, eller `null` når vi mener
 *   utkastet ikke finnes. Begge kontrolleres av backend, slik at en ny fane
 *   ikke sletter en kollegas arbeid ved å tro at utkastet er tomt.
 * @throws {UtkastKonflikt} Når lagret versjon er en annen enn den forventede.
 */
export async function lagreUtkast<T>(
  sakId: string,
  spor: SporType,
  revisjon: number,
  innhold: T,
  forventetVersjon: number | null
): Promise<ServerUtkast<T>> {
  try {
    const svar = await apiFetch<{ utkast: ServerUtkast<T> }>(sti(sakId, spor), {
      method: 'PUT',
      body: JSON.stringify({ revisjon, innhold, forventet_versjon: forventetVersjon }),
    });
    return svar.utkast;
  } catch (feil) {
    if (feil instanceof ApiError && feil.status === 409) {
      const data = feil.data as { utkast?: ServerUtkast<T> } | undefined;
      throw new UtkastKonflikt<T>(data?.utkast ?? null);
    }
    throw feil;
  }
}

/** Forkast teamets utkast — normalt etter at hendelsen er sendt. */
export async function slettUtkast(sakId: string, spor: SporType, revisjon: number): Promise<void> {
  await apiFetch(`${sti(sakId, spor)}?revisjon=${revisjon}`, { method: 'DELETE' });
}
