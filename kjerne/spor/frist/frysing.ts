/**
 * Frysingen av svaret på fristkravet: det svaret gir i dager, når det godkjenner hele kravet, og
 * serverens utregning og kontrollen av byggherrens vurderinger (B-13). `frosset/standpunkt.ts`
 * slår opp her gjennom `FRYSING`, og `frosset/utregning.ts` gjennom `UTREGNING` (#1783). Svaret
 * på forespørselen etter § 33.6.2 og hvordan fristkravene står til den, leses av journalen her.
 */

import {
  kontroller,
  resultatAvDager,
  type Fristkrav,
  type Fristvurdering,
} from '../../regler/frist.ts';
import { UgyldigVurdering } from '../../regler/feil.ts';
import { kontrollerSpesifiseringen } from '../../regler/svarkontroll.ts';
import {
  avvisUkjenteFelt,
  laget,
  prinsipalt,
  standpunktet,
  virkningerIForholdetOgFristen,
  type Svarinnhold,
  type Svarsfrysing,
  type Svarsutregning,
  type Svarvurdering,
  type Utregningsgrunnlag,
} from '../../frosset/byggeklosser.ts';
import type { Regelsett } from '../../regler/regelsett.ts';
import { lagIGrunnlaget } from '../poster/format.ts';
import { dagerILaget, innholdIFristen, utregningIFristen } from './format.ts';
import { HJEMMEL } from '../../format/format.ts';
import { dagenSendt, standpunkterISvaret } from '../../format/leser.ts';
import { ukjenteFelt } from '../../format/skjema.ts';
import type { Dokument, Krav, Standpunkt, Standpunktsvirkning, Utfall } from '../../typer.ts';

/** Det svaret gir i dager for hver frist i laget (KA-U74). */
function utfallIFristen(svar: Svarinnhold, v: Standpunktsvirkning[], prekludert: boolean): Utfall {
  const spesifisering = standpunktet(svar, 'spesifisering');
  const maatteForstaa =
    spesifisering && prinsipalt(v)?.standpunkt === spesifisering.id
      ? spesifisering.maatteForstaa
      : undefined;
  const dagerI = (d: Extract<Standpunkt, { art: 'dager' }>): number => {
    if (prekludert) return 0;
    if (maatteForstaa) return maatteForstaa.find((m) => m.frist === d.gjelder)!.dager;
    return d.resultat === 'avslaatt' ? 0 : d.vurdert;
  };
  const frister = svar.standpunkter.flatMap((d) =>
    d.art === 'dager' ? [{ gjelder: d.gjelder, dager: dagerI(d) }] : []
  );
  return { frister };
}

function fristenGodkjent(svar: Svarinnhold, v: Standpunktsvirkning[]): boolean {
  // Arbeidsvalget i #479: en påberopelse etter § 33.6.1 i et lag gir aldri sammenfall. Leses av
  // standpunktene.
  const spesifisering = standpunktet(svar, 'spesifisering');
  if (
    spesifisering &&
    !spesifisering.iTide &&
    v.some((p) => p.standpunkt === spesifisering.id && laget(p.virkning))
  )
    return false;
  // GR-U7, GR-U38: hele kravet er godkjent når hver frist har fått alle dagene.
  return utregningIFristen(svar.utregning).frister.every((r) => r.resultat === 'godkjent');
}

export const FRYSING_I_FRISTEN = {
  virkninger: virkningerIForholdetOgFristen,
  utfall: utfallIFristen,
  godkjennerHeleKravet: fristenGodkjent,
  vilkaar: 'forhold_avklart',
  // VS-U20, arbeidsvalget 15.10 i #309. Gjelder rettidigheten etter § 33.4 og § 33.6.2.
  hvertITideGirOppInnsigelsen: true,
  // VS-U29: også påberopelsen etter § 33.6.2 mot begrunnelsen.
  ogsaaInnsigelserEtter: ['33.6.2'],
} satisfies Svarsfrysing;

// ---------- Utregningen av svaret (B-13) ----------

/** Feltene kjernen leser i vurderingene i svaret på fristen (`regnUtFrist`, `standpunkter`). */
const FRISTVURDERINGER = new Set<string>([
  'frist_varsel_ok',
  'spesifisert_krav_ok',
  'foresporsel_svar_ok',
  'vilkar_oppfylt',
  'frister',
]);

/** Byggherrens vurdering av dagene for én frist i kravet, med fristens `id` (`gjelder`). */
export interface Dagvurdering {
  gjelder: string;
  dager?: unknown;
  dager_maatte_forstaa?: unknown;
}

const DAGVURDERINGEN: ReadonlySet<string> = new Set(['dager', 'dager_maatte_forstaa']);

/**
 * Vurderingene for fristene i kravet, én per frist og i kravets rekkefølge (KA-U74). Svaret
 * gjelder én kravversjon, så rekkefølgen binder vurderingen til fristen. Kaster
 * `UgyldigVurdering` når antallet ikke stemmer, eller en vurdering har ukjente felt.
 */
export function fristvurderinger(v: Svarvurdering, krav: Krav): Dagvurdering[] {
  const frister = innholdIFristen(krav).frister;
  const liste = v.frister;
  const feil = (grunn: string) => new UgyldigVurdering({ frister: grunn });
  if (!Array.isArray(liste) || liste.length !== frister.length)
    throw feil('svaret må ha én vurdering for hver frist i kravet, i samme rekkefølge');
  return liste.map((x: unknown, i) => {
    if (typeof x !== 'object' || x === null) throw feil(`vurdering ${i + 1} er ikke et objekt`);
    const r = x as Record<string, unknown>;
    const ukjent = ukjenteFelt(r, DAGVURDERINGEN);
    if (ukjent.length) throw feil(`vurdering ${i + 1} har feltene ${ukjent.join(', ')}`);
    return {
      gjelder: frister[i]!.id,
      dager: r.dager,
      dager_maatte_forstaa: r.dager_maatte_forstaa,
    };
  });
}

/**
 * Kravet slik regelsettet leser det for én frist med `krevd` dager, ut fra forespørselen etter
 * § 33.6.2 svaret gjelder. Lagene i et svarutkast leser spørsmålene av det samme (#1925).
 */
export const fristkravet = (
  krevd: number,
  foresporsel: Foresporselsrelasjon | null
): Fristkrav => ({
  krevd_dager: krevd,
  varsel_type: 'spesifisert',
  er_svar_paa_foresporsel: foresporsel?.art === 'svar',
  har_begrunnelse_etter_b: foresporsel?.art === 'begrunnelse',
  // § 33.4 vurderes også når kravet svarer på forespørselen, som uten den.
  har_innsigelse_mot_varsel: true,
  har_tidligere_varsel_i_tide: false,
});

/** Vurderingen av én frist slik regelsettet leser den: vurderingene av hele kravet og dagene. */
export const vurderingenAvFristen = (v: Svarvurdering, f: Dagvurdering): Fristvurdering => ({
  frist_varsel_ok: v.frist_varsel_ok as boolean | undefined,
  spesifisert_krav_ok: v.spesifisert_krav_ok as boolean | undefined,
  foresporsel_svar_ok: v.foresporsel_svar_ok as boolean | undefined,
  vilkar_oppfylt: v.vilkar_oppfylt as boolean | undefined,
  godkjent_dager: f.dager,
});

/** Dagene byggherren måtte forstå for én frist, kontrollert (VS-U4), eller `null`. */
export const dagerMaatteForstaa = (v: Svarvurdering, f: Dagvurdering): number | null =>
  kontrollerSpesifiseringen({
    spesifisert_krav_ok: v.spesifisert_krav_ok,
    dager_maatte_forstaa: f.dager_maatte_forstaa,
    dager: f.dager,
  });

/**
 * Standpunktene i svaret på fristkravet av vurderingene, i formatet de lagres i. `varsel` gir
 * varselet etter § 33.4 svaret påberoper, og `foresporsel` er forespørselen etter § 33.6.2 svaret
 * gjelder. Kommandoen lagrer dem (`STANDPUNKTER_I_FRISTEN`), og utregningen og lagene i et
 * svarutkast leser lagene av dem (#2242).
 */
export function standpunkterIFristen(
  v: Svarvurdering,
  krav: Krav,
  varsel: () => string,
  foresporsel: Foresporselsrelasjon | null,
  nyId: () => string
): Record<string, unknown>[] {
  const ut: Record<string, unknown>[] = [];
  // VS-U20, OV-U5, HF-U1: varselet før svaret.
  if (typeof v.frist_varsel_ok === 'boolean')
    ut.push({
      id: nyId(),
      art: 'rettidighet',
      gjelder: varsel(),
      hjemmel: HJEMMEL.frist,
      i_tide: v.frist_varsel_ok,
    });
  // VS-U17, VS-U29: svaret på forespørselen etter § 33.6.2, som kravet eller begrunnelsen.
  if (typeof v.foresporsel_svar_ok === 'boolean' && foresporsel)
    ut.push({
      id: nyId(),
      art: 'rettidighet',
      gjelder: foresporsel.gjelder,
      hjemmel: '33.6.2',
      i_tide: v.foresporsel_svar_ok,
    });
  if (typeof v.vilkar_oppfylt === 'boolean')
    ut.push({ id: nyId(), art: 'hindring', oppfylt: v.vilkar_oppfylt });
  const frister = fristvurderinger(v, krav);
  if (typeof v.spesifisert_krav_ok === 'boolean')
    ut.push({
      id: nyId(),
      art: 'spesifisering',
      gjelder: krav.id,
      hjemmel: '33.6.1',
      i_tide: v.spesifisert_krav_ok,
      // D-5: dagene byggherren måtte forstå, for hver frist i kravet.
      ...(v.spesifisert_krav_ok
        ? {}
        : {
            maatte_forstaa: frister.map((f) => ({
              frist: f.gjelder,
              dager: f.dager_maatte_forstaa,
            })),
          }),
    });
  // KA-U74: dagene for hver frist i kravet.
  for (const f of frister) ut.push({ id: nyId(), art: 'dager', gjelder: f.gjelder });
  return ut;
}

/** Utregningen av én frist (§ 33): dagene i hvert lag i svaret (KA-U78, OV-U32). */
function regnUtFristen(
  d: Extract<Standpunkt, { art: 'dager' }>,
  krevd: number,
  standpunkter: readonly Standpunkt[],
  virkninger: readonly Standpunktsvirkning[]
): Record<string, unknown> {
  const dager = Array.from(
    { length: lagIGrunnlaget(virkninger) },
    (_, n) => dagerILaget(standpunkter, virkninger, d, n + 1)!
  );
  const resultat = (x: number) => resultatAvDager(true, krevd, x);
  const ut: Record<string, unknown> = {
    gjelder: d.gjelder,
    resultat: resultat(dager[0]!),
    godkjent_dager: dager[0],
  };
  if (dager.length > 1) {
    ut.subsidiaert_resultat = resultat(dager.at(-1)!);
    ut.subsidiaert_godkjent_dager = dager.at(-1);
  }
  ut.lag = dager.map((x, i) => ({ lag: i + 1, dager: x }));
  return ut;
}

/**
 * Utregningen av fristen (§ 33): én rad for hver frist i kravet, uten sum (KA-U74). Lagene er de
 * `virkningerIForholdetOgFristen` gir standpunktene vurderingene blir lagret som (#2242). Lagene
 * leser ikke hvilket varsel rettidigheten etter § 33.4 gjelder, så det står som kravet.
 */
function regnUtFrist(
  v: Svarvurdering,
  { krav, paaberopelse, foresporsel }: Utregningsgrunnlag,
  regler: Regelsett
): Record<string, unknown> {
  avvisUkjenteFelt(v, FRISTVURDERINGER, 'fristen');
  const krevd = innholdIFristen(krav).frister.map((f) => f.dager);
  const fristene = fristvurderinger(v, krav);
  fristene.forEach((f, i) => {
    kontroller(vurderingenAvFristen(v, f), fristkravet(krevd[i]!, foresporsel));
    dagerMaatteForstaa(v, f);
  });
  let n = 0;
  const lagret = standpunkterIFristen(
    v,
    krav,
    () => krav.id,
    foresporsel,
    () => `utregning-${n++}`
  );
  const rader = fristene.map((f, i) => ({
    gjelder: f.gjelder,
    resultat: resultatAvDager(true, krevd[i]!, f.dager as number),
    godkjent_dager: f.dager,
  }));
  const standpunkter = standpunkterISvaret('frist', {
    standpunkter: lagret,
    utregning: { frister: rader },
  });
  const virkninger = virkningerIForholdetOgFristen(
    { spor: 'frist', standpunkter, utregning: {} },
    paaberopelse,
    regler
  );
  // Dagene står i kravets rekkefølge (`standpunkterIFristen`).
  const dagene = standpunkter.filter((d) => d.art === 'dager');
  return {
    frister: dagene.map((d, i) => regnUtFristen(d, krevd[i]!, standpunkter, virkninger)),
  };
}

export const UTREGNING_I_FRISTEN = {
  regnUt: regnUtFrist,
  utenforOmfanget: () => null,
} satisfies Svarsutregning;

/** Feltene klienten skal ha regnet likt med serveren (`SAMMENLIKNES`). */
export const SAMMENLIKNES_I_FRISTEN = [
  'frister.gjelder',
  'frister.resultat',
  'frister.godkjent_dager',
];

export interface ForesporselOgSvar {
  foresporsel: string;
  /** Elementet som svarte: et fristkrav (`medKrav`) eller TEs begrunnelse etter annet ledd b. */
  svar: string | null;
  medKrav: boolean;
  /**
   * OV-U109: fristkravet totalentreprenøren hadde sendt før forespørselen, lagt til etter den.
   * Det er ikke svar på forespørselen, men forespørselen er da ikke ubesvart.
   */
  kravFoer: string | null;
  /** Dagen forespørselen ble sendt (OV-U98), eller `null` når den ikke kan leses. */
  sendt: string | null;
}

/** OV-U109: forespørselen venter på svar fra totalentreprenøren. */
export const erUbesvart = (f: ForesporselOgSvar): boolean => f.svar === null && f.kravFoer === null;

/**
 * § 33.6.2 (VS-U17, VS-U19, VS-U27): svaret på hver forespørsel. TEs begrunnelse etter annet
 * ledd b og fristkravet svarer på forespørselen de uttrykkelig viser til i `gjelder`, aldri
 * etter rekkefølgen i journalen (HF-U1, LV-U18 punkt 3), også et krav lagt til med kravskjemaet
 * (VS-U47 spørsmål 2). Gir forespørselen og elementet som svarte, eller `null`. Et fristkrav
 * uten `gjelder`, sendt dagen før forespørselen eller tidligere, står i `kravFoer` (OV-U109,
 * OV-U104).
 */
export function svarPaaForesporsler(
  dokumenter: Iterable<Pick<Dokument, 'id' | 'registrert' | 'krav' | 'utsagn' | 'opplysninger'>>
): ForesporselOgSvar[] {
  const ut: ForesporselOgSvar[] = [];
  const ubesvart = (gjelder: string | undefined) =>
    ut.find((x) => x.foresporsel === gjelder && x.svar === null);
  for (const d of dokumenter) {
    for (const u of d.utsagn) {
      if (u.art === 'foresporsel')
        ut.push({
          foresporsel: u.id,
          svar: null,
          medKrav: false,
          kravFoer: null,
          sendt: dagenSendt({ id: u.id, dokument: d.id }, d),
        });
      if (u.art === 'foresporselssvar') {
        const f = ubesvart(u.gjelder);
        if (f) f.svar = u.id;
      }
    }
    for (const krav of d.krav) {
      if (krav.spor !== 'frist') continue;
      const f = ubesvart(krav.gjelder);
      if (f) Object.assign(f, { svar: krav.id, medKrav: true });
      if (krav.gjelder !== undefined) continue;
      const dag = dagenSendt({ id: krav.id, dokument: d.id }, d);
      for (const x of ut)
        if (x.kravFoer === null && dag !== null && x.sendt !== null && dag < x.sendt)
          x.kravFoer = krav.id;
    }
  }
  return ut;
}

/**
 * Hvordan fristkravene står til en forespørsel etter § 33.6.2: kravet svarer på den
 * (fjerde ledd), eller TE har begrunnet etter annet ledd b før kravet, og § 33.6.1 gjelder
 * (femte ledd). `gjelder` er det rettidigheten etter § 33.6.2 gjelder: kravet eller begrunnelsen.
 */
export type Foresporselsrelasjon =
  | { art: 'svar'; gjelder: string }
  | { art: 'begrunnelse'; gjelder: string };

export function foresporselsrelasjon(
  svar: readonly ForesporselOgSvar[]
): Foresporselsrelasjon | null {
  // Forespørselen kan bare sendes før det første fristkravet (VS-U19), så det er kravet som
  // svarer. Senere kravversjoner står i samme forhold til forespørselen (VS-U20).
  // OV-U109, OV-U111: etter et krav sendt før forespørselen utledes ingen virkning etter § 33.6.2
  // tredje, fjerde eller femte ledd, heller ikke for kravet som svarte.
  const uten = svar.filter((s) => s.kravFoer === null);
  const krav = uten.find((s) => s.medKrav)?.svar;
  if (krav) return { art: 'svar', gjelder: krav };
  const begrunnelse = uten.filter((s) => s.svar !== null).at(-1)?.svar;
  return begrunnelse ? { art: 'begrunnelse', gjelder: begrunnelse } : null;
}
