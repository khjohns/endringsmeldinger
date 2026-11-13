/**
 * Leseren: radene i `hendelse` i kjernens form, etter formatet i `format.ts`
 * (B-10, #273). Hver rad leses for seg: formen, artene og hvem som kan si hva.
 * Om referansene finnes og peker bakover i samme sak, avgjør utledningen, som
 * ser hele journalen (4.2 i designnotatet).
 *
 * Det er ingen kompatibilitetsleser for Python-radene (B-17): en rad uten
 * `format` er ikke forstått. Det kjernen leser, må være lagret (DM-06). Leseren
 * gjetter ikke på en referanse og går ikke etter plassen i journalen. En rad den
 * ikke forstår, blir `ukjent`, ikke hoppet over (MM-U2).
 */

import {
  BESLUTNINGSGRUNNLAG,
  BREVTEKST,
  HJEMMEL,
  DOKUMENT,
  KRAV,
  OPPLYSNING,
  SAK_OPPRETTET,
  STANDPUNKT,
  STANDPUNKTER_I_SPORET,
  SVAR,
  UTSAGN,
} from './format.ts';
import { LESING_I_FORHOLDET } from '../spor/forhold/format.ts';
import { LESING_I_FRISTEN } from '../spor/frist/format.ts';
import { LESING_I_VEDERLAGET } from '../spor/vederlag/format.ts';
import { avvikIMerkingen, avvikITittelen } from '../frosset/brevtittel.ts';
import {
  erKalenderdato,
  erObjekt,
  feilI,
  Uforstaatt,
  type Skjema,
  type Svarlesing,
} from './skjema.ts';
import type {
  Avsnitt,
  Beslutningsgrunnlag,
  Dokument,
  Domenehendelse,
  Hjemmel,
  Journalrad,
  LestOpplysning,
  LestUtsagn,
  Opplysning,
  Part,
  Spor,
  Standpunkt,
  Standpunktsart,
  Standpunktsvirkning,
  Svar,
  Utsagnsart,
  Varselhjemmel,
  Vedlegg,
  Virkning,
  Korrespondansetype,
} from '../typer.ts';

/**
 * Dokumentet er registrert korrespondanse: det er sendt eller mottatt utenfor appen
 * (4.1). En opplysning som gjelder et varsel i dokumentet, teller ikke (HF-U1).
 */
export const erRegistrert = (opplysninger: { hva: string; gjelder?: string }[]): boolean =>
  opplysninger.some((o) => (o.hva === 'sendt' || o.hva === 'mottatt') && o.gjelder === undefined);

const OSLO = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Oslo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Et tidspunkt med tidssone, så dagen ikke avhenger av vertens tidssone (T1 i #770). */
const TIDSPUNKT =
  /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * Kalenderdagen for en lagret dato, eller `null` når den ikke kan tolkes: en dato på
 * formen ÅÅÅÅ-MM-DD som finnes i kalenderen, som den står, og et tidspunkt med tidssone
 * i norsk tid (#474, KA-U37). Et tidspunkt uten tidssone kan ikke tolkes (#766). Leseren
 * krever ikke kalenderdato (MM-U2), så datoer sammenliknes som dager, ikke som tekst.
 * Brevteksten viser datoen herfra (`norskDato`, #472).
 */
export function kalenderdag(dato: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dato)) return erKalenderdato(dato) ? dato : null;
  // `Date` ruller 2026-02-30T10:00Z og T24:00 over til en annen dag, så dag og klokkeslett må finnes.
  if (!TIDSPUNKT.test(dato) || !erKalenderdato(dato.slice(0, 10))) return null;
  const tidspunkt = new Date(dato);
  return Number.isNaN(tidspunkt.getTime()) ? null : OSLO.format(tidspunkt);
}

/**
 * Datoen et dokument fra appen ble registrert, i norsk tid, som i brevet (KA-U37).
 * Serveren setter tidspunktet med tidssone (VS-U8), og et annet tidspunkt er en feil i
 * kalleren, ikke en dato kontrollene kan hoppe over (#787).
 */
export function registrertDato(d: Pick<Dokument, 'registrert'>): string {
  if (!TIDSPUNKT.test(d.registrert))
    throw new Error(`Registreringstidspunktet ${d.registrert} er ikke et tidspunkt med tidssone.`);
  const dag = kalenderdag(d.registrert);
  if (dag === null)
    throw new Error(`Registreringstidspunktet ${d.registrert} finnes ikke i kalenderen.`);
  return dag;
}

/**
 * Datoopplysningen om et varsel: den som `gjelder` varselet, ellers den om
 * dokumentet varselet står i, når det er registrert for seg (HF-U1, MM-U1).
 */
export function datoFor(
  varsel: { id: string; dokument: string },
  hva: 'sendt' | 'mottatt',
  opplysninger: Opplysning[]
): Extract<Opplysning, { hva: 'sendt' | 'mottatt' }> | undefined {
  const dato = opplysninger.filter(
    (o): o is Extract<Opplysning, { hva: 'sendt' | 'mottatt' }> =>
      o.hva === hva && o.dokument === varsel.dokument
  );
  return dato.find((o) => o.gjelder === varsel.id) ?? dato.find((o) => o.gjelder === undefined);
}

/** MM-U7: en dato bestrides som sendt eller mottatt, opplysningen om § 31.3 som det den er. */
export const sammeSlag = (opplysning: string, bestridelse: string): boolean =>
  opplysning === 'sendt' || opplysning === 'mottatt'
    ? bestridelse === 'sendt' || bestridelse === 'mottatt'
    : opplysning === bestridelse;

/** En opplysning om brevet som helhet: § 31.3 (MM-U12, MM-U50). */
export const omBrevet = (hva: string): hva is 'endringsordre' => hva === 'endringsordre';

type Data = Record<string, unknown>;

function kontroller(verdi: unknown, skjema: Skjema, sti: string): void {
  const feil = feilI(verdi, skjema, sti);
  if (feil.length) throw new Uforstaatt(feil.join('; '));
}

/** Et element kontrollert mot skjemaet for sporet eller arten det oppgir. */
function element(
  verdi: unknown,
  skjemaer: Record<string, Skjema>,
  noekkel: 'spor' | 'art' | 'hva',
  sti: string
): Data {
  if (!erObjekt(verdi)) throw new Uforstaatt(`${sti}: er ikke et objekt`);
  const n = verdi[noekkel];
  if (typeof n !== 'string' || !Object.hasOwn(skjemaer, n))
    throw new Uforstaatt(`${sti}: ukjent ${noekkel} ${JSON.stringify(n)}`);
  kontroller(verdi, skjemaer[n], sti);
  return verdi;
}

const SVARLESING: Record<Spor, Svarlesing> = {
  forhold: LESING_I_FORHOLDET,
  vederlag: LESING_I_VEDERLAGET,
  frist: LESING_I_FRISTEN,
};

/**
 * Standpunktene i et lagret svar, med beløp og dager fra utregningen. Arten og
 * rekkefølgen må være de sporet tillater (`STANDPUNKTER_I_SPORET`). Kaster
 * `Uforstaatt`. Skrivingen bruker den samme funksjonen når brevet fryses.
 */
export function standpunkterISvaret(spor: Spor, svar: Data, sti = '$.svar'): Standpunkt[] {
  const liste = svar.standpunkter;
  if (!Array.isArray(liste) || !liste.length)
    throw new Uforstaatt(`${sti}: har ingen standpunkter`);
  const tillatt = STANDPUNKTER_I_SPORET[spor];
  const utregning = (svar.utregning ?? {}) as Data;
  const lesing = SVARLESING[spor];
  let neste = 0;
  const ut = liste.map((v, i): Standpunkt => {
    const e = element(v, STANDPUNKT, 'art', `${sti}.standpunkter[${i}]`);
    const art = e.art as Standpunktsart;
    const plass = lesing.gjentas
      ? tillatt.findIndex((t) => t.art === art)
      : tillatt.findIndex((t, j) => j >= neste && t.art === art);
    if (plass < 0)
      throw new Uforstaatt(
        `${sti}: standpunktet ${art} hører ikke til ${spor} eller står i feil rekkefølge`
      );
    neste = plass + 1;
    const egen = lesing.standpunkt?.(e, utregning, sti);
    if (egen) return egen;
    const id = e.id as string;
    switch (art) {
      case 'rettidighet':
        if (e.hjemmel !== HJEMMEL[spor] && !lesing.rettidighet.includes(e.hjemmel as string))
          throw new Uforstaatt(`${sti}: rettidighet etter § ${String(e.hjemmel)} i ${spor}`);
        // VS-U5: beløpet etter begrensningen står når varselet etter § 34.1.3 kom for sent.
        if ((e.hjemmel === '34.1.3' && e.i_tide === false) !== 'begrenset_beloep' in e)
          throw new Uforstaatt(
            `${sti}: beløpet etter begrensningen står bare når varselet etter § 34.1.3 kom for sent`
          );
        return {
          id,
          art,
          gjelder: e.gjelder as string,
          hjemmel: e.hjemmel as Hjemmel,
          iTide: e.i_tide as boolean,
          ...('begrenset_beloep' in e ? { begrenset: e.begrenset_beloep as number } : {}),
        };
      default:
        throw new Uforstaatt(`${sti}: standpunktet ${art} hører ikke til ${spor}`);
    }
  });
  lesing.kontrollerHjemlene?.(
    ut.flatMap((s) => (s.art === 'rettidighet' ? [s.hjemmel] : [])),
    sti
  );
  for (const t of tillatt)
    if (t.paakrevd && !ut.some((s) => s.art === t.art))
      throw new Uforstaatt(`${sti}: svaret på ${spor} mangler standpunktet ${t.art}`);
  lesing.kontrollerStandpunktene?.(ut, utregning, sti);
  const subsidiaertVerdi = lesing.subsidiaertVerdi;
  if (
    'subsidiaert_resultat' in utregning !==
    (subsidiaertVerdi !== null && subsidiaertVerdi in utregning)
  )
    throw new Uforstaatt(`${sti}: utregningen har bare halvparten av det subsidiære standpunktet`);
  return ut;
}

/** Standpunktene som er byggherrens påberopelser i sporet. */
const PAABEROPELSER = new Set<Standpunktsart>(['rettidighet', 'hindring', 'spesifisering']);

function lesBeslutningsgrunnlag(
  spor: Spor,
  v: unknown,
  standpunkter: Standpunkt[],
  sti: string
): Beslutningsgrunnlag {
  kontroller(v, BESLUTNINGSGRUNNLAG, sti);
  const b = v as Data;
  if ((spor === 'forhold') !== 'varslingsplikt' in b)
    throw new Uforstaatt(
      `${sti}: varslingsplikten hører til svaret på grunnlaget og bare der (GR-U12)`
    );
  const art = new Map<string, Standpunktsart>(standpunkter.map((s) => [s.id, s.art]));
  const sett = new Set<string>();
  // Laget og upåvirket er slik brevet ordner standpunktene (OV-U32); uten virkning er
  // appens vurdering og står for seg (HF-U2).
  const innslag = [
    ...(b.virkninger as Data[]).map((p) => [p.standpunkt, p.lag] as const),
    ...((b.upaavirket ?? []) as string[]).map((id) => [id, 'upaavirket'] as const),
    ...((b.uten_virkning ?? []) as string[]).map((id) => [id, 'uten_virkning'] as const),
  ];
  const virkninger = innslag.map(([standpunkt, virkning]): Standpunktsvirkning => {
    const id = standpunkt as string;
    if (!art.has(id) || sett.has(id))
      throw new Uforstaatt(
        `${sti}: virkningen gjelder et standpunkt svaret ikke har, eller står to ganger`
      );
    sett.add(id);
    return { standpunkt: id, art: art.get(id)!, virkning: virkning as Virkning };
  });
  const rekkefoelge = new Map(standpunkter.map((s, i) => [s.id, i]));
  virkninger.sort((x, y) => rekkefoelge.get(x.standpunkt)! - rekkefoelge.get(y.standpunkt)!);
  if (sett.size !== art.size)
    throw new Uforstaatt(`${sti}: beslutningsgrunnlaget har ikke én virkning per standpunkt`);
  // OV-U32, OV-U33: upåvirket gjelder vederlag og frist, og bare ved siden av en påberopelse
  // i sporet eller en innsigelse som rammer bare posten.
  const motPosten = SVARLESING[spor].innsigelserMotPosten?.(standpunkter) ?? new Set();
  const paaberoper = (p: Standpunktsvirkning) =>
    typeof p.virkning === 'number' && (PAABEROPELSER.has(p.art) || motPosten.has(p.standpunkt));
  if (
    virkninger.some((p) => p.virkning === 'upaavirket') &&
    (spor === 'forhold' || !virkninger.some(paaberoper))
  )
    throw new Uforstaatt(
      `${sti}: et standpunkt er upåvirket uten en påberopelse i vederlag eller frist (OV-U33)`
    );
  return {
    regelversjon: b.regelversjon as number,
    virkninger,
    linje: b.linje as string,
    sammenfall: b.sammenfall as boolean,
    ...(spor === 'forhold' ? { varslingsplikt: b.varslingsplikt as boolean } : {}),
  };
}

function lesSvar(v: unknown, dokument: string, sti: string): Svar {
  const e = element(v, SVAR, 'spor', sti);
  const spor = e.spor as Spor;
  const standpunkter = standpunkterISvaret(spor, e, sti);
  const beslutningsgrunnlag = lesBeslutningsgrunnlag(
    spor,
    e.beslutningsgrunnlag,
    standpunkter,
    `${sti}.beslutningsgrunnlag`
  );
  SVARLESING[spor].kontrollerUtregningen?.(
    standpunkter,
    e.utregning as Data,
    beslutningsgrunnlag.virkninger,
    sti
  );
  return {
    id: e.id as string,
    spor,
    dokument,
    gjelder: e.gjelder as string,
    erstatter: (e.erstatter as string | undefined) ?? null,
    paaberopelse: (e.paaberopelse as string | undefined) ?? null,
    standpunkter,
    utregning: (e.utregning as Data | undefined) ?? {},
    beslutningsgrunnlag,
  };
}

/**
 * Hvem som kan si hva: TE krever, varsler, godtar, trekker, sier «ingen krav», påberoper
 * passivitet og svarer på forespørselen etter § 33.6.2; BH svarer, begrunner svaret
 * senere (KA-U34) og sender forespørselen. Innsigelse,
 * protest og bestridelse kan komme fra begge; utledningen kontrollerer hvem de gjelder.
 */
const PART_FOR_UTSAGN: Record<Utsagnsart, Part | null> = {
  varsel: 'TE',
  trekk: 'TE',
  aksept: 'TE',
  ingen_krav: 'TE',
  passivitet: 'TE',
  bestridelse: null,
  innsigelse: null,
  foresporsel: 'BH',
  foresporselssvar: 'TE',
  protest: null,
  begrunnelse: 'BH',
  korrigering: 'TE',
};

/**
 * Brevteksten i en lagret rad, eller `null` når raden ikke har en eller teksten ikke har
 * formen i formatet. Skrivingen og saksbildet leser feltet her (#864).
 */
export function brevtekstI(rad: Journalrad): Avsnitt[] | null {
  const t = rad.data.brevtekst;
  return t !== undefined && !feilI(t, BREVTEKST).length ? (t as Avsnitt[]) : null;
}

function lesDokument(h: Journalrad): Dokument {
  kontroller(h.data, DOKUMENT, '$');
  const data = h.data as {
    krav?: unknown[];
    svar?: unknown[];
    utsagn?: unknown[];
    opplysninger?: Data[];
    dokumentasjon?: Vedlegg[];
    brevtekst?: Avsnitt[];
    brevtittel?: string;
    brevnummer?: number;
    merking?: string;
    deres_ref?: string[];
    korrespondansetype?: Korrespondansetype;
    beskrivelse?: string;
    spor?: Spor[];
    retter?: string;
    ikke_i_saken?: true;
  };
  if (data.ikke_i_saken) return ikkeISaken(h, data);
  // OV-U13: opplysningen om § 31.3 gis bare i brevet selv, som hører til registrert
  // korrespondanse med et svar på forholdet. Kontrollen står foran kontrollen av et tomt
  // dokument, så en avklaring alene får denne grunnen. At svaret er byggherrens
  // endringsordre etter OV-U6, kontrolleres i utledningen.
  if (
    (data.opplysninger ?? []).some(
      (o) =>
        erObjekt(o) &&
        o.hva === 'endringsordre' &&
        typeof o.gjelder === 'string' &&
        o.gjelder !== h.event_id
    )
  )
    throw new Uforstaatt(
      'en senere avklaring av at et brev er en endringsordre etter § 31.3, er ikke med i første versjon (OV-U13)'
    );
  if (!data.krav && !data.svar && !data.utsagn && data.beskrivelse === undefined)
    throw new Uforstaatt('dokumentet har verken krav, svar, utsagn eller beskrivelse');
  // OV-U17: en retting i saken er en fullstendig ny registrering av brevet som dokumentasjon.
  if (data.retter !== undefined && data.beskrivelse === undefined)
    throw new Uforstaatt('en retting er ikke et brev registrert som dokumentasjon (OV-U17)');
  const id = h.event_id;
  const avsender: Part = h.aktor_rolle;
  const kreverPart = (part: Part | null, hva: string) => {
    if (part !== null && avsender !== part)
      throw new Uforstaatt(`${hva} er skrevet av ${avsender}, ikke ${part}`);
  };
  if (data.krav) kreverPart('TE', 'et krav');
  if (data.svar) kreverPart('BH', 'et svar');
  const hva = new Set<string>();
  const opplysninger = (data.opplysninger ?? []).map((v, i): LestOpplysning => {
    const o = element(v, OPPLYSNING, 'hva', `$.opplysninger[${i}]`);
    // Én opplysning av hvert slag om dokumentet, og én om hvert varsel i det (HF-U1).
    const noekkel = `${String(o.hva)}:${omBrevet(o.hva as string) ? '' : String(o.gjelder ?? '')}`;
    if (hva.has(noekkel))
      throw new Uforstaatt(`dokumentet har to opplysninger om ${String(o.hva)}`);
    hva.add(noekkel);
    const brev = (o.gjelder as string | undefined) ?? id;
    return o.hva === 'endringsordre'
      ? {
          id: o.id as string,
          dokument: id,
          hva: 'endringsordre',
          oppfylt: o.oppfylt as boolean,
          oppgittAv: avsender,
          brev,
        }
      : {
          id: o.id as string,
          dokument: id,
          hva: o.hva as 'sendt' | 'mottatt',
          dato: o.dato as string,
          oppgittAv: avsender,
          ...(typeof o.gjelder === 'string' ? { gjelder: o.gjelder } : {}),
        };
  });
  const iBrevet = opplysninger.some((o) => o.hva === 'endringsordre');
  if (
    iBrevet &&
    (!erRegistrert(opplysninger) ||
      !((data.svar ?? []) as Data[]).some((s) => erObjekt(s) && s.spor === 'forhold'))
  )
    throw new Uforstaatt(
      'opplysningen om endringsordre står uten et registrert svar på grunnlaget i dokumentet'
    );
  const dokument: Dokument = {
    id,
    avsender,
    registrert: h.tidsstempel,
    opplysninger,
    dokumentasjon: data.dokumentasjon ?? [],
    krav: (data.krav ?? []).map((v, i) => {
      const e = element(v, KRAV, 'spor', `$.krav[${i}]`);
      const { id: kravId, spor, erstatter, gjelder, ...innhold } = e;
      return {
        id: kravId as string,
        spor: spor as Spor,
        dokument: id,
        erstatter: (erstatter as string | undefined) ?? null,
        ...(gjelder === undefined ? {} : { gjelder: gjelder as string }),
        innhold,
      };
    }),
    svar: (data.svar ?? []).map((v, i) => lesSvar(v, id, `$.svar[${i}]`)),
    brevtekst: data.brevtekst ?? null,
    brevtittel: data.brevtittel ?? null,
    brevnummer: data.brevnummer ?? null,
    merking: data.merking ?? null,
    deresRef: data.deres_ref ?? [],
    korrespondansetype: data.korrespondansetype ?? null,
    beskrivelse: data.beskrivelse ?? null,
    spor: data.spor ?? [],
    retter: data.retter ?? null,
    ikkeISaken: false,
    utsagn: (data.utsagn ?? []).map((v, i): LestUtsagn => {
      const e = element(v, UTSAGN, 'art', `$.utsagn[${i}]`);
      const art = e.art as Utsagnsart;
      kreverPart(PART_FOR_UTSAGN[art], `et utsagn med art ${art}`);
      if (art === 'varsel')
        return { id: e.id as string, art, hjemmel: e.hjemmel as Varselhjemmel, dokument: id };
      if (art === 'korrigering') {
        // Formatet krever nøyaktig ett av feltene.
        const felt = e.paalegg_mottatt !== undefined ? 'paalegg_mottatt' : 'klar_over_forholdet';
        return {
          id: e.id as string,
          art,
          gjelder: e.gjelder as string,
          felt,
          dato: e[felt] as string,
        };
      }
      return e as unknown as LestUtsagn;
    }),
  };
  // VS-U23, VS-U27: en forespørsel eller begrunnelse etter § 33.6.2 utenfor appen er
  // dokumentasjon, og registreringen av den er ikke med ennå.
  if (
    erRegistrert(dokument.opplysninger) &&
    dokument.utsagn.some((u) => u.art === 'foresporsel' || u.art === 'foresporselssvar')
  )
    throw new Uforstaatt(
      'et registrert brev har en forespørsel etter § 33.6.2 eller svaret på den'
    );
  // BF-02A: en korrigering sendt utenfor løsningen står som dokumentasjon (OV-U4).
  if (erRegistrert(dokument.opplysninger) && dokument.utsagn.some((u) => u.art === 'korrigering'))
    throw new Uforstaatt('et registrert brev har en korrigering av datoen');
  if (data.beskrivelse !== undefined) dokumentasjonsbrev(dokument);
  else if (data.spor) throw new Uforstaatt('dokumentet har spor uten beskrivelse (OV-U16)');
  // HF-U1: en datoopplysning med `gjelder` gjelder et varsel i samme dokument.
  for (const o of dokument.opplysninger)
    if (
      o.hva !== 'endringsordre' &&
      o.gjelder !== undefined &&
      !dokument.utsagn.some((u) => u.art === 'varsel' && u.id === o.gjelder)
    )
      throw new Uforstaatt('opplysningen gjelder ikke et varsel i dokumentet');
  // LV-U42, D1 A i #1497: registrert korrespondanse har typen, et brev fra løsningen ingen.
  if (erRegistrert(dokument.opplysninger) !== (data.korrespondansetype !== undefined))
    throw new Uforstaatt(
      erRegistrert(dokument.opplysninger)
        ? 'registrert korrespondanse har ingen korrespondansetype (LV-U42)'
        : 'korrespondansetypen står i et dokument som ikke er registrert korrespondanse'
    );
  if (data.brevtittel !== undefined && !data.brevtekst)
    throw new Uforstaatt('brevtittelen står bare i et brev med tekst fra appen (MM-U50)');
  if (data.brevtittel !== undefined) {
    const avvik = avvikITittelen(data.brevtittel, dokument);
    if (avvik) throw new Uforstaatt(avvik);
  }
  if (data.merking !== undefined) {
    const avvik = avvikIMerkingen(
      data.merking,
      data.brevnummer,
      erRegistrert(dokument.opplysninger)
    );
    if (avvik) throw new Uforstaatt(avvik);
  }
  // LV-U27, LV-U23: Deres ref. står i hodet på et brev fra løsningen, som har merkingen.
  if (data.deres_ref !== undefined && data.merking === undefined)
    throw new Uforstaatt('Deres ref. står bare i hodet på et brev fra løsningen, med merkingen');
  if (data.brevtekst) {
    // MM-U17, MM-U50: et registrert brev står som det ble sendt og har ingen tekst fra appen.
    if (erRegistrert(dokument.opplysninger))
      throw new Uforstaatt('et registrert brev har brevtekst fra appen');
    // HF-U1: hvert avsnitt uttrykker ett element i samme brev, eller vedleggene i det (A4).
    const elementer = new Set<string>([
      ...(dokument.dokumentasjon.length ? [id] : []),
      ...dokument.krav.map((k) => k.id),
      ...dokument.svar.map((x) => x.id),
      ...dokument.utsagn.map((u) => u.id),
      ...dokument.opplysninger.map((o) => o.id),
    ]);
    // LV-U70: et element har ett avsnitt, eller ett avsnitt per punkt etter hverandre.
    // Overskriften står først i den låste delen og har et punkt.
    const sett = new Set<string>();
    let forrige: (typeof data.brevtekst)[number] | undefined;
    for (const a of data.brevtekst) {
      const fortsetter = forrige?.gjelder === a.gjelder;
      if (
        !elementer.has(a.gjelder) ||
        (sett.has(a.gjelder) && !fortsetter) ||
        (fortsetter && (a.punkt === undefined || forrige!.punkt === undefined))
      )
        throw new Uforstaatt('et avsnitt i brevteksten gjelder ikke ett element i brevet');
      // Bare et krav og et svar på forholdet eller vederlaget har punkter; kjernen skriver ikke
      // punkter for andre elementer, og svaret på fristen har dagens struktur (MM-U2, LV-U72).
      if (
        a.punkt !== undefined &&
        !dokument.krav.some((k) => k.id === a.gjelder) &&
        !dokument.svar.some((s) => s.id === a.gjelder && s.spor !== 'frist')
      )
        throw new Uforstaatt(
          'et avsnitt i brevteksten har et punkt, men gjelder ikke et krav eller et svar'
        );
      if (a.punkt !== undefined) {
        if (sett.has(`${a.gjelder}\u0000${a.punkt}`))
          throw new Uforstaatt('to avsnitt i brevteksten gjelder samme punkt i et element');
        sett.add(`${a.gjelder}\u0000${a.punkt}`);
      }
      if (
        a.overskrift !== undefined &&
        (a.punkt === undefined ||
          (a.laast !== a.overskrift && !a.laast.startsWith(`${a.overskrift}\n\n`)))
      )
        throw new Uforstaatt('overskriften i et avsnitt i brevteksten står ikke først i punktet');
      sett.add(a.gjelder);
      forrige = a;
    }
  }
  return dokument;
}

/**
 * OV-U18: rettingen som sier at brevet ikke hører til saken, har bare henvisningen til
 * registreringen den retter: ingen beskrivelse, spor, dato eller vedlegg. At registreringen
 * finnes i saken, kontrollerer utledningen, fordi skrivingen leser den nye raden alene.
 */
function ikkeISaken(h: Journalrad, data: Record<string, unknown>): Dokument {
  if (Object.keys(data).some((k) => k !== 'retter' && k !== 'ikke_i_saken'))
    throw new Uforstaatt('rettingen om at brevet ikke hører til saken, har mer enn henvisningen');
  if (typeof data.retter !== 'string')
    throw new Uforstaatt('rettingen om at brevet ikke hører til saken, viser ikke til noe');
  return {
    id: h.event_id,
    avsender: h.aktor_rolle,
    registrert: h.tidsstempel,
    opplysninger: [],
    dokumentasjon: [],
    krav: [],
    svar: [],
    utsagn: [],
    brevtekst: null,
    brevtittel: null,
    brevnummer: null,
    merking: null,
    deresRef: [],
    korrespondansetype: null,
    beskrivelse: null,
    spor: [],
    retter: data.retter,
    ikkeISaken: true,
  };
}

/**
 * OV-U4, OV-U16: et brev registrert som dokumentasjon har beskrivelsen, sporene det hører
 * til, datoen avsenderen sendte det og brevet som vedlegg, og ingenting appen kan utlede noe av.
 */
function dokumentasjonsbrev(d: Dokument): void {
  if (d.krav.length || d.svar.length || d.utsagn.length)
    throw new Uforstaatt('et brev registrert som dokumentasjon har krav, svar eller utsagn');
  const [o, ...flere] = d.opplysninger;
  if (o?.hva !== 'sendt' || o.gjelder !== undefined || flere.length)
    throw new Uforstaatt(
      'et brev registrert som dokumentasjon har ikke bare datoen avsenderen sendte det'
    );
  if (!d.dokumentasjon.length)
    throw new Uforstaatt('brevet registrert som dokumentasjon ligger ikke ved');
  if (new Set(d.spor).size !== d.spor.length)
    throw new Uforstaatt('samme spor står to ganger i brevet registrert som dokumentasjon');
}

/** Journalen i kjernens form. En rad leseren ikke forstår, blir `ukjent`, ikke hoppet over. */
export function lesJournal(journal: Journalrad[], format: number): Domenehendelse[] {
  return journal.map((h): Domenehendelse => {
    const felles = { id: h.event_id, versjon: h.versjon, type: h.event_type };
    const ukjent = (grunn: string): Domenehendelse => ({ ...felles, art: 'ukjent', grunn });
    if (!Number.isInteger(h.format) || (h.format as number) < 1)
      return ukjent(`raden har ikke et format kjernen kjenner (${String(h.format)})`);
    if ((h.format as number) > format) return ukjent(`format ${String(h.format)}`);
    if (h.refererer_til_event_id !== null)
      return ukjent('formatet viser til andre hendelser i data, ikke i referstoid');
    try {
      if (h.event_type === 'sak_opprettet') {
        kontroller(h.data, SAK_OPPRETTET, '$');
        return { ...felles, art: 'sak', tittel: h.data.sakstittel as string };
      }
      if (h.event_type === 'dokument_registrert')
        return { ...felles, art: 'dokument', dokument: lesDokument(h) };
      return ukjent(`ukjent hendelsestype ${h.event_type}`);
    } catch (feil) {
      if (feil instanceof Uforstaatt) return ukjent(feil.message);
      throw feil;
    }
  });
}
