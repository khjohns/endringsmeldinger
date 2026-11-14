/**
 * Frysingen av svaret på fristkravet: det svaret gir i dager, når det godkjenner hele kravet, og
 * serverens utregning og kontrollen av byggherrens vurderinger (B-13). `frosset/standpunkt.ts`
 * slår opp her gjennom `FRYSING`, og `frosset/utregning.ts` gjennom `UTREGNING` (#1783). Svaret
 * på forespørselen etter § 33.6.2 og hvordan fristkravene står til den, leses av journalen her.
 */

import { beregnFrist, resultatAvDager, type Fristkrav } from '../../regler/frist.ts';
import { UgyldigVurdering } from '../../regler/feil.ts';
import { kontrollerSpesifiseringen } from '../../regler/svarkontroll.ts';
import {
  avvisUkjenteFelt,
  kravetErDokumentasjon,
  laget,
  prinsipalt,
  standpunktet,
  virkningerIForholdetOgFristen,
  type Svarinnhold,
  type Svarsfrysing,
  type Svarsutregning,
  type Svarvurdering,
} from '../../frosset/byggeklosser.ts';
import { innholdIFristen, utregningIFristen } from './format.ts';
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
  if (spesifisering && v.some((p) => p.standpunkt === spesifisering.id && laget(p.virkning)))
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
    const ukjent = Object.keys(r).filter((k) => !['dager', 'dager_maatte_forstaa'].includes(k));
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
  er_grunnlag_subsidiaert: false,
  er_hele_fristen_subsidiaer_pga_grunnlag: false,
});

/** Utregningen av én frist (§ 33), med vurderingene som gjelder hele kravet. */
function regnUtFristen(
  v: Svarvurdering,
  krevd: number,
  f: Dagvurdering,
  foresporsel: Foresporselsrelasjon | null
): Record<string, unknown> {
  const fkrav = fristkravet(krevd, foresporsel);
  const { er_prekludert: prekludert } = beregnFrist(fkrav, {
    frist_varsel_ok: v.frist_varsel_ok as boolean | undefined,
    spesifisert_krav_ok: v.spesifisert_krav_ok as boolean | undefined,
    foresporsel_svar_ok: v.foresporsel_svar_ok as boolean | undefined,
    vilkar_oppfylt: v.vilkar_oppfylt as boolean | undefined,
    godkjent_dager: f.dager,
  });
  const maatteForstaa = kontrollerSpesifiseringen({
    spesifisert_krav_ok: v.spesifisert_krav_ok,
    dager_maatte_forstaa: f.dager_maatte_forstaa,
    dager: f.dager,
  });
  // KA-U78, OV-U32: dagene i hvert lag i rekkefølgen i `virkningerIForholdetOgFristen`.
  // Preklusjon og «ikke hindret» gir 0 dager, og spesifiseringen dagene byggherren måtte forstå.
  const dager = [
    ...(prekludert ? [0] : []),
    ...(v.vilkar_oppfylt === true ? [] : [0]),
    ...(maatteForstaa === null ? [] : [maatteForstaa]),
    f.dager as number,
  ];
  const resultat = (d: number) => resultatAvDager(true, krevd, d);
  const ut: Record<string, unknown> = {
    gjelder: f.gjelder,
    resultat: resultat(dager[0]!),
    godkjent_dager: dager[0],
  };
  if (dager.length > 1) {
    ut.subsidiaert_resultat = resultat(dager.at(-1)!);
    ut.subsidiaert_godkjent_dager = dager.at(-1);
  }
  ut.lag = dager.map((d, i) => ({ lag: i + 1, dager: d }));
  return ut;
}

/** Utregningen av fristen (§ 33): én rad for hver frist i kravet, uten sum (KA-U74). */
function regnUtFrist(
  v: Svarvurdering,
  krav: Krav,
  foresporsel: Foresporselsrelasjon | null
): Record<string, unknown> {
  avvisUkjenteFelt(v, FRISTVURDERINGER, 'fristen');
  const krevd = innholdIFristen(krav).frister;
  return {
    frister: fristvurderinger(v, krav).map((f, i) =>
      regnUtFristen(v, krevd[i]!.dager, f, foresporsel)
    ),
  };
}

export const UTREGNING_I_FRISTEN = {
  regnUt: (v, { krav, foresporsel }) => regnUtFrist(v, krav, foresporsel),
  utenforOmfanget: () => null,
} satisfies Svarsutregning;

/** Feltene klienten skal ha regnet likt med serveren (`SAMMENLIKNES`). */
export const SAMMENLIKNES_I_FRISTEN = [
  'frister.gjelder',
  'frister.resultat',
  'frister.godkjent_dager',
];

/**
 * VS-U33, OV-U4. Utledningen og `svarPaaForesporsler` leser det herfra, og kommandoene gjennom
 * utledningen.
 */
export const erFristkravIAppen = (d: Pick<Dokument, 'opplysninger'>, k: Pick<Krav, 'spor'>) =>
  k.spor === 'frist' && !kravetErDokumentasjon(d);

export interface ForesporselOgSvar {
  foresporsel: string;
  /** Elementet som svarte: et fristkrav (`medKrav`) eller TEs begrunnelse etter annet ledd b. */
  svar: string | null;
  medKrav: boolean;
}

/**
 * § 33.6.2 (VS-U17, VS-U19, VS-U27): svaret på hver forespørsel. TEs begrunnelse etter annet
 * ledd b og fristkravet svarer på forespørselen de uttrykkelig viser til i `gjelder`, aldri
 * etter rekkefølgen i journalen (HF-U1, LV-U18 punkt 3). Et krav i et registrert brev er
 * dokumentasjon og svarer ikke (OV-U4). Gir forespørselen og elementet som svarte, eller `null`.
 */
export function svarPaaForesporsler(
  dokumenter: Iterable<Pick<Dokument, 'krav' | 'utsagn' | 'opplysninger'>>
): ForesporselOgSvar[] {
  const ut: ForesporselOgSvar[] = [];
  const ubesvart = (gjelder: string | undefined) =>
    ut.find((x) => x.foresporsel === gjelder && x.svar === null);
  for (const d of dokumenter) {
    for (const u of d.utsagn) {
      if (u.art === 'foresporsel') ut.push({ foresporsel: u.id, svar: null, medKrav: false });
      if (u.art === 'foresporselssvar') {
        const f = ubesvart(u.gjelder);
        if (f) f.svar = u.id;
      }
    }
    for (const krav of d.krav) {
      const f = erFristkravIAppen(d, krav) ? ubesvart(krav.gjelder) : undefined;
      if (f) Object.assign(f, { svar: krav.id, medKrav: true });
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
  const krav = svar.find((s) => s.medKrav)?.svar;
  if (krav) return { art: 'svar', gjelder: krav };
  const begrunnelse = svar.filter((s) => s.svar !== null).at(-1)?.svar;
  return begrunnelse ? { art: 'begrunnelse', gjelder: begrunnelse } : null;
}
