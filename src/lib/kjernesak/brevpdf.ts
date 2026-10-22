/**
 * Nedlastingen av et sendt brev som PDF fra TS-serveren (#1054). Serveren lager
 * PDF-en av det frosne leveringsoppdraget; et utkast kan ikke lastes ned
 * (oppdragsgiver 20.10, #1054).
 */

import { lastNedFil } from '$lib/api/fil';

/** Stien til PDF-en av brevet med hendelsen `eventId` i saken. */
export const brevPdfSti = (sakId: string, eventId: string) =>
  `/api/kjerne/saker/${encodeURIComponent(sakId)}/brev/${encodeURIComponent(eventId)}`;

/**
 * Henter PDF-en og lagrer den med filnavnet `navn`. Prosjektet fra ruta erstatter det
 * aktive (#743).
 *
 * @throws ApiError med serverens melding når brevet ikke kan lastes ned
 */
export const lastNedBrevPdf = (sakId: string, eventId: string, prosjektId: string, navn: string) =>
  lastNedFil(brevPdfSti(sakId, eventId), prosjektId, navn, 'PDF-en kunne ikke lastes ned.');
