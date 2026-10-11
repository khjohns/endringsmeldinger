/**
 * Brevteksten i et brev appen sender (LV-U2, LV-U3, #369): ett avsnitt for hvert
 * krav, svar, utsagn og hver opplysning parten sier i brevet, med den låste delen
 * appen lager av valgene og partens utdypning hver for seg (B-13 om
 * begrunnelsestekst). Teksten lages når brevet skrives, fryses i dokumentet og
 * lages ikke på nytt (MM-U9). Ingen regel leser den. Et registrert brev får ingen
 * tekst (MM-U17).
 *
 * Teksten sier det parten sa, også et standpunkt appen regner som uten virkning.
 * Appens vurdering står ikke der: at et standpunkt er uten virkning, om § 32.2
 * gjaldt, eller sammenfallet (LV-U3, HF-U2, MM-U12). «Prinsipalt» og
 * «subsidiært» er slik brevet ordner standpunktene (HF-U2). Appen tolker ikke
 * utdypningen (KA-U16, KA-U19).
 */

import { erRegistrert } from '../format/leser.ts';
import type { Regelsett } from '../regler/regelsett.ts';
import {
  blirEndringsordre,
  gjelderVarslingsplikten,
  innsigelsenErOppgitt,
  innsigelsenGjelderSvaret,
} from './standpunkt.ts';
import type {
  Avsnitt,
  Dokument,
  Domenehendelse,
  Krav,
  Opplysning,
  Part,
  Spor,
  Standpunkt,
  Svar,
  Utsagn,
} from '../typer.ts';

/** Saken brevet gjelder: sak-ID-en og sakstittelen (KA-U22). */
export interface Saken {
  saksnummer: string;
  tittel: string;
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

const DAG = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Datoen i Oslo for et tidspunkt, eller datoen slik den er oppgitt. «2. oktober 2026». */
export function norskDato(tid: string): string {
  const dag = DAG.test(tid)
    ? tid
    : new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Oslo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(tid));
  const [, aar, maaned, dato] = DAG.exec(dag)!;
  return `${Number(dato)}. ${MAANEDER[Number(maaned) - 1]} ${aar}`;
}

/** Kroner med mellomrom mellom tusener og øre bare når de finnes: «150 000 kr». */
export function kroner(n: number): string {
  const [hele, oere] = Math.abs(n).toFixed(2).split('.');
  const gruppert = hele.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${n < 0 ? '−' : ''}${gruppert}${oere === '00' ? '' : `,${oere}`} kr`;
}

const dager = (n: number) => `${n} ${n === 1 ? 'dag' : 'dager'}`;

/** Kategoriene med navnene i kontrakten og hjemmelen for grunnlaget. */
const HOVEDKATEGORI: Record<string, string> = {
  endring: 'endring (NS 8407 § 33.1 a)',
  svikt: 'forsinkelse eller svikt ved byggherrens ytelser (NS 8407 § 33.1 b)',
  andre_forhold: 'andre hindringer byggherren bærer risikoen for (NS 8407 § 33.1 c)',
  force_majeure: 'force majeure (NS 8407 § 33.3)',
};

const UNDERKATEGORI: Record<string, string> = {
  endringsordre: 'endringsordre (§ 31.3)',
  irregulaer_endring: 'irregulær endring i form av pålegg (§ 32.1)',
  valg_av_loesning: 'begrensning av valgrett (§ 14.6)',
  svar_paa_varsel: 'endring ved svar på varsel (§ 24.2.2)',
  lovendring_gjenstand: 'endring i lover og vedtak som gjelder kontraktsgjenstanden (§ 14.4)',
  lovendring_prosess: 'endring i lover og vedtak som gjelder utførelsen (§ 15.2)',
  gebyrer_og_avgifter: 'endring i gebyrer og avgifter (§ 26.3)',
  samordning: 'samordning (§ 21.4)',
  medvirkning: 'manglende medvirkning eller leveranser fra byggherren (§ 22)',
  grunnforhold: 'uforutsette grunnforhold (§ 23.1)',
  kulturminner: 'funn av kulturminner (§ 23.3)',
  prosjektering: 'svikt i byggherrens prosjektering (§ 24.1)',
  nektet_kontraktsmedhjelper: 'nektelse av kontraktsmedhjelper (§ 10.2)',
  skade_fra_byggherren: 'skade forårsaket av byggherren eller en sideentreprenør (§ 19.1)',
  brukstakelse: 'urettmessig brukstakelse (§ 38.1 annet ledd)',
  stans_ved_betalingsmislighold: 'stans ved betalingsmislighold (§ 29.2)',
  annet_forhold: 'annet forhold (§ 33.1 c)',
};

const PART: Record<Part, string> = { TE: 'TE', BH: 'Byggherren' };

const SPORNAVN: Record<Spor, string> = {
  grunnlag: 'grunnlaget',
  vederlag: 'vederlaget',
  frist: 'fristen',
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

/** Oppslagene teksten trenger i journalen før brevet og i brevet selv. */
class Journalen {
  private readonly brev = new Map<string, { versjon: number; dokument: Dokument }>();
  private readonly elementer = new Map<string, Element>();
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
  }

  element(id: string): Element {
    const e = this.elementer.get(id);
    if (!e) throw new KanIkkeUttrykkes(`brevet viser til ${id}, som ikke finnes i saken`);
    return e;
  }

  dokument(id: string): Dokument {
    return this.brev.get(id)!.dokument;
  }

  /** «brev 3 av 2. oktober 2026»: saksversjonen og datoen brevet ble sendt (HF-U1). */
  brevet(id: string): string {
    const b = this.brev.get(id);
    if (!b || b.versjon === 0) throw new KanIkkeUttrykkes(`${id} er ikke et tidligere brev`);
    const sendt = erRegistrert(b.dokument.opplysninger)
      ? b.dokument.opplysninger.find(
          (o): o is Extract<Opplysning, { hva: 'sendt' | 'mottatt' }> =>
            (o.hva === 'sendt' || o.hva === 'mottatt') && o.gjelder === undefined
        )!.dato
      : b.dokument.registrert;
    return `brev ${b.versjon} av ${norskDato(sendt)}`;
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
 * tolkning (KA-U19). Kaster `KanIkkeUttrykkes` når et element ikke kan uttrykkes.
 */
export function lagBrevtekst(
  nytt: Dokument,
  foer: Domenehendelse[],
  saken: Saken,
  regler: Regelsett,
  utdypningene: ReadonlyMap<string, string> = new Map()
): Avsnitt[] {
  const utdypninger = new Map(utdypningene);
  if (erRegistrert(nytt.opplysninger))
    throw new KanIkkeUttrykkes('et registrert brev står som det ble sendt (MM-U17)');
  const j = new Journalen(foer, nytt);
  const sak = `sak ${saken.saksnummer} («${saken.tittel}»)`;

  const kravet = (k: Krav): string => {
    const b = j.brevet(k.dokument);
    if (k.spor === 'grunnlag') return `TEs krav i ${b}`;
    if (k.spor === 'vederlag')
      return `TEs krav om justering av vederlaget på ${kroner(k.innhold.beloep as number)} i ${b}`;
    return `TEs krav om fristforlengelse på ${dager(k.innhold.dager as number)} i ${b}`;
  };

  const avsnitt: Avsnitt[] = [];
  const legg = (gjelder: string, laast: string) => {
    const utdypning = utdypninger.get(gjelder);
    avsnitt.push({ gjelder, laast, ...(utdypning ? { utdypning } : {}) });
  };

  for (const k of nytt.krav) {
    // Grunnlagskravets beskrivelse er TEs utdypning (LV-U3).
    if (typeof k.innhold.beskrivelse === 'string') utdypninger.set(k.id, k.innhold.beskrivelse);
    legg(k.id, kravtekst(k, sak, j, regler));
  }
  for (const s of nytt.svar) legg(s.id, svartekst(s, nytt, j, kravet));
  for (const u of nytt.utsagn) legg(u.id, utsagnstekst(u, nytt, sak, j, kravet));
  for (const o of nytt.opplysninger) {
    // Datoen for et varsel står i avsnittet for varselet.
    if ((o.hva === 'sendt' || o.hva === 'mottatt') && o.gjelder !== undefined) continue;
    legg(o.id, opplysningstekst(o, nytt.avsender, j));
  }
  return avsnitt;
}

function kravtekst(k: Krav, sak: string, j: Journalen, regler: Regelsett): string {
  const deler: string[] = [];
  if (k.spor === 'grunnlag') {
    const tittel = typeof k.innhold.tittel === 'string' ? ` «${k.innhold.tittel}»` : '';
    const kategori = [
      HOVEDKATEGORI[k.innhold.hovedkategori as string],
      UNDERKATEGORI[k.innhold.underkategori as string],
    ].filter(Boolean);
    deler.push(
      `TE krever endring for forholdet${tittel} i ${sak}. Kategori: ${kategori.join(', ')}.`
    );
    if (gjelderVarslingsplikten(k, regler))
      deler.push(
        'TE varsler etter NS 8407 § 32.2 at TE påberoper seg at pålegget innebærer en endring.'
      );
  } else if (k.spor === 'vederlag') {
    deler.push(
      `TE gir tilbud på justering av vederlaget på ${kroner(k.innhold.beloep as number)} (NS 8407 § 34.2.1).`
    );
  } else {
    deler.push(
      `TE krever fristforlengelse på ${dager(k.innhold.dager as number)} (NS 8407 § 33.6.1).`
    );
  }
  if (k.erstatter)
    deler.push(`Kravet erstatter kravet i ${j.brevet(j.krav(k.erstatter).dokument)}.`);
  return deler.join(' ');
}

/**
 * VS-U9, VS-U11: brevet med den første innsigelsen fra byggherren som svaret kan
 * leses med, og som byggherren ikke senere har gitt opp uttrykkelig.
 */
function aapenInnsigelse(svar: Svar, avsender: Part, j: Journalen): string | undefined {
  const varsler = j.dokumenter.flatMap((d) =>
    d.utsagn.filter((u) => u.art === 'varsel').map((u) => u.id)
  );
  const svarFraParten: Svar[] = [];
  const innsigelser: { gjelder: string; dokument: string; fra: number }[] = [];
  for (const d of j.dokumenter) {
    if (d.avsender !== avsender || d.svar.includes(svar)) continue;
    svarFraParten.push(...d.svar);
    for (const u of d.utsagn)
      if (u.art === 'innsigelse')
        innsigelser.push({ gjelder: u.gjelder, dokument: d.id, fra: svarFraParten.length });
  }
  return innsigelser.find(
    (i) =>
      innsigelsenGjelderSvaret(i.gjelder, svar, varsler) &&
      !innsigelsenErOppgitt(i.gjelder, svar.spor, svarFraParten.slice(i.fra))
  )?.dokument;
}

function svartekst(s: Svar, nytt: Dokument, j: Journalen, kravet: (k: Krav) => string): string {
  const krav = j.krav(s.gjelder);
  const virkning = new Map(s.beslutningsgrunnlag.virkninger.map((v) => [v.standpunkt, v.virkning]));
  const ordnet = s.standpunkter.some((p) => virkning.get(p.id) === 'subsidiaert');
  const innsigelse = aapenInnsigelse(s, nytt.avsender, j);
  const henvisning = innsigelse && j.brevet(innsigelse);
  let subsidiaere = 0;
  const setninger = s.standpunkter.map((p) => {
    const tekst = standpunkttekst(p, s, krav, j, henvisning);
    const v = virkning.get(p.id);
    if (!ordnet || v === 'uten_virkning') return tekst;
    if (v === 'prinsipalt') return `Prinsipalt: ${tekst}`;
    return `${subsidiaere++ ? 'Videre subsidiært' : 'Subsidiært'}: ${tekst}`;
  });
  return [`Byggherren svarer på ${kravet(krav)}.`, ...setninger].join(' ');
}

function standpunkttekst(
  p: Standpunkt,
  s: Svar,
  krav: Krav,
  j: Journalen,
  henvisning: string | undefined
): string {
  const grunnlagskrav =
    s.spor === 'grunnlag' ? krav : s.grunnlagskrav ? j.krav(s.grunnlagskrav) : null;
  switch (p.art) {
    case 'rettidighet': {
      const varselet =
        p.hjemmel === '32.2'
          ? 'TEs varsel etter NS 8407 § 32.2'
          : 'varselet om fristforlengelse etter NS 8407 § 33.4';
      if (!p.iTide)
        return `Byggherren gjør gjeldende at ${varselet} kom for sent${henvisning ? `, jf. innsigelsen i ${henvisning}` : ''}.`;
      return henvisning
        ? `Byggherren opprettholder ikke innsigelsen etter NS 8407 § 5 i ${henvisning}, og godtar at ${varselet} kom i tide.`
        : `Byggherren godtar at ${varselet} kom i tide.`;
    }
    case 'grunnlag':
      if (p.resultat === 'godkjent')
        return blirEndringsordre(s.beslutningsgrunnlag)
          ? `Byggherren godkjenner grunnlaget. Svaret er en endringsordre etter NS 8407 § 32.3 første ledd a, jf. § 31.3: byggherren krever endringen utført slik den er beskrevet i ${kravetsBrev(krav, j)}.`
          : 'Byggherren godkjenner grunnlaget.';
      if (p.resultat === 'avslaatt') return 'Byggherren avslår grunnlaget.';
      return 'Byggherren frafaller pålegget mot å utstede endringsordre for arbeid som alt er utført (NS 8407 § 32.3 første ledd c).';
    case 'hindring': {
      const hjemmel =
        grunnlagskrav?.innhold.hovedkategori === 'force_majeure' ? '§ 33.3' : '§ 33.1';
      return `Byggherren ${p.oppfylt ? 'godtar' : 'godtar ikke'} at fremdriften hindres av forholdet (NS 8407 ${hjemmel}).`;
    }
    case 'beloep':
      return verdi(p.resultat, kroner(p.godkjent), kroner(krav.innhold.beloep as number));
    case 'dager':
      return verdi(p.resultat, dager(p.vurdert), dager(krav.innhold.dager as number));
  }
}

function verdi(resultat: string, godkjent: string, krevd: string): string {
  if (resultat === 'godkjent') return `Byggherren godkjenner ${godkjent}.`;
  if (resultat === 'delvis_godkjent')
    return `Byggherren godkjenner ${godkjent} av de krevde ${krevd}.`;
  if (resultat === 'avslaatt') return 'Byggherren avslår kravet.';
  throw new KanIkkeUttrykkes(`standpunktet ${resultat} har ingen brevtekst`);
}

const kravetsBrev = (k: Krav, j: Journalen) => `TEs krav i ${j.brevet(k.dokument)}`;

/** Det et utsagn eller en innsigelse viser til, med brevet det står i. */
function beskriv(id: string, j: Journalen, kravet: (k: Krav) => string): string {
  const e = j.element(id);
  switch (e.art) {
    case 'krav':
      return kravet(e.krav);
    case 'svar':
      return `byggherrens svar i ${j.brevet(e.svar.dokument)} på ${kravet(j.krav(e.svar.gjelder))}`;
    case 'standpunkt':
      return `påberopelsen av for sen varsling i byggherrens svar i ${j.brevet(e.svar.dokument)}`;
    case 'utsagn':
      if (e.utsagn.art === 'varsel')
        return `TEs varsel om fristforlengelse etter NS 8407 § 33.4 i ${j.brevet(e.dokument)}`;
      if (e.utsagn.art === 'innsigelse') return `innsigelsen i ${j.brevet(e.dokument)}`;
      break;
    case 'dokument':
      return `innsigelsene i ${j.brevet(e.dokument.id)}`;
  }
  throw new KanIkkeUttrykkes(`${id} har ingen brevtekst som det et utsagn viser til`);
}

function utsagnstekst(
  u: Utsagn,
  nytt: Dokument,
  sak: string,
  j: Journalen,
  kravet: (k: Krav) => string
): string {
  const part = PART[nytt.avsender];
  switch (u.art) {
    case 'varsel': {
      const dato = nytt.opplysninger.find(
        (o) => (o.hva === 'sendt' || o.hva === 'mottatt') && o.gjelder === u.id
      );
      if (dato?.hva !== 'sendt')
        throw new KanIkkeUttrykkes('et varsel i et brev fra appen har datoen det ble sendt');
      return `TE opplyser at varsel om fristforlengelse etter NS 8407 § 33.4 ble sendt ${norskDato(dato.dato)}.`;
    }
    case 'aksept': {
      const svar = j.svar(u.gjelder);
      return `TE godtar byggherrens svar i ${j.brevet(svar.dokument)} på ${kravet(j.krav(svar.gjelder))}.`;
    }
    case 'trekk': {
      // KA-U22, ordrett med saken og kravversjonen satt inn.
      const krav = j.krav(u.gjelder);
      if (krav.spor === 'grunnlag')
        return `TE trekker sitt krav i ${sak}. Trekket er avkall på alle krav i saken, også vederlag og fristforlengelse byggherren har godkjent. Trekket opphever ikke et pålegg, en endringsordre, en utførelsesplikt eller byggherrens rettigheter etter en avtale.`;
      const hva = krav.spor === 'vederlag' ? 'justering av vederlaget' : 'fristforlengelse';
      const verdi =
        krav.spor === 'vederlag'
          ? kroner(krav.innhold.beloep as number)
          : dager(krav.innhold.dager as number);
      return `TE trekker kravet om ${hva} i ${sak}, sist fremsatt med ${verdi} i ${j.brevet(krav.dokument)}. Trekket er avkall på dette kravet, også det byggherren har godkjent.`;
    }
    case 'ingen_krav':
      // KA-U22 og KA-U25, ordrett med saken satt inn.
      return u.spor === 'vederlag'
        ? `TE krever ikke justering av vederlaget som følge av forholdet i ${sak}, og gir avkall på slikt krav, også for følger som ikke er kjent i dag. Avkallet omfatter ikke vederlag for forsering etter NS 8407 § 33.8.`
        : `TE krever ikke fristforlengelse som følge av forholdet i ${sak}, og gir avkall på slikt krav, også for følger som ikke er kjent i dag.`;
    case 'innsigelse':
      return `${part} gjør gjeldende at ${beskriv(u.gjelder, j, kravet)} kom for sent (NS 8407 § 5 tredje ledd).`;
    case 'protest':
      return `${part} bestrider ${beskriv(u.gjelder, j, kravet)}.`;
    case 'passivitet': {
      const krav = j.krav(u.gjelder);
      return `TE gjør gjeldende at byggherren ikke har svart uten ugrunnet opphold på TEs varsel etter NS 8407 § 32.2 i ${j.brevet(krav.dokument)}, og at pålegget derfor anses å innebære en endring (NS 8407 § 32.3 annet ledd).`;
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
      return `${part} bekrefter at standpunktene i ${j.brevet(e.opplysning.brev)} gjelder uten forbehold.`;
    }
  }
}

/** Det en opplysning sier, som en leddsetning: «brevet ble sendt 2. oktober 2026». */
function opplysningen(o: Opplysning, j: Journalen): string {
  switch (o.hva) {
    case 'sendt':
    case 'mottatt':
      return `${o.gjelder ? 'varselet' : 'brevet'} ble ${o.hva} ${norskDato(o.dato)}`;
    case 'endringsordre':
      return `${o.brev === o.dokument ? 'brevet' : j.brevet(o.brev)} ${o.oppfylt ? 'var' : 'ikke var'} en endringsordre etter NS 8407 § 31.3`;
    case 'kan_ikke_uttrykkes':
      return `${o.brev === o.dokument ? 'brevet' : j.brevet(o.brev)} har et forbehold eller annet innhold som ikke er uttrykt i appen`;
  }
}

function opplysningstekst(o: Opplysning, avsender: Part, j: Journalen): string {
  if (o.hva === 'kan_ikke_uttrykkes' && o.brev !== o.dokument)
    return `${PART[avsender]} opplyser at ${j.brevet(o.brev)} har et forbehold eller annet innhold som ikke er uttrykt i appen, og som gjelder ${liste(o.spor.map((s) => SPORNAVN[s]))}.`;
  if (o.hva === 'endringsordre' && o.brev !== o.dokument)
    return `${PART[avsender]} opplyser at ${j.brevet(o.brev)} ${o.oppfylt ? 'var' : 'ikke var'} en endringsordre etter NS 8407 § 31.3.`;
  throw new KanIkkeUttrykkes(`opplysningen ${o.hva} i et brev fra appen har ingen brevtekst`);
}

// ---------- Gjengivelsen (LV-U2) ----------

/** Teksten i avsnittene slik et dokument gjengir den: den låste delen, så utdypningen. */
export function gjengi(brevtekst: Avsnitt[]): string {
  return brevtekst.flatMap((a) => (a.utdypning ? [a.laast, a.utdypning] : [a.laast])).join('\n\n');
}

const normalisert = (t: string) => t.replace(/\s+/g, ' ').trim();

/**
 * LV-U2: `gjengitt` er en tro gjengivelse av den frosne teksten når hvert låst
 * avsnitt og hver utdypning står ordrett, i samme rekkefølge. Mellomrom og
 * linjeskift kan være annerledes, slik en PDF bryter linjene.
 */
export function gjengirTro(gjengitt: string, brevtekst: Avsnitt[]): boolean {
  const tekst = normalisert(gjengitt);
  let fra = 0;
  for (const del of brevtekst.flatMap((a) => (a.utdypning ? [a.laast, a.utdypning] : [a.laast]))) {
    const plass = tekst.indexOf(normalisert(del), fra);
    if (plass < 0) return false;
    fra = plass + normalisert(del).length;
  }
  return true;
}
