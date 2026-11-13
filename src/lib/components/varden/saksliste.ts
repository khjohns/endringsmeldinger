/**
 * Sakslisten i Varden (#1450, prototypen `saksliste-v2.html`, MM-U37–MM-U39). Raden
 * viser bare det totalentreprenøren har krevd, og nøkkeltallene summerer kravene. Byggherrens
 * svar, enigheten og betegnelsen per spor står på siden for saken.
 */
import type { Sakslinje } from '$lib/types/api';
import {
  HOVEDKATEGORI_FRA_KATALOGEN,
  tilKatalogen,
  UNDERKATEGORI_FRA_KATALOGEN,
} from '$kjerne/format/koder';
import { dager, kroner } from '$kjerne/frosset/tekst';
import { kalenderdag } from '$kjerne/format/leser';
import { getKontraktsforholdLabel } from '$lib/constants/categories';
import { FORHOLDENE } from './nysak';
import { FORHOLDET, SAKSLISTE } from './tekster';

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

const FORHOLD = new Map(FORHOLDENE.flatMap((g) => g.forhold).map((f) => [f.kode, f]));

/**
 * Forholdet under tittelen med navnet og henvisningen fra skjemaet for ny sak, som
 * «Irregulær endring · pkt. 32.1» (OV-U78, D-1 i BF-05, arbeidsvalg 03.11 i #1450). Et forhold
 * skjemaet ikke har, viser hovedkategorien.
 */
export function forholdet(linje: Sakslinje): string | null {
  if (!linje.forstaatt || !linje.hovedkategori) return null;
  const f = FORHOLD.get(String(tilKatalogen(UNDERKATEGORI_FRA_KATALOGEN, linje.underkategori)));
  if (f) return SAKSLISTE.forholdMedPunkt(f.navn, f.punkt);
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
  /** Ikke med i summene: kravet eller varselet står ikke, eller saken inngår i en endringsordre. */
  dempet: boolean;
  /** Antallet kravposter uten fast beløp ved summen, som i «Tilknyttede krav» (#1779). */
  utenFast: string | null;
  /** «trukket» når kravet i sporet er trukket og saken ellers ikke er avsluttet av TE. */
  merknad: string | null;
};

/**
 * Det TE har krevd i sporet: beløpet eller dagene, «Ingen poster med fast beløp», «Varslet» eller
 * «Ikke krevd» (MM-U37). Summen står med antallet kravposter uten fast beløp, i samme form som
 * «Tilknyttede krav» (arbeidsvalget 12.11 i #1779). «Varslet» leses av `har_varsel` og `ingen_krav` fra serveren, ikke av
 * betegnelsen, som er en annen når byggherren har bedt om spesifisert krav eller sporet er
 * trukket (MM-U30). En sak kjernen ikke forstår, har ingen celle, så tallene ikke leses som
 * riktige (MM-U2).
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
    // En kravpost etter en beregningsregel har ikke et krevd beløp (KA-U61). Uten et fast beløp
    // er kravet ikke med i summene: ukjent er ikke 0 (OV-U43).
    const { beloep, antall_uten_fast_beloep: n } = linje.vederlag.krav;
    if (beloep === null)
      return {
        tekst: FORHOLDET.ingenFastBeloep,
        tall: false,
        dempet: true,
        utenFast: null,
        merknad,
      };
    return {
      tekst: kroner(beloep),
      tall: true,
      dempet,
      utenFast: n ? FORHOLDET.utenFastBeloep(n) : null,
      merknad,
    };
  }
  // KA-U74: dagene gjelder hver frist for seg og legges ikke sammen.
  if (spor === 'frist' && linje.frist.krav) {
    const { frister } = linje.frist.krav;
    return frister.length === 1
      ? { tekst: dager(frister[0]!.dager), tall: true, dempet, utenFast: null, merknad }
      : { tekst: SAKSLISTE.frister(frister.length), tall: false, dempet, utenFast: null, merknad };
  }
  if (varslet(l))
    return {
      tekst: SAKSLISTE.varslet,
      tall: false,
      dempet: !varselITallene(linje, spor, iEndringsordre),
      utenFast: null,
      merknad,
    };
  return { tekst: SAKSLISTE.ikkeKrevd, tall: false, dempet: false, utenFast: null, merknad: null };
}

/** TE har varslet i sporet og ikke sagt «ingen krav» (KA-U12), som serveren gir det. */
const varslet = (s: Sakslinje['vederlag'] | Sakslinje['frist']): boolean =>
  s.har_varsel && !s.ingen_krav;

/**
 * Et varsel uten krav telles for seg når sporet ikke er trukket, saken ikke inngår i en
 * endringsordre og TE ikke har avsluttet saken (MM-U38). Ellers er det dempet i lista.
 */
function varselITallene(
  linje: Sakslinje,
  spor: 'vederlag' | 'frist',
  iEndringsordre: boolean
): boolean {
  const s = linje[spor];
  return (
    !s.krav && varslet(s) && s.betegnelse !== 'trukket' && !iEndringsordre && !avsluttetAvTe(linje)
  );
}

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
    // Et krav med faste beløp telles med summen av dem, også når det har kravposter etter en
    // beregningsregel (KA-U61, #1663).
    if (v.krav && v.kravet_staar && v.krav.beloep !== null) {
      n.vederlag.krav += 1;
      n.vederlag.sum += v.krav.beloep;
    } else if (v.krav && v.kravet_staar) n.vederlag.utenBeloep += 1;
    else if (varselITallene(l, 'vederlag', false)) n.vederlag.varslet += 1;
    if (l.frist.krav && l.frist.kravet_staar) n.frist.krav += 1;
    else if (varselITallene(l, 'frist', false)) n.frist.varslet += 1;
  }
  return n;
}

export type Utvalg = 'alle' | 'eo' | 'ikke-eo' | 'avsluttet';
export type Sortering = 'siste-brev' | 'opprettet';

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

/**
 * Nyeste først, etter datoen for sakens siste brev eller etter når saken ble opprettet. En sak
 * uten brev, eller som kjernen ikke forstår, sorteres etter dagen i Oslo for siste hendelse, som
 * brevets dato. Samme dag sorteres etter siste hendelse.
 */
export const sorter = (linjer: readonly Sakslinje[], etter: Sortering): Sakslinje[] => {
  const naar = (l: Sakslinje) =>
    etter === 'siste-brev'
      ? `${l.siste_brev?.dato ?? kalenderdag(l.siste_hendelse) ?? l.siste_hendelse} ${l.siste_hendelse}`
      : l.opprettet;
  return [...linjer].sort((a, b) => naar(b).localeCompare(naar(a)));
};
