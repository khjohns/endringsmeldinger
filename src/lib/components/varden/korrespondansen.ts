/**
 * Korrespondansen sendt utenfor løsningen, slik den felles komponenten `Korrespondansen.svelte`
 * samler den: typen, sendemåten for et brev, datoen det ble sendt, dokumentet og beskrivelsen
 * (OV-U79, VS-U34, A1 i #2056). Varselet i skjemaet for ny sak, fristkravet og vederlagskravet, og
 * kravet, svaret og aksepten som legges til (OV-U98), bruker det.
 */
import type { Korrespondansetype, Sendemaate } from '$kjerne/typer';
import type { Kjernevedlegg } from './nysak';
import { KORRESPONDANSEN, type Korrespondansehva } from './tekster';

export interface Korrespondansevalg {
  type: Korrespondansetype | null;
  /** Bare for et brev (OV-U79). */
  sendemaate: Sendemaate | null;
  dato: string;
  vedlegg: Kjernevedlegg[];
  beskrivelse: string;
}

export type Korrespondansefelt = keyof ReturnType<typeof KORRESPONDANSEN.mangler>;

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
  { dokument = true, hva = 'varsel' }: { dokument?: boolean; hva?: Korrespondansehva } = {}
): Partial<Record<Korrespondansefelt, string>> {
  const m = KORRESPONDANSEN.mangler(hva);
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

/** Feltene med tekst fra løsningen, som et krav lagt til ikke har (OV-U80, KA-U24). */
const KRAVTEKSTENE = ['utdypning', 'utdypninger', 'forbehold', 'varsel'] as const;

/**
 * Kommandoen fra krav-, svar- eller akseptskjemaet, lagt til med korrespondansen (OV-U80, OV-U98):
 * med datoen, typen, dokumentet og beskrivelsen, og uten teksten løsningen ellers skriver i brevet
 * (utdypningen, begrunnelsen og forbeholdet, KA-U24). Kjernen avviser det som mangler.
 */
export function lagtTil<K extends { type: 'krav' | 'brev' | 'revisjon' | 'aksept' }>(
  kommando: K,
  v: Korrespondansevalg
): K & ReturnType<typeof registreringen> {
  const ut: Record<string, unknown> = { ...kommando };
  if (kommando.type === 'krav') for (const felt of KRAVTEKSTENE) delete ut[felt];
  const utenTekst = (s: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(s).filter(([felt]) => felt !== 'utdypning' && felt !== 'utdypninger')
    );
  if (Array.isArray(ut.svar)) ut.svar = ut.svar.map(utenTekst);
  else if (kommando.type === 'revisjon' && ut.svar)
    ut.svar = utenTekst(ut.svar as Record<string, unknown>);
  return { ...ut, ...registreringen(v) } as K & ReturnType<typeof registreringen>;
}
