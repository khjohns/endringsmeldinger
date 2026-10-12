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
 * Handlingene som kan gjelde saken: hver handling i hvert spor, en bestridelse per
 * opplysning, en innsigelse per varsel, krav og svar, en protest per innsigelse og
 * dokument, påberopt passivitet per grunnlagskrav, en merking per dokument, en avklaring
 * per merking og en begrunnelse per element, som forutsetningen snevrer inn til svarene.
 */
export function kandidater(u: Utledning): Handlingsnoekkel[] {
  const ut: Handlingsnoekkel[] = [];
  for (const spor of SPOR)
    for (const type of ['krav', 'trekke', 'godta', 'svare', 'revidere'] as const)
      ut.push({ type, spor });
  ut.push({ type: 'varsle', spor: 'frist' }, { type: 'sende_varsel', spor: 'frist' });
  for (const spor of KRAVSPOR) ut.push({ type: 'ingen_krav', spor });
  for (const { opplysning } of u.opplysninger) {
    ut.push({ type: 'bestride', gjelder: opplysning.id });
    if (opplysning.hva === 'kan_ikke_uttrykkes')
      ut.push({ type: 'avklare', gjelder: opplysning.id });
  }
  for (const [id, e] of Object.entries(u.elementer)) {
    if (KAN_FAA_INNSIGELSE.has(e.art)) ut.push({ type: 'innsigelse', gjelder: id });
    if (e.innsigelse || e.art === 'dokument') ut.push({ type: 'protest', gjelder: id });
    if (e.art === 'dokument') ut.push({ type: 'merke', gjelder: id });
    ut.push({ type: 'begrunne', gjelder: id });
  }
  for (const k of u.spor.grunnlag.krav) ut.push({ type: 'passivitet', gjelder: k.id });
  return ut;
}

export function handlinger(u: Utledning, part: Part): string[] {
  return kandidater(u)
    .filter((h) => forutsetninger(h, part, u) === null)
    .map(noekkel);
}
