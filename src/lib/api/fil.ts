/**
 * Nedlasting av en fil fra serveren (#1083). Svaret er en fil, ikke JSON, så kallet går
 * ikke gjennom `apiFetch`, men har samme håndtering av en utløpt sesjon og et brutt nett.
 */

import { API_BASE_URL, ApiError, projectHeaders, redirectToLogin } from './client';

export const NETTFEIL = 'Fila kunne ikke hentes. Kontroller nettforbindelsen og prøv igjen.';

/**
 * Henter fila på `endpoint` i prosjektet `prosjektId`. 401 sender brukeren til
 * innloggingen, som `apiFetch`.
 *
 * @throws ApiError med serverens melding, `feiltekst` når svaret ikke har en, eller
 *   `NETTFEIL` (status 0) når nettet er brutt underveis
 */
export async function hentFil(
  endpoint: string,
  prosjektId: string,
  feiltekst: string
): Promise<Blob> {
  let svar: Response;
  try {
    svar = await fetch(`${API_BASE_URL}${endpoint}`, {
      credentials: 'include',
      headers: projectHeaders(prosjektId),
    });
  } catch {
    throw new ApiError(0, NETTFEIL);
  }
  if (!svar.ok) {
    if (svar.status === 401) redirectToLogin();
    const kropp = (await svar.json().catch(() => null)) as { message?: unknown } | null;
    throw new ApiError(
      svar.status,
      typeof kropp?.message === 'string' ? kropp.message : feiltekst,
      kropp
    );
  }
  try {
    return await svar.blob();
  } catch {
    throw new ApiError(0, NETTFEIL);
  }
}

/** Henter fila som `hentFil` og lagrer den i nettleseren med filnavnet `navn`. */
export async function lastNedFil(
  endpoint: string,
  prosjektId: string,
  navn: string,
  feiltekst: string
): Promise<void> {
  const url = URL.createObjectURL(await hentFil(endpoint, prosjektId, feiltekst));
  const a = document.createElement('a');
  a.href = url;
  a.download = navn;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
