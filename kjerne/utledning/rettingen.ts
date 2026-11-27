/**
 * Rettingen av datoen for et varsel eller et krav lagt til som korrespondanse (punkt 8 og 18–23 i
 * samlevedtaket for retting av sendt brev, MM-U59, og MM-U61): når en retting begynner å gjelde, og
 * datoen som gjelder etter punkt 19. Datoen som gjelder, er premiss for nye svar og for hvilket
 * varsel eller krav som er det første varselet løsningen kjenner (VS-U86). Hvilket krav eller svar
 * som var gjeldende, avgjøres av datoen totalentreprenøren oppga, og rettingen endrer det ikke
 * (punkt 18, OV-U123 punkt 17).
 */

import { dagenSendt, dokumenterI, erRegistrert } from '../format/leser.ts';
import type { Domenehendelse, Utsagn } from '../typer.ts';

/** En retting av datoen, slik den står i journalen, med datoen den ble sammenlignet med. */
export interface Retting {
  id: string;
  /** Dokumentet rettingen står i. */
  dokument: string;
  /** Varselet eller kravet datoen gjelder. */
  gjelder: string;
  /** Den nye datoen. */
  dato: string;
  /**
   * Punkt 19: datoen som gjaldt da rettingen ble sendt, som rettingen sammenlignes med. `null`
   * når datoen ikke kan leses.
   */
  gjaldt: string | null;
  /**
   * Elementet rettingen begynte å gjelde ved: rettingen selv når datoen er senere enn den som
   * gjaldt (punkt 19). En retting til en tidligere dato gjelder først når byggherren godtar den
   * (punkt 20, MM-U61), og til da er feltet `null`.
   */
  begynte: string | null;
}

type Rettingsutsagn = Extract<Utsagn, { art: 'retting' }>;

/**
 * Rettingene i journalen, i rekkefølgen de står der. Hver sammenlignes med datoen som gjaldt for
 * varselet eller kravet da den ble sendt (punkt 19). `medVirkning` er rettingene utledningen har
 * lest.
 */
export function rettingeneI(
  journal: readonly Domenehendelse[],
  medVirkning: readonly Rettingsutsagn[]
): Retting[] {
  const lest = new Set(medVirkning.map((r) => r.id));
  const dokumentene = [...dokumenterI(journal)];
  /** Dagen totalentreprenøren først oppga for varselet eller kravet (punkt 8). */
  const oppgitt = (id: string): string | null => {
    const d = dokumentene.find(
      (x) =>
        erRegistrert(x.opplysninger) &&
        (x.krav.some((k) => k.id === id) || x.utsagn.some((u) => u.id === id))
    );
    return d ? dagenSendt({ id, dokument: d.id }, d) : null;
  };
  const gjelder = new Map<string, string | null>();
  const ut: Retting[] = [];
  for (const d of dokumentene)
    for (const x of d.utsagn) {
      if (x.art !== 'retting' || !lest.has(x.id)) continue;
      if (!gjelder.has(x.gjelder)) gjelder.set(x.gjelder, oppgitt(x.gjelder));
      const gjaldt = gjelder.get(x.gjelder)!;
      const senere = gjaldt !== null && x.dato > gjaldt;
      if (senere) gjelder.set(x.gjelder, x.dato);
      ut.push({
        id: x.id,
        dokument: d.id,
        gjelder: x.gjelder,
        dato: x.dato,
        gjaldt,
        begynte: senere ? x.id : null,
      });
    }
  return ut;
}

/**
 * Punkt 19: datoen som gjelder for varselet eller kravet `gjelder`: datoen i rettingen som sist
 * begynte å gjelde, ellers `oppgitt`, datoen totalentreprenøren først oppga. `foer` avgrenser til
 * rettingene som hadde begynt å gjelde før et svar, så et svar står med datoen som gjaldt da det
 * ble sendt (punkt 8).
 */
export function datoEtterRettingene(
  rettinger: readonly Retting[],
  gjelder: string,
  oppgitt: string | null,
  foer: (element: string) => boolean = () => true
): string | null {
  return (
    rettinger.filter((r) => r.gjelder === gjelder && r.begynte !== null && foer(r.begynte)).at(-1)
      ?.dato ?? oppgitt
  );
}

/**
 * Punkt 22: rettingene av datoen for `gjelder` til en tidligere dato enn den som gjaldt, som står
 * åpne. Aksepten i svaret (punkt 20 og 23) er ikke bygget ennå (G-4 i BF-50), så hver slik retting
 * står åpen.
 */
export const rettingeneSomStaarAapne = (
  rettinger: readonly Retting[],
  gjelder: string
): Retting[] =>
  rettinger.filter(
    (r) => r.gjelder === gjelder && r.begynte === null && r.gjaldt !== null && r.dato < r.gjaldt
  );
