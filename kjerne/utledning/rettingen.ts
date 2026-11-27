/**
 * Rettingen av datoen for et varsel eller et krav lagt til som korrespondanse (punkt 8 og 18 i
 * samlevedtaket for retting av sendt brev, MM-U59, og svaret B 27.11 i #1309): rettingen gjelder
 * straks som TEs siste opplysning, også når datoen er tidligere. Datoen som gjelder, er premiss for
 * nye svar og for hvilket varsel eller krav som er det første varselet løsningen kjenner (VS-U86).
 * Hvilket krav eller svar som var gjeldende, avgjøres av datoen TE oppga, og rettingen endrer det
 * ikke (punkt 18, OV-U123 punkt 17).
 */

import { dokumenterI } from '../format/leser.ts';
import type { Domenehendelse, Utsagn } from '../typer.ts';

/** En retting av datoen, slik den står i journalen. */
export interface Retting {
  id: string;
  /** Dokumentet rettingen står i. */
  dokument: string;
  /** Varselet eller kravet datoen gjelder. */
  gjelder: string;
  /** Den nye datoen. */
  dato: string;
}

type Rettingsutsagn = Extract<Utsagn, { art: 'retting' }>;

/** Rettingene utledningen har lest, i rekkefølgen de står i journalen. */
export function rettingeneI(
  journal: readonly Domenehendelse[],
  lest: readonly Rettingsutsagn[]
): Retting[] {
  const ider = new Set(lest.map((r) => r.id));
  return [...dokumenterI(journal)].flatMap((d) =>
    d.utsagn.flatMap((x) =>
      x.art === 'retting' && ider.has(x.id)
        ? [{ id: x.id, dokument: d.id, gjelder: x.gjelder, dato: x.dato }]
        : []
    )
  );
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
  foer: (retting: string) => boolean = () => true
): string | null {
  return rettinger.filter((r) => r.gjelder === gjelder && foer(r.id)).at(-1)?.dato ?? oppgitt;
}
