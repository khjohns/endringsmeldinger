/**
 * Korrespondansen sendt utenfor løsningen, slik den felles komponenten `Korrespondansen.svelte`
 * samler den: typen, sendemåten for et brev, datoen det ble sendt, dokumentet og beskrivelsen
 * (OV-U79, VS-U34, A1 i #2056). Varselet i skjemaet for ny sak, fristkravet og vederlagskravet, og
 * kravet, svaret og aksepten som legges til (OV-U98), bruker det.
 */
import type { Korrespondansetype, Part, Sendemaate, Spor } from '$kjerne/typer';
import type { Utledning } from '$kjerne/utledning/utled';
import type { Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';
import type { Kjernevedlegg, vedleggskart } from './nysak';
import { svareneISporet } from './lesing';
import {
  KORRESPONDANSEN,
  LEGG_TIL,
  type Korrespondansehva,
  type Korrespondansekategori,
} from './tekster';

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

/** Feltene med tekst fra løsningen, som kravet og svaret lagt til ikke har (OV-U80, KA-U24). */
const KRAVTEKSTENE = ['utdypning', 'utdypninger', 'forbehold', 'varsel'];
const SVARTEKSTENE = ['utdypning', 'utdypninger'];
const uten = (o: object, felt: readonly string[]) =>
  Object.fromEntries(Object.entries(o).filter(([f]) => !felt.includes(f)));

/**
 * Kommandoen fra krav-, svar- eller akseptskjemaet, lagt til med korrespondansen (OV-U80, OV-U98):
 * med datoen, typen, dokumentet og beskrivelsen, og uten teksten løsningen ellers skriver i brevet
 * (utdypningen, begrunnelsen og forbeholdet, KA-U24). Kjernen avviser det som mangler.
 */
export function lagtTil<K extends { type: 'krav' | 'brev' | 'aksept'; svar?: unknown }>(
  kommando: K,
  v: Korrespondansevalg
): K & ReturnType<typeof registreringen> {
  const ut = kommando.type === 'krav' ? uten(kommando, KRAVTEKSTENE) : { ...kommando };
  if (Array.isArray(kommando.svar))
    ut.svar = kommando.svar.map((s: object) => uten(s, SVARTEKSTENE));
  return { ...ut, ...registreringen(v) } as K & ReturnType<typeof registreringen>;
}

/**
 * Sender kravet, svaret eller aksepten lagt til, uten brevtekst. `null` når serveren lagret det,
 * ellers det som hindret, fra kjernen eller serveren.
 */
export async function leggTilISaken(
  kjernesak: Kjernesakkontekst,
  kommando: Record<string, unknown>,
  vedlegg: ReturnType<typeof vedleggskart>,
  annet: string
): Promise<string | null> {
  return (await kjernesak.send(kommando, undefined, vedlegg)) ? null : (kjernesak.feil ?? annet);
}

/** Det parten har fylt ut i skjemaet for korrespondanse lagt til (OV-U79, OV-U80). */
export interface Lagttilvalg {
  korrespondanse: Korrespondansevalg;
  kategori: Korrespondansekategori | null;
  /** Sporene dokumentasjonen gjelder; tom gjelder saken (OV-U79). */
  spor: Spor[];
  /** Svaret aksepten gjelder. */
  svar: string | null;
}

export const tomtLagtTil = (spor: Spor): Lagttilvalg => ({
  korrespondanse: tomKorrespondanse(),
  kategori: null,
  spor: [spor],
  svar: null,
});

/**
 * Kategoriene parten kan velge i sporet (OV-U80, arbeidsvalget 16.11 i #807). Bare det parten selv
 * har sendt legges til, så valgene følger parten. Varselet åpner skjemaet for fristen når kjernen
 * tilbyr det, og kravet når kjernen tilbyr et krav i sporet. Svaret på forholdet og aksepten står
 * når sporet har noe å svare på eller godta. Kjernen avgjør resten når kommandoen sendes. I en sak
 * kjernen ikke forstår, er bare dokumentasjonen med (MM-U2).
 */
export function kategoriene(
  part: Part | null,
  spor: Spor,
  u: Utledning,
  handlinger: readonly string[]
): Korrespondansekategori[] {
  if (!u.forstaatt || part === null) return ['dokumentasjon'];
  const s = u.spor[spor];
  return [
    'dokumentasjon',
    ...(part === 'TE' && spor === 'frist' && handlinger.includes('varsle:frist')
      ? (['varsel'] as const)
      : []),
    ...(part === 'TE' && spor !== 'forhold' && handlinger.includes(`krav:${spor}`)
      ? (['krav'] as const)
      : []),
    ...(part === 'BH' && spor === 'forhold' && s.krav.length > 0 ? (['svar'] as const) : []),
    ...(part === 'TE' && svareneISporet(u, spor).length ? (['aksept'] as const) : []),
  ];
}

/** Det som mangler i skjemaet, felt for felt, med meldingen ved feltet. */
export function lagttilmangler(
  v: Lagttilvalg
): Partial<Record<Korrespondansefelt | 'kategori' | 'svar', string>> {
  return {
    ...korrespondansemangler(v.korrespondanse, { hva: 'korrespondanse' }),
    ...(v.kategori === null ? { kategori: LEGG_TIL.kategorienMangler } : {}),
    ...(v.kategori === 'aksept' && v.svar === null ? { svar: LEGG_TIL.svaretMangler } : {}),
  };
}

/** Dokumentasjonen etter OV-U4 og OV-U79: ved sporene, eller saken uten spor. */
export function dokumentasjonen(v: Lagttilvalg) {
  const r = registreringen(v.korrespondanse);
  return {
    type: 'registrert_brev' as const,
    ...(v.spor.length ? { spor: [...v.spor] } : {}),
    ...r,
  };
}
