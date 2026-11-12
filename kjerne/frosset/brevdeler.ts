/**
 * Byggeklossene i brevteksten (#1783): journalen teksten slår opp i, saken før brevet, datoen
 * og beløpet med ordene i brevet og setningene teksten i flere spor deler. `frosset/brevtekst.ts`
 * og teksten i sporene (`kjerne/spor/<spor>/tekst.ts`) bygger på dem.
 */

import { erRegistrert, kalenderdag } from '../format/leser.ts';
import type { Subsidiaergrunn } from '../regler/forhold.ts';
import type { Regelsett } from '../regler/regelsett.ts';
import { kravposterI } from '../spor/vederlag/format.ts';
import { kroner } from './tekst.ts';
import type {
  Dokument,
  Domenehendelse,
  Korrespondansetype,
  Krav,
  Kravpost,
  Kravpostvarselet,
  Kravspor,
  Opplysning,
  Part,
  Hjemmel,
  Sakskode,
  Standpunkt,
  Standpunktsart,
  Svar,
  Utsagn,
} from '../typer.ts';
import type { OppgittDato } from '../spor/forhold/format.ts';

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
  /**
   * Varselet etter § 34.1.2 og § 34.1.3 saken har før brevet, som et registrert varsel eller et
   * tidligere krav (`varseletFoerBrevet` i utledningen). Uten det er kravet i brevet varselet.
   */
  varsletFoer: Partial<Record<'34.1.2' | '34.1.3', string>>;
}

/** Kravet en kommando om et kommende avsnitt ikke kan uttrykke. Brevet skrives ikke. */
export class KanIkkeUttrykkes extends Error {}

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
export const eksMva = (n: number) => `${kroner(n)} eks. mva.`;

/** Setningen med punktum, også når den slutter på en forkortelse. */
export const punktum = (t: string) => (t.endsWith('.') ? t : `${t}.`);

/** En opplysning om når et brev eller et varsel ble sendt eller mottatt. */
export const erDato = (o: Opplysning): o is Extract<Opplysning, { hva: 'sendt' | 'mottatt' }> =>
  o.hva === 'sendt' || o.hva === 'mottatt';

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
export class Journalen {
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

/** Det hver del av teksten trenger: journalen, saken før brevet og brevet selv. */
export interface Tekst {
  j: Journalen;
  saken: Saken;
  nytt: Dokument;
  /** «sak KOE-17 («<sakstittel>»)» (KA-U22, LV-U44). */
  sak: string;
}

/**
 * Et punkt i brevteksten for ett element (#1824, LV-U34): overskriften uten nummeret, eller
 * `null` for innledningen, og avsnittene. Nummeret settes når hele brevet er laget.
 */
export interface Brevpunkt {
  overskrift: string | null;
  avsnitt: string[];
}

/** Setningene som ett avsnitt uten overskrift. */
export const utenOverskrift = (setninger: string[]): Brevpunkt => ({
  overskrift: null,
  avsnitt: [setninger.join(' ')],
});

/** Det særskilte kravet etter § 34.1.3 annet ledd, med ordene i bestemmelsen. */
export const PRODUKTIVITET =
  'økte utgifter på grunn av nedsatt produktivitet eller forstyrrelser på annet arbeid';

/** Betegnelsene i rekkefølge, med «og» før den siste. */
export const opplistet = (a: string[]) =>
  a.length > 1 ? `${a.slice(0, -1).join(', ')} og ${a.at(-1)}` : a[0];

/** Kravversjonene før `k` i sporet, eldste først. */
export function tidligere(k: Krav, j: Journalen): Krav[] {
  const ut: Krav[] = [];
  for (let id = k.erstatter; id; id = j.krav(id).erstatter) ut.unshift(j.krav(id));
  return ut;
}

export function verdi(
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

/** Kravposten standpunktet gjelder (KA-U57 (c) og (d)). */
export function kravpostenI(krav: Krav, gjelder: string): Kravpost {
  const post = kravposterI(krav).find((k) => k.id === gjelder);
  if (!post) throw new KanIkkeUttrykkes(`kravet har ikke kravposten ${gjelder}`);
  return post;
}

/** Brevteksten i ett spor, som `frosset/brevtekst.ts` slår opp gjennom `BREVTEKST` (#1783). */
export interface Sporsbrevtekst {
  /** Sporet i opplysningen og avklaringen om et brev med innhold appen ikke uttrykker. */
  navn: string;
  /** Det et svar eller en aksept gjelder, med kontraktens ord (LV-U4 punkt 4 og 6). */
  svaretGjelder: string;
  /** Kravet (LV-U4 punkt 2–3) i punkter, uten setningen om kravet det erstatter. */
  krav(k: Krav, t: Tekst, regler: Regelsett): Brevpunkt[];
  /** Påberopelsene utenom hjemmelen for sporet som svaret gjentar eller gir opp (VS-U29). */
  ogsaaInnsigelserEtter: readonly Hjemmel[];
  /**
   * Brevteksten legger til setningen om kravet en ny versjon erstatter (KA-U52 punkt 4, LV-U56).
   * Vederlagskravet har setningen selv, i innledningen (#1824).
   */
  nevnerErstattet: boolean;
  /** Overskriften partens utdypning under kravet står under, når den er et eget punkt (#1824). */
  utdypningenUnder?: string;
  /** Kravet i sporet med kontraktens ord, når kravet har et: «kravet om <…>». */
  kravetOm?: string;
}

/** Brevteksten i et spor med krav om vederlag eller frist. */
export interface Kravsporsbrevtekst extends Sporsbrevtekst {
  kravetOm: string;
  /** Det TE er enig i når aksepten ikke gjelder standpunktet til grunnlaget (GR-U7). */
  enigI: string;
  /** Det som identifiserer kravet i trekket (KA-U22). */
  trukket(krav: Krav): string;
  /** At TE ikke krever noe i sporet (KA-U22, KA-U25). */
  ingenKrav(sak: string): string;
}

/** Standpunktet i hver art. */
export type StandpunktIArt = { [K in Standpunktsart]: Extract<Standpunkt, { art: K }> };

/** Teksten for standpunktet i en art som bare ett spor har, med kravet, svaret og journalen (#1783). */
export type Standpunktstekster<A extends Standpunktsart> = {
  [K in A]: (p: StandpunktIArt[K], krav: Krav, svar: Svar, j: Journalen) => string;
};

/** Brevet kan ikke sendes fra appen slik saken står, og kommandoen avvises med `regel`. */
export class BrevetAvvises extends Error {
  readonly regel: string;
  constructor(regel: string, melding: string) {
    super(melding);
    this.regel = regel;
  }
}

/** Teksten med stor forbokstav. */
export const stor = (t: string) => `${t[0].toUpperCase()}${t.slice(1)}`;

/** Delene i rekkefølge, med «og» før den siste. */
export function liste(deler: string[]): string {
  return deler.length < 2 ? deler.join('') : `${deler.slice(0, -1).join(', ')} og ${deler.at(-1)}`;
}
