/**
 * Klienten mot TS-serveren for skiva i #347 (B-18). Serveren står bak samme vert
 * under `/api/kjerne/`, med samme sesjon og CSRF-token som resten av appen.
 */

import { apiFetch } from '$lib/api/client';
import type { Visning } from '$kjerne/visning';

export interface Journallinje {
  event_id: string;
  versjon: number;
  event_type: string;
  tidsstempel: string;
  aktor_rolle: 'TE' | 'BH';
  data: Record<string, unknown>;
}

export interface Leveringsoppdrag {
  id: string;
  event_id: string;
  dokumentnoekkel: string;
  filnavn: string;
  innhold_sha256: string;
  opprettet: string;
}

export interface Kjernesak {
  versjon: number;
  visning: Visning;
  journal: Journallinje[];
  leveringsoppdrag: Leveringsoppdrag[];
}

const sti = (sakId: string) => `/api/kjerne/saker/${encodeURIComponent(sakId)}`;

export const hentKjernesak = (sakId: string) => apiFetch<Kjernesak>(sti(sakId));

/** Kommandoen sendes med versjonen skjemaet så. Aktøren og tidspunktet settes av serveren. */
export const sendKommando = (sakId: string, expectedVersion: number, kommando: unknown) =>
  apiFetch<{ event_id: string; leveringsoppdrag: string; versjon: number }>(
    `${sti(sakId)}/kommandoer`,
    { method: 'POST', body: JSON.stringify({ expected_version: expectedVersion, kommando }) }
  );
