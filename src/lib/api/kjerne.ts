/**
 * Klienten mot TS-serveren for KOE-sakene (B-17, B-18). Serveren står bak samme
 * vert under `/api/kjerne/`, med samme sesjon og CSRF-token som resten av appen.
 */

import { apiFetch, projectHeaders } from '$lib/api/client';
import type { Journalrad, Part } from '$kjerne/typer';
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
  /** Leserens kontraktsside etter Catenda-teamet, `null` uten side (#705). */
  part: Part | null;
  visning: Visning;
  journal: Journallinje[];
  leveringsoppdrag: Leveringsoppdrag[];
}

const SAKER = '/api/kjerne/saker';

/**
 * Serveren krever en kommando-ID og gir kvitteringen når samme ID kommer igjen
 * (#418). Her får hvert kall en ny ID, så et nytt forsøk fra kalleren er en ny
 * kommando.
 */
const nyKommandoId = () => crypto.randomUUID();
const sti = (sakId: string) => `${SAKER}/${encodeURIComponent(sakId)}`;

/** Prosjektet fra ruta går med, så saken ikke leses i et annet aktivt prosjekt. */
export const hentKjernesak = (sakId: string, prosjektId?: string) =>
  apiFetch<Kjernesak>(sti(sakId), { headers: projectHeaders(prosjektId) });

/**
 * Oppretter saken i prosjektet fra ruta, eller det aktive. Serveren lager
 * saks-ID-en og stempler aktøren og tidspunktet.
 */
export const opprettSak = (kommando: unknown, prosjektId?: string) =>
  apiFetch<{ sak_id: string; versjon: number }>(SAKER, {
    method: 'POST',
    headers: projectHeaders(prosjektId),
    body: JSON.stringify({ kommando_id: nyKommandoId(), kommando }),
  });

/**
 * Kommandoen sendes med versjonen skjemaet så, til prosjektet fra ruta eller det
 * aktive. Aktøren og tidspunktet settes av serveren.
 */
export const sendKommando = (
  sakId: string,
  expectedVersion: number,
  kommando: unknown,
  prosjektId?: string
) =>
  apiFetch<{ event_id: string; leveringsoppdrag: string; versjon: number }>(
    `${sti(sakId)}/kommandoer`,
    {
      method: 'POST',
      headers: projectHeaders(prosjektId),
      body: JSON.stringify({
        expected_version: expectedVersion,
        kommando_id: nyKommandoId(),
        kommando,
      }),
    }
  );
