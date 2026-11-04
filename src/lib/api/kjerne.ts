/**
 * Klienten mot TS-serveren for KOE-sakene (B-17, B-18). Serveren står bak samme
 * vert under `/api/kjerne/`, med samme sesjon og CSRF-token som resten av appen.
 */

import { ApiError, apiFetch } from '$lib/api/client';
import type { Saksmerking } from '$lib/kjernesak/brevtekst';
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

/** Svaret fra leseinngangene for sakens kode (LV-U46). */
interface Sakskodesvar {
  kode: 'koe' | 'eo';
  loepenummer: number;
  tildelt: boolean;
  kontraktsforkortelse: string | null;
}

const somMerking = ({ kode, loepenummer, kontraktsforkortelse }: Sakskodesvar): Saksmerking => ({
  sakskode: { kode, loepenummer },
  kontraktsforkortelse,
});

/**
 * Koden saken har, eller den sakens første brev vil få, og kontraktsforkortelsen, som
 * brevteksten trenger (LV-U46, LV-U53). Inngangen krever kontraktsside.
 */
export const hentSaksmerking = (sakId: string, prosjektId: string) =>
  apiFetch<Sakskodesvar>(`${sti(sakId)}/sakskode`, { headers: prosjekthode(prosjektId) }).then(
    somMerking
  );

/** Som `hentSaksmerking`, for en ny sak: det neste nummeret for koden (LV-U46). Bare TE. */
export const hentSaksmerkingForNySak = (prosjektId: string) =>
  apiFetch<Sakskodesvar>('/api/kjerne/sakskode', { headers: prosjekthode(prosjektId) }).then(
    somMerking
  );

/** Saken med merkingen brevteksten lages med, `null` når leseren ikke har kontraktsside. */
export interface LastetKjernesak extends Kjernesak {
  merking: Saksmerking | null;
}

/** Saken, og merkingen når leseren har en kontraktsside og kan sende brev i den. */
export async function hentKjernesakMedMerking(
  sakId: string,
  prosjektId: string
): Promise<LastetKjernesak> {
  const sak = await hentKjernesak(sakId, prosjektId);
  return { ...sak, merking: sak.part ? await hentSaksmerking(sakId, prosjektId) : null };
}

/** Oppretter saken i prosjektet. Serveren lager saks-ID-en og stempler aktøren og tidspunktet. */
export const opprettSak = (kommandoId: string, kommando: unknown, prosjektId: string) =>
  apiFetch<{ sak_id: string; versjon: number }>(SAKER, {
    method: 'POST',
    headers: prosjekthode(prosjektId),
    body: JSON.stringify({ kommando_id: kommandoId, kommando }),
  });

/** Det skjemaet for ny sak sender (`NySak` i `src/lib/components/varden/nysak.ts`, #1492). */
export interface NySakTilServeren {
  sakId: string;
  opprettelse: { sakstittel: string };
  paaberopelse: {
    type: 'krav';
    spor: 'forhold';
    innhold: Record<string, unknown>;
    utdypning?: string;
    /** Vedleggene lastet opp med `lastOppVedleggForNySak` (#1037). */
    dokumentasjon?: string[];
  };
  tekst: string[];
  /**
   * Varselet etter punkt 32.2 TE alt har sendt, med datoen og dokumentet (VS-U38). Dokumentet
   * står også i `paaberopelse.dokumentasjon`; ellers avviser serveren kallet (svar 2 i #1487).
   */
  varsel?: { sendt: string; dokumentasjon: string[] };
}

/**
 * Grensen `SendNySak` for saksruta: saken og den første påberopelsen i én handling
 * (KT-U11, #1487). Saks-ID-en er klientens, fordi brevteksten har saksnummeret (LV-U4),
 * og tittelen sendes én gang (LV-U43). Kommando-ID-en gjelder handlingen, så et nytt
 * forsøk etter et usikkert utfall sender samme ID og får saken fra kvitteringen (#418).
 */
export const sendNySak =
  (prosjektId: string, kommandoId: string = nyKommandoId()) =>
  (nySak: NySakTilServeren): Promise<{ sakId: string }> =>
    apiFetch<{ sak_id: string; event_id: string; versjon: number }>(SAKER, {
      method: 'POST',
      headers: prosjekthode(prosjektId),
      body: JSON.stringify(nySakKropp(nySak, kommandoId)),
    }).then((s) => ({ sakId: s.sak_id }));

/** Kroppen `sendNySak` sender. Demoruta prøver den samme kroppen (#1526 punkt 3). */
export const nySakKropp = (nySak: NySakTilServeren, kommandoId: string) => ({
  kommando_id: kommandoId,
  ny_sak_id: nySak.sakId,
  tittel: nySak.opprettelse.sakstittel,
  paaberopelse: nySak.paaberopelse,
  brevtekst: nySak.tekst,
  ...(nySak.varsel ? { varsel: nySak.varsel } : {}),
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

const VEDLEGG_FOR_NY_SAK = '/api/kjerne/vedlegg';

/**
 * Laster opp et vedlegg til en sak som ennå ikke finnes (#1037). Serveren flytter det inn
 * i saken når saken opprettes med en påberopelse som viser til det. Bare TE laster opp
 * (KT-U10).
 */
export const lastOppVedleggForNySak = (fil: File, prosjektId: string) =>
  apiFetch<{ vedlegg: Kjernevedlegg }>(VEDLEGG_FOR_NY_SAK, {
    method: 'POST',
    headers: {
      ...prosjekthode(prosjektId),
      'Content-Type': 'application/octet-stream',
      'X-Filnavn': encodeURIComponent(fil.name),
    },
    body: fil,
  }).then((s) => s.vedlegg);

/** Sletter et vedlegg teamet har lastet opp til en sak som ennå ikke finnes (#1037). */
export const slettVedleggForNySak = (vedleggId: string, prosjektId: string) =>
  apiFetch<{ success: true }>(`${VEDLEGG_FOR_NY_SAK}/${encodeURIComponent(vedleggId)}`, {
    method: 'DELETE',
    headers: prosjekthode(prosjektId),
  });
