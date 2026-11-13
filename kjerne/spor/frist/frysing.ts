/**
 * Frysingen av svaret på fristkravet: det svaret gir i dager, når det godkjenner hele kravet, og
 * serverens utregning og kontrollen av byggherrens vurderinger (B-13). `frosset/standpunkt.ts`
 * slår opp her gjennom `FRYSING`, og `frosset/utregning.ts` gjennom `UTREGNING` (#1783).
 */

import { beregnFrist, resultatAvDager, type Fristkrav } from '../../regler/frist.ts';
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
} from '../../frosset/byggeklosser.ts';
import type { Foresporselsrelasjon } from '../../frosset/standpunkt.ts';
import { innholdIFristen, utregningIFristen } from './format.ts';
import type { Krav, Standpunktsvirkning, Utfall } from '../../typer.ts';

function utfallIFristen(svar: Svarinnhold, v: Standpunktsvirkning[], prekludert: boolean): Utfall {
  if (prekludert) return { dager: 0 };
  const spesifisering = standpunktet(svar, 'spesifisering');
  if (spesifisering && prinsipalt(v)?.standpunkt === spesifisering.id)
    return { dager: spesifisering.dager! };
  const dager = standpunktet(svar, 'dager')!;
  return { dager: dager.resultat === 'avslaatt' ? 0 : dager.vurdert };
}

function fristenGodkjent(svar: Svarinnhold, v: Standpunktsvirkning[]): boolean {
  // Arbeidsvalget i #479: en påberopelse etter § 33.6.1 i et lag gir aldri sammenfall. Leses av
  // standpunktene.
  const spesifisering = standpunktet(svar, 'spesifisering');
  if (spesifisering && v.some((p) => p.standpunkt === spesifisering.id && laget(p.virkning)))
    return false;
  return utregningIFristen(svar.utregning).resultat === 'godkjent';
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
  'dager',
  'dager_maatte_forstaa',
]);

/** Utregningen av fristen (§ 33). */
function regnUtFrist(
  v: Svarvurdering,
  krav: Krav,
  foresporsel: Foresporselsrelasjon | null
): Record<string, unknown> {
  avvisUkjenteFelt(v, FRISTVURDERINGER, 'fristen');
  const fkrav: Fristkrav = {
    krevd_dager: innholdIFristen(krav).dager,
    varsel_type: 'spesifisert',
    er_svar_paa_foresporsel: foresporsel?.art === 'svar',
    har_begrunnelse_etter_b: foresporsel?.art === 'begrunnelse',
    // § 33.4 vurderes også når kravet svarer på forespørselen, som uten den.
    har_innsigelse_mot_varsel: true,
    har_tidligere_varsel_i_tide: false,
    er_grunnlag_subsidiaert: false,
    er_hele_fristen_subsidiaer_pga_grunnlag: false,
  };
  const r = beregnFrist(fkrav, {
    frist_varsel_ok: v.frist_varsel_ok as boolean | undefined,
    spesifisert_krav_ok: v.spesifisert_krav_ok as boolean | undefined,
    foresporsel_svar_ok: v.foresporsel_svar_ok as boolean | undefined,
    vilkar_oppfylt: v.vilkar_oppfylt as boolean | undefined,
    godkjent_dager: v.dager,
  });
  const ut: Record<string, unknown> = {
    resultat: r.beregnings_resultat,
    godkjent_dager: r.godkjent_dager,
  };
  if (r.subsidiaer_resultat !== null) {
    ut.subsidiaert_resultat = r.subsidiaer_resultat;
    ut.subsidiaert_godkjent_dager = r.subsidiaer_godkjent_dager ?? 0;
  }
  const maatteForstaa = kontrollerSpesifiseringen(v);
  // VS-U4, rekkefølgen i #479: uten preklusjon og med hindring er dagene byggherren måtte
  // forstå at TE hadde krav på det prinsipale, og de vurderte dagene står subsidiært.
  if (maatteForstaa !== null && r.subsidiaer_resultat === null) {
    ut.resultat = resultatAvDager(true, fkrav.krevd_dager, maatteForstaa);
    ut.godkjent_dager = maatteForstaa;
    ut.subsidiaert_resultat = r.beregnings_resultat;
    ut.subsidiaert_godkjent_dager = r.godkjent_dager;
  }
  return ut;
}

export const UTREGNING_I_FRISTEN = {
  regnUt: (v, { krav, foresporsel }) => regnUtFrist(v, krav, foresporsel),
  utenforOmfanget: () => null,
} satisfies Svarsutregning;

/** Feltene klienten skal ha regnet likt med serveren (`SAMMENLIKNES`). */
export const SAMMENLIKNES_I_FRISTEN = ['resultat', 'godkjent_dager'];
