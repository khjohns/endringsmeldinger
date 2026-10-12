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
  Avsnitt,
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
} from '../typer.ts';

/**
 * Dokumentet er registrert korrespondanse: det er sendt eller mottatt utenfor appen
 * (4.1). En opplysning som gjelder et varsel i dokumentet, teller ikke (HF-U1).
 */
export const erRegistrert = (opplysninger: { hva: string; gjelder?: string }[]): boolean =>
  opplysninger.some((o) => (o.hva === 'sendt' || o.hva === 'mottatt') && o.gjelder === undefined);

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

/**
 * MM-U7: en dato bestrides som sendt eller mottatt, opplysningen om § 31.3 og
 * merkingen etter KA-U20 som det de er.
 */
export const sammeSlag = (opplysning: string, bestridelse: string): boolean =>
  opplysning === 'sendt' || opplysning === 'mottatt'
    ? bestridelse === 'sendt' || bestridelse === 'mottatt'
    : opplysning === bestridelse;

/** En opplysning om brevet som helhet: § 31.3 eller merkingen etter KA-U20 (MM-U12). */
export const omBrevet = (hva: string): hva is 'endringsordre' | 'kan_ikke_uttrykkes' =>
  hva === 'endringsordre' || hva === 'kan_ikke_uttrykkes';

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
  const art = new Map<string, Standpunktsart>(standpunkter.map((s) => [s.id, s.art]));
  const sett = new Set<string>();
  // VS-U11: et svar uten standpunkt om rettidighet kan være lest med en innsigelse
  // byggherren sendte før det. Den står som en virkning av art rettidighet, først i
  // brevet; utledningen kontrollerer at den er en slik innsigelse.
  const lestMed = [
    ...(b.virkninger as Data[]).map((p) => p.standpunkt as string),
    ...((b.uten_virkning ?? []) as string[]),
  ].filter((id) => !art.has(id));
  if (lestMed.length > 1 || (lestMed.length && spor === 'vederlag'))
    throw new Uforstaatt(`${sti}: virkningen gjelder et standpunkt svaret ikke har`);
  if (lestMed.length && standpunkter.some((s) => s.art === 'rettidighet'))
    throw new Uforstaatt(
      `${sti}: svaret har standpunktet om rettidighet og er lest med en innsigelse`
    );
  const foerst = lestMed[0];
  if (foerst !== undefined) art.set(foerst, 'rettidighet');
  // Prinsipalt og subsidiært er slik brevet ordner standpunktene; uten virkning er
  // appens vurdering og står for seg (HF-U2).
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
  if (foerst !== undefined) rekkefoelge.set(foerst, -1);
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
    grunnlagskrav: (e.grunnlagskrav as string | undefined) ?? null,
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

/**
 * Hvem som kan si hva: TE krever, varsler, godtar, trekker, sier «ingen krav» og
 * påberoper passivitet; BH svarer og begrunner svaret senere (KA-U34). Innsigelse,
 * protest, bestridelse og avklaring
 * kan komme fra begge; utledningen kontrollerer hvem de gjelder.
 */
const PART_FOR_UTSAGN: Record<Utsagnsart, Part | null> = {
  varsel: 'TE',
  trekk: 'TE',
  aksept: 'TE',
  ingen_krav: 'TE',
  passivitet: 'TE',
  bestridelse: null,
  innsigelse: null,
  protest: null,
  avklaring: null,
  begrunnelse: 'BH',
};

function lesDokument(h: Journalrad): Dokument {
  kontroller(h.data, DOKUMENT, '$');
  const data = h.data as {
    krav?: unknown[];
    svar?: unknown[];
    utsagn?: unknown[];
    opplysninger?: Data[];
    dokumentasjon?: string[];
    brevtekst?: Avsnitt[];
  };
  const avklaring = (data.opplysninger ?? []).some(
    (o) => erObjekt(o) && typeof o.hva === 'string' && omBrevet(o.hva) && 'gjelder' in o
  );
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
    // Én opplysning av hvert slag om dokumentet, og én om hvert varsel i det (HF-U1).
    const noekkel = `${String(o.hva)}:${omBrevet(o.hva as string) ? '' : String(o.gjelder ?? '')}`;
    if (hva.has(noekkel))
      throw new Uforstaatt(`dokumentet har to opplysninger om ${String(o.hva)}`);
    hva.add(noekkel);
    const brev = (o.gjelder as string | undefined) ?? id;
    if (o.hva === 'kan_ikke_uttrykkes') {
      const spor = o.spor as Spor[];
      if (new Set(spor).size !== spor.length)
        throw new Uforstaatt('merkingen har samme spor to ganger');
      return { id: o.id as string, dokument: id, hva: o.hva, spor, oppgittAv: avsender, brev };
    }
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
  // KA-U20: merkingen i brevet selv står i et registrert brev med et krav eller svar.
  if (
    opplysninger.some((o) => o.hva === 'kan_ikke_uttrykkes' && o.brev === id) &&
    (!erRegistrert(opplysninger) || (!data.krav && !data.svar))
  )
    throw new Uforstaatt('merkingen står uten et registrert krav eller svar i dokumentet');
  const dokument: Dokument = {
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
    brevtekst: data.brevtekst ?? null,
    utsagn: (data.utsagn ?? []).map((v, i): Utsagn => {
      const e = element(v, UTSAGN, 'art', `$.utsagn[${i}]`);
      const art = e.art as Utsagnsart;
      kreverPart(PART_FOR_UTSAGN[art], `et utsagn med art ${art}`);
      return art === 'varsel'
        ? { id: e.id as string, art, hjemmel: '33.4', dokument: id }
        : (e as unknown as Utsagn);
    }),
  };
  // HF-U1: en datoopplysning med `gjelder` gjelder et varsel i samme dokument.
  for (const o of dokument.opplysninger)
    if (
      o.hva !== 'endringsordre' &&
      o.hva !== 'kan_ikke_uttrykkes' &&
      o.gjelder !== undefined &&
      !dokument.utsagn.some((u) => u.art === 'varsel' && u.id === o.gjelder)
    )
      throw new Uforstaatt('opplysningen gjelder ikke et varsel i dokumentet');
  if (data.brevtekst) {
    // MM-U17: et registrert brev står som det ble sendt og har ingen tekst fra appen.
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
    const sett = new Set<string>();
    for (const a of data.brevtekst) {
      if (!elementer.has(a.gjelder) || sett.has(a.gjelder))
        throw new Uforstaatt('et avsnitt i brevteksten gjelder ikke ett element i brevet');
      sett.add(a.gjelder);
    }
  }
  return dokument;
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
