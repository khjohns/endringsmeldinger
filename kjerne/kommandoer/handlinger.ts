/**
 * `handlinger(u, part)`: det brukeren får tilbud om (`pending_actions`). En
 * handling tilbys når forutsetningene for kommandoen holder, så tilbudet og
 * avvisningen leser de samme predikatene (INV-MM-1). Serveren snevrer inn til
 * det parten også er autorisert for (`capabilities`).
 */

import { forutsetninger, noekkel, type Handlingsnoekkel } from './forutsetninger.ts';
import type { Utledning } from '../utledning/utled.ts';
import { SPOR, type Part } from '../typer.ts';

/** Handlingene som kan gjelde saken: hver handling i hvert spor, og en bestridelse per opplysning. */
export function kandidater(u: Utledning): Handlingsnoekkel[] {
  const ut: Handlingsnoekkel[] = [];
  for (const spor of SPOR)
    for (const type of ['krav', 'trekke', 'godta', 'svare', 'revidere'] as const)
      ut.push({ type, spor });
  ut.push({ type: 'varsle', spor: 'frist' });
  for (const { opplysning } of u.opplysninger)
    ut.push({ type: 'bestride', gjelder: opplysning.id });
  return ut;
}

export function handlinger(u: Utledning, part: Part): string[] {
  return kandidater(u)
    .filter((h) => forutsetninger(h, part, u) === null)
    .map(noekkel);
}
