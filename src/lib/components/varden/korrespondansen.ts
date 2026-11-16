/**
 * Varselet sendt utenfor løsningen, slik den felles komponenten `Korrespondansen.svelte` samler
 * det: typen, sendemåten for et brev, datoen det ble sendt, dokumentet og beskrivelsen (OV-U79,
 * VS-U34, A1 i #2056). Skjemaet for ny sak, fristkravet og vederlagskravet bruker det.
 */
import type { Korrespondansetype, Sendemaate } from '$kjerne/typer';
import type { Kjernevedlegg } from './nysak';
import { KORRESPONDANSEN } from './tekster';

export interface Korrespondansevalg {
  type: Korrespondansetype | null;
  /** Bare for et brev (OV-U79). */
  sendemaate: Sendemaate | null;
  dato: string;
  vedlegg: Kjernevedlegg[];
  beskrivelse: string;
}

export type Korrespondansefelt = keyof typeof KORRESPONDANSEN.mangler;

export const tomKorrespondanse = (): Korrespondansevalg => ({
  type: null,
  sendemaate: null,
  dato: '',
  vedlegg: [],
  beskrivelse: '',
});

export const erTomKorrespondanse = (v: Korrespondansevalg) =>
  v.type === null && v.sendemaate === null && !v.dato && !v.vedlegg.length && !v.beskrivelse.trim();

/**
 * Det som mangler, felt for felt, med meldingen ved feltet. `dokument: false` når dokumentet
 * ikke kan legges ved ennå (skjemaet for ny sak, #1488).
 */
export function korrespondansemangler(
  v: Korrespondansevalg,
  { dokument = true }: { dokument?: boolean } = {}
): Partial<Record<Korrespondansefelt, string>> {
  const m = KORRESPONDANSEN.mangler;
  return {
    ...(v.type === null ? { type: m.type } : {}),
    ...(v.type === 'brev' && v.sendemaate === null ? { sendemaate: m.sendemaate } : {}),
    ...(!v.dato ? { dato: m.dato } : {}),
    ...(dokument && !v.vedlegg.length ? { dokument: m.dokument } : {}),
    ...(!v.beskrivelse.trim() ? { beskrivelse: m.beskrivelse } : {}),
  };
}

/**
 * Feltene kommandoen bærer for korrespondansen (OV-U79, LV-U42). Sendemåten følger bare et brev,
 * så et valg fra før typen ble endret, ikke sendes. Kjernen avviser det som mangler; skjemaet
 * sier fra ved feltet først.
 */
export function registreringen(v: Korrespondansevalg) {
  const beskrivelse = v.beskrivelse.trim();
  return {
    sendt: v.dato,
    ...(v.type ? { korrespondansetype: v.type } : {}),
    ...(v.type === 'brev' && v.sendemaate ? { sendemaate: v.sendemaate } : {}),
    ...(beskrivelse ? { beskrivelse } : {}),
    dokumentasjon: v.vedlegg.map((x) => x.vedlegg_id),
  };
}
