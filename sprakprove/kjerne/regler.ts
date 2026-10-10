/**
 * Reglene i kjernen med Python-kodene språkprøven og `kontrakt.json` bruker.
 * Kjernen har egne koder (#335). Oversettelsen skjer her, på grensen, med
 * tabellene i `kjerne/koder.ts`: katalogens koder inn, og katalogens koder ut.
 */

import {
  BELOEPSVURDERING_FRA_KATALOGEN,
  GRUNNLAGSRESULTAT_FRA_KATALOGEN,
  HOVEDKATEGORI_FRA_KATALOGEN,
  METODE_FRA_KATALOGEN,
  RESULTAT_FRA_KATALOGEN,
  UNDERKATEGORI_FRA_KATALOGEN,
  UTLOSER_FRA_KATALOGEN,
  fraKatalogen,
  tilKatalogen,
} from '../../kjerne/koder.ts';
import * as grunnlag from '../../kjerne/regler/grunnlag.ts';
import * as frist from '../../kjerne/regler/frist.ts';
import * as vederlag from '../../kjerne/regler/vederlag.ts';
import type { Grunnlagsresultat, Vederlagsmetode } from './typer.ts';

export { foersteUnderkategori, type Subsidiaergrunn } from '../../kjerne/regler/grunnlag.ts';
export type { Fristkrav } from '../../kjerne/regler/frist.ts';

type Inn<T> = Record<string, unknown> & T;

const hoved = (k: string | null) => fraKatalogen(HOVEDKATEGORI_FRA_KATALOGEN, k) as string | null;
const under = (k: string | null) => fraKatalogen(UNDERKATEGORI_FRA_KATALOGEN, k) as string | null;
const grunnlagsresultat = (r: Grunnlagsresultat | null) =>
  fraKatalogen(GRUNNLAGSRESULTAT_FRA_KATALOGEN, r) as never;
const resultatUt = (r: unknown) => tilKatalogen(RESULTAT_FRA_KATALOGEN, r) as string | null;
const utloserUt = (t: string[]) => t.map((u) => tilKatalogen(UTLOSER_FRA_KATALOGEN, u) as string);

export function erPrekludert(
  hovedkategori: string | null,
  underkategori: string | null,
  varsletITide: boolean | null
): boolean {
  return grunnlag.erPrekludert(hoved(hovedkategori), under(underkategori), varsletITide);
}

export function standpunkt(
  g: {
    resultat: Grunnlagsresultat | null;
    hovedkategori: string | null;
    underkategori: string | null;
    varsletITide: boolean | null;
  },
  tilNyttSvar: grunnlag.Subsidiaergrunn | null
): grunnlag.Standpunkt {
  return grunnlag.standpunkt(
    {
      resultat: grunnlagsresultat(g.resultat),
      hovedkategori: hoved(g.hovedkategori),
      underkategori: under(g.underkategori),
      varsletITide: g.varsletITide,
    },
    tilNyttSvar
  );
}

export function kontrollerGrunnlagssvar(
  hovedkategori: string | null,
  underkategori: string | null,
  resultat: Grunnlagsresultat | null,
  varsletITide: boolean | null
): void {
  grunnlag.kontrollerGrunnlagssvar(
    hoved(hovedkategori),
    under(underkategori),
    grunnlagsresultat(resultat),
    varsletITide
  );
}

export type Vederlagskrav = Omit<vederlag.Vederlagskrav, 'metode' | 'grunnlag_resultat'> & {
  metode: Vederlagsmetode | null;
  grunnlag_resultat: Grunnlagsresultat | null;
};

const BELOEPSVURDERINGER = ['hovedkrav_vurdering', 'rigg_vurdering', 'produktivitet_vurdering'];

export function beregnVederlag(krav: Vederlagskrav, v: Record<string, unknown>) {
  const vurdering = { ...v };
  for (const felt of BELOEPSVURDERINGER)
    if (felt in vurdering)
      vurdering[felt] = fraKatalogen(BELOEPSVURDERING_FRA_KATALOGEN, vurdering[felt]);
  const r = vederlag.beregnVederlag(
    {
      ...krav,
      metode: fraKatalogen(METODE_FRA_KATALOGEN, krav.metode) as never,
      hovedkategori: hoved(krav.hovedkategori),
      underkategori: under(krav.underkategori),
      grunnlag_resultat: grunnlagsresultat(krav.grunnlag_resultat),
    },
    vurdering as Inn<vederlag.Vederlagsvurdering>
  );
  return {
    ...r,
    beregnings_resultat: resultatUt(r.beregnings_resultat),
    subsidiaer_resultat: resultatUt(r.subsidiaer_resultat),
    subsidiaer_triggers: utloserUt(r.subsidiaer_triggers),
  };
}

export function beregnFrist(krav: frist.Fristkrav, v: Parameters<typeof frist.beregnFrist>[1]) {
  const r = frist.beregnFrist(krav, v);
  return {
    ...r,
    beregnings_resultat: resultatUt(r.beregnings_resultat),
    subsidiaer_resultat: resultatUt(r.subsidiaer_resultat),
    subsidiaer_triggers: utloserUt(r.subsidiaer_triggers),
  };
}
