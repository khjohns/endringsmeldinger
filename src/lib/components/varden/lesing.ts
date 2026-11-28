import { innsigelsenIFristen } from '#kjerne/spor/frist/format.ts';
import { innsigelsenIVederlaget } from '#kjerne/spor/vederlag/format.ts';
import { BREVTEKSTEN_I_VEDERLAGET } from '#kjerne/spor/vederlag/tekst.ts';
import { lageneISvaret, vilkaaretFor, type Innsigelsen, type Vilkaaret } from './svarlagene';
import { kravetOgSvaretIFristen } from './fristoversikt';
import { kravetOgSvaret } from './vederlagsoversikt';

/**
 * Det Varden viser av saken, lest av kjernens utledning (#1331): brevene med sporene de
 * hører til, datoene partene har oppgitt, og standpunktene i et svar med laget kjernen
 * gir dem. Modulen avgjør ingenting selv. Hvilke handlinger som er mulige, hva et brev
 * sier og hva en aksept gir, kommer fra kjernen gjennom `lagKjernesak`.
 */

import { omtalen } from '#kjerne/frosset/brevdeler.ts';
import { svaretGjelder } from '#kjerne/frosset/brevtittel.ts';
import {
  innholdIForholdet,
  innsigelsenIForholdet,
  oppgittDato,
} from '#kjerne/spor/forhold/format.ts';
import {
  FORHOLDSGRUPPER,
  forholdet,
  forholdsordene,
  type Forholdsordene,
} from '#kjerne/spor/forhold/tekst.ts';
import { grunnerFraForholdet } from '#kjerne/spor/forhold/frysing.ts';
import { plassene } from '#kjerne/frosset/byggeklosser.ts';
import { datoForDokumentet } from '#kjerne/format/leser.ts';
import { fasteBeloepIKravet, kravposterI, utenFastBeloep } from '#kjerne/spor/vederlag/format.ts';
import type { Subsidiaergrunn } from '#kjerne/regler/forhold.ts';
import type { TilbudtHandling } from '#kjerne/kommandoer/handlinger.ts';
import type {
  Avsnitt,
  Dokument,
  IkkeFyltUt,
  Korrespondansetype,
  Krav,
  Part,
  Sendemaate,
  Spor,
  Standpunkt,
  Svar,
  Utfall,
  Varselhjemmel,
} from '#kjerne/typer.ts';
import { SPOR } from '#kjerne/typer.ts';
import type { Korrespondansekategori } from './tekster/typer';
import { datoenSomGjelder, type Utledning, type Utsagn } from '#kjerne/utledning/utled.ts';
import { detSomRettes } from '#kjerne/kommandoer/rettingen.ts';
import type { Betegnelse } from '#kjerne/utledning/visning.ts';
import { elementenesSpor, type Kjernesakkontekst } from '#lib/kjernesak/kontekst.svelte.ts';
import type { GjeldendeFristdato } from '#lib/kjernesak/brevtekst.ts';
import type { Snippet } from 'svelte';

/**
 * Ett brev i saken. `nummer` er brevets nummer i saken, som brevteksten kaller «brev 5»
 * (LV-U44), og `null` for et registrert brev uten nummer (LV-U45).
 */
export interface Brevet {
  id: string;
  nummer: number | null;
  avsender: Part;
  /** Parten som la til brevet og oppga datoen, også når avsenderen er motparten (OV-U79). */
  lagtTilAv: Part;
  registrert: string;
  /**
   * Datoen avsenderen oppgir at et registrert brev ble sendt (OV-U85), og `null` for et brev
   * sendt herfra, der `registrert` er sendingen.
   */
  sendt: string | null;
  spor: Spor[];
  art: 'krav' | 'svar' | 'aksept' | 'trekk' | 'varsel' | 'innlegg' | 'registrert' | 'annet';
  /** Brevet innlegget viser til (MM-U47 punkt 2), og `null` for et brev som ikke er et innlegg. */
  viserTil: string | null;
  /** Kjernens kode for forholdet et krav i forholdssporet påberoper, ellers `null`. */
  forhold: string | null;
  /** Vår ref., merkingen som ble frosset med brevet (LV-U44, LV-U24), eller `null`. */
  merking: string | null;
  /** Deres ref. som ble frosset med brevet (LV-U27, LV-U49), tom når det ikke har noen. */
  deresRef: string[];
  /**
   * Omtalen av brevet slik brevteksten gir den: «brev K201-KOE-017-03 av 2. oktober 2026», eller
   * «totalentreprenørens e-post av …» for registrert korrespondanse (LV-U44, LV-U45).
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
  /** Bestemmelsene for varslene i brevet, tom for et brev uten varsel (OV-U25, VS-U48, VS-U52). */
  varselhjemler: Varselhjemmel[];
  /**
   * Varselet hvert svar i brevet bare på et varsel gjelder, per spor, med ordene i brevtittelen:
   * `tittel` «varsel om fristforlengelse» og `del` «varselet om fristforlengelse». Et svar på
   * kravet står ikke her (VS-U96 punkt 39, #2481).
   */
  svarPaaVarselet: Partial<Record<Spor, { tittel: string; del: string }>>;
  /** Typen og sendemåten for korrespondanse lagt til (OV-U79), og `null` for et brev herfra. */
  korrespondansetype: Korrespondansetype | null;
  sendemaate: Sendemaate | null;
  /**
   * Det korrespondansen lagt til er etter kontrakten, lest av innholdet kjernen har lagret
   * (U-10 i BF-49). `null` for et brev herfra.
   */
  kategori: Korrespondansekategori | null;
  /** D-12 i BF-49: skjemaet parten avbrøt før korrespondansen ble lagt til som dokumentasjon. */
  ikkeFyltUt: IkkeFyltUt | null;
  /** D-13 i BF-49: dokumentasjonen korrespondansen ble lagt til på nytt i stedet for. */
  retter: Rettingen | null;
  /** Korrespondansen som ble lagt til på nytt i stedet for denne dokumentasjonen (OV-U17). */
  rettetAv: Rettingen | null;
}

/** Den andre registreringen i en retting, også når den står i et annet spor (U-11 og U-12 i BF-49). */
export type Rettingen = Pick<Dokument, 'id' | 'registrert' | 'beskrivelse'>;

/** Kategorien for korrespondanse lagt til, av innholdet i dokumentet (U-10 i BF-49). */
function kategoriAv(d: Dokument): Korrespondansekategori | null {
  if (d.brevtekst !== null) return null;
  if (d.krav.length) return 'krav';
  if (d.svar.length) return 'svar';
  if (d.utsagn.some((x) => x.art === 'aksept')) return 'aksept';
  if (d.utsagn.some((x) => x.art === 'varsel')) return 'varsel';
  return 'dokumentasjon';
}

function artAv(d: Dokument): Brevet['art'] {
  if (d.brevtekst === null) return 'registrert';
  if (d.svar.length) return 'svar';
  if (d.krav.length) return 'krav';
  const u = d.utsagn.find((x) => ['aksept', 'trekk', 'varsel', 'innlegg'].includes(x.art));
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
        varselhjemler: Object.freeze(b.varselhjemler),
        svarPaaVarselet: Object.freeze(b.svarPaaVarselet),
      })
    )
  ) as Brevet[];
  brevenePerUtledning.set(u, brev);
  return brev;
}

function lesBrevene(u: Utledning): Brevet[] {
  const spor = elementenesSpor(u);
  // Innlegget hører til sporene til brevet det viser til, som står før det i journalen (G-7 i BF-03).
  const brevetsSpor = new Map<string, Spor[]>();
  const varselsvar = new Set(SPOR.flatMap((s) => u.spor[s].svarPaaVarsler.map((x) => x.id)));
  const dokumentene = new Map(
    u.journal.flatMap((h) => (h.art === 'dokument' ? [[h.dokument.id, h.dokument] as const] : []))
  );
  const rettingen = (id: string | null | undefined): Rettingen | null => {
    const d = id ? dokumentene.get(id) : undefined;
    return d ? { id: d.id, registrert: d.registrert, beskrivelse: d.beskrivelse } : null;
  };
  const rettetAv = new Map(u.registrerteBrev.map((r) => [r.dokument, r.rettetAv]));
  return u.journal.flatMap((h) => {
    if (h.art !== 'dokument') return [];
    const d = h.dokument;
    const innlegg = d.utsagn.find((x): x is Utsagn<'innlegg'> => x.art === 'innlegg');
    const i = new Set<Spor>([
      ...d.spor,
      ...d.krav.map((k) => k.spor),
      ...d.svar.map((s) => s.spor),
      // Et varsel har sporet selv, som et varsel for en kravpost (VS-U53).
      ...d.utsagn.flatMap((x) => {
        const s = ('gjelder' in x ? spor.get(x.gjelder) : undefined) ?? spor.get(x.id);
        return s ? [s] : [];
      }),
      ...((innlegg && brevetsSpor.get(innlegg.gjelder)) ?? []),
    ]);
    brevetsSpor.set(d.id, [...i]);
    return [
      {
        id: d.id,
        nummer: d.brevnummer,
        avsender: d.avsender,
        lagtTilAv: d.lagtTilAv,
        registrert: d.registrert,
        sendt: datoForDokumentet(d.opplysninger, 'sendt')?.dato ?? null,
        spor: [...i],
        art: artAv(d),
        viserTil: innlegg?.gjelder ?? null,
        forhold: innholdIForholdet(d.krav.find((k) => k.spor === 'forhold')).underkategori,
        merking: d.merking,
        deresRef: d.deresRef,
        omtale: omtalen(d),
        brevtittel: d.brevtittel,
        avsnitt: d.brevtekst,
        // OV-U79: også et varsel, krav eller svar lagt til har beskrivelsen (krav fra #2074 i #807).
        beskrivelse: d.beskrivelse,
        vedlegg: d.dokumentasjon.map((v) => v.filnavn),
        varselhjemler: d.utsagn.flatMap((x) => (x.art === 'varsel' ? [x.hjemmel] : [])),
        svarPaaVarselet: Object.fromEntries(
          d.svar.filter((s) => varselsvar.has(s.id)).map((s) => [s.spor, svaretGjelder(s)])
        ),
        korrespondansetype: d.korrespondansetype,
        sendemaate: d.sendemaate,
        kategori: kategoriAv(d),
        ikkeFyltUt: d.ikkeFyltUt,
        retter: rettingen(d.retter),
        rettetAv: rettingen(rettetAv.get(d.id)),
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
 * Svaret utkastet gir i sporet i forhåndsvisningen `etter`, også et svar lagt til som ikke blir
 * gjeldende (OV-U103), eller `null`.
 */
export function nyttSvarIUtkastet(u: Utledning, etter: Utledning | null, spor: Spor) {
  if (!etter) return null;
  const kjent = new Set(svareneISporet(u, spor).map((x) => x.id));
  return svareneISporet(etter, spor).find((x) => !kjent.has(x.id)) ?? null;
}

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
  hva: 'paalegg_mottatt' | 'klar_over_forholdet' | 'klar_over_utgiftene' | 'sendt' | 'mottatt';
  oppgittAv: Part;
  brev: Brevref;
  spor: Spor[];
}

/**
 * Datoene partene har oppgitt: når TE mottok pålegget eller ble klar over forholdet
 * (påberopelsen og korrigeringene, `datoopplysninger` i utledningen, MM-U59 punkt 10), når TE
 * ble klar over at utgiftene etter § 34.1.3 ville påløpe (`kunnskapsdatoer`, VS-U86) og når et
 * dokument ble sendt eller mottatt (opplysningene). Løsningen vurderer dem ikke (MM-U12, MM-U50).
 */
export function oppgitteDatoer(u: Utledning): OppgittDato[] {
  const brev = new Map(brevene(u).map((b) => [b.id, b]));
  const ut: OppgittDato[] = [];
  for (const o of u.datoopplysninger) {
    const b = brev.get(o.dokument);
    if (b) ut.push({ dato: o.dato, hva: o.felt, oppgittAv: 'TE', brev: ref(b), spor: ['forhold'] });
  }
  // U-2 i BF-48: hver dato TE har oppgitt for når utgiftene etter § 34.1.3 ble kjent.
  for (const o of u.kunnskapsdatoer) {
    const b = brev.get(o.dokument);
    if (b)
      ut.push({
        dato: o.dato,
        hva: 'klar_over_utgiftene',
        oppgittAv: 'TE',
        brev: ref(b),
        spor: ['vederlag'],
      });
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

/** TEs siste opplysning om når TE ble klar over forholdet (MM-U59 punkt 10). */
export function klarOverForholdet(u: Utledning): OppgittDato | null {
  return oppgitteDatoer(u).findLast((d) => d.hva === 'klar_over_forholdet') ?? null;
}

/** TEs opplysning om datoen etter VS-U26, i påberopelsen eller en korrigering (MM-U59 punkt 10). */
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
 * TEs opplysning om datoen TE ble klar over at utgiftene etter § 34.1.3 annet ledd ville påløpe,
 * i varselet, i vederlagskravet eller i et eget brev (VS-U86 punkt 12–14, G-7 i BF-48).
 */
export interface Kunnskapsdatoen {
  /** Varselet, kravet eller det egne utsagnet med opplysningen (`Kunnskapsopplysning.id`). */
  id: string;
  dato: string;
  brev: Brevref;
  /** Opplysningen står i et eget brev etter VS-U86 punkt 14. */
  egen: boolean;
  /** TEs siste opplysning da det egne brevet ble sendt, som brevet nevner. */
  forrige: Kunnskapsdatoen | null;
  /** TEs siste opplysning (VS-U85). */
  siste: boolean;
  /** Det egne brevet med TEs neste opplysning, `null` når ingen er sendt etter denne. */
  endretI: Brevref | null;
}

/**
 * TEs opplysninger om kunnskapsdatoen i rekkefølgen i journalen, med brevene de står i. Datoen i
 * et varsel lagt til etter TEs siste opplysning står som opplysningen i det brevet (VS-U85).
 */
export function kunnskapsdatoene(u: Utledning): Kunnskapsdatoen[] {
  const lest = kunnskapsdatoenePerUtledning.get(u);
  if (lest) return lest;
  const brev = new Map(brevene(u).map((b) => [b.id, b]));
  const egne = new Set(
    u.journal.flatMap((h) =>
      h.art === 'dokument'
        ? h.dokument.utsagn.flatMap((x) => (x.art === 'kunnskapsdato' ? [x.id] : []))
        : []
    )
  );
  const ut: Kunnskapsdatoen[] = [];
  let siste: Kunnskapsdatoen | null = null;
  for (const o of u.kunnskapsdatoer) {
    const b = brev.get(o.dokument);
    if (!b) continue;
    const egen = egne.has(o.id);
    const x: Kunnskapsdatoen = {
      id: o.id,
      dato: o.dato,
      brev: ref(b),
      egen,
      forrige: egen ? siste : null,
      siste: false,
      endretI: null,
    };
    if (egen && siste) siste.endretI = ref(b);
    if (o.blirSiste) siste = x;
    ut.push(x);
  }
  if (siste) siste.siste = true;
  kunnskapsdatoenePerUtledning.set(u, ut);
  return ut;
}

const kunnskapsdatoenePerUtledning = new WeakMap<Utledning, Kunnskapsdatoen[]>();

/** TEs siste opplysning om kunnskapsdatoen, eller `null` når datoen ikke er oppgitt (VS-U85). */
export const sisteKunnskapsdatoen = (u: Utledning): Kunnskapsdatoen | null =>
  kunnskapsdatoene(u).find((o) => o.siste) ?? null;

/** Én dato for et varsel eller et krav lagt til: datoen TE oppga, eller en retting av den. */
export interface Rettetdato {
  dato: string;
  /** Brevet med varselet eller kravet for datoen TE oppga, ellers brevet med rettingen. */
  brev: Brevref;
  retting: boolean;
}

/**
 * Datoene for et varsel eller et krav TE har lagt til som korrespondanse (BF-50, U-5): datoen TE
 * oppga først, så hver retting i rekkefølgen i journalen. Den siste er datoen som gjelder
 * (`datoenSomGjelder`, MM-U63).
 */
export interface Datorettingene {
  gjelder: string;
  det: { art: 'varsel'; hjemmel: Varselhjemmel } | { art: 'krav' };
  /** Brevet med varselet eller kravet. */
  brev: Brevref;
  datoene: Rettetdato[];
}

/**
 * Datoene for varselet eller kravet `gjelder`, eller `null` når kjernen ikke regner det som lagt
 * til som korrespondanse (`detSomRettes`, D-1 og D-2 i BF-50).
 */
export function datorettingene(u: Utledning, gjelder: string): Datorettingene | null {
  const d = detSomRettes(u, gjelder);
  const brev = d ? brevet(u, d.element.dokument) : null;
  const oppgitt = d ? datoenSomGjelder({ journal: u.journal, rettinger: [] }, d.element) : null;
  if (!d || !brev || oppgitt === null) return null;
  const alle = new Map(brevene(u).map((b) => [b.id, b]));
  return {
    gjelder,
    det: d.art === 'varsel' ? { art: 'varsel', hjemmel: d.hjemmel } : { art: 'krav' },
    brev: ref(brev),
    datoene: [
      { dato: oppgitt, brev: ref(brev), retting: false },
      ...u.rettinger.flatMap((r) => {
        const b = alle.get(r.dokument);
        return r.gjelder === gjelder && b ? [{ dato: r.dato, brev: ref(b), retting: true }] : [];
      }),
    ],
  };
}

/** Datoen som gjelder for varselet eller kravet `gjelder` etter rettingene (U-6, U-10). */
export const datoenSomGjelderMedBrev = (u: Utledning, gjelder: string): Rettetdato | null =>
  datorettingene(u, gjelder)?.datoene.at(-1) ?? null;

/**
 * Datoene under hvert brev i tråden (U-5 i BF-50): ved brevet med varselet eller kravet hvert
 * varsel eller krav med en retting eller som TE kan rette (`rettbare`), og ved brevet med en
 * retting datoen den retter fra og til.
 */
export interface Datolinjene {
  lagtTil: Datorettingene[];
  retting: { rettingene: Datorettingene; plass: number } | null;
}

export function datolinjene(u: Utledning, rettbare: readonly string[]): Map<string, Datolinjene> {
  const ut = new Map<string, Datolinjene>();
  const linjene = (id: string) => {
    const l = ut.get(id) ?? { lagtTil: [], retting: null };
    ut.set(id, l);
    return l;
  };
  const ider = [...new Set([...u.rettinger.map((r) => r.gjelder), ...rettbare])];
  for (const id of ider) {
    const r = datorettingene(u, id);
    if (!r) continue;
    linjene(r.brev.id).lagtTil.push(r);
    r.datoene.forEach((d, plass) => {
      if (d.retting) linjene(d.brev.id).retting = { rettingene: r, plass };
    });
  }
  return ut;
}

/** Varselet etter § 34.1.3 kjernen tilbyr TE å oppgi datoen for (`oppgi_kunnskapsdato:<id>`). */
export const kunnskapsdatoTilbudt = (
  tilbudte: readonly { type: string; gjelder: string | null }[]
): string | null => tilbudte.find((h) => h.type === 'oppgi_kunnskapsdato')?.gjelder ?? null;

/**
 * Én linje i et svar, med etiketten for laget den står i når svaret har flere lag: en grunn
 * fra svaret på forholdet brevet hadde foran seg, med brevet det står i, eller et standpunkt i
 * svaret.
 */
export type Standpunktet = {
  lag: string | null;
  /** Innsigelsene foran som rammer standpunktet (`vilkaaretFor`). */
  vilkaar?: Innsigelsen[];
  heller?: boolean;
} & ({ grunn: Subsidiaergrunn; brev: Brevref } | { standpunkt: Standpunkt });

/**
 * Linjene i svaret `svar` i brevets rekkefølge, med laget brevet ga dem (OV-U32). Grunnene
 * fra svaret på forholdet brevet hadde foran seg står først, ett lag hver (OV-U33,
 * `Svarberegning.forholdssvaret`). Et svar på forholdet revidert etter brevet endrer ikke det
 * brevet sa. `u` er saken med svaret, for et utkast forhåndsvisningen. Et svar på et varsel som
 * står alene (VS-U79), har ingen beregning i `u.svar`, og kalleren gir svaret på forholdet det
 * fryses med (`forholdssvaret`).
 */
export function standpunktene(
  svar: Svar,
  u: Utledning,
  forholdssvaret?: Svar | null
): Standpunktet[] {
  const beregning = u.svar[svar.id];
  if (!beregning && forholdssvaret === undefined)
    throw new Error(`Svaret ${svar.id} er ikke i saken`);
  const g = beregning
    ? beregning.forholdssvaret
      ? u.svar[beregning.forholdssvaret].svar
      : null
    : (forholdssvaret ?? null);
  const grunner = g ? grunnerFraForholdet(g, g.beslutningsgrunnlag.virkninger) : [];
  const plass = plassene(svar, svar.beslutningsgrunnlag.virkninger, grunner.length);
  const lagene =
    svar.spor === 'vederlag'
      ? lageneISvaret(u, svar, brevene(u), 0, 'beloep', innsigelsenIVederlaget, g)
      : lageneISvaret(
          u,
          svar,
          brevene(u),
          0,
          'dager',
          svar.spor === 'frist' ? innsigelsenIFristen : innsigelsenIForholdet,
          g
        );
  // Samme vilkår i samme lag er samme liste, også for to poster, så en visning kan skrive det
  // én gang (#2182).
  const vilkaarene = new Map<string, Vilkaaret>();
  const vilkaarFor = (lag: number | null, s?: Standpunkt) => {
    if (lag === null) return {};
    const post = s && svar.spor === 'vederlag' ? BREVTEKSTEN_I_VEDERLAGET.posten(s) : undefined;
    const v = vilkaaretFor(lagene, lag, post);
    if (!v) return {};
    const noekkel = JSON.stringify([
      lag,
      v.heller,
      v.vilkaar.map((i) => (i.art === 'grunn' ? [i.art, i.grunn] : i)),
    ]);
    if (!vilkaarene.has(noekkel)) vilkaarene.set(noekkel, v);
    return vilkaarene.get(noekkel)!;
  };
  return [
    ...grunner.map((grunn, i) => ({
      grunn,
      brev: ref(brevet(u, g!.dokument)!),
      lag: plass.grunn(i).etikett,
      ...vilkaarFor(plass.grunn(i).lag),
    })),
    // KA-U72: standpunktet til beløpet uten beløp, når tilbudet ikke er akseptert, vises ikke.
    ...svar.standpunkter
      .filter((s) => !(s.art === 'beloep' && s.godkjent === undefined))
      .map((s) => {
        const p = plass.standpunkt(s.id);
        return { standpunkt: s, lag: p.etikett, ...vilkaarFor(p.lag, s) };
      }),
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

/** Innleggene som viser til brevet `id`, i rekkefølgen i journalen (D-8 i BF-03). */
export const innleggSomViserTil = (brev: Brevet[], id: string): Brevet[] =>
  brev.filter((b) => b.art === 'innlegg' && b.viserTil === id);

/**
 * Forholdet TE påberoper i gjeldende krav, med gruppen fra kjernens liste (OV-U77, OV-U78).
 * Uten krav, eller med en kode lista ikke har, er begge `null`.
 */
export function forholdetISaken(u: Utledning): { navn: string; gruppe: string } | null {
  const f = forholdet(innholdIForholdet(u.spor.forhold.gjeldendeKrav).underkategori);
  const g = f && FORHOLDSGRUPPER.find((x) => x.forhold.some((y) => y.kode === f.kode));
  return f && g ? { navn: f.navn, gruppe: g.navn } : null;
}

/** Varslene Varden har skjema for: i fristen, og i vederlaget «Bare varsle» (BF-37). */
const VARSLENE_I_VARDEN: readonly Varselhjemmel[] = ['33.4', '34.1.2', '34.1.3', '34.3.3', '34.4'];

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
  /** Fristene med gjeldende frist uten dagene i saken siden viser (KA-U77). */
  datoer: readonly GjeldendeFristdato[];
  /** Lenken til en annen sak i prosjektet. */
  sakslenke?: (sakId: string) => string;
}

/** Fristtabellen for saken `kjernesak`, som siden for fristen og kravskjemaet regner gjeldende frist av. */
export const fristtabellen = (
  kjernesak: Kjernesakkontekst,
  sakslenke?: (sakId: string) => string
): Fristtabellen => ({
  datoer: kjernesak.fristdatoer,
  sakslenke,
});

/** Det sidene for forholdet, vederlaget og fristen får fra `Sporlesing` (oppsett B, #1997). */
export interface Sideprops {
  u: Utledning;
  /** Lenkene i hodet til tråden: «Send innlegg» og «Legg til korrespondanse» (BF-03, OV-U80). */
  traadlenkene?: Snippet;
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
  /** Varselet etter § 34.1.3 kjernen tilbyr TE å oppgi datoen for (`oppgi_kunnskapsdato:<id>`). */
  kunnskapsdatoVarselet?: string | null;
  onkunnskapsdato?: (varselet: string) => void;
  /** Varslene og kravene lagt til som TE kan rette datoen for (`rette_datoen:<id>`, BF-50). */
  rettbare?: string[];
  onrett?: (gjelder: string) => void;
  /** Brevene som har en handling ved seg, den brevet svarer på (U-16 i BF-44). */
  handlingerVed?: readonly string[];
  /** Handlingene ved brevet med ID-en. */
  handling?: Snippet<[string]>;
  /** Brevet slik det ble sendt, i raden. */
  brevet?: Snippet<[Brevet]>;
  /** Leveringen av brevene sendt herfra til Catenda (`leveringene`). */
  levering?: ReadonlyMap<string, string | null>;
  /** Det som står i hodet på siden under overskriften, som et spor uten varsel eller krav (U-2 i BF-51). */
  merknad?: Snippet;
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
export interface Brevinnholdet {
  /** «Pålegget» for en irregulær endring, ellers «forholdet». */
  gjelderPaalegg: boolean;
  utdypning: string | null;
  oppgitt: { hva: 'paalegg_mottatt' | 'klar_over_forholdet'; dato: string } | null;
  /** TEs opplysning om datoen i brevet, i påberopelsen eller en korrigering (G-7 i BF-02A). */
  opplysning: Datoopplysningen | null;
  /**
   * I et svar: TEs siste opplysning om datoen da svaret ble sendt, når TE har korrigert den
   * senere (designdelen i MM-U59, U-5 i BF-02A).
   */
  sisteOpplysningVedSvaret: Datoopplysningen | null;
  /** Standpunktene med laget, og brevet med varselet en påberopelse av sen varsling gjelder. */
  standpunkter: {
    standpunkt: Standpunkt;
    lag: string | null;
    brev: Brevref | null;
    ordene: Forholdsordene;
    vilkaar?: Innsigelsen[];
    heller?: boolean;
  }[];
}

/** Det som avgjør kontraktens ord for byggherrens standpunkt til forholdet i svaret. */
function forholdsordeneISvaret(svar: Svar, u: Utledning): Forholdsordene {
  const krav = u.spor.forhold.krav.find((k) => k.id === svar.gjelder);
  if (!krav) throw new Error(`Påberopelsen ${svar.gjelder} som svaret gjelder, er ikke i saken`);
  return forholdsordene(svar.beslutningsgrunnlag, krav);
}

/** Innholdet i brevene om forholdet, etter brevets ID. Brev uten krav eller svar har ingen. */
export function brevinnholdene(u: Utledning): Map<string, Brevinnholdet> {
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
  const ut = new Map<string, Brevinnholdet>();
  for (const k of u.spor.forhold.krav) {
    const innhold = innholdIForholdet(k);
    const kode = innhold.underkategori;
    const o = iBrevet(k.dokument);
    // En ny versjon som gjengir TEs siste opplysning, er ingen ny opplysning i utledningen, men
    // brevet sier datoen (MM-U59 punkt 10, #1647).
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
        return [
          {
            standpunkt: l.standpunkt,
            lag: l.lag,
            brev: b ? ref(b) : null,
            ordene,
            ...(l.vilkaar ? { vilkaar: l.vilkaar, heller: l.heller } : {}),
          },
        ];
      }),
    });
  }
  return ut;
}

/**
 * Et krav om vederlagsjustering eller fristforlengelse i «Tilknyttede krav», som i prototypen
 * `grunnlagsoversikt.html`: det TE krevde i gjeldende kravversjon, beløpene eller dagene i
 * byggherrens svar på det i hvert lag, og hvorfor svaret er subsidiært til forholdet
 * (`subsidiaer`, vedtaket 05.10). Lagene er de samme som på siden for kravet
 * (`kravetOgSvaret`, `kravetOgSvaretIFristen`), og hvert lag etter det første står med vilkåret
 * (D1 A 24.11 i #2248).
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
   * `lagene` er beløpet eller dagene i hvert lag i sporet, og `forAlle` dagene i lagene som
   * gjelder alle fristene når kravet har flere. `utenFast` er antallet kravposter svaret ikke har
   * et beløp for: tilbudet er ikke akseptert (KA-U72), eller posten er etter en beregningsregel
   * (KA-U61). `null` før byggherren har svart på kravet som gjelder.
   */
  svaret: {
    lagene: Lagraden[];
    forAlle: Lagraden[];
    utenFast: number;
    brev: Brevref;
  } | null;
  /**
   * Fristene i kravet når det har flere enn én, med dagene TE krevde og dagene i lagene som er
   * ulike per frist (KA-U74). Dagene legges ikke sammen, så da er `krevd.tall` `null`. Tom for
   * vederlaget og for én frist.
   */
  frister: Fristen[];
  grunner: Subsidiaergrunn[];
}

/**
 * Et lag i svaret med beløpet eller dagene. `vilkaar` er innsigelsene i sporet laget gjelder hvis
 * ikke fører frem; grunnene fra forholdet står i vilkåret for hele kravet (`grunner`).
 */
export interface Lagraden {
  vilkaar: Innsigelsen[];
  heller: boolean;
  /** «prinsipalt», «subsidiært» eller «videre subsidiært», og `null` når svaret har ett lag. */
  etikett: string | null;
  tall: number;
}

/** Én frist i «Tilknyttede krav». */
export interface Fristen {
  id: string;
  nummer: string | null;
  navn: string;
  krevd: number;
  lagene: Lagraden[];
}

const lagraden = (l: Lagraden): Lagraden => ({
  vilkaar: l.vilkaar.filter((i) => i.art !== 'grunn'),
  heller: l.heller,
  etikett: l.etikett,
  tall: l.tall,
});

export function tilknyttetKrav(u: Utledning, spor: 'vederlag' | 'frist'): TilknyttetKrav {
  const alle = brevene(u);
  const s = u.spor[spor];
  const krav = s.gjeldendeKrav;
  const kravbrev = krav && brevet(u, krav.dokument);
  const grunner = s.subsidiaer;
  if (spor === 'vederlag') {
    const k = kravetOgSvaret(u, alle);
    // En kravpost etter en beregningsregel har ikke et krevd beløp (KA-U61). Visningen sier hvor
    // mange poster som ikke har et fast beløp (#1752).
    const fast = krav ? fasteBeloepIKravet(krav) : null;
    const svar = s.gjeldendeSvar;
    return {
      spor,
      krevd:
        k && fast
          ? {
              tall: k.krevd,
              utenFast: fast.utenFastBeloep,
              brev: ref(k.kravbrev),
            }
          : null,
      svaret:
        k?.svarbrev && svar
          ? {
              // Uten et beløp for noen post har svaret ikke et tall i laget (KA-U72).
              lagene: svar.standpunkter.some((x) => x.art === 'beloep' && x.godkjent !== undefined)
                ? k.lagene.flatMap((l) =>
                    l.beloep === null ? [] : [lagraden({ ...l, tall: l.beloep })]
                  )
                : [],
              forAlle: [],
              utenFast: utenFastBeloep(svar.standpunkter).size,
              brev: ref(k.svarbrev),
            }
          : null,
      frister: [],
      grunner,
    };
  }
  const k = kravetOgSvaretIFristen(u, alle);
  // KA-U74: dagene står per frist og legges ikke sammen. Med én frist står dagene for den som
  // tallet for kravet og svaret, og med flere står de per frist.
  const frister: Fristen[] = (k?.frister ?? []).map((f) => ({
    id: f.id,
    nummer: f.nummer,
    navn: f.navn,
    krevd: f.krevd,
    lagene: f.lagene.map((l) => lagraden({ ...l, tall: l.dager })),
  }));
  const forAlle = (k?.felles ?? []).flatMap((l) =>
    l.dager === null ? [] : [lagraden({ ...l, tall: l.dager })]
  );
  const enFrist = frister.length === 1;
  return {
    spor,
    krevd:
      k && kravbrev
        ? { tall: enFrist ? frister[0]!.krevd : null, utenFast: 0, brev: ref(k.kravbrev) }
        : null,
    svaret: k?.svarbrev
      ? {
          lagene: enFrist ? [...forAlle, ...frister[0]!.lagene] : [],
          forAlle: enFrist ? [] : forAlle,
          utenFast: 0,
          brev: ref(k.svarbrev),
        }
      : null,
    frister: enFrist ? [] : frister,
    grunner,
  };
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
