/**
 * Den ventende opprettelsen av en ny sak i fanens lagring. Egen modul, så rotlayouten kan
 * fjerne andre brukeres utkast uten å laste skjemaet (#1678).
 */

import type { Utfylling } from './nysak';

/**
 * Opprettelsen som er sendt uten at utfallet er kjent (#1526 punkt 1). Saks-ID-en og
 * kommando-ID-en gjelder handlingen, så et nytt forsøk etter ny innlasting sender de samme
 * ID-ene med det samme skjemaet. Har serveren lagret det første forsøket, får TE saken fra
 * kvitteringen, og det blir ikke to saker. Den fjernes når saken er opprettet, eller når TE
 * avbryter. Lagringen er per fane, og skjemaet virker uten den.
 *
 * Den er lagret per bruker, så en annen bruker som logger inn i samme fane, ikke får forrige
 * brukers tekst, vedlegg eller ID-er, også når den første sesjonen utløp uten utlogging.
 * Uten en innlogget bruker lagres og leses ingenting. Utkastene til andre brukere fjernes fra
 * fanen når sesjonen er hentet (`+layout.ts`), og utloggingen tømmer fanens lagring (`logout`
 * i `$lib/api/auth`, #1678).
 */
export interface VentendeOpprettelse {
  sakId: string;
  kommandoId: string;
  utkast: Utfylling | null;
}

const VENTENDE = 'nysak:ventende:';

const ventendeNoekkel = (brukerId: string, prosjektId: string) =>
  `${VENTENDE}${brukerId}:${prosjektId}`;

/** Fjerner utkastene i fanen som ikke er brukerens, også de en utløpt sesjon etterlot. */
export function fjernAndresVentende(brukerId: string) {
  const egne = `${VENTENDE}${brukerId}:`;
  try {
    const andres: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const noekkel = sessionStorage.key(i);
      if (noekkel?.startsWith(VENTENDE) && !noekkel.startsWith(egne)) andres.push(noekkel);
    }
    for (const noekkel of andres) sessionStorage.removeItem(noekkel);
  } catch {
    // Uten tilgang til lagringen er ingenting lagret der.
  }
}

export function lesVentende(
  brukerId: string | undefined,
  prosjektId: string
): VentendeOpprettelse | null {
  if (!brukerId) return null;
  try {
    const lagret = sessionStorage.getItem(ventendeNoekkel(brukerId, prosjektId));
    return lagret ? (JSON.parse(lagret) as VentendeOpprettelse) : null;
  } catch {
    return null;
  }
}

export function lagreVentende(
  brukerId: string | undefined,
  prosjektId: string,
  ventende: VentendeOpprettelse
) {
  if (!brukerId) return;
  try {
    sessionStorage.setItem(ventendeNoekkel(brukerId, prosjektId), JSON.stringify(ventende));
  } catch {
    // Uten lagringen sender et nytt forsøk i samme visning fortsatt samme ID-er.
  }
}

export function fjernVentende(brukerId: string | undefined, prosjektId: string) {
  if (!brukerId) return;
  try {
    sessionStorage.removeItem(ventendeNoekkel(brukerId, prosjektId));
  } catch {
    // Som over.
  }
}
