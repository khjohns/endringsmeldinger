/**
 * Nedlastingen av et sendt brev som PDF fra TS-serveren (#1054). Serveren lager
 * PDF-en av det frosne leveringsoppdraget; et utkast kan ikke lastes ned
 * (oppdragsgiver 20.10, #1054).
 */

import { API_BASE_URL } from '$lib/api/client';

/** Stien til PDF-en av brevet med hendelsen `eventId` i saken. */
export const brevPdfSti = (sakId: string, eventId: string) =>
  `/api/kjerne/saker/${encodeURIComponent(sakId)}/brev/${encodeURIComponent(eventId)}`;

/**
 * Henter PDF-en og lagrer den med filnavnet `navn`. Prosjektet fra ruta erstatter det
 * aktive (#743). Svaret er en fil, ikke JSON, så kallet går ikke gjennom `apiFetch`.
 *
 * @throws Error med serverens melding når brevet ikke kan lastes ned
 */
export async function lastNedBrevPdf(
  sakId: string,
  eventId: string,
  prosjektId: string,
  navn: string
): Promise<void> {
  const svar = await fetch(`${API_BASE_URL}${brevPdfSti(sakId, eventId)}`, {
    credentials: 'include',
    headers: { 'X-Project-ID': prosjektId },
  });
  if (!svar.ok) {
    const kropp = (await svar.json().catch(() => null)) as { message?: unknown } | null;
    throw new Error(
      typeof kropp?.message === 'string' ? kropp.message : 'PDF-en kunne ikke lastes ned.'
    );
  }
  const url = URL.createObjectURL(await svar.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = navn;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
