/**
 * Meldingen for felt en kropp ikke kan ha, felles for inngangene og `nysak.ts` (#2036).
 * Modulen importerer ingenting, så demoruta kan bruke den gjennom `nysak.ts`.
 */

/** `null` når alle feltene i `objekt` er tillatt. Med `objektnavn` gjelder meldingen et objekt inne i kroppen. */
export function ukjenteFeltmelding(
  objekt: Record<string, unknown>,
  tillatte: ReadonlySet<string>,
  objektnavn?: string
): string | null {
  const ukjente = Object.keys(objekt).filter((k) => !tillatte.has(k));
  if (!ukjente.length) return null;
  return `Ukjente felt${objektnavn ? ` i ${objektnavn}` : ''}: ${ukjente.join(', ')}.`;
}
