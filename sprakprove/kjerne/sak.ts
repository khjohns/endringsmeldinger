/**
 * Saken bygget av journalen, i målformen for M2: hvert spor holder gjeldende
 * krav, siste svar og aksepten, med eksplisitte referanser. Svaret gjelder
 * kravet det viser til; aksepten gjelder svaret den viser til. Status regnes
 * ved lesing og er bare en oppsummering til visning.
 */

import type { Standpunkt } from '../../kjerne/regler/grunnlag.ts';
import {
  erPrekludert,
  foersteUnderkategori as forsteUnderkategori,
  standpunkt,
  type Subsidiaergrunn,
} from './regler.ts';
import type { Grunnlagsresultat, Hendelse, Saksstatus, Spor, Sporstatus } from './typer.ts';

export interface Krav {
  eventId: string;
  /** 1 for første kravversjon. */
  versjon: number;
  data: Record<string, unknown>;
}

export interface Svar {
  eventId: string;
  kravId: string;
  /** Kravversjonen svaret gjelder. */
  kravversjon: number;
  data: Record<string, unknown>;
}

export interface Sportilstand {
  krav: Krav | null;
  /** Siste svar, også på en tidligere kravversjon. */
  svar: Svar | null;
  /** Svaret TE har godtatt. */
  akseptertSvarId: string | null;
  /** Grunnen til at svaret var subsidiært da grunnlagssvaret falt (vedtaket 05.10, GR-U1). */
  subsidiaertTilNyttSvar: Subsidiaergrunn | null;
}

export interface Sak {
  sakId: string;
  antallHendelser: number;
  grunnlag: Sportilstand;
  vederlag: Sportilstand;
  frist: Sportilstand;
}

const tomtSpor = (): Sportilstand => ({
  krav: null,
  svar: null,
  akseptertSvarId: null,
  subsidiaertTilNyttSvar: null,
});

export function nySak(sakId: string): Sak {
  return {
    sakId,
    antallHendelser: 0,
    grunnlag: tomtSpor(),
    vederlag: tomtSpor(),
    frist: tomtSpor(),
  };
}

/** Svaret på gjeldende kravversjon, eller `null` når sporet venter på svar (KA-U1, KT-U1). */
export function gjeldendeSvar(spor: Sportilstand): Svar | null {
  return spor.svar && spor.krav && spor.svar.kravId === spor.krav.eventId ? spor.svar : null;
}

export function teHarAkseptert(spor: Sportilstand): boolean {
  const svar = gjeldendeSvar(spor);
  return svar !== null && spor.akseptertSvarId === svar.eventId;
}

const tekst = (v: unknown) => (typeof v === 'string' ? v : null);
const sannhet = (v: unknown) => (typeof v === 'boolean' ? v : null);

export interface Grunnlagsvurdering {
  resultat: Grunnlagsresultat | null;
  varsletITide: boolean | null;
  hovedkategori: string | null;
  underkategori: string | null;
}

/** Grunnlaget slik gjeldende svar og gjeldende kravversjon sier. */
export function grunnlagsvurdering(sak: Sak): Grunnlagsvurdering {
  const svar = gjeldendeSvar(sak.grunnlag);
  const krav = sak.grunnlag.krav?.data ?? {};
  return {
    resultat: (tekst(svar?.data.resultat) as Grunnlagsresultat | null) ?? null,
    varsletITide: sannhet(svar?.data.grunnlag_varslet_i_tide),
    hovedkategori: tekst(krav.hovedkategori),
    underkategori: forsteUnderkategori(krav.underkategori as string | string[] | null),
  };
}

export function grunnlagetErPrekludert(sak: Sak): boolean {
  const g = grunnlagsvurdering(sak);
  return erPrekludert(g.hovedkategori, g.underkategori, g.varsletITide);
}

/** M1: om svaret på vederlag eller frist er subsidiært, og hvorfor. */
export function standpunktFor(sak: Sak, spor: 'vederlag' | 'frist'): Standpunkt {
  const g = grunnlagsvurdering(sak);
  return standpunkt(
    {
      resultat: g.resultat,
      hovedkategori: g.hovedkategori,
      underkategori: g.underkategori,
      varsletITide: g.varsletITide,
    },
    sak[spor].subsidiaertTilNyttSvar
  );
}

function grunnlagsstatus(sak: Sak): Sporstatus {
  const spor = sak.grunnlag;
  if (!spor.krav) return 'ikke_relevant';
  const svar = gjeldendeSvar(spor);
  if (!svar) return 'sendt';
  const resultat = svar.data.resultat as Grunnlagsresultat;
  const prekludert = grunnlagetErPrekludert(sak);
  if (teHarAkseptert(spor))
    return resultat === 'avslatt' || prekludert ? 'avslatt_akseptert' : 'godkjent';
  if (resultat === 'frafalt') return 'trukket';
  if (prekludert) return 'under_forhandling';
  if (resultat === 'godkjent') return 'laast';
  return 'avslatt';
}

function kravsporstatus(sak: Sak, navn: 'vederlag' | 'frist'): Sporstatus {
  const spor = sak[navn];
  if (!spor.krav) return sak.grunnlag.krav ? 'utkast' : 'ikke_relevant';
  const svar = gjeldendeSvar(spor);
  if (!svar) return 'sendt';
  const resultat = svar.data.beregnings_resultat;
  if (teHarAkseptert(spor)) return resultat === 'avslatt' ? 'avslatt_akseptert' : 'godkjent';
  if (resultat === 'godkjent') return 'godkjent';
  if (resultat === 'delvis_godkjent') return 'delvis_godkjent';
  if (resultat === 'avslatt') return 'avslatt';
  return 'under_behandling';
}

export function sporstatus(sak: Sak, spor: Spor): Sporstatus {
  return spor === 'grunnlag' ? grunnlagsstatus(sak) : kravsporstatus(sak, spor);
}

export function grunnlagetErLaast(sak: Sak): boolean {
  const svar = gjeldendeSvar(sak.grunnlag);
  return svar !== null && svar.data.resultat === 'godkjent' && !grunnlagetErPrekludert(sak);
}

const FERDIG: Sporstatus[] = ['godkjent', 'laast', 'trukket', 'avslatt_akseptert'];
const FORHANDLING: Sporstatus[] = ['under_forhandling', 'delvis_godkjent', 'avslatt'];
const KRAVSPOR = ['vederlag', 'frist'] as const;

/** GR-U7: byggherren har godkjent grunnlaget uten preklusjon etter § 32.2, eller frafalt pålegget. */
export function grunnlagetErAvklart(sak: Sak): boolean {
  const resultat = gjeldendeSvar(sak.grunnlag)?.data.resultat;
  return resultat === 'frafalt' || (resultat === 'godkjent' && !grunnlagetErPrekludert(sak));
}

/** GR-U7: standpunktene i sporet faller sammen. TE har godtatt gjeldende svar, eller svaret godkjenner hele kravet. */
export function erEnighet(sak: Sak, navn: 'vederlag' | 'frist'): boolean {
  const svar = gjeldendeSvar(sak[navn]);
  return (
    svar !== null && (teHarAkseptert(sak[navn]) || svar.data.beregnings_resultat === 'godkjent')
  );
}

/** GR-U7, KA-U5: enighet i sporet og avklart grunnlag. */
export function erOppgjort(sak: Sak, navn: 'vederlag' | 'frist'): boolean {
  return erEnighet(sak, navn) && grunnlagetErAvklart(sak);
}

/**
 * Samlet status for KOE-saken. Saken er omforent når grunnlaget er avklart og
 * hvert sendt krav er oppgjort; et spor TE fortsatt kan sende, hindrer (EO-U2).
 * Resten er oppsummeringen `overordnet_status` har i Python.
 */
export function samletStatus(sak: Sak): Saksstatus {
  const g = sporstatus(sak, 'grunnlag');
  const statuser = [g, sporstatus(sak, 'vederlag'), sporstatus(sak, 'frist')].filter(
    (s) => s !== 'ikke_relevant'
  );
  if (!statuser.length) return 'INGEN_AKTIVE_SPOR';
  if (g === 'avslatt_akseptert') return 'LUKKET_AVSLATT';
  if (grunnlagetErAvklart(sak) && KRAVSPOR.every((n) => sak[n].krav && erOppgjort(sak, n))) {
    return 'OMFORENT';
  }
  if (statuser.every((s) => s === 'trukket')) return 'LUKKET_TRUKKET';
  if (statuser.every((s) => s === 'avslatt_akseptert')) return 'LUKKET_AVSLATT';
  if (statuser.some((s) => FORHANDLING.includes(s))) return 'UNDER_FORHANDLING';
  if (statuser.includes('under_behandling')) return 'UNDER_BEHANDLING';
  if (statuser.includes('sendt')) return 'VENTER_PAA_SVAR';
  if (statuser.includes('utkast') && statuser.every((s) => FERDIG.includes(s) || s === 'utkast')) {
    return grunnlagetErAvklart(sak) ? 'UNDER_BEHANDLING' : 'UTKAST';
  }
  return 'UKJENT';
}

/** Saken kan inngå i en endringsordre. Etter frafall går endringsordren i en egen EO-sak (GR-U3). EO-U2 er utenfor flyten (DT-06). */
export function kanUtstedeEo(sak: Sak): boolean {
  if (!grunnlagetErAvklart(sak) || gjeldendeSvar(sak.grunnlag)?.data.resultat === 'frafalt')
    return false;
  return KRAVSPOR.every((n) => !sak[n].krav || erOppgjort(sak, n));
}

// ---------- Projeksjonen ----------

const SVARTYPER: Record<string, Spor> = {
  respons_grunnlag: 'grunnlag',
  respons_vederlag: 'vederlag',
  respons_vederlag_oppdatert: 'vederlag',
  respons_frist: 'frist',
};

const KRAVTYPER: Record<string, Spor> = {
  grunnlag_opprettet: 'grunnlag',
  grunnlag_oppdatert: 'grunnlag',
  vederlag_krav_sendt: 'vederlag',
  vederlag_krav_oppdatert: 'vederlag',
  frist_krav_sendt: 'frist',
};

/**
 * En hendelse projeksjonen ikke kan anvende. B-10: en ukjent rettslig relevant
 * hendelse kan ikke overses mens bindende kommandoer tillates.
 */
export class UkjentHendelse extends Error {}

/**
 * Legg én hendelse til saken. Hendelsen er alt godkjent av forretningsreglene.
 * Kaster `UkjentHendelse` for en type kjernen ikke behandler, og for en sak som
 * ikke er en vanlig KOE-sak.
 */
export function anvend(sak: Sak, h: Hendelse): Sak {
  const ny: Sak = structuredClone(sak);
  ny.antallHendelser += 1;
  const type = h.event_type as string;
  if (type === 'sak_opprettet') {
    const sakstype = h.data.sakstype;
    if (sakstype !== undefined && sakstype !== 'standard')
      throw new UkjentHendelse(`sak_opprettet med sakstype ${String(sakstype)}`);
    return ny;
  }
  // MS-05: et internt notat er ikke et kontraktsvarsel og har ingen domenevirkning.
  if (type === 'internt_notat') return ny;
  const kravspor = KRAVTYPER[h.event_type];
  if (kravspor) {
    const spor = ny[kravspor];
    if (kravspor === 'grunnlag' && gjeldendeSvar(spor) !== null) {
      // GR-U1 og vedtaket 05.10: svaret på forrige versjon faller, og et
      // subsidiært svar på vederlag eller frist forblir subsidiært.
      for (const navn of ['vederlag', 'frist'] as const) {
        if (ny[navn].svar) ny[navn].subsidiaertTilNyttSvar = standpunktFor(sak, navn).hovedgrunn;
      }
    }
    const data = kravspor === 'grunnlag' && spor.krav ? { ...spor.krav.data, ...h.data } : h.data;
    spor.krav = { eventId: h.event_id, versjon: (spor.krav?.versjon ?? 0) + 1, data };
    return ny;
  }
  const svarspor = SVARTYPER[h.event_type];
  if (svarspor) {
    const spor = ny[svarspor];
    const krav = spor.krav;
    if (!krav) throw new UkjentHendelse(`${type} uten krav i sporet`);
    spor.svar = {
      eventId: h.event_id,
      kravId: krav.eventId,
      kravversjon: krav.versjon,
      data: h.data,
    };
    if (svarspor === 'grunnlag') {
      ny.vederlag.subsidiaertTilNyttSvar = null;
      ny.frist.subsidiaertTilNyttSvar = null;
    } else {
      spor.subsidiaertTilNyttSvar = null;
    }
    return ny;
  }
  if (type === 'te_aksepterer_respons') {
    ny[h.data.spor as Spor].akseptertSvarId = h.refererer_til_event_id;
    return ny;
  }
  throw new UkjentHendelse(type);
}

export function projiser(sakId: string, journal: Hendelse[]): Sak {
  return journal.reduce(anvend, nySak(sakId));
}
