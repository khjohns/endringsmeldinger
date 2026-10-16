/**
 * Klienten mot TS-serveren for KOE-sakene (B-17, B-18). Serveren står bak samme
 * vert under `/api/kjerne/`, med samme sesjon og CSRF-token som resten av appen.
 */

import { apiFetch } from '$lib/api/client';
import type { Journalrad } from '$kjerne/typer';
import type { Visning } from '$kjerne/utledning/visning';

export type Journallinje = Pick<
  Journalrad,
  'event_id' | 'versjon' | 'event_type' | 'tidsstempel' | 'aktor_rolle' | 'format' | 'data'
>;

export interface Leveringsoppdrag {
  id: string;
  event_id: string;
  dokumentnoekkel: string;
  filnavn: string | null;
  innhold_sha256: string;
  opprettet: string;
}

export interface Kjernesak {
  versjon: number;
  visning: Visning;
  journal: Journallinje[];
  leveringsoppdrag: Leveringsoppdrag[];
}

const SAKER = '/api/kjerne/saker';
const sti = (sakId: string) => `${SAKER}/${encodeURIComponent(sakId)}`;

export const hentKjernesak = (sakId: string) => apiFetch<Kjernesak>(sti(sakId));

/**
 * Oppretter saken. Serveren lager saks-ID-en og stempler aktøren og tidspunktet.
 * Inngangen bygges i #370 (FK-7); formen her er det klienten sender dit.
 */
export const opprettSak = (kommando: unknown) =>
  apiFetch<{ sak_id: string; versjon: number }>(SAKER, {
    method: 'POST',
    body: JSON.stringify({ kommando }),
  });

/** Kommandoen sendes med versjonen skjemaet så. Aktøren og tidspunktet settes av serveren. */
export const sendKommando = (sakId: string, expectedVersion: number, kommando: unknown) =>
  apiFetch<{ event_id: string; leveringsoppdrag: string; versjon: number }>(
    `${sti(sakId)}/kommandoer`,
    { method: 'POST', body: JSON.stringify({ expected_version: expectedVersion, kommando }) }
  );
