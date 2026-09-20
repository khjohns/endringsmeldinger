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

import { API_BASE_URL, ApiError, getActiveProjectId, getCsrfToken, projectHeaders } from './client';

export interface Vedlegg {
  id: string;
  navn: string;
  storrelse: number;
  lastet_opp_av: string;
  lastet_opp_rolle: 'TE' | 'BH';
  tidspunkt: string;
  /**
   * 'staged': privat mellomlagring for eget team.
   * 'pending': sendt i en hendelse, venter på levering til Catenda.
   * 'delivered': lastet opp og knyttet til saken i Catenda.
   */
  status: 'staged' | 'pending' | 'delivered';
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

export interface VedleggsListe {
  vedlegg: Vedlegg[];
  /** Leserens kontraktsside, eller null når den ikke kan bekreftes. */
  minRolle: 'TE' | 'BH' | null;
}

export async function hentVedlegg(sakId: string): Promise<VedleggsListe> {
  const response = await fetch(base(sakId), {
    credentials: 'include',
    headers: projectHeaders(),
  });
  if (!response.ok) throw new ApiError(response.status, await feilmelding(response));
  const data = await response.json();
  return { vedlegg: data.vedlegg ?? [], minRolle: data.min_rolle ?? null };
}

/**
 * Fjern et vedlegg som ennå ikke er brukt i en sendt hendelse.
 *
 * Backend håndhever regelen: kun eget team, og ikke brukt i en lagret
 * hendelse eller ferdigstilt vurdering.
 */
export async function slettVedlegg(sakId: string, vedleggId: string): Promise<void> {
  const response = await fetch(`${base(sakId)}/${encodeURIComponent(vedleggId)}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      ...projectHeaders(),
      'X-CSRF-Token': await getCsrfToken(),
    },
  });
  if (!response.ok) throw new ApiError(response.status, await feilmelding(response));
}

export async function provLevering(sakId: string): Promise<void> {
  const response = await fetch(`${base(sakId)}/retry`, {
    method: 'POST',
    credentials: 'include',
    headers: { ...projectHeaders(), 'X-CSRF-Token': await getCsrfToken() },
  });
  if (!response.ok) throw new ApiError(response.status, await feilmelding(response));
}

export async function lastOppVedlegg(
  sakId: string,
  fil: File,
  projectId = getActiveProjectId()
): Promise<Vedlegg> {
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
      ...(projectId ? { 'X-Project-ID': projectId } : {}),
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
    headers: projectHeaders(),
  });
  if (!response.ok) throw new ApiError(response.status, await feilmelding(response));
  return response.blob();
}

/** Last ned vedlegget til brukerens maskin. */
export async function lastNedVedlegg(
  sakId: string,
  vedlegg: Pick<Vedlegg, 'id' | 'navn'>
): Promise<void> {
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
