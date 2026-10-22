/**
 * `handlinger(u, part)`: det brukeren får tilbud om (`pending_actions`). En
 * handling tilbys når forutsetningene for kommandoen holder, så tilbudet og
 * avvisningen leser de samme predikatene (INV-MM-1). Serveren snevrer inn til
 * det parten også er autorisert for (`capabilities`).
 */

import { forutsetninger, noekkel, type Handlingsnoekkel } from './forutsetninger.ts';
import { KAN_FAA_INNSIGELSE, type Utledning } from '../utledning/utled.ts';
import { KRAVSPOR, SPOR, type Part } from '../typer.ts';

/**
 * Handlingene som kan gjelde saken: hver handling i hvert spor og en innsigelse per
 * varsel, krav og svar. Bestridelse, merking, avklaring, protest, påberopt passivitet
 * og senere begrunnelse tilbys ikke (OV-U7).
 */
export function kandidater(u: Utledning): Handlingsnoekkel[] {
  const ut: Handlingsnoekkel[] = [];
  for (const spor of SPOR)
    for (const type of ['krav', 'trekke', 'godta', 'svare', 'revidere'] as const)
      ut.push({ type, spor });
  ut.push({ type: 'sende_foresporsel', spor: 'frist' }, { type: 'registrere_brev' });
  for (const spor of KRAVSPOR)
    for (const type of ['varsle', 'sende_varsel', 'ingen_krav'] as const) ut.push({ type, spor });
  for (const [id, e] of Object.entries(u.elementer)) {
    if (KAN_FAA_INNSIGELSE.has(e.art)) ut.push({ type: 'innsigelse', gjelder: id });
    if (e.art === 'foresporsel') ut.push({ type: 'svare_paa_foresporsel', gjelder: id });
  }
  return ut;
}

export function handlinger(u: Utledning, part: Part): string[] {
  return kandidater(u)
    .filter((h) => forutsetninger(h, part, u) === null)
    .map(noekkel);
}
