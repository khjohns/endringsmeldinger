/**
 * Leseren: journalradene i kjernens form. Lagringsformatet er ikke valgt
 * (B-10, #273), så leseren tar radene i formen `hendelse` har i dag, med
 * feltene kjernen legger til i `data` (`dokument_id`, `beslutningsgrunnlag`,
 * `regelversjon` i aksepten og `hendelsesformat`) og de to
 * typene `frist_varsel_registrert` og `bestridelse_registrert`.
 *
 * Det er ingen kompatibilitetsleser for Python-radene (B-17). Det kjernen
 * leser, må være lagret (DM-06): et svar uten et fullstendig beslutningsgrunnlag
 * og en aksept uten regelversjon er ikke forstått. En enighet har ikke noe eget
 * grunnlag; innholdet står i brevet (KA-U10).
 *
 * Det dagens form lar være underforstått, gjør leseren uttrykkelig med
 * betydningen skriveren hadde da raden ble skrevet: en rettidighetsvurdering i
 * et fristsvar gjelder varselet som var registrert da, ellers varselet utledet
 * av kravet; et trekk gjelder sporets siste krav. Leseren gjetter ikke på en
 * manglende referanse. Den gir en hendelse som ikke er forstått (MM-U2).
 */

import { erObjekt, tekst } from './skjema.ts';
import { utenforOmfanget } from './standpunkt.ts';
import type {
  Beslutningsgrunnlag,
  Dokument,
  Domenehendelse,
  Journalrad,
  Krav,
  Opplysning,
  Part,
  Spor,
  Standpunkt,
  Svar,
  Utfall,
  Utsagn,
  Virkning,
} from './typer.ts';

/**
 * Hendelsestypene per spor, i formen `hendelse` har i dag. Leseren og
 * skrivingen avleder sine oppslag herfra, så navnene har ett hjem til
 * lagringsformatet er valgt (#273).
 */
export const HENDELSESTYPER: Record<
  Spor,
  { krav: [string, string]; svar: [string, string]; trekk: string }
> = {
  grunnlag: {
    krav: ['grunnlag_opprettet', 'grunnlag_oppdatert'],
    svar: ['respons_grunnlag', 'respons_grunnlag_oppdatert'],
    trekk: 'grunnlag_trukket',
  },
  vederlag: {
    krav: ['vederlag_krav_sendt', 'vederlag_krav_oppdatert'],
    svar: ['respons_vederlag', 'respons_vederlag_oppdatert'],
    trekk: 'vederlag_krav_trukket',
  },
  frist: {
    krav: ['frist_krav_sendt', 'frist_krav_oppdatert'],
    svar: ['respons_frist', 'respons_frist_oppdatert'],
    trekk: 'frist_krav_trukket',
  },
};

const oppslag = (felt: (t: (typeof HENDELSESTYPER)[Spor]) => string[]): Record<string, Spor> =>
  Object.fromEntries(
    (Object.entries(HENDELSESTYPER) as [Spor, (typeof HENDELSESTYPER)[Spor]][]).flatMap(
      ([spor, t]) => felt(t).map((type) => [type, spor])
    )
  );
const KRAVTYPER = oppslag((t) => t.krav);
export const SVARTYPER = oppslag((t) => t.svar);
const TREKKTYPER = oppslag((t) => [t.trekk]);

export const KRAVREFERANSE: Record<Spor, string> = {
  grunnlag: 'grunnlag_event_id',
  vederlag: 'vederlag_krav_id',
  frist: 'frist_krav_id',
};

/** Varselet kjernen utleder av et fristkrav når ingen varsel er registrert (MM-U1). */
export const utledetVarsel = (kravId: string) => `utledet:${kravId}`;

/** Leseren forstår ikke raden (MM-U2). */
export class Uforstaatt extends Error {}

const sannhet = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null);
const tall = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

function krev<T>(verdi: T | null, hva: string): T {
  if (verdi === null) throw new Uforstaatt(hva);
  return verdi;
}

/** Det leseren husker mellom radene for å gjøre en underforstått referanse uttrykkelig. */
interface Lesestand {
  sisteKrav: Partial<Record<Spor, string>>;
  fristvarsel: string | null;
}

/**
 * Utsagnene i et svar. `fristvarsel` er varselet en rettidighetsvurdering etter
 * § 33.4 gjelder: det registrerte da svaret ble skrevet, ellers det utledede.
 * Kaster `Uforstaatt`. Skrivingen bruker den samme funksjonen når brevet fryses.
 */
export function svarutsagn(
  spor: Spor,
  id: string,
  gjelder: string,
  data: Record<string, unknown>,
  fristvarsel: string
): Utsagn[] {
  const utsagn: Utsagn[] = [];
  if (spor === 'grunnlag') {
    const iTide = sannhet(data.grunnlag_varslet_i_tide);
    if (iTide !== null)
      utsagn.push({ id: `${id}#rettidighet`, art: 'rettidighet', gjelder, hjemmel: '32.2', iTide });
    const resultat = krev(tekst(data.resultat), 'grunnlagssvaret mangler resultat');
    if (!['godkjent', 'avslatt', 'frafalt'].includes(resultat))
      throw new Uforstaatt(`ukjent resultat ${resultat}`);
    utsagn.push({
      id: `${id}#ansvar`,
      art: 'ansvar',
      gjelder,
      resultat: resultat as 'godkjent' | 'avslatt' | 'frafalt',
    });
  } else if (spor === 'vederlag') {
    utsagn.push({
      id: `${id}#beloep`,
      art: 'beloep',
      gjelder,
      resultat: krev(tekst(data.beregnings_resultat), 'vederlagssvaret mangler resultat') as never,
      godkjent: krev(tall(data.total_godkjent_belop), 'vederlagssvaret mangler beløp'),
    });
  } else {
    const iTide = sannhet(data.frist_varsel_ok);
    if (iTide !== null) {
      utsagn.push({
        id: `${id}#rettidighet`,
        art: 'rettidighet',
        gjelder: fristvarsel,
        hjemmel: '33.4',
        iTide,
      });
    }
    const hindring = sannhet(data.vilkar_oppfylt);
    if (hindring !== null)
      utsagn.push({ id: `${id}#hindring`, art: 'hindring', gjelder, oppfylt: hindring });
    const resultat = tekst(data.subsidiaer_resultat) ?? tekst(data.beregnings_resultat);
    utsagn.push({
      id: `${id}#dager`,
      art: 'dager',
      gjelder,
      resultat: krev(resultat, 'fristsvaret mangler resultat') as never,
      vurdert: krev(
        tall(data.subsidiaer_godkjent_dager) ?? tall(data.godkjent_dager),
        'fristsvaret mangler dager'
      ),
    });
  }
  return utsagn;
}

function lesSvar(h: Journalrad, spor: Spor, dokument: string, stand: Lesestand): Svar {
  const data = h.data;
  const utenfor = utenforOmfanget(spor, data);
  if (utenfor) throw new Uforstaatt(utenfor);
  const gjelder = svarreferanse(h, spor);
  const utsagn = svarutsagn(
    spor,
    h.event_id,
    gjelder,
    data,
    stand.fristvarsel ?? utledetVarsel(gjelder)
  );
  return {
    id: h.event_id,
    spor,
    dokument,
    gjelder,
    erstatter: tekst(data.original_respons_id),
    utsagn,
    utregning: data,
    beslutningsgrunnlag: lesBeslutningsgrunnlag(data.beslutningsgrunnlag, spor, utsagn),
  };
}

/** Kravet svaret gjelder. Referansene i raden må vise til det samme kravet. */
export function svarreferanse(h: Journalrad, spor: Spor): string {
  const referanser = [h.refererer_til_event_id, tekst(h.data[KRAVREFERANSE[spor]])].filter(
    (r): r is string => r !== null
  );
  if (!referanser.length) throw new Uforstaatt('svaret viser ikke til noe krav');
  if (referanser.some((r) => r !== referanser[0]))
    throw new Uforstaatt('svaret viser til to ulike krav');
  return referanser[0];
}

const VIRKNINGER = new Set(['hovedgrunn', 'subsidiaer', 'uten_virkning']);
const objekt = (v: unknown): Record<string, unknown> | null => (erObjekt(v) ? v : null);

/** Standpunktene skal ha ett standpunkt per utsagn i svaret, med samme art. */
function lesStandpunkter(v: unknown, utsagn: Utsagn[]): Standpunkt[] {
  if (!Array.isArray(v) || v.length !== utsagn.length)
    throw new Uforstaatt('beslutningsgrunnlaget har ikke ett standpunkt per utsagn');
  const art = new Map(utsagn.map((u) => [u.id, u.art]));
  const sett = new Set<string>();
  return v.map((p) => {
    const o = objekt(p);
    const id = tekst(o?.utsagn);
    if (!o || id === null || !VIRKNINGER.has(o.virkning as string) || sett.has(id))
      throw new Uforstaatt('beslutningsgrunnlaget har et ugyldig standpunkt');
    if (!art.has(id) || art.get(id) !== o.art)
      throw new Uforstaatt('beslutningsgrunnlaget har et standpunkt til et utsagn svaret ikke har');
    sett.add(id);
    return { utsagn: id, art: o.art as Standpunkt['art'], virkning: o.virkning as Virkning };
  });
}

/** Utfallet har feltet sporet gir, og ingen andre: avklart eller avvist, beløpet eller dagene. */
function lesUtfall(v: unknown, spor: Spor): Utfall {
  const o = objekt(v);
  const felt = { grunnlag: 'grunnlag', vederlag: 'beloep', frist: 'dager' }[spor];
  const verdi = o?.[felt];
  const gyldig =
    spor === 'grunnlag' ? verdi === 'avklart' || verdi === 'avvist' : tall(verdi) !== null;
  if (!o || Object.keys(o).length !== 1 || !gyldig)
    throw new Uforstaatt('beslutningsgrunnlaget har et ugyldig utfall');
  return { [felt]: verdi } as Utfall;
}

function lesBeslutningsgrunnlag(v: unknown, spor: Spor, utsagn: Utsagn[]): Beslutningsgrunnlag {
  const o = objekt(v);
  if (!o) throw new Uforstaatt('svaret mangler beslutningsgrunnlag');
  if (typeof o.sammenfall !== 'boolean')
    throw new Uforstaatt('beslutningsgrunnlaget sier ikke om svaret godkjenner hele kravet');
  // GR-U7: en enighet om vederlag eller frist har vilkåret at grunnlaget er avklart.
  if (o.vilkaar !== (spor === 'grunnlag' ? undefined : 'grunnlag_avklart'))
    throw new Uforstaatt('beslutningsgrunnlaget har et annet vilkår enn sporet');
  return {
    regelversjon: krev(tall(o.regelversjon), 'beslutningsgrunnlaget mangler regelversjon'),
    standpunkter: lesStandpunkter(o.standpunkter, utsagn),
    linje: krev(tekst(o.linje), 'beslutningsgrunnlaget mangler linjen i brevet'),
    sammenfall: o.sammenfall,
    utfall: lesUtfall(o.utfall, spor),
    ...(spor === 'grunnlag' ? {} : { vilkaar: 'grunnlag_avklart' as const }),
  };
}

function lesDokument(h: Journalrad, stand: Lesestand): Dokument {
  const data = h.data;
  const id = tekst(data.dokument_id) ?? h.event_id;
  const avsender: Part = h.aktor_rolle;
  const dokument: Dokument = {
    id,
    avsender,
    registrert: h.tidsstempel,
    opplysninger: [],
    dokumentasjon: Array.isArray(data.dokumentasjon) ? data.dokumentasjon.map(String) : [],
    krav: [],
    svar: [],
    utsagn: [],
  };
  const opplysning = (hva: 'sendt' | 'mottatt', verdi: unknown, oppgittAv: unknown) => {
    const v = tekst(verdi);
    if (v === null) return;
    const part = tekst(oppgittAv) ?? avsender;
    if (part !== 'TE' && part !== 'BH') throw new Uforstaatt('ukjent part for opplysningen');
    const o: Opplysning = { id: `${id}#${hva}`, dokument: id, hva, verdi: v, oppgittAv: part };
    dokument.opplysninger.push(o);
  };
  const registrer = () => {
    const varselId = `${h.event_id}#varsel`;
    dokument.utsagn.push({
      id: varselId,
      art: 'varsel',
      gjelder: 'frist',
      hjemmel: '33.4',
      dokument: id,
    });
    return varselId;
  };
  const type = h.event_type;
  // Hvem som kan si hva: TE krever, varsler, godtar og trekker; BH svarer.
  const kreverPart = (part: Part) => {
    if (avsender !== part) throw new Uforstaatt(`${type} er skrevet av ${avsender}, ikke ${part}`);
  };

  if (KRAVTYPER[type]) {
    kreverPart('TE');
    const spor = KRAVTYPER[type];
    const krav: Krav = { id: h.event_id, spor, dokument: id, innhold: data };
    dokument.krav.push(krav);
    stand.sisteKrav[spor] = h.event_id;
    // Et varsel som står i kravet, er registrert første gang det kommer (MM-U1).
    const varsel = data.frist_varsel as Record<string, unknown> | undefined;
    if (spor === 'frist' && varsel && stand.fristvarsel === null) {
      krev(tekst(varsel.dato_sendt), 'varselet i kravet mangler sendedato');
      stand.fristvarsel = registrer();
      opplysning('sendt', varsel.dato_sendt, 'TE');
    }
    return dokument;
  }
  if (SVARTYPER[type]) {
    kreverPart('BH');
    dokument.svar.push(lesSvar(h, SVARTYPER[type], id, stand));
    return dokument;
  }
  if (type === 'te_aksepterer_respons') {
    kreverPart('TE');
    dokument.utsagn.push({
      id: `${h.event_id}#aksept`,
      art: 'aksept',
      gjelder: krev(h.refererer_til_event_id, 'aksepten viser ikke til noe svar'),
      regelversjon: krev(tall(data.regelversjon), 'aksepten mangler regelversjon'),
    });
    return dokument;
  }
  if (TREKKTYPER[type]) {
    kreverPart('TE');
    dokument.utsagn.push({
      id: `${h.event_id}#trekk`,
      art: 'trekk',
      gjelder: krev(stand.sisteKrav[TREKKTYPER[type]] ?? null, 'trekket gjelder et spor uten krav'),
    });
    return dokument;
  }
  if (type === 'frist_varsel_registrert') {
    kreverPart('TE');
    const varselId = registrer();
    opplysning(
      'sendt',
      krev(tekst(data.sendt), 'varselet mangler sendedato'),
      data.sendt_oppgitt_av
    );
    opplysning('mottatt', data.mottatt, data.mottatt_oppgitt_av);
    stand.fristvarsel ??= varselId;
    return dokument;
  }
  if (type === 'bestridelse_registrert') {
    const hva = tekst(data.hva);
    if (hva !== 'sendt' && hva !== 'mottatt') throw new Uforstaatt('ukjent bestridelse');
    dokument.utsagn.push({
      id: `${h.event_id}#bestridelse`,
      art: 'bestridelse',
      gjelder: krev(tekst(data.gjelder), 'bestridelsen viser ikke til noe'),
      hva,
    });
    return dokument;
  }
  throw new Uforstaatt(`ukjent hendelsestype ${type}`);
}

/** Journalen i kjernens form. En rad leseren ikke forstår, blir `ukjent`, ikke hoppet over. */
export function lesJournal(journal: Journalrad[], format: number): Domenehendelse[] {
  const stand: Lesestand = { sisteKrav: {}, fristvarsel: null };
  return journal.map((h): Domenehendelse => {
    const felles = { id: h.event_id, versjon: h.versjon, type: h.event_type as string };
    const radformat = h.data.hendelsesformat ?? 1;
    if (typeof radformat !== 'number' || radformat > format)
      return { ...felles, art: 'ukjent', grunn: `format ${String(radformat)}` };
    if (felles.type === 'sak_opprettet') {
      const sakstype = h.data.sakstype;
      return sakstype === undefined || sakstype === 'standard'
        ? { ...felles, art: 'sak' }
        : { ...felles, art: 'ukjent', grunn: `sakstype ${String(sakstype)}` };
    }
    try {
      return { ...felles, art: 'dokument', dokument: lesDokument(h, stand) };
    } catch (feil) {
      if (feil instanceof Uforstaatt) return { ...felles, art: 'ukjent', grunn: feil.message };
      throw feil;
    }
  });
}
