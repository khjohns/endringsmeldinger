/**
 * Summen av et innhold som JSON, uavhengig av rekkefølgen på nøklene. Oppdragene
 * (`levering.ts`) og kommandoene (`kommandosum`) regnes begge herfra. Modulen har ingen
 * avhengigheter, så kommandolaget ikke trekker inn PDF-stakken (#805).
 */

import { createHash } from 'node:crypto';

/** JSON med nøklene sortert, så summen kan regnes på nytt av det basen gir tilbake. */
export function kanonisk(verdi: unknown): string {
  if (Array.isArray(verdi))
    return `[${verdi.map((v) => (v === undefined ? 'null' : kanonisk(v))).join(',')}]`;
  if (verdi !== null && typeof verdi === 'object')
    return `{${Object.keys(verdi)
      .sort()
      .filter((k) => (verdi as Record<string, unknown>)[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${kanonisk((verdi as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  return JSON.stringify(verdi);
}

export const sjekksum = (innhold: unknown): string =>
  createHash('sha256').update(kanonisk(innhold)).digest('hex');
