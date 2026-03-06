/**
 * Status Labels
 *
 * Lesbare norske labels for system-statuser.
 * Brukes i UI for å vise brukervennlige statustekster.
 */

import type { OverordnetStatus, SporStatus } from '../types/timeline';

/**
 * Statuser som regnes som aktive (ikke avsluttet/lukket)
 */
export const AKTIVE_OVERORDNET_STATUSER: OverordnetStatus[] = [
  'UTKAST',
  'SENDT',
  'VENTER_PAA_SVAR',
  'UNDER_BEHANDLING',
];

/**
 * Overordnet saks-status til lesbar label
 */
export const OVERORDNET_STATUS_LABELS: Record<OverordnetStatus, string> = {
  UTKAST: 'Utkast',
  SENDT: 'Sendt',
  VENTER_PAA_SVAR: 'Venter på svar',
  UNDER_BEHANDLING: 'Under behandling',
  UNDER_FORHANDLING: 'Under forhandling',
  OMFORENT: 'Omforent',
  LUKKET: 'Lukket',
  LUKKET_TRUKKET: 'Trukket',
};

/**
 * Hent lesbar label for overordnet status
 */
export function getOverordnetStatusLabel(status: OverordnetStatus): string {
  return OVERORDNET_STATUS_LABELS[status] || status;
}

/**
 * Spor-status til lesbar label
 */
export const SPOR_STATUS_LABELS: Record<SporStatus, string> = {
  ikke_relevant: 'Ikke relevant',
  utkast: 'Utkast',
  sendt: 'Sendt',
  under_behandling: 'Under behandling',
  godkjent: 'Godkjent',
  delvis_godkjent: 'Delvis godkjent',
  avslatt: 'Avslått',
  under_forhandling: 'Under forhandling',
  trukket: 'Trukket',
  laast: 'Låst',
};

/**
 * Hent lesbar label for spor-status
 */
export function getSporStatusLabel(status: SporStatus): string {
  return SPOR_STATUS_LABELS[status] || status;
}
