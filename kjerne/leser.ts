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
import { erObjekt, feilI, type Skjema } from './skjema.ts';
import type {
  Beslutningsgrunnlag,
  Dokument,
  Domenehendelse,
  Journalrad,
  Opplysning,
  Part,
  Spor,
  Standpunkt,
  Standpunktsart,
  Standpunktsvirkning,
  Svar,
  Utsagn,
  Utsagnsart,
  Virkning,
} from './typer.ts';

/** Dokumentet er registrert korrespondanse: det er sendt eller mottatt utenfor appen (4.1). */
export const erRegistrert = (opplysninger: { hva: string }[]): boolean =>
  opplysninger.some((o) => o.hva === 'sendt' || o.hva === 'mottatt');

/** MM-U7: en opplysning om § 31.3 bestrides som det, en dato som sendt eller mottatt. */
export const sammeSlag = (opplysning: string, bestridelse: string): boolean =>
  (opplysning === 'endringsordre') === (bestridelse === 'endringsordre');

/** Leseren forstår ikke raden (MM-U2). */
export class Uforstaatt extends Error {}

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
  let neste = 0;
  const ut = liste.map((v, i): Standpunkt => {
    const e = element(v, STANDPUNKT, 'art', `${sti}.standpunkter[${i}]`);
    const art = e.art as Standpunktsart;
    const plass = tillatt.findIndex((t, j) => j >= neste && t.art === art);
    if (plass < 0)
      throw new Uforstaatt(
        `${sti}: standpunktet ${art} hører ikke til ${spor} eller står i feil rekkefølge`
      );
    neste = plass + 1;
    const id = e.id as string;
    switch (art) {
      case 'rettidighet':
        if (e.hjemmel !== HJEMMEL[spor])
          throw new Uforstaatt(`${sti}: rettidighet etter § ${String(e.hjemmel)} i ${spor}`);
        return {
          id,
          art,
          gjelder: e.gjelder as string,
          hjemmel: e.hjemmel as '32.2' | '33.4',
          iTide: e.i_tide as boolean,
        };
      case 'grunnlag':
        return { id, art, resultat: e.resultat as never };
      case 'hindring':
        return { id, art, oppfylt: e.oppfylt as boolean };
      case 'beloep':
        return {
          id,
          art,
          resultat: utregning.resultat as never,
          godkjent: utregning.godkjent_beloep as number,
        };
      case 'dager':
        return {
          id,
          art,
          resultat: (utregning.subsidiaert_resultat ?? utregning.resultat) as never,
          vurdert: (utregning.subsidiaert_godkjent_dager ?? utregning.godkjent_dager) as number,
        };
    }
  });
  for (const t of tillatt)
    if (t.paakrevd && !ut.some((s) => s.art === t.art))
      throw new Uforstaatt(`${sti}: svaret på ${spor} mangler standpunktet ${t.art}`);
  if ('subsidiaert_resultat' in utregning !== 'subsidiaert_godkjent_dager' in utregning)
    throw new Uforstaatt(`${sti}: utregningen har bare halvparten av det subsidiære standpunktet`);
  return ut;
}

function lesBeslutningsgrunnlag(
  spor: Spor,
  v: unknown,
  standpunkter: Standpunkt[],
  sti: string
): Beslutningsgrunnlag {
  kontroller(v, BESLUTNINGSGRUNNLAG, sti);
  const b = v as Data;
  if ((spor === 'grunnlag') !== 'varslingsplikt' in b)
    throw new Uforstaatt(
      `${sti}: varslingsplikten hører til svaret på grunnlaget og bare der (GR-U12)`
    );
  const art = new Map(standpunkter.map((s) => [s.id, s.art]));
  const sett = new Set<string>();
  // Prinsipalt og subsidiært er slik brevet ordner standpunktene; uten virkning er
  // appens vurdering og står for seg (oppdragsgiver 10.10).
  const innslag = [
    ...(b.virkninger as Data[]).map((p) => [p.standpunkt, p.virkning] as const),
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
  return {
    regelversjon: b.regelversjon as number,
    virkninger,
    linje: b.linje as string,
    sammenfall: b.sammenfall as boolean,
    ...(spor === 'grunnlag' ? { varslingsplikt: b.varslingsplikt as boolean } : {}),
  };
}

function lesSvar(v: unknown, dokument: string, sti: string): Svar {
  const e = element(v, SVAR, 'spor', sti);
  const spor = e.spor as Spor;
  const standpunkter = standpunkterISvaret(spor, e, sti);
  return {
    id: e.id as string,
    spor,
    dokument,
    gjelder: e.gjelder as string,
    erstatter: (e.erstatter as string | undefined) ?? null,
    standpunkter,
    utregning: (e.utregning as Data | undefined) ?? {},
    beslutningsgrunnlag: lesBeslutningsgrunnlag(
      spor,
      e.beslutningsgrunnlag,
      standpunkter,
      `${sti}.beslutningsgrunnlag`
    ),
  };
}

/** Hvem som kan si hva: TE krever, varsler, godtar, trekker og sier «ingen krav»; BH svarer. */
const PART_FOR_UTSAGN: Record<Utsagnsart, Part | null> = {
  varsel: 'TE',
  trekk: 'TE',
  aksept: 'TE',
  ingen_krav: 'TE',
  bestridelse: null,
};

function lesDokument(h: Journalrad): Dokument {
  kontroller(h.data, DOKUMENT, '$');
  const data = h.data as {
    krav?: unknown[];
    svar?: unknown[];
    utsagn?: unknown[];
    opplysninger?: Data[];
    dokumentasjon?: string[];
  };
  const avklaring = (data.opplysninger ?? []).some((o) => erObjekt(o) && 'gjelder' in o);
  if (!data.krav && !data.svar && !data.utsagn && !avklaring)
    throw new Uforstaatt('dokumentet har verken krav, svar, utsagn eller en avklaring');
  const id = h.event_id;
  const avsender: Part = h.aktor_rolle;
  const kreverPart = (part: Part | null, hva: string) => {
    if (part !== null && avsender !== part)
      throw new Uforstaatt(`${hva} er skrevet av ${avsender}, ikke ${part}`);
  };
  if (data.krav) kreverPart('TE', 'et krav');
  if (data.svar) kreverPart('BH', 'et svar');
  const hva = new Set<string>();
  const opplysninger = (data.opplysninger ?? []).map((v, i): Opplysning => {
    const o = element(v, OPPLYSNING, 'hva', `$.opplysninger[${i}]`);
    if (hva.has(o.hva as string))
      throw new Uforstaatt(`dokumentet har to opplysninger om ${String(o.hva)}`);
    hva.add(o.hva as string);
    return o.hva === 'endringsordre'
      ? {
          id: o.id as string,
          dokument: id,
          hva: 'endringsordre',
          oppfylt: o.oppfylt as boolean,
          oppgittAv: avsender,
          brev: (o.gjelder as string | undefined) ?? id,
        }
      : {
          id: o.id as string,
          dokument: id,
          hva: o.hva as 'sendt' | 'mottatt',
          dato: o.dato as string,
          oppgittAv: avsender,
        };
  });
  // Opplysningen om § 31.3 i brevet selv hører til registrert korrespondanse med et svar
  // på grunnlaget. En avklaring av et tidligere brev kontrolleres i utledningen.
  const iBrevet = opplysninger.some((o) => o.hva === 'endringsordre' && o.brev === id);
  if (
    iBrevet &&
    (!erRegistrert(opplysninger) ||
      !((data.svar ?? []) as Data[]).some((s) => erObjekt(s) && s.spor === 'grunnlag'))
  )
    throw new Uforstaatt(
      'opplysningen om endringsordre står uten et registrert svar på grunnlaget i dokumentet'
    );
  return {
    id,
    avsender,
    registrert: h.tidsstempel,
    opplysninger,
    dokumentasjon: data.dokumentasjon ?? [],
    krav: (data.krav ?? []).map((v, i) => {
      const e = element(v, KRAV, 'spor', `$.krav[${i}]`);
      const { id: kravId, spor, erstatter, ...innhold } = e;
      return {
        id: kravId as string,
        spor: spor as Spor,
        dokument: id,
        erstatter: (erstatter as string | undefined) ?? null,
        innhold,
      };
    }),
    svar: (data.svar ?? []).map((v, i) => lesSvar(v, id, `$.svar[${i}]`)),
    utsagn: (data.utsagn ?? []).map((v, i): Utsagn => {
      const e = element(v, UTSAGN, 'art', `$.utsagn[${i}]`);
      const art = e.art as Utsagnsart;
      kreverPart(PART_FOR_UTSAGN[art], `et utsagn med art ${art}`);
      return art === 'varsel'
        ? { id: e.id as string, art, hjemmel: '33.4', dokument: id }
        : (e as unknown as Utsagn);
    }),
  };
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
        return { ...felles, art: 'sak' };
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
