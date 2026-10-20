/**
 * Datalaget for godkjenningspakkene (S-1a, #818) og kjeden fra hierarkiet i HR-kopien
 * (S-1c, #831), i `database/migrasjoner/20261019110000_godkjenning.sql` og
 * `20261020171000_hierarki_kjede.sql`. Funksjonene kalles inne i `transaksjon` med
 * byggherresiden og teamet i konteksten; uten team finnes ingen pakke (invarianten om
 * utkast).
 */
import {
  BLOKKERT,
  feilnummer,
  KONFLIKT,
  NEKTET,
  sql,
  UGYLDIG,
  UNIK_INDEKS,
  UNIK_NOEKKEL,
  type Foresp,
} from './datalag.ts';
import type { Brevverdi } from './fullmakt.ts';

const INGEN_ROLLER = 52070;
const KJEDEN_MANGLER = 52071;
const ROLLEN_MISTET = 52072;

export type Godkjenningshandling = 'godkjent' | 'returnert' | 'trukket';

/** Pakken finnes ikke for aktøren, eller aktøren kan ikke gjøre handlingen. */
export class PakkeNektet extends Error {}
/**
 * Pakken er returnert, trukket eller godkjent i alle steg, den forrige pakken er alt
 * erstattet, teamet har en åpen pakke i saken, eller lagringen brøt en unik indeks eller nøkkel,
 * som når en samtidig pakke eller handling kom først. Meldingen sier hvilket.
 */
export class PakkeAvsluttet extends Error {}
export class UgyldigPakke extends Error {}
/** Driften har ikke registrert noen roller (GFK-U2). */
export class IngenRoller extends Error {}
/**
 * Kjeden kan ikke avledes av en fersk HR-kopi: saksbehandleren eller en leder mangler
 * rolle, kopien er eldre enn 24 timer, eller ingen leder har en grense som dekker
 * verdien. Pakken kan ikke lages, og driften varsles (GFK-U10).
 */
export class PakkeKanIkkeLages extends Error {}
/** Godkjenneren har mistet rollen, eller som siste i kjeden grensen; pakken lages på nytt (GFK-U10). */
export class RollenMistet extends Error {}

async function kall<T>(arbeid: Promise<T>): Promise<T> {
  try {
    return await arbeid;
  } catch (feil) {
    const nr = feilnummer(feil);
    const melding = feil instanceof Error ? feil.message : String(feil);
    if (nr === NEKTET || nr === BLOKKERT) throw new PakkeNektet(melding, { cause: feil });
    if (nr === KONFLIKT) throw new PakkeAvsluttet(melding, { cause: feil });
    if (nr === UNIK_INDEKS || nr === UNIK_NOEKKEL)
      throw new PakkeAvsluttet('En pakke eller handling med samme nøkkel er alt lagret', {
        cause: feil,
      });
    if (nr === UGYLDIG) throw new UgyldigPakke(melding, { cause: feil });
    if (nr === INGEN_ROLLER) throw new IngenRoller(melding, { cause: feil });
    if (nr === KJEDEN_MANGLER) {
      console.warn(`Godkjenningspakken kan ikke lages: ${melding}`);
      throw new PakkeKanIkkeLages(melding, { cause: feil });
    }
    if (nr === ROLLEN_MISTET) throw new RollenMistet(melding, { cause: feil });
    throw feil;
  }
}

const tall = (v: unknown): number | null => (v === null ? null : Number(v));

/** Dagmulktssatsen i prosjektet i konteksten. Bare byggherren ser den. */
export async function lesDagmulktssats(foresp: Foresp): Promise<number | null> {
  const r = await foresp().execute('koe_api.dagmulktssats');
  const satser = r.recordset as unknown as { sats: unknown }[];
  return satser.length ? tall(satser[0].sats) : null;
}

export interface Godkjenner {
  brukerId: string;
  /** Rollen i HR-kopien (GFK-U6). */
  rolle: string;
  /** Kroner. `null` er ubegrenset. */
  grense: number | null;
}

const verdi = (v: Brevverdi) => (f: Foresp) =>
  f().input('beloep', sql.Decimal(15, 2), v.beloep).input('gulv', sql.Decimal(15, 2), v.gulv);

/**
 * Godkjennerne svaret fra saksbehandleren i konteksten må gjennom, i kjedens
 * rekkefølge (GFK-U8). Tom liste når saksbehandlerens egen rolle dekker verdien (GFK-U4).
 */
export async function lesGodkjenningskjede(foresp: Foresp, v: Brevverdi): Promise<Godkjenner[]> {
  const r = await kall(verdi(v)(foresp).execute('koe_api.godkjenningskjede'));
  return (
    r.recordset as unknown as { godkjenner_id: string; rolle: string; grense: unknown }[]
  ).map((g) => ({ brukerId: g.godkjenner_id, rolle: g.rolle, grense: tall(g.grense) }));
}

export interface NyPakke {
  pakkeId: string;
  sakId: string;
  forrigePakkeId: string | null;
  /** Svarene og teksten avsenderen godkjenner (LV-U2). */
  brev: unknown;
  /** Det fullmakten ble regnet av: kravversjonene, verdien og satsen. */
  fullmaktsgrunnlag: unknown;
  /** Verdien kjeden avledes av; kjeden fryses i pakken (GFK-U10). */
  verdi: Brevverdi;
}

export async function lagPakke(foresp: Foresp, p: NyPakke): Promise<void> {
  await kall(
    verdi(p.verdi)(foresp)
      .input('pakke_id', sql.UniqueIdentifier, p.pakkeId)
      .input('sak_id', sql.NVarChar(36), p.sakId)
      .input('forrige_pakke_id', sql.UniqueIdentifier, p.forrigePakkeId)
      .input('brev', sql.NVarChar(sql.MAX), JSON.stringify(p.brev))
      .input('fullmaktsgrunnlag', sql.NVarChar(sql.MAX), JSON.stringify(p.fullmaktsgrunnlag))
      .execute('koe_api.lag_godkjenningspakke')
  );
}

export async function registrerHandling(
  foresp: Foresp,
  pakkeId: string,
  handling: Godkjenningshandling,
  begrunnelse: string | null = null
): Promise<void> {
  await kall(
    foresp()
      .input('pakke_id', sql.UniqueIdentifier, pakkeId)
      .input('handling', sql.NVarChar(20), handling)
      .input('begrunnelse', sql.NVarChar(4000), begrunnelse)
      .execute('koe_api.registrer_godkjenningshandling')
  );
}

export interface LagretHandling {
  handling: Godkjenningshandling;
  steg: number | null;
  aktorId: string;
  /** Rollen og grensen godkjenneren hadde da godkjenningen ble gitt (B-04 punkt 2). */
  fullmakt: { tittel: string; grense: number | null } | null;
  begrunnelse: string | null;
  tidspunkt: Date;
}

export interface LagretPakke {
  pakkeId: string;
  sakId: string;
  forrigePakkeId: string | null;
  /** Saksbehandleren som utarbeidet svaret og står i brevet som saksbehandler (LV-U15). */
  aktorId: string;
  brev: unknown;
  fullmaktsgrunnlag: unknown;
  opprettet: Date;
  godkjennere: string[];
  handlinger: LagretHandling[];
}

/** Pakken, eller `null` når den ikke finnes eller er skjult for teamet i konteksten. */
export async function lesPakke(foresp: Foresp, pakkeId: string): Promise<LagretPakke | null> {
  const r = await foresp()
    .input('pakke_id', sql.UniqueIdentifier, pakkeId)
    .query(
      `SELECT LOWER(CONVERT(nvarchar(36), pakke_id)) AS pakke_id, sak_id,
              LOWER(CONVERT(nvarchar(36), forrige_pakke_id)) AS forrige_pakke_id,
              LOWER(CONVERT(nvarchar(36), aktor_id)) AS aktor_id, brev, fullmaktsgrunnlag, opprettet
         FROM koe.godkjenningspakke WHERE pakke_id = @pakke_id;
       SELECT LOWER(CONVERT(nvarchar(36), godkjenner_id)) AS godkjenner_id
         FROM koe.godkjenningssteg WHERE pakke_id = @pakke_id ORDER BY steg;
       SELECT handling, steg, LOWER(CONVERT(nvarchar(36), aktor_id)) AS aktor_id, fullmakt_tittel,
              fullmakt_grense, begrunnelse, tidspunkt
         FROM koe.godkjenningshandling WHERE pakke_id = @pakke_id ORDER BY loepenr;`
    );
  const [pakker, steg, handlinger] = r.recordsets as unknown as [
    {
      pakke_id: string;
      sak_id: string;
      forrige_pakke_id: string | null;
      aktor_id: string;
      brev: string;
      fullmaktsgrunnlag: string;
      opprettet: Date;
    }[],
    { godkjenner_id: string }[],
    {
      handling: Godkjenningshandling;
      steg: number | null;
      aktor_id: string;
      fullmakt_tittel: string | null;
      fullmakt_grense: unknown;
      begrunnelse: string | null;
      tidspunkt: Date;
    }[],
  ];
  const p = pakker[0];
  if (!p) return null;
  return {
    pakkeId: p.pakke_id,
    sakId: p.sak_id,
    forrigePakkeId: p.forrige_pakke_id,
    aktorId: p.aktor_id,
    brev: JSON.parse(p.brev),
    fullmaktsgrunnlag: JSON.parse(p.fullmaktsgrunnlag),
    opprettet: p.opprettet,
    godkjennere: steg.map((s) => s.godkjenner_id),
    handlinger: handlinger.map((h) => ({
      handling: h.handling,
      steg: h.steg,
      aktorId: h.aktor_id,
      fullmakt:
        h.fullmakt_tittel === null
          ? null
          : { tittel: h.fullmakt_tittel, grense: tall(h.fullmakt_grense) },
      begrunnelse: h.begrunnelse,
      tidspunkt: h.tidspunkt,
    })),
  };
}

/** Godkjent i hvert steg i kjeden, og verken returnert eller trukket. Stegene telles fra 1. */
export function erGodkjent(p: LagretPakke): boolean {
  if (p.handlinger.some((h) => h.handling !== 'godkjent')) return false;
  const godkjent = new Set(p.handlinger.map((h) => h.steg));
  return p.godkjennere.every((_, i) => godkjent.has(i + 1));
}
