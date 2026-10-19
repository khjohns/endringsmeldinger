/**
 * Klienten mot TS-serveren for KOE-sakene (B-17, B-18). Serveren står bak samme
 * vert under `/api/kjerne/`, med samme sesjon og CSRF-token som resten av appen.
 */

import { ApiError, apiFetch } from '$lib/api/client';
import type { Journalrad, Part, Vedlegg } from '$kjerne/typer';
import type { Visning } from '$kjerne/utledning/visning';

/** Navnet er slått opp ved visning; uten treff er det `aktor_id` (#820). */
export type Journallinje = Pick<
  Journalrad,
  'event_id' | 'versjon' | 'event_type' | 'tidsstempel' | 'aktor_rolle' | 'format' | 'data'
> & { aktor_navn?: string };

export interface Leveringsoppdrag {
  id: string;
  event_id: string;
  dokumentnoekkel: string;
  filnavn: string | null;
  innhold_sha256: string;
  opprettet: string;
  /** Tidspunktet dokumentreferansen på topicen ble kvittert, eller `null` (#764). */
  levert: string | null;
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
 * Kommando-ID-en for én brukerhandling. Serveren gir kvitteringen når samme ID kommer
 * igjen med samme innhold, så et nytt forsøk på samme handling sender samme ID (#418).
 */
export const nyKommandoId = () => crypto.randomUUID();

/**
 * Svaret kom ikke fram, serveren svarte `UTFALL_USIKKERT`, eller det kom en serverfeil
 * (5xx) uten kode, som fra en proxy. Kommandoen kan være lagret, så et nytt forsøk
 * sender samme kommando med samme ID (#418), og serveren gir kvitteringen. Serveren
 * avgjør: en annen kode er sikker, og feilen vises (oppdragsgiver 19.10, #816).
 */
export const erUsikkertUtfall = (e: unknown) => {
  if (!(e instanceof ApiError)) return false;
  const kode = (e.data as { error?: unknown } | undefined)?.error;
  return (
    e.status === 0 || kode === 'UTFALL_USIKKERT' || (e.status >= 500 && typeof kode !== 'string')
  );
};

const sti = (sakId: string) => `${SAKER}/${encodeURIComponent(sakId)}`;

/**
 * Prosjektet fra ruta er påkrevd i hvert kall og erstatter alltid det aktive (#743), så
 * saken ikke leses eller skrives i et annet prosjekt. En tom streng avvises av serveren.
 */
const prosjekthode = (prosjektId: string) => ({ 'X-Project-ID': prosjektId });

export const hentKjernesak = (sakId: string, prosjektId: string) =>
  apiFetch<Kjernesak>(sti(sakId), { headers: prosjekthode(prosjektId) });

/** Oppretter saken i prosjektet. Serveren lager saks-ID-en og stempler aktøren og tidspunktet. */
export const opprettSak = (kommandoId: string, kommando: unknown, prosjektId: string) =>
  apiFetch<{ sak_id: string; versjon: number }>(SAKER, {
    method: 'POST',
    headers: prosjekthode(prosjektId),
    body: JSON.stringify({ kommando_id: kommandoId, kommando }),
  });

/** Kommandoen sendes med versjonen skjemaet så. Aktøren og tidspunktet settes av serveren. */
export const sendKommando = (
  sakId: string,
  expectedVersion: number,
  kommandoId: string,
  kommando: unknown,
  prosjektId: string
) =>
  apiFetch<{ event_id: string; leveringsoppdrag: string; versjon: number }>(
    `${sti(sakId)}/kommandoer`,
    {
      method: 'POST',
      headers: prosjekthode(prosjektId),
      body: JSON.stringify({
        expected_version: expectedVersion,
        kommando_id: kommandoId,
        kommando,
      }),
    }
  );

/** Vedlegget i mellomlageret, ubundet til det sendes med et brev (LV-U14). */
export type Kjernevedlegg = Vedlegg & { stoerrelse: number };

/**
 * Laster opp filen til mellomlageret i saken. Kroppen er filen, og filnavnet står i
 * hodet `X-Filnavn`. Serveren renser navnet og avviser en tom fil og en fil over 15 MB.
 */
export const lastOppKjernevedlegg = (sakId: string, fil: File, prosjektId: string) =>
  apiFetch<{ vedlegg: Kjernevedlegg }>(`${sti(sakId)}/vedlegg`, {
    method: 'POST',
    headers: {
      ...prosjekthode(prosjektId),
      'Content-Type': 'application/octet-stream',
      'X-Filnavn': encodeURIComponent(fil.name),
    },
    body: fil,
  }).then((s) => s.vedlegg);
