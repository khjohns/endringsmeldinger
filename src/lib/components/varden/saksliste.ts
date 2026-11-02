/**
 * Sakslisten i Varden (#1450, prototypen `saksliste-v2.html`, MM-U37–MM-U39). Raden
 * viser bare det totalentreprenøren har krevd, og nøkkeltallene summerer kravene. Byggherrens
 * svar, enigheten og betegnelsen per spor står på siden for saken.
 */
import type { Sakslinje } from '$lib/types/api';
import { HOVEDKATEGORI_FRA_KATALOGEN, tilKatalogen } from '$kjerne/format/koder';
import { dager, kroner } from '$kjerne/frosset/standpunkt';
import { getKontraktsforholdLabel } from '$lib/constants/categories';
import { SAKSLISTE } from './tekster';

/** Sakstypene i panelet etter KT-U9. Forsering står ikke der ennå (svaret på M4). */
export type Fane = 'koe' | 'eo';
export const FANENE: Fane[] = ['koe', 'eo'];

/**
 * Sakstypen i `sak_metadata`. KOE-saken opprettes som `standard` (`kjerne/kommandoer/opprettelse.ts`).
 * EO-saken finnes ikke ennå (#1423); navnet `endringsordre` er en antakelse til den er bygget.
 */
const SAKSTYPE: Record<string, Fane> = { standard: 'koe', endringsordre: 'eo' };

export const fanen = (linje: Sakslinje): Fane | null => SAKSTYPE[linje.sakstype] ?? null;

/** Dokumentkoden til endringsordren som omfatter saken, etter KOE-sakens ID (EO-U13, EO-U14). */
export type Endringsordrer = Record<string, string>;

/** Saken er avsluttet av TE: påberopelsen er trukket, eller TE har godtatt avslaget. */
export const avsluttetAvTe = (linje: Sakslinje): boolean =>
  linje.saksbetegnelse === 'paaberopelsen_trukket' ||
  linje.saksbetegnelse === 'avslaget_paa_forholdet_godtatt';

/** Merket under tittelen når TE har avsluttet saken. */
export function saksmerke(linje: Sakslinje): string | null {
  if (linje.saksbetegnelse === 'paaberopelsen_trukket') return SAKSLISTE.paaberopelsenTrukket;
  if (linje.saksbetegnelse === 'avslaget_paa_forholdet_godtatt') return SAKSLISTE.avslagetGodtatt;
  return null;
}

/** Navnet på forholdet under tittelen (OV-U78). */
export function forholdet(linje: Sakslinje): string | null {
  if (!linje.forstaatt || !linje.hovedkategori) return null;
  return (
    getKontraktsforholdLabel(
      String(tilKatalogen(HOVEDKATEGORI_FRA_KATALOGEN, linje.hovedkategori))
    ) || null
  );
}

export type Krevd = {
  tekst: string;
  /** Et beløp eller antall dager, som står i mono og høyrestilt. */
  tall: boolean;
  /** Ikke med i summene: kravet står ikke, eller saken inngår i en endringsordre. */
  dempet: boolean;
  /** «trukket» når kravet i sporet er trukket og saken ellers ikke er avsluttet av TE. */
  merknad: string | null;
};

/**
 * Det TE har krevd i sporet: beløpet eller dagene, «Varslet», beregningsregelen eller
 * «Ikke krevd» (MM-U37). «Varslet» leses av `har_varsel`, ikke av betegnelsen, som er en
 * annen når byggherren har bedt om spesifisert krav eller sporet er trukket (MM-U30). En
 * sak kjernen ikke forstår, har ingen celle, så tallene ikke leses som riktige (MM-U2).
 */
export function krevd(
  linje: Sakslinje,
  spor: 'vederlag' | 'frist',
  iEndringsordre: boolean
): Krevd | null {
  if (!linje.forstaatt) return null;
  const l = linje[spor];
  const dempet = iEndringsordre || !l.kravet_staar;
  const trukket = l.betegnelse === 'trukket';
  const merknad = trukket && !avsluttetAvTe(linje) ? SAKSLISTE.trukket : null;
  if (spor === 'vederlag' && linje.vederlag.krav) {
    const { beloep, metode } = linje.vederlag.krav;
    if (metode !== 'tilbud')
      return { tekst: SAKSLISTE.metode[metode] ?? metode, tall: false, dempet: true, merknad };
    return { tekst: kroner(beloep), tall: true, dempet, merknad };
  }
  if (spor === 'frist' && linje.frist.krav)
    return { tekst: dager(linje.frist.krav.dager), tall: true, dempet, merknad };
  if (varslet(l))
    return {
      tekst: SAKSLISTE.varslet,
      tall: false,
      dempet: iEndringsordre || trukket || avsluttetAvTe(linje),
      merknad,
    };
  return { tekst: SAKSLISTE.ikkeKrevd, tall: false, dempet: false, merknad: null };
}

/**
 * TE har varslet i sporet og ikke sagt «ingen krav» etter varselet (KA-U12). Betegnelsen
 * `ingen_krav` går foran `varslet` i MM-U30, og sporet viser da «Ikke krevd».
 */
const varslet = (s: Sakslinje['vederlag'] | Sakslinje['frist']): boolean =>
  s.har_varsel && s.betegnelse !== 'ingen_krav';

export type Noekkeltall = {
  /** `utenBeloep` er krav etter regningsarbeid eller enhetspriser: ukjent er ikke 0 (OV-U43). */
  vederlag: { sum: number; krav: number; varslet: number; utenBeloep: number };
  frist: { krav: number; varslet: number };
};

/**
 * Kravene i sakene som ikke inngår i en endringsordre (MM-U38). Et
 * krav telles når serveren sier at det står (`kravet_staar`, som utelater trukne krav og saker
 * TE har avsluttet). Et varsel uten krav telles for seg. Krav
 * etter regningsarbeid eller enhetspriser har ikke beløp i lista og telles for seg.
 * Fristdagene summeres ikke.
 */
export function noekkeltall(linjer: readonly Sakslinje[], eo: Endringsordrer): Noekkeltall {
  const n: Noekkeltall = {
    vederlag: { sum: 0, krav: 0, varslet: 0, utenBeloep: 0 },
    frist: { krav: 0, varslet: 0 },
  };
  for (const l of linjer) {
    if (!l.forstaatt || eo[l.sak_id] || avsluttetAvTe(l)) continue;
    const v = l.vederlag;
    if (v.krav && v.kravet_staar && v.krav.metode === 'tilbud') {
      n.vederlag.krav += 1;
      n.vederlag.sum += v.krav.beloep;
    } else if (v.krav && v.kravet_staar) n.vederlag.utenBeloep += 1;
    else if (!v.krav && varslet(v)) n.vederlag.varslet += 1;
    if (l.frist.krav && l.frist.kravet_staar) n.frist.krav += 1;
    else if (!l.frist.krav && varslet(l.frist)) n.frist.varslet += 1;
  }
  return n;
}

export type Utvalg = 'alle' | 'eo' | 'ikke-eo' | 'avsluttet';
export type Sortering = 'oppdatert' | 'opprettet';

export function iUtvalg(linje: Sakslinje, utvalg: Utvalg, eo: Endringsordrer): boolean {
  if (utvalg === 'eo') return Boolean(eo[linje.sak_id]);
  if (utvalg === 'ikke-eo') return !eo[linje.sak_id];
  if (utvalg === 'avsluttet') return avsluttetAvTe(linje);
  return true;
}

/** Søket leser tittelen, forholdet og koden for endringsordren. */
export function treff(linje: Sakslinje, soek: string, eo: Endringsordrer): boolean {
  const q = soek.trim().toLocaleLowerCase('nb');
  if (!q) return true;
  return [linje.sakstittel, forholdet(linje), eo[linje.sak_id]]
    .filter(Boolean)
    .some((t) => t!.toLocaleLowerCase('nb').includes(q));
}

/** Nyeste først, etter siste hendelse i journalen eller etter når saken ble opprettet. */
export const sorter = (linjer: readonly Sakslinje[], etter: Sortering): Sakslinje[] =>
  [...linjer].sort((a, b) =>
    etter === 'oppdatert'
      ? b.siste_hendelse.localeCompare(a.siste_hendelse)
      : b.opprettet.localeCompare(a.opprettet)
  );
