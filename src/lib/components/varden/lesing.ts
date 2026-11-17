/**
 * Det Varden viser av saken, lest av kjernens utledning (#1331): brevene med sporene de
 * hører til, datoene partene har oppgitt, og standpunktene i et svar med laget kjernen
 * gir dem. Modulen avgjør ingenting selv. Hvilke handlinger som er mulige, hva et brev
 * sier og hva en aksept gir, kommer fra kjernen gjennom `lagKjernesak`.
 */

import { omtalen } from '$kjerne/frosset/brevdeler';
import { innholdIForholdet, oppgittDato } from '$kjerne/spor/forhold/format';
import {
  FORHOLDSGRUPPER,
  forholdet,
  forholdsordene,
  type Forholdsordene,
} from '$kjerne/spor/forhold/tekst';
import { grunnerFraForholdet } from '$kjerne/spor/forhold/frysing';
import { plassene } from '$kjerne/frosset/byggeklosser';
import { betegnelsen, innholdIFristen } from '$kjerne/spor/frist/format';
import { fasteBeloepIKravet, kravposterI, utenFastBeloep } from '$kjerne/spor/vederlag/format';
import { tilTall } from '$kjerne/regler/beloep';
import type { Subsidiaergrunn } from '$kjerne/regler/forhold';
import type { TilbudtHandling } from '$kjerne/kommandoer/handlinger';
import type {
  Avsnitt,
  Dokument,
  Krav,
  Part,
  Spor,
  Standpunkt,
  Svar,
  Utfall,
  Varselhjemmel,
} from '$kjerne/typer';
import type { Utledning } from '$kjerne/utledning/utled';
import type { Betegnelse } from '$kjerne/utledning/visning';
import { elementenesSpor, type Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';
import type { Fristdato } from '$lib/kjernesak/brevtekst';
import type { Snippet } from 'svelte';

/**
 * Ett brev i saken. `nummer` er brevets nummer i saken, som brevteksten kaller «brev 5»
 * (LV-U44), og `null` for et registrert brev uten nummer (LV-U45).
 */
export interface Brevet {
  id: string;
  nummer: number | null;
  avsender: Part;
  registrert: string;
  /**
   * Datoen avsenderen oppgir at et registrert brev ble sendt (OV-U85), og `null` for et brev
   * sendt herfra, der `registrert` er sendingen.
   */
  sendt: string | null;
  spor: Spor[];
  art: 'krav' | 'svar' | 'aksept' | 'trekk' | 'innsigelse' | 'varsel' | 'registrert' | 'annet';
  /** Kjernens kode for forholdet et krav i forholdssporet påberoper, ellers `null`. */
  forhold: string | null;
  /** Vår ref., merkingen som ble frosset med brevet (LV-U53, LV-U24), eller `null`. */
  merking: string | null;
  /** Deres ref. som ble frosset med brevet (LV-U27, LV-U49), tom når det ikke har noen. */
  deresRef: string[];
  /**
   * Omtalen av brevet slik brevteksten gir den: «brev K201-KOE-017-03 av 2. oktober 2026», eller
   * «totalentreprenørens e-post av …» for registrert korrespondanse (LV-U53, LV-U42).
   */
  omtale: string | null;
  /** Tittelen som ble frosset med brevet (MM-U3, MM-U50), eller `null` når brevet ikke har en. */
  brevtittel: string | null;
  /** Teksten slik den ble frosset da brevet ble skrevet; `null` for et registrert brev (MM-U17, MM-U50). */
  avsnitt: Avsnitt[] | null;
  /** Beskrivelsen den som la brevet til, oppga (OV-U16, OV-U79), og `null` for et brev sendt herfra. */
  beskrivelse: string | null;
  /** Filnavnene på vedleggene brevet binder, i brevets rekkefølge (LV-U14). */
  vedlegg: string[];
}

/** OV-U85: datoen parten oppga at dokumentet ble sendt, ikke datoen for et varsel i det (HF-U1). */
function sendtDato(d: Dokument): string | null {
  for (const o of d.opplysninger) if (o.hva === 'sendt' && o.gjelder === undefined) return o.dato;
  return null;
}

function artAv(d: Dokument): Brevet['art'] {
  if (d.brevtekst === null) return 'registrert';
  if (d.svar.length) return 'svar';
  if (d.krav.length) return 'krav';
  const u = d.utsagn.find((x) => ['aksept', 'trekk', 'innsigelse', 'varsel'].includes(x.art));
  return (u?.art as Brevet['art']) ?? 'annet';
}

const brevenePerUtledning = new WeakMap<Utledning, Brevet[]>();

/**
 * Brevene i saken i rekkefølgen i journalen, lest én gang per utledning og delt av alle
 * kallerne (#2000).
 */
export function brevene(u: Utledning): Brevet[] {
  const lest = brevenePerUtledning.get(u);
  if (lest) return lest;
  // Frosset, også brevene og listene i dem, så en kaller som endrer noe, feiler i stedet for å
  // endre det for de andre.
  const brev = Object.freeze(
    lesBrevene(u).map((b) =>
      Object.freeze({
        ...b,
        spor: Object.freeze(b.spor),
        avsnitt: b.avsnitt && Object.freeze([...b.avsnitt]),
        vedlegg: Object.freeze(b.vedlegg),
      })
    )
  ) as Brevet[];
  brevenePerUtledning.set(u, brev);
  return brev;
}

function lesBrevene(u: Utledning): Brevet[] {
  const spor = elementenesSpor(u);
  return u.journal.flatMap((h) => {
    if (h.art !== 'dokument') return [];
    const d = h.dokument;
    const i = new Set<Spor>([
      ...d.spor,
      ...d.krav.map((k) => k.spor),
      ...d.svar.map((s) => s.spor),
      // Et varsel har sporet selv, som et varsel for en kravpost (VS-U53).
      ...d.utsagn.flatMap((x) => {
        const s = ('gjelder' in x ? spor.get(x.gjelder) : undefined) ?? spor.get(x.id);
        return s ? [s] : [];
      }),
    ]);
    return [
      {
        id: d.id,
        nummer: d.brevnummer,
        avsender: d.avsender,
        registrert: d.registrert,
        sendt: sendtDato(d),
        spor: [...i],
        art: artAv(d),
        forhold: innholdIForholdet(d.krav.find((k) => k.spor === 'forhold')).underkategori,
        merking: d.merking,
        deresRef: d.deresRef,
        omtale: omtalen(d),
        brevtittel: d.brevtittel,
        avsnitt: d.brevtekst,
        // OV-U79: også et varsel, krav eller svar lagt til har beskrivelsen (krav fra #2074 i #807).
        beskrivelse: d.beskrivelse,
        vedlegg: d.dokumentasjon.map((v) => v.filnavn),
      },
    ];
  });
}

/**
 * Brevene i tråden på siden for sporet, i rekkefølgen i journalen: alle brevene i saken på siden
 * for forholdet, og brevene i sporet på siden for et krav (oppdragsgiver 13.11, #1898).
 */
export const brevITraaden = (brev: Brevet[], spor: Spor): Brevet[] =>
  spor === 'forhold' ? brev : brev.filter((b) => b.spor.includes(spor));

/**
 * Brevet med neste versjon av kravet i samme spor, etter ID-en til brevet med den tidligere
 * versjonen. Tråden viser et eldre krav dempet med «fulgt opp i brev 5» (U-5 i BF-44).
 */
/**
 * Hvert krav i sporet som et senere krav i et annet brev følger opp, med brevet som følger opp
 * (U-5 i BF-44).
 */
function oppfoelgingeneISporet(u: Utledning, spor: Spor, brev: Map<string, Brevet>) {
  const krav = u.spor[spor].krav;
  return krav.slice(0, -1).flatMap((k, i) => {
    const neste = brev.get(krav[i + 1].dokument);
    return neste && k.dokument !== neste.id ? [{ dokument: k.dokument, neste }] : [];
  });
}

export function oppfoelgingene(u: Utledning, alle: Brevet[]): Map<string, Brevref> {
  const brev = new Map(alle.map((b) => [b.id, b]));
  const SPORENE = ['forhold', 'vederlag', 'frist'] as const;
  // Et brev med et krav som gjelder i et annet spor, er ikke fulgt opp som helhet.
  const gjelder = new Set(SPORENE.flatMap((s) => u.spor[s].gjeldendeKrav?.dokument ?? []));
  const ut = new Map<string, Brevref>();
  for (const s of SPORENE)
    for (const { dokument, neste } of oppfoelgingeneISporet(u, s, brev))
      if (!gjelder.has(dokument)) ut.set(dokument, ref(neste));
  return ut;
}

/**
 * Brevene med et krav et senere krav i sporet følger opp, også når brevet har et krav som
 * gjelder i et annet spor og derfor ikke er fulgt opp som helhet (`oppfoelgingene`, U-5 i BF-44).
 */
export function eldreKravISporet(u: Utledning, spor: Spor, alle: Brevet[]): Set<string> {
  const brev = new Map(alle.map((b) => [b.id, b]));
  return new Set(oppfoelgingeneISporet(u, spor, brev).map((o) => o.dokument));
}

/** Det en tekst trenger for å vise til et brev, med eller uten nummer. */
export type Brevref = Pick<Brevet, 'id' | 'nummer' | 'registrert' | 'omtale' | 'art'>;

const ref = ({ id, nummer, registrert, omtale, art }: Brevref): Brevref => ({
  id,
  nummer,
  registrert,
  omtale,
  art,
});

/** Brevet med dokumentet `id`. */
export const brevet = (u: Utledning, id: string) => brevene(u).find((b) => b.id === id) ?? null;

const elementenePerUtledning = new WeakMap<Utledning, Map<string, Brevet>>();

/** Brevet med kravet, svaret eller utsagnet `id`, slått opp én gang per utledning. */
export function brevMedElement(u: Utledning, id: string): Brevet | null {
  let kart = elementenePerUtledning.get(u);
  if (!kart) {
    kart = new Map();
    for (const h of u.journal) {
      if (h.art !== 'dokument') continue;
      const b = brevet(u, h.dokument.id);
      if (!b) continue;
      for (const x of [...h.dokument.krav, ...h.dokument.svar, ...h.dokument.utsagn])
        kart.set(x.id, b);
    }
    elementenePerUtledning.set(u, kart);
  }
  return kart.get(id) ?? null;
}

/** Brevet utsagnet `id` står i, som forespørselen etter § 33.6.2. */
export const brevMedUtsagn = brevMedElement;

/** Byggherrens svar i sporet, også dem utenfor rekken (OV-U103). */
export const svareneISporet = (u: Utledning, spor: Spor) => [
  ...u.spor[spor].svar,
  ...u.spor[spor].svarUtenforRekken,
];

/**
 * OV-U104: brevene i saken et brev lagt til er sendt samme dag som, slik kjernen sammenlikner dem
 * i utledningen `etter` med brevet, og ikke i `foer`. Løsningen kjenner ikke rekkefølgen.
 */
export function sendtSammeDagSom(foer: Utledning, etter: Utledning): Brevet[] {
  // Paret er det samme uansett hvilket element kjernen nevner først.
  const par = (x: { element: string; med: string }) => [x.element, x.med].sort().join(' ');
  const kjent = new Set(foer.sendtSammeDag.map(par));
  const ut = new Map<string, Brevet>();
  for (const x of etter.sendtSammeDag) {
    if (kjent.has(par(x))) continue;
    // Elementet i det nye brevet er det som ikke fantes før; det andre er brevet i saken.
    const iSaken = brevMedElement(foer, x.med) ?? brevMedElement(foer, x.element);
    if (iSaken) ut.set(iSaken.id, iSaken);
  }
  return [...ut.values()];
}

/**
 * OV-U104: brevene i saken kjernen har sammenliknet med et annet brev sendt samme dag, med de
 * andre brevene for hvert. Løsningen kjenner ikke rekkefølgen.
 */
const sammeDagPerUtledning = new WeakMap<Utledning, Map<string, Brevet[]>>();

export function sendtSammeDag(u: Utledning): Map<string, Brevet[]> {
  const lest = sammeDagPerUtledning.get(u);
  if (lest) return lest;
  const ut = new Map<string, Brevet[]>();
  sammeDagPerUtledning.set(u, ut);
  const legg = (a: Brevet, b: Brevet) => {
    const liste = ut.get(a.id) ?? [];
    if (!liste.some((x) => x.id === b.id)) ut.set(a.id, [...liste, b]);
  };
  for (const x of u.sendtSammeDag) {
    const a = brevMedElement(u, x.element);
    const b = brevMedElement(u, x.med);
    if (a && b && a.id !== b.id) {
      legg(a, b);
      legg(b, a);
    }
  }
  return ut;
}

/** En dato en part har oppgitt i et brev, med brevet den står i. */
export interface OppgittDato {
  dato: string;
  hva: 'paalegg_mottatt' | 'klar_over_forholdet' | 'sendt' | 'mottatt';
  oppgittAv: Part;
  brev: Brevref;
  spor: Spor[];
}

/**
 * Datoene partene har oppgitt: når TE mottok pålegget eller ble klar over forholdet
 * (påberopelsen og korrigeringene, `datoopplysninger` i utledningen, MM-U55 punkt 10) og når et
 * dokument ble sendt eller mottatt (opplysningene). Løsningen vurderer dem ikke (MM-U12, MM-U50).
 */
export function oppgitteDatoer(u: Utledning): OppgittDato[] {
  const brev = new Map(brevene(u).map((b) => [b.id, b]));
  const ut: OppgittDato[] = [];
  for (const o of u.datoopplysninger) {
    const b = brev.get(o.dokument);
    if (b) ut.push({ dato: o.dato, hva: o.felt, oppgittAv: 'TE', brev: ref(b), spor: ['forhold'] });
  }
  for (const { opplysning: o } of u.opplysninger) {
    const b = brev.get(o.dokument);
    if ((o.hva === 'sendt' || o.hva === 'mottatt') && b)
      ut.push({ dato: o.dato, hva: o.hva, oppgittAv: o.oppgittAv, brev: ref(b), spor: b.spor });
  }
  return ut;
}

/**
 * Datoene som hører til sporet: de oppgitt i sporet, og i vederlaget også datoen i
 * grunnlagskravet, som varselet etter § 34.1.2 regnes fra. Lesingen og svarskjemaet viser de
 * samme (#1393).
 */
export const datoerISporet = (u: Utledning, spor: Spor) =>
  oppgitteDatoer(u).filter(
    (d) => d.spor.includes(spor) || (spor === 'vederlag' && d.spor.includes('forhold'))
  );

/** TEs siste opplysning om når TE ble klar over forholdet (MM-U55 punkt 10). */
export function klarOverForholdet(u: Utledning): OppgittDato | null {
  return oppgitteDatoer(u).findLast((d) => d.hva === 'klar_over_forholdet') ?? null;
}

/** TEs opplysning om datoen etter VS-U26, i påberopelsen eller en korrigering (MM-U55 punkt 10). */
export interface Datoopplysningen {
  /** Påberopelsen eller korrigeringen med opplysningen, som handlingen `korrigere:<id>` viser til. */
  id: string;
  hva: 'paalegg_mottatt' | 'klar_over_forholdet';
  dato: string;
  brev: Brevref;
  korrigering: boolean;
  /** Opplysningen før denne i samme felt, som en korrigering viser til. */
  forrige: Datoopplysningen | null;
  /** TEs siste opplysning i feltet. */
  siste: boolean;
  /** Brevet med korrigeringen av denne opplysningen, `null` for den siste. */
  korrigertI: Brevref | null;
}

/** TEs opplysninger om datoen i rekkefølgen i journalen, med brevene de står i. */
export function datoopplysningene(u: Utledning): Datoopplysningen[] {
  const brev = new Map(brevene(u).map((b) => [b.id, b]));
  const ut: Datoopplysningen[] = [];
  for (const o of u.datoopplysninger) {
    const b = brev.get(o.dokument);
    if (!b) continue;
    const forrige = ut.findLast((x) => x.hva === o.felt) ?? null;
    if (forrige) {
      forrige.siste = false;
      forrige.korrigertI = ref(b);
    }
    ut.push({
      id: o.id,
      hva: o.felt,
      dato: o.dato,
      brev: ref(b),
      korrigering: o.korrigering,
      forrige,
      siste: true,
      korrigertI: null,
    });
  }
  return ut;
}

/**
 * Én linje i et svar, med etiketten for laget den står i når svaret har flere lag: en grunn
 * fra svaret på forholdet brevet hadde foran seg, med brevet det står i, eller et standpunkt i
 * svaret.
 */
export type Standpunktet = { lag: string | null } & (
  | { grunn: Subsidiaergrunn; brev: Brevref }
  | { standpunkt: Standpunkt }
);

/**
 * Linjene i svaret `svar` i brevets rekkefølge, med laget brevet ga dem (OV-U32). Grunnene
 * fra svaret på forholdet brevet hadde foran seg står først, ett lag hver (OV-U33,
 * `Svarberegning.forholdssvaret`). Et svar på forholdet revidert etter brevet endrer ikke det
 * brevet sa. `u` er saken med svaret, for et utkast forhåndsvisningen.
 */
export function standpunktene(svar: Svar, u: Utledning): Standpunktet[] {
  const beregning = u.svar[svar.id];
  if (!beregning) throw new Error(`Svaret ${svar.id} er ikke i saken`);
  const g = beregning.forholdssvaret === null ? null : u.svar[beregning.forholdssvaret].svar;
  const grunner = g ? grunnerFraForholdet(g, g.beslutningsgrunnlag.virkninger) : [];
  const plass = plassene(svar, svar.beslutningsgrunnlag.virkninger, grunner.length);
  return [
    ...grunner.map((grunn, i) => ({
      grunn,
      brev: ref(brevet(u, g!.dokument)!),
      lag: plass.grunn(i).etikett,
    })),
    // KA-U72: standpunktet til beløpet uten beløp, når tilbudet ikke er akseptert, vises ikke.
    ...svar.standpunkter
      .filter((s) => !(s.art === 'beloep' && s.godkjent === undefined))
      .map((s) => ({ standpunkt: s, lag: plass.standpunkt(s.id).etikett })),
  ];
}

/**
 * Brevet linja for sporet viser til: siste brev i sporet, eller, når sporet er trukket, det
 * siste trekket i sporet selv eller av påberopelsen. Trekket av påberopelsen trekker kravene som
 * bygger på den (GR-U5), men brevet hører til forholdet, så siste brev i kravsporet er et annet.
 */
export const brevForLinja = (brev: Brevet[], spor: Spor, trukket: boolean): Brevet | undefined =>
  (trukket
    ? brev.findLast(
        (b) => b.art === 'trekk' && (b.spor.includes(spor) || b.spor.includes('forhold'))
      )
    : undefined) ?? brev.filter((b) => b.spor.includes(spor)).at(-1);

/** Hovedkategorien (§ 33.1 a–c, § 33.3) i gjeldende krav i forholdet, eller `null` uten krav. */
export function hovedkategorien(u: Utledning): string | null {
  return innholdIForholdet(u.spor.forhold.gjeldendeKrav).hovedkategori;
}

/**
 * Forholdet TE påberoper i gjeldende krav, med gruppen fra kjernens liste (OV-U77, OV-U78).
 * Uten krav, eller med en kode lista ikke har, er begge `null`.
 */
export function forholdetISaken(u: Utledning): { navn: string; gruppe: string } | null {
  const f = forholdet(innholdIForholdet(u.spor.forhold.gjeldendeKrav).underkategori);
  const g = f && FORHOLDSGRUPPER.find((x) => x.forhold.some((y) => y.kode === f.kode));
  return f && g ? { navn: f.navn, gruppe: g.navn } : null;
}

/** Varslene Varden har tekst for. Varslene etter § 34.3.3 og § 34.4 kommer i økt 3 (G-8 i BF-14). */
const VARSLENE_I_VARDEN: readonly Varselhjemmel[] = ['33.4', '34.1.2', '34.1.3'];

/**
 * Handlingene kjernen tilbyr i sporet, med sporet kjernen gir hver av dem. Saken som helhet
 * (`registrere_brev`) hører ikke til et spor.
 */
export function handlingerISporet(tilbudt: TilbudtHandling[], spor: Spor): TilbudtHandling[] {
  return tilbudt.filter(
    (h) => h.spor === spor && (h.hjemmel === null || VARSLENE_I_VARDEN.includes(h.hjemmel))
  );
}

/**
 * Betegnelsen i MM-U30 for hvert spor, slik lesepunktet har utledet den i saksbildet. Visningen
 * kaller ikke utledningen i kjernen selv (lesepunktvakten i `lesepunkter.test.ts`).
 */
export const betegnelsene = (
  bilde: Kjernesakkontekst['saksbilde']
): Record<Spor, Betegnelse | null> => {
  const kode = (spor: Spor) =>
    (bilde?.spor.find((s) => s.spor === spor)?.betegnelse?.kode ?? null) as Betegnelse | null;
  return { forhold: kode('forhold'), vederlag: kode('vederlag'), frist: kode('frist') };
};

/** Fristtabellen og sakene i prosjektet, som gjeldende frist regnes av (KA-U77, BF-45 U-5). */
export interface Fristtabellen {
  datoer: readonly Fristdato[];
  /** Saken siden viser, som forlengelsene i den ikke regnes med i (KA-U77). */
  sakId: string;
  /** Sakene kjernen ikke forstår, som kan ha forlenget en frist (MM-U2). */
  ikkeForstaatt: readonly string[];
  /** Lenken til en annen sak i prosjektet. */
  sakslenke?: (sakId: string) => string;
}

/** Fristtabellen for saken `kjernesak`, som siden for fristen og kravskjemaet regner gjeldende frist av. */
export const fristtabellen = (
  kjernesak: Kjernesakkontekst,
  sakslenke?: (sakId: string) => string
): Fristtabellen => ({
  datoer: kjernesak.fristdatoer,
  sakId: kjernesak.sakId,
  ikkeForstaatt: kjernesak.sakerIkkeForstaatt,
  sakslenke,
});

/** Det sidene for forholdet, vederlaget og fristen får fra `Sporlesing` (oppsett B, #1997). */
export interface Sideprops {
  u: Utledning;
  /** Betegnelsen i MM-U30 for hvert spor, fra saksbildet (`betegnelsene`). */
  betegnelser: Record<Spor, Betegnelse | null>;
  /** Fristtabellen, til siden for fristen. */
  fristtabell?: Fristtabellen;
  /** Opplysningene om datoen TE kan korrigere (`korrigere:<id>`), til siden for forholdet. */
  korrigerbare?: string[];
  /** Brevet som vises ved siden av tråden, eller i raden når `smal`. */
  vist?: string | null;
  /** Under 1181 px står brevet i raden, ikke i høyre kolonne (U-16 i BF-44). */
  smal?: boolean;
  onles: (id: string) => void;
  /** Brukeren går til et annet spor, som forholdet fra forbeholdet. */
  onspor?: (spor: Spor) => void;
  onkorriger?: (opplysning: string) => void;
  /** Brevet handlingen svarer på (U-16 i BF-44). */
  handlingVed?: string | null;
  handling?: Snippet;
  /** Brevet slik det ble sendt, i raden. */
  brevet?: Snippet<[Brevet]>;
  /** Leveringen av brevene sendt herfra til Catenda (`leveringene`). */
  levering?: ReadonlyMap<string, string | null>;
}

/**
 * Når hvert brev sendt herfra ble levert til Catenda, etter brevets ID, og `null` før leveringen
 * er kvittert (G-5 i BF-44). Kvitteringen kommer etter at vedleggene er levert
 * (`server/jobber.ts`). Et brev uten leveringsoppdrag, som i demoruta, står ikke i lista, og
 * heller ikke et registrert brev, som ikke har noe dokument og ikke får `levert` (#2026).
 */
export const leveringene = (
  oppdrag: readonly { event_id: string; filnavn: string | null; levert: string | null }[]
): ReadonlyMap<string, string | null> =>
  new Map(oppdrag.flatMap((o) => (o.filnavn === null ? [] : [[o.event_id, o.levert] as const])));

/**
 * Innholdet i et brev i tråden om forholdet, som i prototypen `grunnlagsoversikt.html`: TEs
 * beskrivelse, som står som utdypningen under kravet i brevteksten (`brevtekst.ts`), og datoen
 * TE oppgir; byggherrens standpunkter med lagene brevet ga dem (OV-U32), og begrunnelsen.
 */
export interface Innlegget {
  /** «Pålegget» for en irregulær endring, ellers «forholdet». */
  gjelderPaalegg: boolean;
  utdypning: string | null;
  oppgitt: { hva: 'paalegg_mottatt' | 'klar_over_forholdet'; dato: string } | null;
  /** TEs opplysning om datoen i brevet, i påberopelsen eller en korrigering (G-7 i BF-02A). */
  opplysning: Datoopplysningen | null;
  /**
   * I et svar: TEs siste opplysning om datoen da svaret ble sendt, når TE har korrigert den
   * senere (designdelen i MM-U55, U-5 i BF-02A).
   */
  sisteOpplysningVedSvaret: Datoopplysningen | null;
  /** Standpunktene med laget, og brevet med varselet en påberopelse av sen varsling gjelder. */
  standpunkter: {
    standpunkt: Standpunkt;
    lag: string | null;
    brev: Brevref | null;
    ordene: Forholdsordene;
  }[];
}

/** Det som avgjør kontraktens ord for byggherrens standpunkt til forholdet i svaret. */
function forholdsordeneISvaret(svar: Svar, u: Utledning): Forholdsordene {
  const krav = u.spor.forhold.krav.find((k) => k.id === svar.gjelder);
  if (!krav) throw new Error(`Påberopelsen ${svar.gjelder} som svaret gjelder, er ikke i saken`);
  return forholdsordene(svar.beslutningsgrunnlag, krav);
}

/** Innholdet i brevene om forholdet, etter brevets ID. Brev uten krav eller svar har ingen. */
export function innleggene(u: Utledning): Map<string, Innlegget> {
  const alle = brevene(u);
  const brev = new Map(alle.map((b) => [b.id, b]));
  // Byggherrens begrunnelse står per punkt i svaret (KA-U46, LV-U70), i rekkefølgen i brevet.
  const utdypning = (dokument: string, gjelder: string) =>
    (brev.get(dokument)?.avsnitt ?? [])
      .filter((a) => a.gjelder === gjelder)
      .flatMap((a) => a.utdypning?.trim() || [])
      .join('\n\n') || null;
  const kravbrev = new Map(u.spor.forhold.krav.map((k) => [k.id, brev.get(k.dokument)]));
  const opplysningene = datoopplysningene(u);
  const iBrevet = (dokument: string) =>
    opplysningene.findLast((o) => o.brev.id === dokument) ?? null;
  const oppgitt = (o: Datoopplysningen | null) => (o ? { hva: o.hva, dato: o.dato } : null);
  /** TE har korrigert datoen i feltet etter opplysningen, ikke bare gjentatt den (U-5 i BF-02A). */
  const korrigertSenere = (o: Datoopplysningen) =>
    opplysningene.slice(opplysningene.indexOf(o) + 1).some((x) => x.hva === o.hva && x.korrigering);
  const ut = new Map<string, Innlegget>();
  for (const k of u.spor.forhold.krav) {
    const innhold = innholdIForholdet(k);
    const kode = innhold.underkategori;
    const o = iBrevet(k.dokument);
    // En ny versjon som gjengir TEs siste opplysning, er ingen ny opplysning i utledningen, men
    // brevet sier datoen (MM-U55 punkt 10, #1647).
    const felt = oppgittDato(innhold.hovedkategori, innhold.underkategori);
    const gjentatt = felt === null ? null : innhold.datoer[felt];
    ut.set(k.dokument, {
      gjelderPaalegg: kode === 'irregulaer_endring',
      utdypning: utdypning(k.dokument, k.id),
      oppgitt:
        oppgitt(o) ?? (felt !== null && gjentatt !== null ? { hva: felt, dato: gjentatt } : null),
      opplysning: o,
      sisteOpplysningVedSvaret: null,
      standpunkter: [],
    });
  }
  for (const o of opplysningene.filter((x) => x.korrigering))
    ut.set(o.brev.id, {
      gjelderPaalegg: o.hva === 'paalegg_mottatt',
      utdypning: utdypning(o.brev.id, o.id),
      oppgitt: oppgitt(o),
      opplysning: o,
      sisteOpplysningVedSvaret: null,
      standpunkter: [],
    });
  for (const s of u.spor.forhold.svar) {
    const ordene = forholdsordeneISvaret(s, u);
    const daSvaretBleSendt = opplysningene.find((o) => o.id === u.svar[s.id]?.datoopplysning);
    ut.set(s.dokument, {
      gjelderPaalegg: false,
      utdypning: utdypning(s.dokument, s.id),
      oppgitt: null,
      opplysning: null,
      sisteOpplysningVedSvaret:
        daSvaretBleSendt && korrigertSenere(daSvaretBleSendt) ? daSvaretBleSendt : null,
      // Svaret på forholdet har ingen grunner fra et annet svar foran seg (OV-U33).
      standpunkter: standpunktene(s, u).flatMap((l) => {
        if (!('standpunkt' in l)) return [];
        const g = 'gjelder' in l.standpunkt ? l.standpunkt.gjelder : undefined;
        const b = g ? kravbrev.get(g) : undefined;
        return [{ standpunkt: l.standpunkt, lag: l.lag, brev: b ? ref(b) : null, ordene }];
      }),
    });
  }
  return ut;
}

/**
 * Et krav om vederlagsjustering eller fristforlengelse i «Tilknyttede krav», som i prototypen
 * `grunnlagsoversikt.html`: det TE krevde i gjeldende kravversjon, beløpene eller dagene i
 * byggherrens gjeldende svar med lagene (`standpunktene`), og hvorfor svaret er subsidiært til
 * forholdet (`subsidiaer`, vedtaket 05.10).
 */
export interface TilknyttetKrav {
  spor: 'vederlag' | 'frist';
  /**
   * Summen av de faste beløpene i kroner, eller dagene, og `null` når ingen post har et fast
   * beløp. `utenFast` er antallet kravposter etter en beregningsregel, som ikke har et krevd
   * beløp (KA-U61).
   */
  krevd: { tall: number | null; utenFast: number; brev: Brevref } | null;
  /**
   * `poster` er summen av beløpene, eller dagene, i hvert lag, i lagenes rekkefølge. `utenFast`
   * er antallet kravposter svaret ikke har et beløp for: tilbudet er ikke akseptert (KA-U72), eller
   * posten er etter en beregningsregel (KA-U61). Det leses av standpunktene i brevet.
   */
  svaret: {
    poster: { tall: number; lag: string | null }[];
    utenFast: number;
    brev: Brevref;
  } | null;
  /**
   * Fristene i kravet når det har flere enn én, hver med betegnelsen i kontrakten, dagene TE
   * krevde og dagene i byggherrens svar i hvert lag (KA-U74). Dagene legges ikke sammen, så da er
   * `krevd.tall` `null` og `svaret.poster` tom. Tom for vederlaget og for én frist.
   */
  frister: Fristen[];
  grunner: Subsidiaergrunn[];
}

/** Én frist i «Tilknyttede krav». `svaret` er tom når svaret ikke har dagene for fristen. */
export interface Fristen {
  id: string;
  betegnelse: string;
  krevd: number;
  svaret: { tall: number; lag: string | null }[];
}

/**
 * Betegnelsene på kravpostene utfallet sier ikke har fast beløp prinsipalt (OV-U73, svar 6 A
 * i #1663), slått opp i kravversjonene i sporet, siden svaret kan gjelde en tidligere versjon
 * enn den gjeldende. En kravpost som ikke finnes, står med id.
 */
export function kravposterUtenFastBeloep(utfall: Utfall, krav: readonly Krav[]): string[] {
  const poster = krav.flatMap((k) => kravposterI(k));
  return (utfall.uten_fast_beloep ?? []).map(
    (id) => poster.find((p) => p.id === id)?.betegnelse ?? id
  );
}

/** Summen av tallene med samme lag, i rekkefølgen lagene først står i. Summeres i øre. */
function summertPerLag(poster: { tall: number; lag: string | null }[]) {
  const oere = new Map<string | null, number>();
  for (const p of poster) oere.set(p.lag, (oere.get(p.lag) ?? 0) + Math.round(p.tall * 100));
  return [...oere].map(([lag, o]) => ({ tall: o / 100, lag }));
}

export function tilknyttetKrav(u: Utledning, spor: 'vederlag' | 'frist'): TilknyttetKrav {
  const s = u.spor[spor];
  const krav = s.gjeldendeKrav;
  const kravbrev = krav && brevet(u, krav.dokument);
  const svar = s.gjeldendeSvar;
  const svarbrev = svar && brevet(u, svar.dokument);
  // En kravpost etter en beregningsregel har ikke et krevd beløp (KA-U61). Summen er de faste
  // beløpene, og visningen sier hvor mange poster som ikke har et fast beløp (#1752).
  const fastKrevd = krav && spor === 'vederlag' ? fasteBeloepIKravet(krav) : null;
  const linjene = svar && svarbrev ? standpunktene(svar, u) : [];
  // KA-U74: dagene står per frist og legges ikke sammen. Med én frist står dagene for den som
  // tallet for kravet og svaret, og med flere står de per frist i `frister`.
  const alle = (krav && spor === 'frist' ? innholdIFristen(krav).frister : []).map((f) => ({
    id: f.id,
    betegnelse: betegnelsen(f),
    krevd: f.dager,
  }));
  const enFrist = alle.length === 1;
  const dageneFor = (id: string) =>
    linjene.flatMap((l) =>
      'standpunkt' in l && l.standpunkt.art === 'dager' && l.standpunkt.gjelder === id
        ? [{ tall: l.standpunkt.vurdert, lag: l.lag }]
        : []
    );
  return {
    spor,
    krevd:
      krav && kravbrev
        ? {
            tall: fastKrevd
              ? fastKrevd.sum === null
                ? null
                : tilTall(fastKrevd.sum)
              : enFrist
                ? alle[0]!.krevd
                : null,
            utenFast: fastKrevd?.utenFastBeloep ?? 0,
            brev: ref(kravbrev),
          }
        : null,
    svaret:
      svar && svarbrev
        ? {
            poster: enFrist
              ? summertPerLag(dageneFor(alle[0]!.id))
              : summertPerLag(
                  linjene.flatMap((l) =>
                    'standpunkt' in l && l.standpunkt.art === 'beloep'
                      ? [{ tall: l.standpunkt.godkjent!, lag: l.lag }]
                      : []
                  )
                ),
            utenFast: spor === 'vederlag' ? utenFastBeloep(svar.standpunkter).size : 0,
            brev: ref(svarbrev),
          }
        : null,
    frister: alle.length > 1 ? alle.map((f) => ({ ...f, svaret: dageneFor(f.id) })) : [],
    grunner: s.subsidiaer,
  };
}

/**
 * Avsnittene i et punkt i brevet, uten overskriften, som står først i den låste delen. Står den
 * ikke først, står hele den låste delen, så ingen tekst faller bort (#1824).
 */
export const underOverskriften = (a: Pick<Avsnitt, 'laast' | 'overskrift'>): string[] =>
  (a.overskrift && a.laast.startsWith(a.overskrift)
    ? a.laast.slice(a.overskrift.length).trimStart()
    : a.laast
  )
    .split('\n\n')
    .filter((del) => del !== '');
