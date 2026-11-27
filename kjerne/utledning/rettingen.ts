/**
 * Rettingen av datoen for et varsel eller et krav lagt til som korrespondanse (punkt 8 og 18 i
 * samlevedtaket for retting av sendt brev, MM-U59, og MM-U63): rettingen gjelder
 * straks som TEs siste opplysning, også når datoen er tidligere. Datoen som gjelder, er premiss for
 * nye svar og for hvilket varsel eller krav som er det første varselet løsningen kjenner (VS-U86).
 * Hvilket krav eller svar som var gjeldende, avgjøres av datoen TE oppga, og rettingen endrer det
 * ikke (punkt 18, OV-U123 punkt 17).
 */

import { foerDagen } from '../format/leser.ts';

/** En retting av datoen, slik den står i journalen. */
export interface Retting {
  id: string;
  /** Dokumentet rettingen står i. */
  dokument: string;
  /** Varselet eller kravet datoen gjelder. */
  gjelder: string;
  /** Den nye datoen. */
  dato: string;
  /** Dagen brevet med rettingen ble sendt (OV-U98). */
  sendt: string | null;
}

/**
 * Datoen som gjelder for varselet eller kravet `gjelder`: datoen i den siste rettingen, ellers
 * `oppgitt`, datoen TE først oppga. `foer` avgrenser til rettingene før et svar, så et svar står
 * med datoen som gjaldt da det ble sendt (punkt 8).
 */
export function datoEtterRettingene(
  rettinger: readonly Retting[],
  gjelder: string,
  oppgitt: string | null,
  foer: (retting: Retting) => boolean = () => true
): string | null {
  return rettinger.filter((r) => r.gjelder === gjelder && foer(r)).at(-1)?.dato ?? oppgitt;
}

/**
 * Utledningen med rettingene sendt til og med dagen `dag`, for et svar lagt til som oppgir at det
 * ble sendt den dagen (punkt 8 i samlevedtaket for retting av sendt brev, MM-U59, og OV-U98).
 */
export const medRettingeneTil = <U extends { rettinger: readonly Retting[] }>(
  u: U,
  dag: string | null
): U =>
  dag === null ? u : { ...u, rettinger: u.rettinger.filter((r) => !foerDagen(dag, r.sendt)) };
