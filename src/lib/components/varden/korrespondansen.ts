/**
 * Korrespondansen sendt utenfor løsningen, slik den felles komponenten `Korrespondansen.svelte`
 * samler den: typen, datoen det ble sendt, sendemåten for et brev (U-1 i BF-49), dokumentet og beskrivelsen
 * (OV-U79, VS-U34, A1 i #2056). Varselet i skjemaet for ny sak, fristkravet og vederlagskravet, og
 * kravet, svaret og aksepten som legges til (OV-U98), bruker det.
 */
import type { TilbudtHandling } from '#kjerne/kommandoer/handlinger.ts';
import type { Varselposten } from '#kjerne/kommandoer/kommando.ts';
import type { Korrespondansetype, Part, Sendemaate, Spor, Varselhjemmel } from '#kjerne/typer.ts';
import type { Utledning } from '#kjerne/utledning/utled.ts';
import {
  KRAVTEKSTENE,
  SVARTEKSTENE,
  type Kjernesakkontekst,
} from '#lib/kjernesak/kontekst.svelte.ts';
import { definert } from './kommandoer';
import type { Kjernevedlegg, vedleggskart } from './nysak';
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
  /**
   * Dokumentasjonen fra samme side som korrespondansen legges til på nytt i stedet for (D-13 og
   * U-12 i BF-49, MM-U59 punkt 9).
   */
  retter?: string;
}

export type Korrespondansefelt = keyof ReturnType<typeof KORRESPONDANSEN.mangler>;

/** Feltene i komponenten, i rekkefølgen den viser dem. */
export const KORRESPONDANSEFELTENE = [
  'type',
  'dato',
  'sendemaate',
  'dokument',
  'beskrivelse',
] as const satisfies readonly Korrespondansefelt[];

/**
 * Nøkkelen for et felt i komponenten hos kalleren. ID-en for feltet og nøkkelen for feilen bygges
 * av den, så de to stemmer (punkt 2 i #2088). `post` skiller komponenten i hver post.
 */
export const korrespondansenoekkel = (navn: string, felt: Korrespondansefelt, post?: string) =>
  post === undefined ? `${navn}-${felt}` : `${navn}-${felt}-${post}`;

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

/** Det som mangler (`korrespondansemangler`), med nøkkelen for feltet hos kalleren. */
export const korrespondansefeilene = (
  v: Korrespondansevalg,
  navn: string,
  { post, ...valg }: Parameters<typeof korrespondansemangler>[1] & { post?: string } = {}
): [string, string][] => {
  const mangler = korrespondansemangler(v, valg);
  return KORRESPONDANSEFELTENE.flatMap((felt) => {
    const tekst = mangler[felt];
    return tekst === undefined ? [] : [[korrespondansenoekkel(navn, felt, post), tekst]];
  });
};

/**
 * Feltene kommandoen bærer for korrespondansen (OV-U79, LV-U45). Sendemåten følger bare et brev,
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
    ...(v.retter ? { retter: v.retter } : {}),
  };
}

const uten = (o: object, felt: readonly string[]) =>
  Object.fromEntries(Object.entries(o).filter(([f]) => !felt.includes(f)));

/**
 * Kommandoen fra krav-, svar- eller akseptskjemaet, lagt til med korrespondansen (OV-U80, OV-U98):
 * med datoen, typen, dokumentet og beskrivelsen, og uten teksten løsningen ellers skriver i brevet
 * (utdypningen, begrunnelsen og forbeholdet, OV-U80). Kjernen avviser det som mangler.
 */
export function lagtTil<K extends { type: 'krav' | 'brev' | 'aksept'; svar?: unknown }>(
  kommando: K,
  v: Korrespondansevalg
): K & ReturnType<typeof registreringen> {
  // G-2 i BF-49: feltene med tekst fra løsningen er kjernens lister.
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
  vedlegg: ReturnType<typeof vedleggskart> | undefined,
  annet: string
): Promise<string | null> {
  return (await kjernesak.send(kommando, undefined, vedlegg)) ? null : (kjernesak.feil ?? annet);
}

/** Et varsel parten har valgt i skjemaet, med feltene for bestemmelsen (U-5 i BF-49). */
export interface Varselvalg {
  hjemmel: Varselhjemmel;
  /** VS-U87 punkt 27: arbeidet varselet etter § 34.3.3 eller § 34.4 gjelder. */
  arbeid: string;
  /** VS-U86 punkt 12: datoen varselet etter § 34.1.3 oppga. */
  klarOver: string;
}

/** Det parten har fylt ut i skjemaet for korrespondanse lagt til (OV-U79, OV-U80). */
export interface Lagttilvalg {
  korrespondanse: Korrespondansevalg;
  /** Parten som sendte korrespondansen, uten forhåndsvalg (U-2 i BF-49). */
  avsender: Part | null;
  kategori: Korrespondansekategori | null;
  /** Sporene dokumentasjonen gjelder; tom gjelder saken (OV-U79). */
  spor: Spor[];
  /** Svaret aksepten gjelder. */
  svar: string | null;
  /** Varslene i korrespondansen, i flere spor (#2455, VS-U87). */
  varsler: Varselvalg[];
}

export const tomtLagtTil = (spor: Spor): Lagttilvalg => ({
  korrespondanse: tomKorrespondanse(),
  avsender: null,
  kategori: null,
  spor: [spor],
  svar: null,
  varsler: [],
});

/** VS-U87 punkt 27: varselet etter § 34.3.3 og § 34.4 har arbeidet det gjelder. */
export const harArbeid = (h: Varselhjemmel) => h === '34.3.3' || h === '34.4';

/**
 * Varselet slik kommandoen bærer det: arbeidet bare etter § 34.3.3 og § 34.4, og datoen bare
 * etter § 34.1.3 (`varselfeil` i kjernen).
 */
export const varselposten = (r: Pick<Varselvalg, 'hjemmel' | 'arbeid' | 'klarOver'>) =>
  definert({
    hjemmel: r.hjemmel,
    arbeid: harArbeid(r.hjemmel) ? r.arbeid.trim() || undefined : undefined,
    klar_over_utgiftene: r.hjemmel === '34.1.3' ? r.klarOver || undefined : undefined,
  }) as Varselposten;

/** Rekkefølgen varslene står i, som i prototypen (U-5 i BF-49). */
const VARSELREKKEFOELGEN: readonly Varselhjemmel[] = [
  '32.2',
  '33.4',
  '34.1.2',
  '34.1.3',
  '34.3.3',
  '34.4',
];

/** Varslene kjernen tilbyr for korrespondansen, i alle sporene (G-4 i BF-49, #2455). */
export const tilbudteVarsler = (tilbudte: readonly TilbudtHandling[]): Varselhjemmel[] =>
  VARSELREKKEFOELGEN.filter((h) => tilbudte.some((t) => t.type === 'varsle' && t.hjemmel === h));

/**
 * Kategoriene parten kan velge i sporet, fra handlingene kjernen tilbyr for korrespondansen med
 * datoen og avsenderen (G-1 i BF-49, `tilbudteLagtTil`). Korrespondanse motparten har sendt, er
 * bare dokumentasjon (D-1, U-3). Varselet står når kjernen tilbyr et varsel i et av sporene, så ett
 * brev kan ha varsler i flere spor (#2455). Kravet står i vederlaget og fristen, og svaret på
 * forholdet, til svarene og kravet i forholdet bygges (G-5 og G-8). I en sak kjernen ikke forstår,
 * er bare dokumentasjonen med (MM-U2).
 */
export function kategoriene(
  part: Part | null,
  avsender: Part | null,
  spor: Spor,
  u: Utledning,
  tilbudte: readonly TilbudtHandling[]
): Korrespondansekategori[] {
  if (!u.forstaatt || part === null || (avsender !== null && avsender !== part))
    return ['dokumentasjon'];
  const i = (type: TilbudtHandling['type']) =>
    tilbudte.some((t) => t.type === type && t.spor === spor);
  return [
    'dokumentasjon',
    ...(tilbudteVarsler(tilbudte).length ? (['varsel'] as const) : []),
    ...(spor !== 'forhold' && i('krav') ? (['krav'] as const) : []),
    ...(spor === 'forhold' && (i('svare') || i('revidere')) ? (['svar'] as const) : []),
    ...(i('godta') ? (['aksept'] as const) : []),
  ];
}

/** Det som mangler i skjemaet, felt for felt, med meldingen ved feltet. */
export function lagttilmangler(
  v: Lagttilvalg
): Partial<Record<Korrespondansefelt | 'avsender' | 'kategori' | 'svar' | 'varsler', string>> {
  return {
    ...korrespondansemangler(v.korrespondanse, { hva: 'korrespondanse' }),
    ...(v.avsender === null ? { avsender: LEGG_TIL.avsenderMangler } : {}),
    ...(v.kategori === null ? { kategori: LEGG_TIL.kategorienMangler } : {}),
    ...(v.kategori === 'aksept' && v.svar === null ? { svar: LEGG_TIL.svaretMangler } : {}),
    ...(v.kategori === 'varsel' && !v.varsler.length ? { varsler: LEGG_TIL.varsleneMangler } : {}),
  };
}

/**
 * Dokumentasjonen etter OV-U4 og OV-U79: ved sporene, eller saken uten spor. Avsenderen står bare
 * når den er motparten, så hver avsender har én form (AK 4 i `kjerne/tester/avsenderen.test.ts`).
 */
export function dokumentasjonen(v: Lagttilvalg, part: Part | null) {
  return {
    type: 'registrert_brev' as const,
    ...(v.spor.length ? { spor: [...v.spor] } : {}),
    ...registreringen(v.korrespondanse),
    ...(v.avsender && v.avsender !== part ? { avsender: v.avsender } : {}),
  };
}

/**
 * Varslene i korrespondansen i én kommando, også i flere spor (#2455, beslutningsdelen i VS-U87).
 * Kjernen avviser det den ikke godtar.
 */
export function varselet(v: Lagttilvalg) {
  const r = registreringen(v.korrespondanse);
  return {
    type: 'varsel' as const,
    varsler: VARSELREKKEFOELGEN.flatMap((h) => {
      const x = v.varsler.find((y) => y.hjemmel === h);
      return x ? [varselposten(x)] : [];
    }),
    ...r,
    korrespondansetype: r.korrespondansetype!,
  };
}
