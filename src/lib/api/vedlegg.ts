/**
 * Vedlegg
 *
 * Dokumentene ligger i Catendas bibliotek; appen holder ingen egen kopi.
 * Backend er tilgangspunktet: den autoriserer hver forespørsel mot saken før
 * den henter eller legger noe i biblioteket.
 *
 * Opplasting og nedlasting går utenom `apiFetch`, som setter JSON-header og
 * parser svaret som tekst. Multipart trenger at nettleseren setter sin egen
 * grense, og nedlasting trenger binærdata.
 */

import { API_BASE_URL, ApiError, getActiveProjectId, getCsrfToken } from './client';

export interface Vedlegg {
  id: string;
  navn: string;
  storrelse: number;
  lastet_opp_av: string;
  lastet_opp_rolle: 'TE' | 'BH';
  tidspunkt: string;
}

/** Filstørrelsen backend godtar. Speiler MAKS_VEDLEGG_BYTES. */
export const MAKS_VEDLEGG_BYTES = 15 * 1024 * 1024;

function base(sakId: string): string {
  return `${API_BASE_URL}/api/cases/${encodeURIComponent(sakId)}/vedlegg`;
}

async function feilmelding(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.message === 'string') return data.message;
  } catch {
    // Svaret var ikke JSON; bruk standardteksten under.
  }
  return 'Noe gikk galt. Prøv igjen.';
}

export async function hentVedlegg(sakId: string): Promise<Vedlegg[]> {
  const response = await fetch(base(sakId), {
    credentials: 'include',
    headers: { 'X-Project-ID': getActiveProjectId() },
  });
  if (!response.ok) throw new ApiError(response.status, await feilmelding(response));
  const data = await response.json();
  return data.vedlegg ?? [];
}

export async function lastOppVedlegg(sakId: string, fil: File): Promise<Vedlegg> {
  if (fil.size === 0) throw new ApiError(400, 'Filen er tom.');
  if (fil.size > MAKS_VEDLEGG_BYTES) {
    throw new ApiError(413, `Filen er større enn ${MAKS_VEDLEGG_BYTES / (1024 * 1024)} MB.`);
  }

  const data = new FormData();
  data.append('file', fil);

  // Content-Type settes bevisst ikke: nettleseren må sette multipart-grensen selv.
  const response = await fetch(base(sakId), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'X-Project-ID': getActiveProjectId(),
      'X-CSRF-Token': await getCsrfToken(),
    },
    body: data,
  });
  if (!response.ok) throw new ApiError(response.status, await feilmelding(response));
  return response.json();
}

/**
 * Hent vedlegget som binærdata.
 *
 * Nedlastingen kan ikke være en vanlig lenke: forespørselen trenger
 * prosjekt-headeren, og backend svarer bare på et autorisert kall.
 */
export async function hentVedleggInnhold(sakId: string, vedleggId: string): Promise<Blob> {
  const response = await fetch(`${base(sakId)}/${encodeURIComponent(vedleggId)}`, {
    credentials: 'include',
    headers: { 'X-Project-ID': getActiveProjectId() },
  });
  if (!response.ok) throw new ApiError(response.status, await feilmelding(response));
  return response.blob();
}

/** Last ned vedlegget til brukerens maskin. */
export async function lastNedVedlegg(sakId: string, vedlegg: Vedlegg): Promise<void> {
  const blob = await hentVedleggInnhold(sakId, vedlegg.id);
  const url = URL.createObjectURL(blob);
  try {
    const lenke = document.createElement('a');
    lenke.href = url;
    lenke.download = vedlegg.navn;
    document.body.appendChild(lenke);
    lenke.click();
    lenke.remove();
  } finally {
    // Frigi objektet etter at nettleseren har startet nedlastingen.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/** Menneskelig filstørrelse på norsk format. */
export function formaterStorrelse(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}
