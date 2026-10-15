/**
 * Brevteksten i et brev appen sender (LV-U2, LV-U3, #369): ett avsnitt for hvert
 * krav, svar, utsagn og hver opplysning parten sier i brevet, og ett for
 * vedleggene, med den låste delen appen lager av valgene og partens utdypning hver
 * for seg (B-13 om begrunnelsestekst). Ordlyden er LV-U4, GR-U14 og GR-U16, og
 * hva teksten omfatter, A2–A5 i paragrafmatrisen. Teksten lages når brevet
 * skrives, fryses i dokumentet og lages ikke på nytt (MM-U9). Ingen regel leser
 * den. Et registrert brev får ingen tekst (MM-U17).
 *
 * Teksten sier det parten sa, også et standpunkt appen regner som uten virkning.
 * Appens vurdering står ikke der: at et standpunkt er uten virkning, om § 32.2
 * gjaldt, eller sammenfallet (LV-U3, HF-U2, MM-U12). «Prinsipalt» og
 * «subsidiært» er slik brevet ordner standpunktene (HF-U2). Appen tolker ikke
 * utdypningen (KA-U16, KA-U19).
 */

import { erRegistrert } from '../format/leser.ts';
import { erKalenderdato } from '../format/skjema.ts';
import { beloep, tilKrone } from '../regler/beloep.ts';
import type { Subsidiaergrunn } from '../regler/grunnlag.ts';
import type { Regelsett } from '../regler/regelsett.ts';
import {
  blirEndringsordre,
  gjelderVarslingsplikten,
  grunnerFraGrunnlaget,
  innsigelsenErOppgitt,
  innsigelsenGjelderSvaret,
  prinsipalt,
} from './standpunkt.ts';
import type {
  Avsnitt,
  Dokument,
  Domenehendelse,
  Hjemmel,
  Kravspor,
  Krav,
  Opplysning,
  Part,
  Spor,
  Standpunkt,
  Svar,
  Utsagn,
} from '../typer.ts';

/**
 * Saken slik den var før brevet: sak-ID-en og sakstittelen (KA-U22), gjeldende
 * svar på grunnlaget (A2) og hvorfor svaret i et spor er subsidiært til grunnlaget
 * (LV-U4 punkt 6). Skrivingen leser dem av utledningen.
 */
export interface Saken {
  saksnummer: string;
  tittel: string;
  grunnlagssvar: string | null;
  subsidiaer: Record<Kravspor, Subsidiaergrunn[]>;
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

const DAG = /^(\d{4})-(\d{2})-(\d{2})$/;

const OSLO = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Oslo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Datoen i Oslo for et tidspunkt, eller datoen slik den er oppgitt. «2. oktober 2026». */
export function norskDato(tid: string): string {
  const tidspunkt = new Date(tid);
  if (DAG.test(tid) ? !erKalenderdato(tid) : Number.isNaN(tidspunkt.getTime()))
    throw new KanIkkeUttrykkes(`${tid} er ikke en dato`);
  const dag = DAG.test(tid) ? tid : OSLO.format(tidspunkt);
  const [, aar, maaned, dato] = DAG.exec(dag)!;
  return `${Number(dato)}. ${MAANEDER[Number(maaned) - 1]} ${aar}`;
}

/** Kroner med mellomrom mellom tusener og øre bare når de finnes: «150 000 kr». */
export function kroner(n: number): string {
  // Avrundet til hele øre som reglene runder (`beloep`), ikke som flyttallet.
  const i = beloep(n)!;
  const abs = i < 0n ? -i : i;
  const gruppert = String(abs / 100n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
  const oere = String(abs % 100n).padStart(2, '0');
  return `${i < 0n ? '−' : ''}${gruppert}${oere === '00' ? '' : `,${oere}`}\u00a0kr`;
}

/** Et beløp i brevet er uten merverdiavgift, og teksten sier det (LV-U4 punkt 2). */
const eksMva = (n: number) => `${kroner(n)} eks. mva.`;

const dager = (n: number) => `${n} ${n === 1 ? 'dag' : 'dager'}`;

/** Setningen med punktum, også når den slutter på en forkortelse. */
const punktum = (t: string) => (t.endsWith('.') ? t : `${t}.`);

/** En opplysning om når et brev eller et varsel ble sendt eller mottatt. */
const erDato = (o: Opplysning): o is Extract<Opplysning, { hva: 'sendt' | 'mottatt' }> =>
  o.hva === 'sendt' || o.hva === 'mottatt';

const stor = (t: string) => `${t[0].toUpperCase()}${t.slice(1)}`;

/** Underkategoriene med betegnelsen i kontrakten og hjemmelen (LV-U4 punkt 1). */
const UNDERKATEGORI: Record<string, { navn: string; hjemmel: string }> = {
  irregulaer_endring: { navn: 'irregulær endring i form av pålegg', hjemmel: '32.1' },
  valg_av_loesning: { navn: 'begrensning av valgrett', hjemmel: '14.6' },
  svar_paa_varsel: { navn: 'endring ved svar på varsel', hjemmel: '24.2.2' },
  lovendring_gjenstand: {
    navn: 'endring i lover og vedtak som gjelder kontraktsgjenstanden',
    hjemmel: '14.4',
  },
  lovendring_prosess: { navn: 'endring i lover og vedtak som gjelder utførelsen', hjemmel: '15.2' },
  gebyrer_og_avgifter: { navn: 'endring i gebyrer og avgifter', hjemmel: '26.3' },
  samordning: { navn: 'samordning', hjemmel: '21.4' },
  medvirkning: {
    navn: 'manglende medvirkning eller leveranser fra byggherren',
    hjemmel: '22',
  },
  grunnforhold: { navn: 'uforutsette grunnforhold', hjemmel: '23.1' },
  kulturminner: { navn: 'funn av kulturminner', hjemmel: '23.3' },
  prosjektering: { navn: 'svikt i byggherrens prosjektering', hjemmel: '24.1' },
  nektet_kontraktsmedhjelper: { navn: 'nektelse av kontraktsmedhjelper', hjemmel: '10.2' },
  skade_fra_byggherren: {
    navn: 'skade forårsaket av byggherren eller en sideentreprenør',
    hjemmel: '19.1',
  },
  brukstakelse: { navn: 'urettmessig brukstakelse', hjemmel: '38.1 annet ledd' },
  stans_ved_betalingsmislighold: { navn: 'stans ved betalingsmislighold', hjemmel: '29.2' },
  annet_forhold: { navn: 'annet forhold', hjemmel: '33.1 c' },
};

/** Bokstaven i § 33.1 for hovedkategoriene svikt og andre forhold. */
const LEDD_I_33_1: Record<string, string> = { svikt: 'b', andre_forhold: 'c' };

const PART: Record<Part, string> = { TE: 'TE', BH: 'Byggherren' };

const SPORNAVN: Record<Spor, string> = {
  grunnlag: 'grunnlaget',
  vederlag: 'vederlaget',
  frist: 'fristen',
};

/** Det et svar eller en aksept gjelder, med kontraktens ord (LV-U4 punkt 4 og 6). */
const SVARET_GJELDER: Record<Spor, string> = {
  grunnlag: 'grunnlaget',
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

  /** «brev 3 av 2. oktober 2026»: saksversjonen og datoen brevet ble sendt (HF-U1, A5). */
  brevet(id: string): string {
    const b = this.brev.get(id);
    if (!b || b.versjon === 0) throw new KanIkkeUttrykkes(`${id} er ikke et tidligere brev`);
    const sendt = erRegistrert(b.dokument.opplysninger)
      ? b.dokument.opplysninger.filter(erDato).find((o) => o.gjelder === undefined)!.dato
      : b.dokument.registrert;
    return `brev ${b.versjon} av ${norskDato(sendt)}`;
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
    throw new KanIkkeUttrykkes('et registrert brev står som det ble sendt (MM-U17)');
  const j = new Journalen(foer, nytt);
  const t: Tekst = { j, saken, nytt, sak: `sak ${saken.saksnummer} («${saken.tittel}»)` };

  const avsnitt: Avsnitt[] = [];
  const legg = (gjelder: string, laast: string) => {
    const utdypning = utdypninger.get(gjelder);
    avsnitt.push({ gjelder, laast, ...(utdypning ? { utdypning } : {}) });
  };

  for (const k of nytt.krav) legg(k.id, kravtekst(k, t, regler));
  for (const s of nytt.svar) legg(s.id, svartekst(s, t));
  for (const u of nytt.utsagn) legg(u.id, utsagnstekst(u, t));
  for (const o of nytt.opplysninger) {
    // Datoen for et varsel står i avsnittet for varselet.
    if (erDato(o) && o.gjelder !== undefined) continue;
    legg(o.id, opplysningstekst(o, nytt.avsender, j));
  }
  // A4: vedleggene står i teksten, så det som fryses, er teksten og vedleggene (LV-U2).
  if (nytt.dokumentasjon.length) legg(nytt.id, `Brevet har vedlegg: ${liste(nytt.dokumentasjon)}.`);
  return avsnitt;
}

/** Det hver del av teksten trenger: journalen, saken før brevet og brevet selv. */
interface Tekst {
  j: Journalen;
  saken: Saken;
  nytt: Dokument;
  /** «sak <saksnummer> («<sakstittel>»)» (KA-U22). */
  sak: string;
}

/** LV-U4 punkt 1–3 og GR-U16. */
function kravtekst(k: Krav, { j, sak }: Tekst, regler: Regelsett): string {
  const deler: string[] = [];
  if (k.spor === 'grunnlag') {
    const forholdet = `forholdet${typeof k.innhold.tittel === 'string' ? ` «${k.innhold.tittel}»` : ''} i ${sak}`;
    const hoved = k.innhold.hovedkategori as string;
    const under = k.innhold.underkategori as string;
    const u = UNDERKATEGORI[under];
    if (hoved === 'endring' && under === 'endringsordre') {
      deler.push(
        `TE gjør gjeldende krav som følge av en endringsordre fra byggherren for ${forholdet} (NS 8407 § 31.3).`,
        `TE viser til endringsordren «${k.innhold.endringsordre as string}».`
      );
    } else if (hoved === 'endring' && u) {
      deler.push(
        `TE krever endringsordre for ${forholdet}. Grunnlaget er ${u.navn} (NS 8407 § ${u.hjemmel}).`
      );
      if (gjelderVarslingsplikten(k, regler))
        deler.push(
          'TE varsler etter NS 8407 § 32.2 at TE påberoper seg at pålegget innebærer en endring.'
        );
    } else if (LEDD_I_33_1[hoved] && u) {
      const ledd = LEDD_I_33_1[hoved];
      const hjemmel =
        u.hjemmel === `33.1 ${ledd}`
          ? `§ 33.1 ${ledd} og § 34.1.2`
          : `§ ${u.hjemmel}, jf. § 33.1 ${ledd} og § 34.1.2`;
      deler.push(
        `TE gjør gjeldende krav som følge av ${u.navn} (NS 8407 ${hjemmel}) for ${forholdet}.`
      );
    } else {
      // Force majeure kan ikke uttrykkes i formatet ennå (#367).
      throw new KanIkkeUttrykkes(`kategorien ${hoved}/${under} har ingen brevtekst`);
    }
  } else if (k.spor === 'vederlag') {
    deler.push(
      `TE krever justering av vederlaget med ${eksMva(k.innhold.beloep as number)} Kravet er et tilbud etter NS 8407 § 34.2.1.`
    );
  } else {
    deler.push(
      `TE krever fristforlengelse på ${dager(k.innhold.dager as number)} (NS 8407 § 33.6.1).`
    );
  }
  if (k.erstatter)
    deler.push(`Kravet erstatter TEs krav i ${j.brevet(j.krav(k.erstatter).dokument)}.`);
  return deler.join(' ');
}

/** En innsigelse med brevet den står i. */
interface Innsigelse {
  gjelder: string;
  dokument: string;
}

/**
 * VS-U9, VS-U11: innsigelsene fra byggherren som svaret kan leses med, og som byggherren
 * ikke senere har gitt opp uttrykkelig, i rekkefølgen de kom, med brevet de står i.
 */
function aapneInnsigelser(svar: Svar, avsender: Part, j: Journalen): Innsigelse[] {
  // VS-U20, OV-U5: varslene og det første fristkravet, som er det første varselet appen kjenner.
  const varslene = [
    ...j.dokumenter.flatMap((d) => d.utsagn.filter((u) => u.art === 'varsel').map((u) => u.id)),
    ...j.dokumenter
      .flatMap((d) => d.krav.filter((k) => k.spor === 'frist'))
      .slice(0, 1)
      .map((k) => k.id),
  ];
  const svarFraParten: Svar[] = [];
  const innsigelser: (Innsigelse & { fra: number })[] = [];
  for (const d of j.dokumenter) {
    if (d.avsender !== avsender || d.svar.includes(svar)) continue;
    svarFraParten.push(...d.svar);
    for (const u of d.utsagn)
      if (u.art === 'innsigelse')
        innsigelser.push({ gjelder: u.gjelder, dokument: d.id, fra: svarFraParten.length });
  }
  return innsigelser.filter(
    (i) =>
      innsigelsenGjelderSvaret(i.gjelder, svar, varslene) &&
      !innsigelsenErOppgitt(i.gjelder, svar.spor, svarFraParten.slice(i.fra))
  );
}

/** Metoden byggherren mener vederlaget skal justeres etter, når tilbudet ikke er akseptert. */
const METODEN = {
  enhetspriser: 'etter enhetspriser (NS 8407 § 34.3)',
  regningsarbeid: 'som regningsarbeid (NS 8407 § 34.4)',
} as const satisfies Record<NonNullable<Extract<Standpunkt, { art: 'metode' }>['oensket']>, string>;

/** Varselet et standpunkt om rettidighet gjelder (LV-U4 punkt 5, LV-U5). */
const VARSELET: Record<Hjemmel, string> = {
  '32.2': 'TEs varsel etter NS 8407 § 32.2',
  '33.4': 'varselet om fristforlengelse etter NS 8407 § 33.4',
  '34.1.2': 'varselet om vederlagsjustering etter NS 8407 § 34.1.2',
};

const SEN_32_2 = `${VARSELET['32.2']} kom for sent`;

/**
 * A2: standpunktene i svaret på grunnlaget som gjør et svar på vederlag eller frist
 * subsidiært (B-13 05.10): preklusjon etter § 32.2 og avslag. Svaret på grunnlaget
 * står i samme brev eller er gjeldende svar før brevet. Teksten sier hva byggherren
 * sa der, og tilskriver ikke byggherren noe nytt (LV-U3).
 */
function grunnlagetsStandpunkter(s: Svar, { j, saken, nytt }: Tekst): string[] {
  if (s.spor === 'grunnlag') return [];
  const g =
    nytt.svar.find((x) => x.spor === 'grunnlag') ??
    (saken.grunnlagssvar ? j.svar(saken.grunnlagssvar) : undefined);
  if (!g) return [];
  const virkning = prinsipalt(g.beslutningsgrunnlag.virkninger);
  const grunner = grunnerFraGrunnlaget(g, g.beslutningsgrunnlag.virkninger);
  const prekludert = grunner.includes('prekludert');
  const avslaatt = grunner.includes('avslaatt');
  if (g.dokument === nytt.id) {
    const se = ' (se svaret på grunnlaget)';
    return [
      ...(prekludert ? [`byggherren gjør gjeldende at ${SEN_32_2}${avslaatt ? '' : se}.`] : []),
      ...(avslaatt ? [`byggherren avslår grunnlaget${se}.`] : []),
    ];
  }
  // VS-U11: et registrert svar kan være lest med en innsigelse i et annet brev.
  const paaberopt =
    virkning && !g.standpunkter.some((p) => p.id === virkning.standpunkt)
      ? j.element(virkning.standpunkt)
      : null;
  const preklusjonsbrev = j.brevet(paaberopt?.art === 'utsagn' ? paaberopt.dokument : g.dokument);
  return [
    ...(prekludert ? [`byggherren har gjort gjeldende i ${preklusjonsbrev} at ${SEN_32_2}.`] : []),
    ...(avslaatt
      ? [
          prekludert && !paaberopt
            ? 'byggherren har avslått grunnlaget i samme brev.'
            : `byggherren har avslått grunnlaget i ${j.brevet(g.dokument)}.`,
        ]
      : []),
  ];
}

/** LV-U4 punkt 4 og 5, med A2 når grunnlaget er avslått eller prekludert. */
function svartekst(s: Svar, t: Tekst): string {
  const { j, nytt } = t;
  const krav = j.krav(s.gjelder);
  const virkning = new Map(s.beslutningsgrunnlag.virkninger.map((v) => [v.standpunkt, v.virkning]));
  const innsigelser = aapneInnsigelser(s, nytt.avsender, j);
  const ledd = [
    ...grunnlagetsStandpunkter(s, t).map((tekst) => ({ tekst, ordnes: true })),
    ...s.standpunkter.map((p) => ({
      tekst: standpunkttekst(p, s, krav, j, innsigelser),
      // Metoden er ikke en egen grunn, men står ved siden av beløpet (arbeidsvalget i #479).
      ordnes: virkning.get(p.id) !== 'uten_virkning' && p.art !== 'metode',
    })),
  ];
  // «Prinsipalt» og «subsidiært» er slik brevet ordner standpunktene (HF-U2).
  const ordnet =
    ledd.length > s.standpunkter.length ||
    s.standpunkter.some((p) => virkning.get(p.id) === 'subsidiaert');
  let plass = 0;
  const setninger = ledd.map(({ tekst, ordnes }) => {
    if (!ordnet || !ordnes) return stor(tekst);
    const n = plass++;
    return `${n === 0 ? 'Prinsipalt' : n === 1 ? 'Subsidiært' : 'Videre subsidiært'}: ${tekst}`;
  });
  return [
    `Byggherrens svar på ${SVARET_GJELDER[s.spor]} i TEs krav i ${j.brevet(krav.dokument)}:`,
    ...setninger,
    ...(s.erstatter
      ? [`Svaret erstatter byggherrens svar i ${j.brevet(j.svar(s.erstatter).dokument)}.`]
      : []),
  ].join(' ');
}

/** Ett standpunkt som en setning med liten forbokstav (LV-U4 punkt 5, LV-U5, GR-U14). */
function standpunkttekst(
  p: Standpunkt,
  s: Svar,
  krav: Krav,
  j: Journalen,
  innsigelser: Innsigelse[]
): string {
  const grunnlagskrav =
    s.spor === 'grunnlag' ? krav : s.grunnlagskrav ? j.krav(s.grunnlagskrav) : null;
  switch (p.art) {
    case 'rettidighet': {
      const varselet =
        p.hjemmel === '33.4'
          ? `${VARSELET[p.hjemmel]} i ${j.brevet(j.dokumentetTil(p.gjelder))}`
          : VARSELET[p.hjemmel];
      // OV-U5, del 2 av #407: standpunktet gjentar eller gir opp innsigelsen mot det samme
      // det gjelder, som i innsigelsenErOppgitt.
      const innsigelse = innsigelser.find((i) => i.gjelder === p.gjelder);
      const henvisning = innsigelse && j.brevet(innsigelse.dokument);
      if (!p.iTide)
        return `byggherren gjør gjeldende at ${varselet} kom for sent${henvisning ? `, jf. innsigelsen i ${henvisning}` : ''}.`;
      return henvisning
        ? `byggherren gir opp innsigelsen etter NS 8407 § 5 i ${henvisning} og gjør ikke gjeldende at ${varselet} kom for sent.`
        : `byggherren gjør ikke gjeldende at ${varselet} kom for sent.`;
    }
    case 'grunnlag':
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
        grunnlagskrav?.innhold.hovedkategori === 'force_majeure' ? '§ 33.3' : '§ 33.1';
      return `byggherren ${p.oppfylt ? 'legger til grunn' : 'legger ikke til grunn'} at fremdriften hindres som følge av forholdet (NS 8407 ${hjemmel}).`;
    }
    case 'metode':
      // Arbeidsvalget i #479: metoden er byggherrens standpunkt, ikke appens avgjørelse.
      return p.aksepterer
        ? 'byggherren aksepterer beregningsmåten i TEs tilbud (NS 8407 § 34.2.2).'
        : `byggherren aksepterer ikke TEs tilbud (NS 8407 § 34.2.2 første ledd), og mener vederlaget skal justeres ${METODEN[p.oensket!]}.`;
    case 'spesifisering':
      return p.iTide
        ? 'byggherren gjør ikke gjeldende at kravet om fristforlengelse ble spesifisert for sent (NS 8407 § 33.6.1).'
        : `byggherren gjør gjeldende at kravet om fristforlengelse ble spesifisert for sent, og at TE bare har krav på den fristforlengelsen byggherren måtte forstå at TE hadde krav på, ${dager(p.dager!)} (NS 8407 § 33.6.1).`;
    case 'beloep': {
      // Uten aksept av tilbudet er resultatet aldri «godkjent» (§ 34.2.2), men hele beløpet
      // kan være det, til nærmeste krone som i B-13.
      const krevd = krav.innhold.beloep as number;
      const heleBeloepet = tilKrone(beloep(p.godkjent)!) >= tilKrone(beloep(krevd)!);
      const resultat = p.resultat === 'delvis_godkjent' && heleBeloepet ? 'godkjent' : p.resultat;
      return verdi(resultat, eksMva(p.godkjent), eksMva(krevd));
    }
    case 'dager':
      return verdi(p.resultat, dager(p.vurdert), dager(krav.innhold.dager as number));
  }
}

/**
 * GR-U14, GR-U15: setningen etter § 31.3 i en godkjenning som er en endringsordre.
 * TEs beskrivelse av pålegget står som utdypningen under kravet i brevet kravet står
 * i, og siteres; appen tolker den ikke (KA-U19). Et registrert krav står som det ble
 * sendt (MM-U17), og godkjenningen viser til pålegget i det (GR-U13). Et krav fra
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

function verdi(resultat: string, godkjent: string, krevd: string): string {
  if (resultat === 'godkjent') return punktum(`byggherren godkjenner ${godkjent}`);
  if (resultat === 'delvis_godkjent')
    return punktum(`byggherren godkjenner ${godkjent} av de krevde ${krevd}`);
  if (resultat === 'avslaatt') return 'byggherren avslår kravet.';
  throw new KanIkkeUttrykkes(`standpunktet ${resultat} har ingen brevtekst`);
}

/** Det en innsigelse eller en protest viser til, med brevet det står i (LV-U4 punkt 7 og 8). */
function beskriv(id: string, j: Journalen): string {
  const e = j.element(id);
  switch (e.art) {
    case 'krav':
      return `TEs krav${e.krav.spor === 'grunnlag' ? '' : ` om ${KRAVET_OM[e.krav.spor]}`} i ${j.brevet(e.krav.dokument)}`;
    case 'svar':
      return `byggherrens svar i ${j.brevet(e.svar.dokument)}`;
    case 'standpunkt':
      return `påberopelsen av for sen varsling i svaret i ${j.brevet(e.svar.dokument)}`;
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

/** LV-U4 punkt 3 og 6–13, og VS-U15, KA-U22, KA-U25 og KA-U34 ordrett. */
function utsagnstekst(u: Utsagn, { j, saken, nytt, sak }: Tekst): string {
  const part = PART[nytt.avsender];
  switch (u.art) {
    case 'varsel': {
      const dato = nytt.opplysninger.find((o) => erDato(o) && o.gjelder === u.id);
      // VS-U15: et brev med bare varselet, uten en dato for det, er selve varselet.
      if (dato === undefined && nytt.utsagn.length === 1 && !nytt.krav.length && !nytt.svar.length)
        return `TE varsler etter NS 8407 § 33.4 at TE vil kreve fristforlengelse som følge av forholdet i ${sak}.`;
      if (dato?.hva !== 'sendt')
        throw new KanIkkeUttrykkes('et varsel i et brev fra appen har datoen det ble sendt');
      return `TE opplyser at varsel om fristforlengelse etter NS 8407 § 33.4 ble sendt ${norskDato(dato.dato)}.`;
    }
    case 'aksept': {
      const svar = j.svar(u.gjelder);
      const aksept = `TE godtar byggherrens svar på ${SVARET_GJELDER[svar.spor]} i ${j.brevet(svar.dokument)}.`;
      // GR-U7: enigheten gjelder beløpet eller dagene, ikke standpunktet til grunnlaget.
      if (svar.spor === 'grunnlag' || !saken.subsidiaer[svar.spor].length) return aksept;
      return `${aksept} TE er enig i ${svar.spor === 'vederlag' ? 'beløpet' : 'antallet dager'}, men ikke i byggherrens standpunkt til grunnlaget.`;
    }
    case 'trekk': {
      const krav = j.krav(u.gjelder);
      // KA-U22, ordrett med saken satt inn.
      if (krav.spor === 'grunnlag')
        return `TE trekker sitt krav i ${sak}. Trekket er avkall på alle krav i saken, også vederlag og fristforlengelse byggherren har godkjent. Trekket opphever ikke et pålegg, en endringsordre, en utførelsesplikt eller byggherrens rettigheter etter en avtale.`;
      const verdi =
        krav.spor === 'vederlag'
          ? eksMva(krav.innhold.beloep as number)
          : dager(krav.innhold.dager as number);
      return `TE trekker kravet om ${KRAVET_OM[krav.spor]} i ${sak}, fremsatt i ${j.brevet(krav.dokument)} (${verdi}). Trekket er avkall på dette kravet, også det byggherren har godkjent.`;
    }
    case 'ingen_krav':
      // KA-U22 og KA-U25, ordrett med saken satt inn.
      return u.spor === 'vederlag'
        ? `TE krever ikke justering av vederlaget som følge av forholdet i ${sak}, og gir avkall på slikt krav, også for følger som ikke er kjent i dag. Avkallet omfatter ikke vederlag for forsering etter NS 8407 § 33.8.`
        : `TE krever ikke fristforlengelse som følge av forholdet i ${sak}, og gir avkall på slikt krav, også for følger som ikke er kjent i dag.`;
    case 'innsigelse':
      return `${part} gjør gjeldende at ${beskriv(u.gjelder, j)} kom for sent (NS 8407 § 5 tredje ledd).`;
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
      return `${o.gjelder ? 'varselet etter NS 8407 § 33.4 i brevet' : 'brevet'} ble ${o.hva} ${norskDato(o.dato)}`;
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
