/**
 * Brevteksten i et brev appen sender (LV-U2, LV-U3, #369): ett avsnitt for hvert
 * krav, svar, utsagn og hver opplysning parten sier i brevet, og ett for
 * vedleggene, med den låste delen appen lager av valgene og partens utdypning hver
 * for seg (B-13 om begrunnelsestekst). Ordlyden er LV-U4, GR-U14 og GR-U16, og
 * hva teksten omfatter, A2–A5 i paragrafmatrisen. Teksten lages når brevet
 * skrives, fryses i dokumentet og lages ikke på nytt (MM-U9). Ingen regel leser
 * den. Et registrert brev får ingen tekst (MM-U17 (opphevet av MM-U50)).
 *
 * Teksten sier det parten sa, også et standpunkt appen regner som uten virkning.
 * Appens vurdering står ikke der: at et standpunkt er uten virkning, om § 32.2
 * gjaldt, eller sammenfallet (LV-U3, HF-U2, MM-U12 (opphevet av MM-U50)). «Prinsipalt» og
 * «subsidiært» er slik brevet ordner standpunktene (HF-U2). Appen tolker ikke
 * utdypningen (KA-U16, KA-U19).
 */

import { HJEMMEL, type OppgittDato } from '../format/format.ts';
import { forholdet } from './forholdene.ts';
import { sakensKode } from './brevtittel.ts';
import { erRegistrert, kalenderdag } from '../format/leser.ts';
import { beloep, tilTall, type Oere } from '../regler/beloep.ts';
import type { Subsidiaergrunn } from '../regler/forhold.ts';
import type { Regelsett } from '../regler/regelsett.ts';
import { erBeloepetGodkjentFullt } from '../regler/vederlag.ts';
import {
  blirEndringsordre,
  etikett,
  laget,
  gjelderVarslingsplikten,
  grunnerFraForholdet,
  innsigelsenErOppgitt,
  innsigelsenPaaberoper,
  svarPaaForesporsler,
} from './standpunkt.ts';
import {
  harProduktivitetspost,
  innholdIForholdet,
  innholdIFristen,
  innholdIVederlaget,
  krevdIKravposten,
  krevdProduktivitet,
  krevdRigg,
  kravposterI,
} from '../format/kravinnhold.ts';
import { dager, iLagene, kroner } from './tekst.ts';
import { erKravpostvarselhjemmel, utenGren } from '../typer.ts';
import type {
  Avsnitt,
  Dokument,
  Domenehendelse,
  Hjemmel,
  Kravspor,
  Krav,
  Kravpost,
  Opplysning,
  Part,
  Korrespondansetype,
  Sakskode,
  Spor,
  Standpunkt,
  Svar,
  Utsagn,
  Kravvarselhjemmel,
  Kravpostvarselet,
  Varselhjemmel,
} from '../typer.ts';

/**
 * Saken slik den var før brevet: sakens kode (LV-U44, S3 i #1497) og sakstittelen (KA-U22), gjeldende
 * svar på forholdet (A2), hvorfor svaret i et spor er subsidiært til forholdet
 * (LV-U4 punkt 6) og om forholdet er avklart ved frafall (GR-U23, GR-U26). Skrivingen
 * leser dem av utledningen.
 */
export interface Saken {
  sakskode: Sakskode;
  tittel: string;
  svarPaaPaaberopelsen: string | null;
  /**
   * TEs opplysninger om datoen før brevet, slik utledningen leser dem, i rekkefølgen i
   * journalen. Den siste i feltet er den en ny versjon må gjengi (`DATOEN_KAN_IKKE_ENDRES`).
   */
  datoopplysninger: { felt: OppgittDato; dato: string; dokument: string }[];
  subsidiaer: Record<Kravspor, Subsidiaergrunn[]>;
  avklartVedFrafall: boolean;
  /** Varselet etter § 34.3.3 eller § 34.4 for hver kravpost i brevet som har et (`kravpostvarslene`). */
  kravpostvarsler: Record<string, Kravpostvarselet>;
}

/** Kravet en kommando om et kommende avsnitt ikke kan uttrykke. Brevet skrives ikke. */
export class KanIkkeUttrykkes extends Error {}

/** Brevet kan ikke sendes fra appen slik saken står, og kommandoen avvises med `regel`. */
export class BrevetAvvises extends Error {
  readonly regel: string;
  constructor(regel: string, melding: string) {
    super(melding);
    this.regel = regel;
  }
}

const MAANEDER = [
  'januar',
  'februar',
  'mars',
  'april',
  'mai',
  'juni',
  'juli',
  'august',
  'september',
  'oktober',
  'november',
  'desember',
];

/** Datoen i Oslo for et tidspunkt, eller datoen slik den er oppgitt. «2. oktober 2026». */
export function norskDato(tid: string): string {
  const dag = kalenderdag(tid);
  if (dag === null) throw new KanIkkeUttrykkes(`${tid} er ikke en dato`);
  const [aar, maaned, dato] = dag.split('-');
  return `${Number(dato)}. ${MAANEDER[Number(maaned) - 1]} ${aar}`;
}

/** Et beløp i brevet er uten merverdiavgift, og teksten sier det (LV-U4 punkt 2). */
const eksMva = (n: number) => `${kroner(n)} eks. mva.`;

/** Setningen med punktum, også når den slutter på en forkortelse. */
const punktum = (t: string) => (t.endsWith('.') ? t : `${t}.`);

/** En opplysning om når et brev eller et varsel ble sendt eller mottatt. */
const erDato = (o: Opplysning): o is Extract<Opplysning, { hva: 'sendt' | 'mottatt' }> =>
  o.hva === 'sendt' || o.hva === 'mottatt';

const stor = (t: string) => `${t[0].toUpperCase()}${t.slice(1)}`;

/** Bokstaven i § 33.1 for hovedkategoriene svikt og andre forhold. */
const LEDD_I_33_1: Record<string, string> = { svikt: 'b', andre_forhold: 'c' };

const PART: Record<Part, string> = { TE: 'TE', BH: 'Byggherren' };

const SPORNAVN: Record<Spor, string> = {
  forhold: 'grunnlaget',
  vederlag: 'vederlaget',
  frist: 'fristen',
};

/** Det et svar eller en aksept gjelder, med kontraktens ord (LV-U4 punkt 4 og 6). */
const SVARET_GJELDER: Record<Spor, string> = {
  forhold: 'grunnlaget',
  vederlag: 'kravet om justering av vederlaget',
  frist: 'kravet om fristforlengelse',
};

/** Kravet i sporet med kontraktens ord: «kravet om <…>». */
const KRAVET_OM: Record<Kravspor, string> = {
  vederlag: 'justering av vederlaget',
  frist: 'fristforlengelse',
};

function liste(deler: string[]): string {
  return deler.length < 2 ? deler.join('') : `${deler.slice(0, -1).join(', ')} og ${deler.at(-1)}`;
}

type Element =
  | { art: 'krav'; krav: Krav }
  | { art: 'svar'; svar: Svar }
  | { art: 'utsagn'; utsagn: Utsagn; dokument: string }
  | { art: 'standpunkt'; standpunkt: Standpunkt; svar: Svar }
  | { art: 'opplysning'; opplysning: Opplysning }
  | { art: 'dokument'; dokument: Dokument };

/** Parten med eieform, skrevet fullt ut i brevet (LV-U35, LV-U42). */
const PARTENS: Record<Part, string> = { TE: 'totalentreprenørens', BH: 'byggherrens' };

/** Typen registrert korrespondanse slik brevet nevner den (LV-U42). */
const KORRESPONDANSEN: Record<Korrespondansetype, string> = { brev: 'brev', e_post: 'e-post' };

/**
 * Et tidligere brev med merkingen som er frosset på det, og datoen det ble sendt: «brev
 * K201-KOE-017-03 av 2. oktober 2026» (LV-U53, oppdragsgiver 04.11 i #1570). Registrert
 * korrespondanse har ingen frosset merking ennå (LV-U45) og omtales med parten, typen og
 * datoen: «totalentreprenørens e-post av 2. oktober 2026» (LV-U42). `null` for et brev uten
 * noen av dem. Varden omtaler brevet med den samme teksten.
 */
export function omtalen(d: Dokument): string | null {
  const registrert = erRegistrert(d.opplysninger);
  const sendt = registrert
    ? d.opplysninger.filter(erDato).find((o) => o.gjelder === undefined)?.dato
    : d.registrert;
  if (sendt === undefined) return null;
  if (d.merking !== null) return `brev ${d.merking} av ${norskDato(sendt)}`;
  if (registrert && d.korrespondansetype !== null)
    return `${PARTENS[d.avsender]} ${KORRESPONDANSEN[d.korrespondansetype]} av ${norskDato(sendt)}`;
  return null;
}

/** Oppslagene teksten trenger i journalen før brevet og i brevet selv. */
class Journalen {
  private readonly brev = new Map<string, { versjon: number; dokument: Dokument }>();
  private readonly elementer = new Map<string, Element>();
  /** Dokumentet hvert element står i. */
  private readonly iDokument = new Map<string, Dokument>();
  readonly dokumenter: Dokument[] = [];

  constructor(foer: Domenehendelse[], nytt: Dokument) {
    for (const h of foer) if (h.art === 'dokument') this.legg(h.dokument, h.versjon);
    this.legg(nytt, 0);
  }

  private legg(d: Dokument, versjon: number) {
    this.brev.set(d.id, { versjon, dokument: d });
    this.dokumenter.push(d);
    this.elementer.set(d.id, { art: 'dokument', dokument: d });
    for (const krav of d.krav) this.elementer.set(krav.id, { art: 'krav', krav });
    for (const svar of d.svar) {
      this.elementer.set(svar.id, { art: 'svar', svar });
      for (const standpunkt of svar.standpunkter)
        this.elementer.set(standpunkt.id, { art: 'standpunkt', standpunkt, svar });
    }
    for (const utsagn of d.utsagn)
      this.elementer.set(utsagn.id, { art: 'utsagn', utsagn, dokument: d.id });
    for (const opplysning of d.opplysninger)
      this.elementer.set(opplysning.id, { art: 'opplysning', opplysning });
    for (const id of this.elementer.keys()) if (!this.iDokument.has(id)) this.iDokument.set(id, d);
  }

  /** Dokumentet elementet står i, eller dokumentet selv; `undefined` når det ikke finnes. */
  dokumentMed(id: string): Dokument | undefined {
    return this.iDokument.get(id);
  }

  element(id: string): Element {
    const e = this.elementer.get(id);
    if (!e) throw new KanIkkeUttrykkes(`brevet viser til ${id}, som ikke finnes i saken`);
    return e;
  }

  /** Et tidligere brev slik `omtalen` gir det. Kaster når brevet ikke kan omtales. */
  brevet(id: string): string {
    const b = this.brev.get(id);
    if (!b || b.versjon === 0) throw new KanIkkeUttrykkes(`${id} er ikke et tidligere brev`);
    const omtale = omtalen(b.dokument);
    if (omtale === null)
      throw new KanIkkeUttrykkes(
        `${id} har ingen merking, fordi prosjektet hadde ingen kontraktsforkortelse da brevet ble skrevet`
      );
    return omtale;
  }

  erRegistrert(dokument: string): boolean {
    return erRegistrert(this.brev.get(dokument)!.dokument.opplysninger);
  }

  /** Utdypningen under elementet i brevteksten i brevet det står i. */
  utdypning(element: string, dokument: string): string | undefined {
    return this.brev.get(dokument)?.dokument.brevtekst?.find((a) => a.gjelder === element)
      ?.utdypning;
  }

  /** VS-U20, OV-U5: brevet varselet står i, som et registrert varsel eller det første fristkravet. */
  dokumentetTil(id: string): string {
    const e = this.element(id);
    if (e.art === 'utsagn') return e.dokument;
    if (e.art === 'krav') return e.krav.dokument;
    throw new KanIkkeUttrykkes(`${id} er ikke et varsel eller et krav`);
  }

  krav(id: string): Krav {
    const e = this.element(id);
    if (e.art !== 'krav') throw new KanIkkeUttrykkes(`${id} er ikke et krav`);
    return e.krav;
  }

  svar(id: string): Svar {
    const e = this.element(id);
    if (e.art !== 'svar') throw new KanIkkeUttrykkes(`${id} er ikke et svar`);
    return e.svar;
  }
}

/**
 * Brevteksten for dokumentet `nytt`, som parten sender i appen nå. `foer` er
 * journalen før brevet. `utdypninger` er partens utdypning per element, uten
 * tolkning (KA-U19). Kaster `KanIkkeUttrykkes` når et element ikke kan uttrykkes,
 * og `BrevetAvvises` når brevet ikke kan sendes fra appen slik saken står.
 */
export function lagBrevtekst(
  nytt: Dokument,
  foer: Domenehendelse[],
  saken: Saken,
  regler: Regelsett,
  utdypninger: ReadonlyMap<string, string> = new Map()
): Avsnitt[] {
  if (erRegistrert(nytt.opplysninger))
    throw new KanIkkeUttrykkes('et registrert brev står som det ble sendt (MM-U50)');
  const j = new Journalen(foer, nytt);
  const t: Tekst = {
    j,
    saken,
    nytt,
    sak: `sak ${sakensKode(saken.sakskode)} («${saken.tittel}»)`,
  };

  const avsnitt: Avsnitt[] = [];
  const legg = (gjelder: string, laast: string) => {
    const utdypning = utdypninger.get(gjelder);
    avsnitt.push({ gjelder, laast, ...(utdypning ? { utdypning } : {}) });
  };

  for (const k of nytt.krav) legg(k.id, kravtekst(k, t, regler));
  for (const s of nytt.svar) legg(s.id, svartekst(s, t, regler));
  for (const u of nytt.utsagn) legg(u.id, utsagnstekst(u, t));
  for (const o of nytt.opplysninger) {
    // Datoen for et varsel står i avsnittet for varselet.
    if (erDato(o) && o.gjelder !== undefined) continue;
    legg(o.id, opplysningstekst(o, nytt.avsender, j));
  }
  // A4: vedleggene står i teksten med filnavnet, så det som fryses, er teksten og
  // vedleggene (LV-U2, arbeidsvalg 10 i #790).
  if (nytt.dokumentasjon.length)
    legg(nytt.id, `Brevet har vedlegg: ${liste(nytt.dokumentasjon.map((v) => `«${v.filnavn}»`))}.`);
  return avsnitt;
}

/** Det hver del av teksten trenger: journalen, saken før brevet og brevet selv. */
interface Tekst {
  j: Journalen;
  saken: Saken;
  nytt: Dokument;
  /** «sak KOE-17 («<sakstittel>»)» (KA-U22, LV-U44). */
  sak: string;
}

/**
 * Datoen totalentreprenøren oppgir, med partene skrevet fullt ut i brevet (VS-U26, LV-U35).
 * Meldingene og skjemaet har ordene i `DATOEN_GJELDER`.
 */
const DATOEN_I_BREVET: Record<OppgittDato, string> = {
  paalegg_mottatt: 'pålegget ble mottatt',
  klar_over_forholdet: 'totalentreprenøren ble klar over forholdet',
};

/**
 * Påberopelsen av forholdet: LV-U41 og LV-U43 for det første brevet, LV-U56 for en ny versjon,
 * med partene skrevet fullt ut (LV-U35) og henvisningen med «punkt» (LV-U39). Sakstittelen er
 * navnet på forholdet og står én gang. Datoen står som i LV-U57 og LV-U56.
 */
function forholdstekst(k: Krav, { saken, j }: Tekst, regler: Regelsett): string[] {
  const navnet = `«${saken.tittel}» i sak ${sakensKode(saken.sakskode)}`;
  const innhold = innholdIForholdet(k);
  const hoved = innhold.hovedkategori;
  const f = forholdet(innhold.underkategori);
  const nyVersjon = k.erstatter !== null;
  const dato = (felt: OppgittDato) => {
    const oppgitt = innhold.datoer[felt];
    if (oppgitt === null) return [];
    // LV-U56: hver tidligere opplysning med brevet den ble oppgitt i, den opprinnelige først.
    const opplysninger = saken.datoopplysninger.filter((o) => o.felt === felt);
    const tidligere = nyVersjon ? opplysninger.slice(0, -1) : [];
    return [
      stor(`${DATOEN_I_BREVET[felt]} ${norskDato(oppgitt)}.`),
      ...(tidligere.length
        ? [
            `Totalentreprenøren oppga tidligere ${liste(tidligere.map((o) => `${norskDato(o.dato)} i ${j.brevet(o.dokument)}`))}.`,
          ]
        : []),
    ];
  };
  if (hoved === 'endring' && f?.kode === 'endringsordre')
    return nyVersjon
      ? [
          `Påberopelsen gjelder endringsordre «${innhold.endringsordre}» fra byggherren (NS 8407 punkt 31.3) for ${navnet}.`,
        ]
      : [
          `Totalentreprenøren gjør gjeldende krav som følge av en endringsordre fra byggherren for ${navnet} (NS 8407 punkt 31.3).`,
          `Totalentreprenøren viser til endringsordren «${innhold.endringsordre}».`,
        ];
  if (hoved === 'endring' && f)
    return nyVersjon
      ? [
          `Påberopelsen gjelder ${f.navn.toLowerCase()} (NS 8407 punkt ${f.hjemmel}) for ${navnet}.`,
          ...dato('paalegg_mottatt'),
        ]
      : [
          `Totalentreprenøren krever endringsordre for ${navnet} som ${f.navn.toLowerCase()} (NS 8407 punkt ${f.hjemmel}).`,
          ...(gjelderVarslingsplikten(k, regler)
            ? [
                'Totalentreprenøren varsler etter NS 8407 punkt 32.2 at totalentreprenøren påberoper seg at pålegget innebærer en endring.',
              ]
            : []),
          // VS-U43: etter setningen om punkt 32.2. Appen vurderer ikke rettidigheten.
          ...dato('paalegg_mottatt'),
        ];
  const ledd = hoved === null ? undefined : LEDD_I_33_1[hoved];
  if (ledd && f) {
    const hjemmel =
      f.hjemmel === `33.1 ${ledd}`
        ? `punkt 33.1 ${ledd} og 34.1.2`
        : `punkt ${f.hjemmel}, jf. punkt 33.1 ${ledd} og 34.1.2`;
    return [
      nyVersjon
        ? `Påberopelsen gjelder ${f.navn.toLowerCase()} (NS 8407 ${hjemmel}) for ${navnet}.`
        : `Totalentreprenøren påberoper ${f.navn.toLowerCase()} (NS 8407 ${hjemmel}) for ${navnet}.`,
      // VS-U43: etter kategorisetningen.
      ...dato('klar_over_forholdet'),
    ];
  }
  // Force majeure kan ikke uttrykkes i formatet ennå (#367).
  throw new KanIkkeUttrykkes(`kategorien ${hoved}/${innhold.underkategori} har ingen brevtekst`);
}

/** LV-U4 punkt 2–3 og GR-U16. Forholdet står i `forholdstekst`. */
function kravtekst(k: Krav, t: Tekst, regler: Regelsett): string {
  const { j } = t;
  const deler: string[] = [];
  if (k.spor === 'forhold') {
    deler.push(...forholdstekst(k, t, regler));
  } else if (k.spor === 'vederlag') {
    deler.push(vederlagstekst(k, t));
  } else if (k.spor === 'frist') {
    deler.push(
      `TE krever fristforlengelse på ${dager(innholdIFristen(k).dager)} (NS 8407 § 33.6.1).`
    );
    // LV-U18 setning 3: kravet som viser til forespørselen, sier det (HF-U1).
    if (k.gjelder)
      deler.push(
        `Kravet er svar på byggherrens forespørsel etter NS 8407 § 33.6.2 i ${j.brevet(j.dokumentetTil(k.gjelder))}.`
      );
  } else utenGren(k.spor);
  // KA-U52 punkt 4 for vederlag og frist (#1379). En ny versjon av påberopelsen sier ikke at
  // noe erstattes (LV-U56).
  if (k.erstatter && k.spor !== 'forhold')
    deler.push(`Kravet erstatter TEs krav i ${j.brevet(j.krav(k.erstatter).dokument)}.`);
  return deler.join(' ');
}

/** En innsigelse med brevet den står i. */
interface Innsigelse {
  gjelder: string;
  dokument: string;
  hjemmel?: Hjemmel | null;
}

/**
 * VS-U9, VS-U11, VS-U24: byggherrens egne innsigelser som er en påberopelse etter
 * bestemmelsen svaret tar stilling til, og som byggherren ikke senere har gitt opp
 * uttrykkelig, i rekkefølgen de kom, med brevet de står i. Svaret gjentar dem eller
 * gir dem opp.
 */
function aapneInnsigelser(
  svar: Svar,
  avsender: Part,
  j: Journalen,
  regler: Regelsett
): Innsigelse[] {
  const svarFraParten: Svar[] = [];
  const innsigelser: (Innsigelse & { fra: number })[] = [];
  for (const d of j.dokumenter) {
    if (d.avsender !== avsender || d.svar.includes(svar)) continue;
    // HF-U4, OV-U4: et registrert brev gir ikke opp innsigelsen.
    if (!erRegistrert(d.opplysninger)) svarFraParten.push(...d.svar);
    for (const u of d.utsagn)
      // VS-U29: standpunktet om at begrunnelsen ikke er et svar, er ingen påberopelse.
      if (u.art === 'innsigelse' && u.grunn === undefined)
        innsigelser.push({ gjelder: u.gjelder, dokument: d.id, fra: svarFraParten.length });
  }
  return innsigelser.flatMap((i) => {
    const hjemmel = innsigelsenPaaberoper(i.gjelder, j.dokumenter, (k) =>
      gjelderVarslingsplikten(k, regler)
    );
    // VS-U29: i fristen også påberopelsen etter § 33.6.2 mot begrunnelsen, og i vederlaget
    // den etter § 34.1.3 mot det særskilte varselet (VS-U24, OV-U22).
    const gjelder =
      hjemmel === HJEMMEL[svar.spor] ||
      (svar.spor === 'frist' && hjemmel === '33.6.2') ||
      (svar.spor === 'vederlag' && hjemmel === '34.1.3');
    return gjelder && !innsigelsenErOppgitt(svar.spor, svarFraParten.slice(i.fra), hjemmel)
      ? [{ gjelder: i.gjelder, dokument: i.dokument, hjemmel }]
      : [];
  });
}

/** Metoden byggherren mener vederlaget skal justeres etter, når tilbudet ikke er akseptert. */
const METODEN = {
  enhetspriser: 'etter enhetspriser (NS 8407 § 34.3)',
  regningsarbeid: 'som regningsarbeid (NS 8407 § 34.4)',
} as const satisfies Record<
  NonNullable<Extract<Standpunkt, { art: 'oppgjoersform' }>['oensket']>,
  string
>;

/** Det særskilte kravet etter § 34.1.3 annet ledd, med ordene i bestemmelsen. */
const PRODUKTIVITET =
  'økte utgifter på grunn av nedsatt produktivitet eller forstyrrelser på annet arbeid';

/** Bestemmelsen varselet er gitt etter; etter OV-U25 gjelder varselet i § 34.1.3 tredje ledd bare annet ledd (LV-U29). */
const VARSLET_ETTER: Record<Kravvarselhjemmel, string> = {
  '33.4': 'NS 8407 § 33.4',
  '34.1.2': 'NS 8407 § 34.1.2',
  '34.1.3': 'NS 8407 § 34.1.3 tredje ledd',
  '34.3.3': 'NS 8407 punkt 34.3.3 første ledd',
  '34.4': 'NS 8407 punkt 34.4',
};

/** Betegnelsene i rekkefølge, med «og» før den siste. */
const opplistet = (a: string[]) =>
  a.length > 1 ? `${a.slice(0, -1).join(', ')} og ${a.at(-1)}` : a[0];

/** Kravversjonene før `k` i sporet, eldste først. */
function tidligere(k: Krav, j: Journalen): Krav[] {
  const ut: Krav[] = [];
  for (let id = k.erstatter; id; id = j.krav(id).erstatter) ut.unshift(j.krav(id));
  return ut;
}

/**
 * Varselet gitt før kravet: «… ble gitt i» brevet det står i (VS-U55). Ligger dokumentet ved
 * kravet, er det lagt til i kravskjemaet, og totalentreprenøren opplyser det (VS-U51, VS-U53).
 * Ordlyden er design (U-14 i BF-14), og partene skrives fullt ut (`docs/sprak.md`, #1532).
 */
function gitt(
  varselet: Extract<Kravpostvarselet, { art: 'gitt' }>,
  hva: string,
  { j, nytt }: Pick<Tekst, 'j' | 'nytt'>
): string {
  const brevet = j.brevet(j.dokumentetTil(varselet.varsel));
  const vedlagte = new Set(nytt.dokumentasjon.map((v) => v.vedlegg_id));
  const dokumentet = j.dokumentMed(varselet.varsel)?.dokumentasjon ?? [];
  return dokumentet.length && dokumentet.every((v) => vedlagte.has(v.vedlegg_id))
    ? `Totalentreprenøren opplyser at ${hva.charAt(0).toLowerCase()}${hva.slice(1)} ble gitt i ${brevet}, som er vedlagt.`
    : `${hva} ble gitt i ${brevet}.`;
}

/** Setningen for én kravpost. Ordlyden er design (U-6 i BF-14); budskapet står i KA-U61 og KA-U66. */
function kravposttekst(
  p: Kravpost,
  varselet: Kravpostvarselet | undefined,
  t: Pick<Tekst, 'j' | 'nytt'>
): string {
  const hode = `${p.betegnelse} ${punktum(p.beskrivelse).slice(0, -1)}${p.pns ? ` (PNS ${p.pns})` : ''}:`;
  if (p.oppgjoersform === 'tilbud') return `${hode} TE krever ${eksMva(p.beloep!)}`;
  const deler = [hode];
  if (p.oppgjoersform === 'enhetspriser') {
    deler.push(
      p.justert
        ? `TE krever at ${p.betegnelse} gjøres opp etter kontraktens enhetspriser, justert etter NS 8407 punkt 34.3.2.`
        : `TE krever at ${p.betegnelse} gjøres opp etter kontraktens enhetspriser etter NS 8407 punkt 34.3.1.`
    );
    if (varselet)
      deler.push(
        varselet.art === 'kravet'
          ? 'Kravet er varsel om justering av enhetsprisene etter NS 8407 punkt 34.3.3.'
          : gitt(varselet, 'Varselet om justering av enhetsprisene etter NS 8407 punkt 34.3.3', t)
      );
    if (p.anslag !== undefined)
      deler.push(`Anslaget er ${eksMva(p.anslag)} Anslaget er en opplysning og ikke et tilbud.`);
  } else if (p.oppgjoersform === 'regningsarbeid') {
    deler.push(
      `TE krever at ${p.betegnelse} gjøres opp som regningsarbeid etter NS 8407 punkt 34.4 og punkt 30.`
    );
    if (varselet)
      deler.push(
        varselet.art === 'kravet'
          ? 'Kravet er varsel før regningsarbeidet settes i gang (NS 8407 punkt 34.4).'
          : gitt(varselet, 'Varselet før regningsarbeidet settes i gang (NS 8407 punkt 34.4)', t)
      );
    if (p.kostnadsoverslag !== undefined)
      deler.push(
        `Kostnadsoverslaget er ${eksMva(p.kostnadsoverslag)} Overslaget er en opplysning og ikke et tilbud.`
      );
  } else utenGren(p.oppgjoersform);
  return deler.join(' ');
}

/**
 * Vederlagskravet: én setning per kravpost, trekket (KA-U56), postene utenfor kravpostene
 * (OV-U95 punkt 3, OV-U89 punkt 17) og hvilke poster som er tilbud etter § 34.2.1 (KA-U61,
 * KA-U65). Rigg og drift kalles ikke tilbud.
 */
function vederlagstekst(k: Krav, t: Tekst): string {
  const { j, saken } = t;
  const foer = tidligere(k, j);
  const poster = kravposterI(k);
  const deler = poster.map((p) => punktum(kravposttekst(p, saken.kravpostvarsler[p.id], t)));
  const forrige = foer.at(-1);
  for (const id of innholdIVederlaget(k).trekker) {
    const p = forrige && kravposterI(forrige).find((q) => q.id === id);
    if (!p)
      throw new KanIkkeUttrykkes(
        `trekket gjelder kravposten ${id}, som ikke står i forrige kravversjon`
      );
    deler.push(
      `TE trekker kravet i ${p.betegnelse} ${punktum(p.beskrivelse).slice(0, -1)}, fremsatt i ${j.brevet(forrige.dokument)}.`
    );
  }
  // OV-U95 punkt 3: «i tillegg» når vederlagsjusteringen har minst én kravpost.
  const post = krevdProduktivitet(k);
  if (post !== null)
    deler.push(
      `TE krever ${poster.length ? 'i tillegg ' : ''}særskilt justering av vederlaget etter NS 8407 § 34.1.3 annet ledd for ${PRODUKTIVITET} med ${eksMva(tilTall(post))}`
    );
  const rigg = krevdRigg(k);
  if (rigg !== null)
    deler.push(`TE krever ${eksMva(tilTall(rigg))} for rigg og drift i forlenget byggetid.`);
  if (!poster.length && post === null && rigg === null)
    throw new KanIkkeUttrykkes('vederlagskravet har ingen poster');
  const tilbud = poster.filter((p) => p.oppgjoersform === 'tilbud').map((p) => p.betegnelse);
  if (post !== null) tilbud.push('den særskilte vederlagsjusteringen');
  if (tilbud.length)
    deler.push(`Kravet for ${opplistet(tilbud)} er et tilbud etter NS 8407 punkt 34.2.1.`);
  const regel = poster.filter((p) => p.oppgjoersform !== 'tilbud').map((p) => p.betegnelse);
  if (regel.length)
    deler.push(
      `${opplistet(regel)} gjøres opp etter en beregningsregel, og kravet for ${regel.length > 1 ? 'dem' : 'den'} er ikke et tilbud.`
    );
  return deler.join(' ');
}

/** KA-U22: beløpene som identifiserer vederlagskravet i trekket: de krevde faste beløpene. */
function kravetsBeloep(krav: Krav): string {
  const deler = kravposterI(krav).flatMap((p) => {
    const krevd = krevdIKravposten(krav, p);
    return krevd === null ? [] : [`${eksMva(tilTall(krevd))} i ${p.betegnelse}`];
  });
  const post = krevdProduktivitet(krav);
  if (post !== null) deler.push(`${eksMva(tilTall(post))} etter NS 8407 § 34.1.3 annet ledd`);
  const rigg = krevdRigg(krav);
  if (rigg !== null) deler.push(`${eksMva(tilTall(rigg))} for rigg og drift`);
  return deler.length ? deler.join(' og ') : 'uten krevd beløp';
}

/** TEs eget varsel, slik brevteksten nevner det (LV-U4 punkt 3, OV-U5). */
const VARSEL_OM: Record<Kravvarselhjemmel, string> = {
  '33.4': `om fristforlengelse etter ${VARSLET_ETTER['33.4']}`,
  '34.1.2': `om vederlagsjustering etter ${VARSLET_ETTER['34.1.2']}`,
  '34.1.3': `om særskilt justering for nedsatt produktivitet eller forstyrrelser etter ${VARSLET_ETTER['34.1.3']}`,
  // Ordlyden for varslene etter § 34.3.3 og § 34.4 er design etter VS-U48 (#1663).
  '34.3.3': `om justering av enhetsprisene etter ${VARSLET_ETTER['34.3.3']}`,
  '34.4': `om regningsarbeid etter ${VARSLET_ETTER['34.4']}`,
};

/** Varselet et standpunkt om rettidighet gjelder (LV-U4 punkt 5, LV-U5). */
const VARSELET: Record<Hjemmel, string> = {
  '32.2': 'TEs varsel etter NS 8407 § 32.2',
  '33.4': `varselet ${VARSEL_OM['33.4']}`,
  '33.6.2': 'TEs svar på forespørselen etter NS 8407 § 33.6.2',
  '34.1.2': `varselet ${VARSEL_OM['34.1.2']}`,
  '34.1.3': `varselet ${VARSEL_OM['34.1.3']}`,
  '34.3.3': `varselet ${VARSEL_OM['34.3.3']}`,
  '34.4': `varselet ${VARSEL_OM['34.4']}`,
};

const SEN_32_2 = `${VARSELET['32.2']} kom for sent`;

/**
 * A2: standpunktene i svaret på forholdet som gjør et svar på vederlag eller frist
 * subsidiært (B-13 05.10): preklusjon etter § 32.2 og avslag. Svaret på forholdet
 * står i samme brev eller er gjeldende svar før brevet. Teksten sier hva byggherren
 * sa der, og tilskriver ikke byggherren noe nytt (LV-U3).
 */
function forholdetsStandpunkter(s: Svar, { j, saken, nytt }: Tekst): string[] {
  if (s.spor === 'forhold') return [];
  const g =
    nytt.svar.find((x) => x.spor === 'forhold') ??
    (saken.svarPaaPaaberopelsen ? j.svar(saken.svarPaaPaaberopelsen) : undefined);
  if (!g) return [];
  const grunner = grunnerFraForholdet(g, g.beslutningsgrunnlag.virkninger);
  const prekludert = grunner.includes('prekludert');
  const avslaatt = grunner.includes('avslaatt');
  if (g.dokument === nytt.id) {
    const se = ' (se svaret på grunnlaget)';
    return [
      ...(prekludert ? [`byggherren gjør gjeldende at ${SEN_32_2}${avslaatt ? '' : se}.`] : []),
      ...(avslaatt ? [`byggherren avslår grunnlaget${se}.`] : []),
    ];
  }
  return [
    ...(prekludert
      ? [`byggherren har gjort gjeldende i ${j.brevet(g.dokument)} at ${SEN_32_2}.`]
      : []),
    ...(avslaatt
      ? [
          prekludert
            ? 'byggherren har avslått grunnlaget i samme brev.'
            : `byggherren har avslått grunnlaget i ${j.brevet(g.dokument)}.`,
        ]
      : []),
  ];
}

/**
 * GR-U26: forbeholdet når byggherren svarer på vederlag eller frist uten å ha svart på
 * gjeldende versjon av forholdet, i brevet eller før det, og forholdet ikke er avklart
 * ved frafall (GR-U23). Det er ikke et lag.
 */
function forbeholdForForholdet(s: Svar, { j, saken, nytt }: Tekst): string[] {
  if (s.spor === 'forhold' || saken.svarPaaPaaberopelsen !== null || saken.avklartVedFrafall)
    return [];
  if (nytt.svar.some((x) => x.spor === 'forhold')) return [];
  if (!s.paaberopelse) throw new KanIkkeUttrykkes(`${s.id} viser ikke til grunnlagskravet`);
  return [
    `Byggherren har ennå ikke svart på grunnlaget i TEs krav i ${j.brevet(j.krav(s.paaberopelse).dokument)}.`,
    'Standpunktene nedenfor gjelder under forutsetning av at grunnlaget for kravet foreligger.',
  ];
}

/** LV-U4 punkt 4 og 5, med A2 når forholdet er avslått eller prekludert, og GR-U26 når det er ubesvart. */
function svartekst(s: Svar, t: Tekst, regler: Regelsett): string {
  const { j, nytt } = t;
  const krav = j.krav(s.gjelder);
  const virkning = new Map(s.beslutningsgrunnlag.virkninger.map((v) => [v.standpunkt, v.virkning]));
  const innsigelser = aapneInnsigelser(s, nytt.avsender, j, regler);
  // OV-U32: et avslått eller prekludert forhold står først, med lagene fra svaret på
  // forholdet, og lagene i sporet flyttes ned med antallet lag de opptar (B-13, A2). Hvert
  // ledd fra forholdet er ett lag der: preklusjonen etter § 32.2 er det første, og avslaget
  // står i laget etter. Et standpunkt uten lag, også et upåvirket, får ingen etikett. Et
  // akseptert tilbud står med kravposten (OV-U33, LV-U31). Er tilbudet ikke akseptert, står
  // ikke beløpet for kravposten i brevet (KA-U72). Standpunktene i samme lag står under én
  // etikett (`iLagene`).
  const forholdet = forholdetsStandpunkter(s, t);
  const forskyvning = forholdet.length;
  const ledd = iLagene(
    [
      ...forholdet.map((tekst, i) => ({ tekst, plass: (i + 1) as number | null })),
      ...s.standpunkter.filter(harTekst).map((p) => {
        const lag = laget(virkning.get(p.id)!);
        return {
          tekst: standpunkttekst(p, s, krav, j, innsigelser),
          plass: lag !== null ? lag + forskyvning : null,
        };
      }),
    ],
    (l) => l.plass,
    forskyvning + 1
  );
  // #1267 punkt 4: med mer enn ett lag står innledningen for seg, og hver etikett begynner et
  // nytt avsnitt. Standpunktene uten etikett står i avsnittet før, som metoden sammen med
  // beløpet, eller i et eget avsnitt foran den første etiketten.
  const ordnet = ledd.some(({ plass }) => plass !== null && plass > 1);
  const merket = new Set<number>();
  const avsnitt: string[][] = [
    [
      `Byggherrens svar på ${SVARET_GJELDER[s.spor]} i TEs krav i ${j.brevet(krav.dokument)}:`,
      ...forbeholdForForholdet(s, t),
    ],
  ];
  if (ordnet) avsnitt.push([]);
  for (const { tekst, plass } of ledd) {
    if (!ordnet || plass === null || merket.has(plass)) avsnitt.at(-1)!.push(stor(tekst));
    else {
      merket.add(plass);
      avsnitt.push([`${stor(etikett(plass))}: ${tekst}`]);
    }
  }
  if (s.erstatter) {
    const erstatter = `Svaret erstatter byggherrens svar i ${j.brevet(j.svar(s.erstatter).dokument)}.`;
    if (ordnet) avsnitt.push([erstatter]);
    else avsnitt.at(-1)!.push(erstatter);
  }
  return avsnitt
    .filter((a) => a.length)
    .map((a) => a.join(' '))
    .join('\n\n');
}

/**
 * Varselet et standpunkt om rettidighet gjelder, med brevet det står i (HF-U1, #497). Uten
 * eget varsel er det brevet med TEs første krav i sporet, uten forbeholdet fra skjemaet
 * (LV-U21, OV-U28, OV-U29), og etter § 32.2 det første grunnlagskravet (VS-U43 punkt 6 og 10
 * med designdelen). For § 33.6.2 er det svaret på forespørselen, med brevet forespørselen
 * står i (LV-U18 setning 4).
 */
function varseletMedBrevet(p: Extract<Standpunkt, { art: 'rettidighet' }>, j: Journalen): string {
  // Forutsetningene avviser svaret før dette (#1600).
  if (p.hjemmel === '32.2' && j.element(p.gjelder).art !== 'krav')
    throw new KanIkkeUttrykkes('varselet etter § 32.2 sendt utenfor løsningen har ingen brevtekst');
  const gjelder = p.hjemmel === '33.6.2' ? foresporselenTil(p.gjelder, j) : p.gjelder;
  return `${VARSELET[p.hjemmel]} i ${j.brevet(j.dokumentetTil(gjelder))}`;
}

/** KA-U72: standpunktet til beløpet for en kravpost der tilbudet ikke er akseptert, står ikke i brevet. */
const harTekst = (p: Standpunkt): boolean => !(p.art === 'beloep' && p.godkjent === undefined);

/** Ett standpunkt som en setning med liten forbokstav (LV-U4 punkt 5, LV-U5, GR-U14). */
function standpunkttekst(
  p: Standpunkt,
  s: Svar,
  krav: Krav,
  j: Journalen,
  innsigelser: Innsigelse[]
): string {
  const paaberopelse = s.spor === 'forhold' ? krav : s.paaberopelse ? j.krav(s.paaberopelse) : null;
  switch (p.art) {
    case 'rettidighet': {
      // VS-U29, VS-U31: saken har én forespørsel, så standpunktet etter § 33.6.2 gjelder begrunnelsen.
      const aapne = innsigelser.filter((i) => i.hjemmel === p.hjemmel);
      const varselet = erKravpostvarselhjemmel(p.hjemmel) ? '' : varseletMedBrevet(p, j);
      // Et «for sent» gjentar de åpne innsigelsene, og et «i tide» gir dem opp (VS-U11, VS-U24).
      // Saken har ett varsel etter § 33.4 (oppdragsgiver 15.10, #498).
      const brevene = liste([...new Set(aapne.map((i) => j.brevet(i.dokument)))]);
      const henvisning = aapne.length > 1 ? 'innsigelsene' : 'innsigelsen';
      const jf = aapne.length ? `, jf. ${henvisning} i ${brevene}` : '';
      // KA-U64: varselet etter § 34.3.3 eller § 34.4 for kravposten. VS-U4: for § 34.3.3 står
      // prinsipalt det byggherren måtte forstå; løsningen regner det ikke ut.
      if (erKravpostvarselhjemmel(p.hjemmel)) {
        const om = `${VARSELET[p.hjemmel]} for ${kravpostenI(krav, p.gjelder).betegnelse}`;
        if (p.iTide) return `byggherren gjør ikke gjeldende at ${om} kom for sent.`;
        return p.hjemmel === '34.3.3'
          ? `byggherren gjør gjeldende at ${om} kom for sent, og at TE bare har krav på den justeringen av enhetsprisene byggherren måtte forstå at forholdet ville føre til.`
          : `byggherren gjør gjeldende at ${om} ikke ble gitt eller kom for sent.`;
      }
      // OV-U28: begrensningen etter § 34.1.3 med beløpet byggherren godkjenner for kravet.
      if (!p.iTide && p.hjemmel === '34.1.3')
        return `byggherren gjør gjeldende at ${varselet} kom for sent${jf}, og at TE har tapt retten til å påberope seg påløpte utgifter som grunnlag for kravet. Byggherren godkjenner ${eksMva(p.begrenset!)} for dette kravet.`;
      if (!p.iTide) return `byggherren gjør gjeldende at ${varselet} kom for sent${jf}.`;
      return aapne.length
        ? `byggherren gir opp ${henvisning} etter NS 8407 § 5 i ${brevene} og gjør ikke gjeldende at ${varselet} kom for sent.`
        : `byggherren gjør ikke gjeldende at ${varselet} kom for sent.`;
    }
    case 'forhold':
      if (p.resultat === 'godkjent')
        return blirEndringsordre(s.beslutningsgrunnlag)
          ? endringsordretekst(krav, j)
          : 'byggherren godkjenner grunnlaget.';
      if (p.resultat === 'avslaatt')
        return s.beslutningsgrunnlag.varslingsplikt
          ? 'byggherren avslår kravet på endringsordre (NS 8407 § 32.3 første ledd b).'
          : 'byggherren avslår grunnlaget.';
      return 'byggherren frafaller pålegget mot å utstede endringsordre for allerede utført arbeid (NS 8407 § 32.3 første ledd c).';
    case 'hindring': {
      const hjemmel =
        innholdIForholdet(paaberopelse).hovedkategori === 'force_majeure' ? '§ 33.3' : '§ 33.1';
      return `byggherren ${p.oppfylt ? 'legger til grunn' : 'legger ikke til grunn'} at fremdriften hindres som følge av forholdet (NS 8407 ${hjemmel}).`;
    }
    case 'oppgjoersform': {
      // Arbeidsvalget i #479: oppgjørsformen er byggherrens standpunkt, ikke appens avgjørelse. LV-U31 og
      // LV-U32: godkjenningen betegner ikke tilbudet som akseptert, heller ikke ved fullt beløp.
      // KA-U57 (d): med flere kravposter sier standpunktet hvilken kravpost det gjelder.
      const post = kravposterI(krav).length > 1 ? kravpostenI(krav, p.gjelder).betegnelse : null;
      if (p.hjemmel !== '34.2.2') return beregningsregeltekst(p, post);
      return p.aksepterer
        ? `byggherren godkjenner oppgjør som fast sum${post ? ` for ${post}` : ''} med beløpet og forbeholdene som fremgår av svaret.`
        : `byggherren aksepterer ikke TEs tilbud${post ? ` for ${post}` : ''} (NS 8407 § 34.2.2 første ledd), og mener vederlaget${post ? ' for kravposten' : ''} skal justeres ${METODEN[p.oensket!]}.`;
    }
    case 'justering': {
      // KA-U68, OV-U95 punkt 5: standpunktet godkjenner ingen priser, mengder eller beløp.
      const post = kravpostenI(krav, p.gjelder).betegnelse;
      return p.godtar
        ? `byggherren godtar at enhetsprisene for ${post} justeres (NS 8407 punkt 34.3.2). Det godkjenner ikke priser, mengder eller beløp.`
        : `byggherren bestrider at enhetsprisene for ${post} skal justeres (NS 8407 punkt 34.3.2), og mener ${post} skal gjøres opp etter kontraktens enhetspriser.`;
    }
    case 'spesifisering':
      return p.iTide
        ? 'byggherren gjør ikke gjeldende at kravet om fristforlengelse ble spesifisert for sent (NS 8407 § 33.6.1).'
        : `byggherren gjør gjeldende at kravet om fristforlengelse ble spesifisert for sent, og at TE bare har krav på den fristforlengelsen byggherren måtte forstå at TE hadde krav på, ${dager(p.dager!)} (NS 8407 § 33.6.1).`;
    case 'beloep': {
      // Standpunktet har et beløp, fordi `harTekst` har tatt bort standpunktene uten (KA-U72).
      // Resultatet regnes i hele øre (B-13, OV-U59). OV-U28: med posten etter § 34.1.3 annet
      // ledd sier brevet beløpet for hver post for seg.
      const krevd = p.saerskilt ? krevdProduktivitet(krav)! : krevdeKravpost(krav, p.gjelder!)[1];
      const godkjent = beloep(p.godkjent)!;
      const resultat = erBeloepetGodkjentFullt(krevd, godkjent)
        ? 'godkjent'
        : godkjent === 0n
          ? 'avslaatt'
          : 'delvis_godkjent';
      const post = p.saerskilt
        ? SAERSKILT
        : kravposterI(krav).length > 1
          ? krevdeKravpost(krav, p.gjelder!)[0].betegnelse
          : harProduktivitetspost(krav)
            ? 'justeringen ellers'
            : null;
      return verdi(resultat, eksMva(p.godkjent!), eksMva(tilTall(krevd)), post);
    }
    case 'dager':
      return verdi(p.resultat, dager(p.vurdert), dager(innholdIFristen(krav).dager));
  }
}

/**
 * GR-U14, GR-U15: setningen etter § 31.3 i en godkjenning som er en endringsordre.
 * TEs beskrivelse av pålegget står som utdypningen under kravet i brevet kravet står
 * i, og siteres; appen tolker den ikke (KA-U19). Et registrert krav står som det ble
 * sendt (MM-U17 (opphevet av MM-U50)), og godkjenningen viser til pålegget i det (GR-U13). Et krav fra
 * appen uten beskrivelse kan ikke si hva endringen går ut på, og svaret avvises.
 */
function endringsordretekst(krav: Krav, j: Journalen): string {
  const kravet = `TEs krav i ${j.brevet(krav.dokument)}`;
  const innledning =
    'byggherren godkjenner grunnlaget. Svaret er en endringsordre etter NS 8407 § 32.3 første ledd a, jf. § 31.3: byggherren krever at endringen utføres slik pålegget er beskrevet i';
  if (j.erRegistrert(krav.dokument)) return `${innledning} ${kravet}.`;
  const beskrivelse = j.utdypning(krav.id, krav.dokument);
  if (!beskrivelse?.trim())
    throw new BrevetAvvises(
      'PAALEGGET_IKKE_BESKREVET',
      'Godkjenningen er en endringsordre (§ 32.3 første ledd a), men TEs krav beskriver ikke pålegget, så brevet kan ikke si hva endringen går ut på (§ 31.3, GR-U14). Svaret må sendes utenfor appen.'
    );
  return `${innledning} ${kravet}: «${beskrivelse}».`;
}

/** Kravposten standpunktet gjelder (KA-U57 (c) og (d)). */
function kravpostenI(krav: Krav, gjelder: string): Kravpost {
  const post = kravposterI(krav).find((k) => k.id === gjelder);
  if (!post) throw new KanIkkeUttrykkes(`kravet har ikke kravposten ${gjelder}`);
  return post;
}

/** Kravposten med fast sum standpunktet til beløpet gjelder, og det krevde beløpet (KA-U57 (c)). */
function krevdeKravpost(krav: Krav, gjelder: string): [Kravpost, Oere] {
  const post = kravpostenI(krav, gjelder);
  const krevd = krevdIKravposten(krav, post);
  if (krevd === null)
    throw new KanIkkeUttrykkes(`kravposten ${post.betegnelse} har ikke et krevd beløp`);
  return [post, krevd];
}

/** TEs beregningsregel i standpunktet, etter hjemmelen. */
const REGELEN = {
  '34.3': 'etter enhetspriser (NS 8407 § 34.3)',
  '34.4': 'som regningsarbeid (NS 8407 § 34.4)',
} as const;

/**
 * Standpunktet til beregningsregelen for en kravpost (KA-U54, OV-U95 punkt 5) og kravet om
 * spesifisert tilbud (KA-U69, KA-U71). Ordlyden er design (prototype v3, `#svar`).
 */
function beregningsregeltekst(
  p: Extract<Standpunkt, { art: 'oppgjoersform' }>,
  post: string | null
): string {
  const forPosten = post ? ` for ${post}` : '';
  const regelen = REGELEN[p.hjemmel as '34.3' | '34.4'];
  if (p.aksepterer)
    return `byggherren godtar at vederlaget${forPosten} justeres ${regelen}. Det godkjenner ikke mengder, priser, kostnader eller noe beløp.`;
  const mener = p.oensket ? `, og mener det skal justeres ${METODEN[p.oensket]}` : '';
  const tilbud = p.kreverTilbud
    ? ` Byggherren krever at TE gir et spesifisert tilbud${post ? ` for ${post}` : ' for kravposten'} (NS 8407 § 34.2.1 første ledd).`
    : '';
  return `byggherren godtar ikke at vederlaget${forPosten} justeres ${regelen}${mener}.${tilbud}`;
}

/** OV-U28: posten etter § 34.1.3 annet ledd i setningen om beløpet. */
const SAERSKILT = 'særskilt justering etter NS 8407 § 34.1.3 annet ledd';

function verdi(
  resultat: string,
  godkjent: string,
  krevd: string,
  post: string | null = null
): string {
  const om = post ? ` for ${post}` : '';
  if (resultat === 'godkjent') return punktum(`byggherren godkjenner ${godkjent}${om}`);
  if (resultat === 'delvis_godkjent')
    return punktum(`byggherren godkjenner ${godkjent} av de krevde ${krevd}${om}`);
  if (resultat === 'avslaatt')
    return post ? `byggherren avslår kravet om ${post}.` : 'byggherren avslår kravet.';
  throw new KanIkkeUttrykkes(`standpunktet ${resultat} har ingen brevtekst`);
}

/** Forespørselen et standpunkt etter § 33.6.2 gjelder svaret på: kravet eller begrunnelsen. */
function foresporselenTil(gjelder: string, j: Journalen): string {
  const f = svarPaaForesporsler(j.dokumenter).find((x) => x.svar === gjelder);
  if (!f) throw new KanIkkeUttrykkes(`${gjelder} er ikke et svar på en forespørsel`);
  return f.foresporsel;
}

const erPaaberopelseEtter3362 = (id: string, svar: Svar) =>
  svar.standpunkter.some((p) => p.id === id && p.art === 'rettidighet' && p.hjemmel === '33.6.2');

/** Det en innsigelse eller en protest viser til, med brevet det står i (LV-U4 punkt 7 og 8). */
function beskriv(id: string, j: Journalen): string {
  const e = j.element(id);
  switch (e.art) {
    case 'krav':
      return `TEs krav${e.krav.spor === 'forhold' ? '' : ` om ${KRAVET_OM[e.krav.spor]}`} i ${j.brevet(e.krav.dokument)}`;
    case 'svar':
      return `byggherrens svar i ${j.brevet(e.svar.dokument)}`;
    case 'standpunkt':
      // LV-U20: påberopelsen etter § 33.6.2 gjelder TEs svar på forespørselen, ikke et varsel.
      return erPaaberopelseEtter3362(id, e.svar)
        ? `påberopelsen av at TEs svar på forespørselen etter NS 8407 § 33.6.2 kom for sent i svaret i ${j.brevet(e.svar.dokument)}`
        : `påberopelsen av for sen varsling i svaret i ${j.brevet(e.svar.dokument)}`;
    case 'utsagn':
      if (e.utsagn.art === 'varsel')
        return `TEs varsel ${VARSEL_OM[uttrykkbar(e.utsagn.hjemmel)]} i ${j.brevet(e.dokument)}`;
      if (e.utsagn.art === 'innsigelse') return `innsigelsen i ${j.brevet(e.dokument)}`;
      if (e.utsagn.art === 'foresporselssvar')
        return `TEs svar i ${j.brevet(e.dokument)} på forespørselen etter NS 8407 § 33.6.2`;
      break;
    case 'dokument':
      return `innsigelsene i ${j.brevet(e.dokument.id)}`;
  }
  throw new KanIkkeUttrykkes(`${id} har ingen brevtekst som det et utsagn viser til`);
}

/**
 * Det registrerte varselet etter § 32.2 har ingen brevtekst ennå: teksten når et svar viser
 * til det, venter på S-4 i #807, og fra løsningen er påberopelsen varselet (GR-U31).
 */
function uttrykkbar(hjemmel: Varselhjemmel): Kravvarselhjemmel {
  if (hjemmel === '32.2')
    throw new KanIkkeUttrykkes('varselet etter § 32.2 sendt utenfor løsningen har ingen brevtekst');
  return hjemmel;
}

/** VS-U15 og LV-U19: det TE varsler at TE vil kreve. */
const VIL_KREVE: Record<Kravvarselhjemmel, string> = {
  '33.4': 'fristforlengelse',
  '34.1.2': 'justering av vederlaget',
  '34.1.3': `særskilt justering av vederlaget etter annet ledd for ${PRODUKTIVITET}`,
  '34.3.3': 'justering av enhetsprisene',
  '34.4': 'oppgjør som regningsarbeid',
};

/** Hjemmelen for varselet en datoopplysning gjelder (HF-U1). */
function varselhjemmel(id: string, j: Journalen): Varselhjemmel {
  const e = j.element(id);
  if (e.art === 'utsagn' && e.utsagn.art === 'varsel') return e.utsagn.hjemmel;
  throw new KanIkkeUttrykkes(`${id} er ikke et varsel`);
}

/** LV-U4 punkt 3 og 6–13, og VS-U15, KA-U22, KA-U25 og KA-U34 (opphevet av KA-U46) ordrett. */
function utsagnstekst(u: Utsagn, { j, saken, nytt, sak }: Tekst): string {
  const part = PART[nytt.avsender];
  switch (u.art) {
    case 'varsel': {
      const hjemmel = uttrykkbar(u.hjemmel);
      const dato = nytt.opplysninger.find((o) => erDato(o) && o.gjelder === u.id);
      // VS-U15: et brev med bare varselet, uten en dato for det, er selve varselet.
      // LV-U19: varselet etter § 34.1.2 har samme form.
      if (dato === undefined && nytt.utsagn.length === 1 && !nytt.krav.length && !nytt.svar.length)
        return `TE varsler etter ${VARSLET_ETTER[hjemmel]} at TE vil kreve ${VIL_KREVE[hjemmel]} som følge av forholdet i ${sak}.`;
      if (dato?.hva !== 'sendt')
        throw new KanIkkeUttrykkes('et varsel i et brev fra appen har datoen det ble sendt');
      return `TE opplyser at varsel ${VARSEL_OM[hjemmel]} ble sendt ${norskDato(dato.dato)}.`;
    }
    case 'aksept': {
      const svar = j.svar(u.gjelder);
      const aksept = `TE godtar byggherrens svar på ${SVARET_GJELDER[svar.spor]} i ${j.brevet(svar.dokument)}.`;
      // GR-U7: enigheten gjelder beløpet eller dagene, ikke standpunktet til forholdet.
      if (svar.spor === 'forhold' || !saken.subsidiaer[svar.spor].length) return aksept;
      return `${aksept} TE er enig i ${svar.spor === 'vederlag' ? 'beløpet' : svar.spor === 'frist' ? 'antallet dager' : utenGren(svar.spor)}, men ikke i byggherrens standpunkt til grunnlaget.`;
    }
    case 'trekk': {
      const krav = j.krav(u.gjelder);
      // KA-U22, ordrett med saken satt inn.
      if (krav.spor === 'forhold')
        return `TE trekker sitt krav i ${sak}. Trekket er avkall på alle krav i saken, også vederlag og fristforlengelse byggherren har godkjent. Trekket opphever ikke et pålegg, en endringsordre, en utførelsesplikt eller byggherrens rettigheter etter en avtale.`;
      const verdi =
        krav.spor === 'vederlag'
          ? kravetsBeloep(krav)
          : krav.spor === 'frist'
            ? dager(innholdIFristen(krav).dager)
            : utenGren(krav.spor);
      return `TE trekker kravet om ${KRAVET_OM[krav.spor]} i ${sak}, fremsatt i ${j.brevet(krav.dokument)} (${verdi}). Trekket er avkall på dette kravet, også det byggherren har godkjent.`;
    }
    case 'ingen_krav':
      // KA-U22 og KA-U25, ordrett med saken satt inn.
      return u.spor === 'vederlag'
        ? `TE krever ikke justering av vederlaget som følge av forholdet i ${sak}, og gir avkall på slikt krav, også for følger som ikke er kjent i dag. Avkallet omfatter ikke vederlag for forsering etter NS 8407 § 33.8.`
        : u.spor === 'frist'
          ? `TE krever ikke fristforlengelse som følge av forholdet i ${sak}, og gir avkall på slikt krav, også for følger som ikke er kjent i dag.`
          : utenGren(u.spor);
    case 'innsigelse':
      // VS-U29: standpunktet om at begrunnelsen ikke er et svar etter § 33.6.2 annet ledd, uten
      // henvisningen til § 5 (arbeidsvalget 21.10 i #1095).
      if (u.grunn === 'ikke_svar')
        return `${part} gjør gjeldende at ${beskriv(u.gjelder, j)} ikke er et svar etter NS 8407 § 33.6.2 annet ledd.`;
      return `${part} gjør gjeldende at ${beskriv(u.gjelder, j)} kom for sent (NS 8407 § 5 tredje ledd).`;
    case 'foresporsel':
      // LV-U18 setning 1, ordrett med saken satt inn.
      return `Byggherren ber etter NS 8407 § 33.6.2 TE angi og begrunne det antall dager TE krever som fristforlengelse som følge av forholdet i ${sak}. Svarer ikke TE, tapes kravet på fristforlengelse. Har TE ikke grunnlag for å beregne kravet, skal TE i stedet begrunne hvorfor grunnlaget ikke foreligger.`;
    case 'foresporselssvar':
      // LV-U18 setning 2. TEs begrunnelse følger som utdypningen.
      return `TE svarer på byggherrens forespørsel etter NS 8407 § 33.6.2 i ${j.brevet(j.dokumentetTil(u.gjelder))} at grunnlaget for å beregne kravet ikke foreligger (§ 33.6.2 annet ledd b).`;
    case 'protest':
      return `${part} protesterer mot ${beskriv(u.gjelder, j)}.`;
    case 'passivitet': {
      const krav = j.krav(u.gjelder);
      return `TE gjør gjeldende at byggherren ikke svarte uten ugrunnet opphold på TEs varsel etter NS 8407 § 32.2 i ${j.brevet(krav.dokument)}, og at pålegget derfor anses å innebære en endring (NS 8407 § 32.3 annet ledd).`;
    }
    case 'bestridelse': {
      const e = j.element(u.gjelder);
      if (e.art !== 'opplysning') throw new KanIkkeUttrykkes(`${u.gjelder} er ikke en opplysning`);
      return `${part} bestrider opplysningen i ${j.brevet(e.opplysning.dokument)} om at ${opplysningen(e.opplysning, j)}.`;
    }
    case 'avklaring': {
      const e = j.element(u.gjelder);
      if (e.art !== 'opplysning' || e.opplysning.hva !== 'kan_ikke_uttrykkes')
        throw new KanIkkeUttrykkes(`${u.gjelder} er ikke en merking`);
      return `${part} bekrefter at standpunktene i ${j.brevet(e.opplysning.brev)} om ${liste(e.opplysning.spor.map((s) => SPORNAVN[s]))} gjelder uten forbehold fra og med dette brevet.`;
    }
    case 'korrigering': {
      // Punkt 10 i samlevedtaket for retting av sendt brev (MM-U41 (opphevet av MM-U52)), med partene skrevet fullt
      // ut (LV-U35) og henvisningen etter LV-U53.
      const e = j.element(u.gjelder);
      const [dokument, tidligere] =
        e.art === 'krav'
          ? [e.krav.dokument, innholdIForholdet(e.krav).datoer[u.felt]]
          : e.art === 'utsagn' && e.utsagn.art === 'korrigering'
            ? [e.dokument, e.utsagn.dato]
            : [null, null];
      if (dokument === null || typeof tidligere !== 'string')
        throw new KanIkkeUttrykkes(`${u.gjelder} har ingen opplysning om datoen`);
      return `Totalentreprenøren oppgir nå at ${DATOEN_I_BREVET[u.felt]} ${norskDato(u.dato)}. I ${j.brevet(dokument)} oppga totalentreprenøren ${norskDato(tidligere)}.`;
    }
    case 'begrunnelse': {
      // KA-U34: byggherrens tekst følger som utdypningen.
      const svar = j.svar(u.gjelder);
      return `Byggherren begrunner sitt svar på ${SVARET_GJELDER[svar.spor]} i ${j.brevet(svar.dokument)}:`;
    }
  }
}

/** Det en opplysning sier, som en leddsetning: «brevet ble sendt 2. oktober 2026» (LV-U4 punkt 10). */
function opplysningen(o: Opplysning, j: Journalen): string {
  switch (o.hva) {
    case 'sendt':
    case 'mottatt':
      return `${o.gjelder ? `varselet etter NS 8407 § ${varselhjemmel(o.gjelder, j)} i brevet` : 'brevet'} ble ${o.hva} ${norskDato(o.dato)}`;
    case 'endringsordre':
      return `${o.brev === o.dokument ? 'brevet' : j.brevet(o.brev)} ${o.oppfylt ? 'var' : 'ikke var'} en endringsordre etter NS 8407 § 31.3`;
    case 'kan_ikke_uttrykkes':
      return `${o.brev === o.dokument ? 'brevet' : j.brevet(o.brev)} har et forbehold eller annet innhold som ikke er uttrykt i appen`;
  }
}

/** LV-U4 punkt 11. */
function opplysningstekst(o: Opplysning, avsender: Part, j: Journalen): string {
  if (erDato(o) || o.brev === o.dokument)
    throw new KanIkkeUttrykkes(`opplysningen ${o.hva} i et brev fra appen har ingen brevtekst`);
  const sporene =
    o.hva === 'kan_ikke_uttrykkes'
      ? `, og som gjelder ${liste(o.spor.map((s) => SPORNAVN[s]))}`
      : '';
  return `${PART[avsender]} opplyser at ${opplysningen(o, j)}${sporene}.`;
}

// ---------- Brevhodet (LV-U23, LV-U27) ----------

/** Utsagnene som svarer på, godtar eller bestrider det de `gjelder` (LV-U49). */
const SVARER_GODTAR_BESTRIDER = new Set<Utsagn['art']>([
  'aksept',
  'innsigelse',
  'bestridelse',
  'protest',
  'foresporselssvar',
]);

/**
 * Deres ref. i hodet på brevet `nytt`: merkingen på hvert av motpartens brev som utsagnene i
 * brevet svarer på, godtar eller bestrider, slik de uttrykkelig viser til dem (LV-U49, HF-U1),
 * i rekkefølgen etter brevnummeret (U-2 i BF-07). En ny kravversjon viser til byggherrens siste
 * svar på kravversjonen den erstatter, slik journalen står når den sendes, lest av `erstatter`
 * og `gjelder` og ikke av rekkefølgen (LV-U50, LV-U51). Et eget brev står ikke, og heller ikke
 * motpartens brev uten merking, som registrert korrespondanse (LV-U27: «når de finnes»).
 */
export function lagDeresRef(nytt: Dokument, foer: Domenehendelse[]): string[] {
  const j = new Journalen(foer, nytt);
  const viserTil: string[] = [
    ...nytt.svar.map((s) => s.gjelder),
    ...nytt.svar.flatMap((s) => s.standpunkter.flatMap(detRettidighetenGjelder)),
    ...nytt.utsagn.flatMap((x) =>
      SVARER_GODTAR_BESTRIDER.has(x.art) && 'gjelder' in x ? [x.gjelder] : []
    ),
    ...nytt.krav.flatMap((k) => (k.erstatter ? sisteSvarPaa(k.erstatter, j) : [])),
    // LV-U49: kravet som svarer på forespørselen etter § 33.6.2, svarer på byggherrens brev.
    ...nytt.krav.flatMap((k) => (k.gjelder ? [k.gjelder] : [])),
  ];
  const brev = new Map<string, Dokument>();
  for (const id of viserTil) {
    const d = j.dokumentMed(id);
    if (d && d.id !== nytt.id && d.avsender !== nytt.avsender && d.merking !== null)
      brev.set(d.id, d);
  }
  return [...brev.values()]
    .sort((a, b) => (a.brevnummer ?? 0) - (b.brevnummer ?? 0))
    .map((d) => d.merking!);
}

/**
 * Det et standpunkt om rettidighet gjelder: varselet, kravversjonen eller TEs svar på
 * forespørselen etter § 33.6.2, også når svaret er en begrunnelse i et eget brev (LV-U49, D-1 og
 * U-6 i BF-07, arbeidsvalgene A i #1497), også det første grunnlagskravet etter § 32.2
 * (VS-U43 punkt 10). Forespørselen, som brevteksten nevner for § 33.6.2, er byggherrens eget brev og holdes ute av
 * filteret på avsender i `lagDeresRef`.
 */
const detRettidighetenGjelder = (p: Standpunkt): string[] =>
  p.art === 'rettidighet' ? [p.gjelder] : [];

/** LV-U51: svaret på kravversjonen som ingen senere revisjon erstatter, eller ingen. */
function sisteSvarPaa(krav: string, j: Journalen): string[] {
  const svar = j.dokumenter.flatMap((d) => d.svar.filter((s) => s.gjelder === krav));
  const erstattet = new Set(svar.map((s) => s.erstatter));
  return svar.filter((s) => !erstattet.has(s.id)).map((s) => s.id);
}

// ---------- Gjengivelsen (LV-U2) ----------

/** Teksten i avsnittene slik et dokument gjengir den: den låste delen, så utdypningen. */
export function gjengi(brevtekst: Avsnitt[]): string {
  return deler(brevtekst).join('\n\n');
}

const deler = (brevtekst: Avsnitt[]) =>
  brevtekst.flatMap((a) => (a.utdypning ? [a.laast, a.utdypning] : [a.laast]));

const normalisert = (t: string) => t.replace(/\s+/g, ' ').trim();

/**
 * LV-U2: `gjengitt` er en tro gjengivelse av den frosne teksten når hvert låst
 * avsnitt og hver utdypning står ordrett, i samme rekkefølge. Mellomrom og
 * linjeskift kan være annerledes, slik en PDF bryter linjene.
 */
export function gjengirTro(gjengitt: string, brevtekst: Avsnitt[]): boolean {
  const tekst = normalisert(gjengitt);
  let fra = 0;
  for (const del of deler(brevtekst).map(normalisert)) {
    const plass = tekst.indexOf(del, fra);
    if (plass < 0) return false;
    fra = plass + del.length;
  }
  return true;
}
