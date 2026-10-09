/**
 * Kompatibilitetsleseren: dagens lagrede hendelser i modellens form (2.3 i
 * modellforslaget). Lagringsformatet er ikke valgt (B-10, #273), så leseren tar
 * radene slik `hendelse` har dem i dag. Feltene prøven legger til i `data`
 * (`dokument_id`, `beslutningsgrunnlag`, `enighetsgrunnlag`, `regelversjon` i
 * aksepten, `hendelsesformat`) og de to nye typene `frist_varsel_registrert` og
 * `bestridelse_registrert` finnes bare i prøven.
 *
 * Det dagens form lar være underforstått, gjør leseren uttrykkelig med
 * betydningen skriveren hadde da raden ble skrevet: en rettidighetsvurdering i
 * et fristsvar gjelder varselet som var registrert da, ellers varselet utledet
 * av kravet; et trekk gjelder sporets siste krav. Leseren gjetter ikke på en
 * manglende referanse. Den gir en hendelse som ikke er forstått (MM-U2).
 */

import type { Hendelse } from '../../kjerne/typer.ts';
import { utenforProven } from './standpunkt.ts';
import type {
  Dokument,
  Domenehendelse,
  Enighetsgrunnlag,
  Krav,
  Opplysning,
  Part,
  Spor,
  Svar,
  Utsagn,
} from './typer.ts';

const KRAVTYPER: Record<string, Spor> = {
  grunnlag_opprettet: 'grunnlag',
  grunnlag_oppdatert: 'grunnlag',
  vederlag_krav_sendt: 'vederlag',
  vederlag_krav_oppdatert: 'vederlag',
  frist_krav_sendt: 'frist',
  frist_krav_oppdatert: 'frist',
};

export const SVARTYPER: Record<string, Spor> = {
  respons_grunnlag: 'grunnlag',
  respons_grunnlag_oppdatert: 'grunnlag',
  respons_vederlag: 'vederlag',
  respons_vederlag_oppdatert: 'vederlag',
  respons_frist: 'frist',
  respons_frist_oppdatert: 'frist',
};

const TREKKTYPER: Record<string, Spor> = {
  grunnlag_trukket: 'grunnlag',
  vederlag_krav_trukket: 'vederlag',
  frist_krav_trukket: 'frist',
};

export const KRAVREFERANSE: Record<Spor, string> = {
  grunnlag: 'grunnlag_event_id',
  vederlag: 'vederlag_krav_id',
  frist: 'frist_krav_id',
};

/** Varselet kjernen utleder av et fristkrav når ingen varsel er registrert (MM-U1). */
export const utledetVarsel = (kravId: string) => `utledet:${kravId}`;

class Uforstatt extends Error {}

const tekst = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const sannhet = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null);
const tall = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

function krev<T>(verdi: T | null, hva: string): T {
  if (verdi === null) throw new Uforstatt(hva);
  return verdi;
}

/** Det leseren husker mellom radene for å gjøre en underforstått referanse uttrykkelig. */
interface Lesestand {
  sisteKrav: Partial<Record<Spor, string>>;
  fristvarsel: string | null;
}

function svarutsagn(
  spor: Spor,
  id: string,
  gjelder: string,
  data: Record<string, unknown>,
  stand: Lesestand
): Utsagn[] {
  const utsagn: Utsagn[] = [];
  if (spor === 'grunnlag') {
    const iTide = sannhet(data.grunnlag_varslet_i_tide);
    if (iTide !== null)
      utsagn.push({ id: `${id}#rettidighet`, art: 'rettidighet', gjelder, hjemmel: '32.2', iTide });
    const resultat = krev(tekst(data.resultat), 'grunnlagssvaret mangler resultat');
    if (!['godkjent', 'avslatt', 'frafalt'].includes(resultat))
      throw new Uforstatt(`ukjent resultat ${resultat}`);
    utsagn.push({
      id: `${id}#ansvar`,
      art: 'ansvar',
      gjelder,
      resultat: resultat as 'godkjent' | 'avslatt' | 'frafalt',
    });
  } else if (spor === 'vederlag') {
    utsagn.push({
      id: `${id}#belop`,
      art: 'belop',
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
        gjelder: stand.fristvarsel ?? utledetVarsel(gjelder),
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

function lesSvar(h: Hendelse, spor: Spor, dokument: string, stand: Lesestand): Svar {
  const data = h.data;
  const utenfor = utenforProven(spor, data);
  if (utenfor) throw new Uforstatt(utenfor);
  const referanser = [h.refererer_til_event_id, tekst(data[KRAVREFERANSE[spor]])].filter(
    (r): r is string => r !== null
  );
  if (!referanser.length) throw new Uforstatt('svaret viser ikke til noe krav');
  if (referanser.some((r) => r !== referanser[0]))
    throw new Uforstatt('svaret viser til to ulike krav');
  const gjelder = referanser[0];
  const enighet =
    'enighetsgrunnlag' in data ? (data.enighetsgrunnlag as Enighetsgrunnlag | null) : undefined;
  return {
    id: h.event_id,
    spor,
    dokument,
    gjelder,
    erstatter: tekst(data.original_respons_id),
    regelversjon: tall(data.regelversjon),
    utsagn: svarutsagn(spor, h.event_id, gjelder, data, stand),
    utregning: data,
    beslutningsgrunnlag:
      (data.beslutningsgrunnlag as Svar['beslutningsgrunnlag'] | undefined) ?? null,
    enighetsgrunnlag: enighet,
  };
}

function lesDokument(h: Hendelse, stand: Lesestand): Dokument {
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
    if (part !== 'TE' && part !== 'BH') throw new Uforstatt('ukjent part for opplysningen');
    const o: Opplysning = { id: `${id}#${hva}`, dokument: id, hva, verdi: v, oppgittAv: part };
    dokument.opplysninger.push(o);
  };
  const type = h.event_type as string;

  if (KRAVTYPER[type]) {
    const spor = KRAVTYPER[type];
    const krav: Krav = { id: h.event_id, spor, dokument: id, innhold: data };
    dokument.krav.push(krav);
    stand.sisteKrav[spor] = h.event_id;
    // Et varsel som står i kravet, er registrert første gang det kommer (MM-U1).
    const varsel = data.frist_varsel as Record<string, unknown> | undefined;
    if (spor === 'frist' && varsel && stand.fristvarsel === null) {
      krev(tekst(varsel.dato_sendt), 'varselet i kravet mangler sendedato');
      const varselId = `${h.event_id}#varsel`;
      dokument.utsagn.push({
        id: varselId,
        art: 'varsel',
        gjelder: 'frist',
        hjemmel: '33.4',
        dokument: id,
      });
      opplysning('sendt', varsel.dato_sendt, 'TE');
      stand.fristvarsel = varselId;
    }
    return dokument;
  }
  if (SVARTYPER[type]) {
    dokument.svar.push(lesSvar(h, SVARTYPER[type], id, stand));
    return dokument;
  }
  if (type === 'te_aksepterer_respons') {
    // Et tomt enighetsgrunnlag skriver ingen kjerne: et uavklart standpunkt kan ikke godtas.
    if (data.enighetsgrunnlag === null)
      throw new Uforstatt('aksepten har et tomt enighetsgrunnlag');
    dokument.utsagn.push({
      id: `${h.event_id}#aksept`,
      art: 'aksept',
      gjelder: krev(h.refererer_til_event_id, 'aksepten viser ikke til noe svar'),
      regelversjon: tall(data.regelversjon),
      // Uten feltet utledes enighetsgrunnlaget (2.5).
      enighetsgrunnlag: data.enighetsgrunnlag as Enighetsgrunnlag | undefined,
    });
    return dokument;
  }
  if (TREKKTYPER[type]) {
    dokument.utsagn.push({
      id: `${h.event_id}#trekk`,
      art: 'trekk',
      gjelder: krev(stand.sisteKrav[TREKKTYPER[type]] ?? null, 'trekket gjelder et spor uten krav'),
    });
    return dokument;
  }
  if (type === 'frist_varsel_registrert') {
    const varselId = `${h.event_id}#varsel`;
    dokument.utsagn.push({
      id: varselId,
      art: 'varsel',
      gjelder: 'frist',
      hjemmel: '33.4',
      dokument: id,
    });
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
    if (hva !== 'sendt' && hva !== 'mottatt') throw new Uforstatt('ukjent bestridelse');
    dokument.utsagn.push({
      id: `${h.event_id}#bestridelse`,
      art: 'bestridelse',
      gjelder: krev(tekst(data.gjelder), 'bestridelsen viser ikke til noe'),
      hva,
    });
    return dokument;
  }
  throw new Uforstatt(`ukjent hendelsestype ${type}`);
}

/** Journalen i modellens form. En rad leseren ikke forstår, blir `ukjent`, ikke hoppet over. */
export function lesJournal(journal: Hendelse[], format: number): Domenehendelse[] {
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
      if (feil instanceof Uforstatt) return { ...felles, art: 'ukjent', grunn: feil.message };
      throw feil;
    }
  });
}
