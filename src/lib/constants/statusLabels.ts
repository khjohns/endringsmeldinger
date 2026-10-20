/**
 * Status Labels
 *
 * Lesbare norske labels for system-statuser.
 * Brukes i UI for å vise brukervennlige statustekster.
 */

import type { SporStatus } from '../types/timeline';

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
  avslatt_akseptert: 'Avslag godtatt',
  laast: 'Låst',
};
