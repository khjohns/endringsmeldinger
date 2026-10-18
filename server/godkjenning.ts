/**
 * Datalaget for fullmaktene og godkjenningspakkene (S-1a, #818), i
 * `database/migrasjoner/20261019110000_godkjenning.sql`. Funksjonene kalles inne i
 * `transaksjon` med byggherresiden og teamet i konteksten; uten team finnes ingen
 * pakke (invarianten om utkast).
 */
import { feilnummer, sql } from './datalag.ts';
import type { Fullmakt } from './fullmakt.ts';

type Foresp = () => sql.Request;

export type Godkjenningshandling = 'godkjent' | 'returnert' | 'trukket';

/** Pakken finnes ikke for aktøren, eller aktøren kan ikke gjøre handlingen. */
export class PakkeNektet extends Error {}
/** Pakken er returnert, trukket eller godkjent i alle steg. */
export class PakkeAvsluttet extends Error {}
export class UgyldigPakke extends Error {}

const NEKTET = 51403;
const AVSLUTTET = 51409;
const UGYLDIG = 51422;
const BLOKKERT = 33504;

async function kall<T>(arbeid: Promise<T>): Promise<T> {
  try {
    return await arbeid;
  } catch (feil) {
    const nr = feilnummer(feil);
    const melding = feil instanceof Error ? feil.message : String(feil);
    if (nr === NEKTET || nr === BLOKKERT) throw new PakkeNektet(melding);
    if (nr === AVSLUTTET) throw new PakkeAvsluttet(melding);
    if (nr === UGYLDIG) throw new UgyldigPakke(melding);
    throw feil;
  }
}

const tall = (v: unknown): number | null => (v === null ? null : Number(v));

/** Fullmaktene og dagmulktssatsen i prosjektet i konteksten. Bare byggherren ser dem. */
export async function lesFullmakter(
  foresp: Foresp
): Promise<{ fullmakter: Fullmakt[]; dagmulktssats: number | null }> {
  const r = await foresp().execute('koe_api.fullmakter');
  const [fullmakter, satser] = r.recordsets as unknown as [
    { bruker_id: string; tittel: string; grense: unknown; plass: number }[],
    { sats: unknown }[],
  ];
  return {
    fullmakter: fullmakter.map((f) => ({
      brukerId: f.bruker_id,
      tittel: f.tittel,
      grense: tall(f.grense),
      plass: f.plass,
    })),
    dagmulktssats: satser.length ? tall(satser[0].sats) : null,
  };
}

export interface NyPakke {
  pakkeId: string;
  sakId: string;
  forrigePakkeId: string | null;
  /** Svarene og teksten avsenderen godkjenner (LV-U2). */
  brev: unknown;
  /** Det fullmakten ble regnet av: kravversjonene, verdien og satsen. */
  fullmaktsgrunnlag: unknown;
  /** Bruker-ID-ene i kjedens rekkefølge, fra `godkjenningskjede`. */
  godkjennere: readonly string[];
}

export async function lagPakke(foresp: Foresp, p: NyPakke): Promise<void> {
  await kall(
    foresp()
      .input('pakke_id', sql.UniqueIdentifier, p.pakkeId)
      .input('sak_id', sql.NVarChar(36), p.sakId)
      .input('forrige_pakke_id', sql.UniqueIdentifier, p.forrigePakkeId)
      .input('brev', sql.NVarChar(sql.MAX), JSON.stringify(p.brev))
      .input('fullmaktsgrunnlag', sql.NVarChar(sql.MAX), JSON.stringify(p.fullmaktsgrunnlag))
      .input('godkjennere', sql.NVarChar(sql.MAX), JSON.stringify(p.godkjennere))
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
  /** Fullmakten som var gitt da godkjenningen ble gitt (B-04 punkt 2). */
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
    Record<string, unknown>[],
    { godkjenner_id: string }[],
    Record<string, unknown>[],
  ];
  const p = pakker[0];
  if (!p) return null;
  return {
    pakkeId: p.pakke_id as string,
    sakId: p.sak_id as string,
    forrigePakkeId: (p.forrige_pakke_id as string | null) ?? null,
    aktorId: p.aktor_id as string,
    brev: JSON.parse(p.brev as string),
    fullmaktsgrunnlag: JSON.parse(p.fullmaktsgrunnlag as string),
    opprettet: p.opprettet as Date,
    godkjennere: steg.map((s) => s.godkjenner_id),
    handlinger: handlinger.map((h) => ({
      handling: h.handling as Godkjenningshandling,
      steg: h.steg as number | null,
      aktorId: h.aktor_id as string,
      fullmakt:
        h.fullmakt_tittel === null
          ? null
          : { tittel: h.fullmakt_tittel as string, grense: tall(h.fullmakt_grense) },
      begrunnelse: h.begrunnelse as string | null,
      tidspunkt: h.tidspunkt as Date,
    })),
  };
}

/** Godkjent i alle steg, og verken returnert eller trukket. */
export const erGodkjent = (p: LagretPakke): boolean =>
  p.handlinger.every((h) => h.handling === 'godkjent') &&
  p.handlinger.length === p.godkjennere.length;
