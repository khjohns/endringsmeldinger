/** Meldingen for felt en kropp ikke kan ha, felles for inngangene og `nysak.ts` (#2036). */

import { ukjenteFelt } from '../../../kjerne/format/skjema.ts';

/** `null` når alle feltene i `objekt` er tillatt. Med `objektnavn` gjelder meldingen et objekt inne i kroppen. */
export function ukjenteFeltmelding(
  objekt: Record<string, unknown>,
  tillatte: ReadonlySet<string>,
  objektnavn?: string
): string | null {
  const ukjente = ukjenteFelt(objekt, tillatte);
  if (!ukjente.length) return null;
  return `Ukjente felt${objektnavn ? ` i ${objektnavn}` : ''}: ${ukjente.join(', ')}.`;
}
