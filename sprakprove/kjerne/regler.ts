/**
 * Reglene i kjernen med Python-kodene språkprøven og `kontrakt.json` bruker.
 * Kjernen har egne koder (#335). Oversettelsen skjer her, på grensen, med
 * tabellene i `kjerne/format/koder.ts`: katalogens koder inn, og katalogens koder ut.
 */

import {
  BELOEPSVURDERING_FRA_KATALOGEN,
  GRUNNLAGSRESULTAT_FRA_KATALOGEN,
  METODE_FRA_KATALOGEN,
  RESULTAT_FRA_KATALOGEN,
  UTLOESER_FRA_KATALOGEN,
  fraKatalogen,
  kategoriFraKatalogen,
  tilKatalogen,
} from '../../kjerne/format/koder.ts';
import { UgyldigVurdering } from '../../kjerne/regler/feil.ts';
import * as grunnlag from '../../kjerne/regler/grunnlag.ts';
import * as frist from '../../kjerne/regler/frist.ts';
import * as vederlag from '../../kjerne/regler/vederlag.ts';
import { GJELDENDE_REGLER } from '../../kjerne/regler/regelsett.ts';
import type { Grunnlagsresultat, Vederlagsmetode } from './typer.ts';

export { foersteUnderkategori, type Subsidiaergrunn } from '../../kjerne/regler/grunnlag.ts';
export type { Fristkrav } from '../../kjerne/regler/frist.ts';

type Inn<T> = Record<string, unknown> & T;

const grunnlagsresultat = (r: Grunnlagsresultat | null) =>
  fraKatalogen(GRUNNLAGSRESULTAT_FRA_KATALOGEN, r) as never;
const resultatUt = (r: unknown) => tilKatalogen(RESULTAT_FRA_KATALOGEN, r) as string | null;
const utloserUt = (t: string[]) => t.map((u) => tilKatalogen(UTLOESER_FRA_KATALOGEN, u) as string);

export function erPrekludert(
  hovedkategori: string | null,
  underkategori: string | null,
  varsletITide: boolean | null
): boolean {
  const k = kategoriFraKatalogen({ hovedkategori, underkategori });
  return grunnlag.erPrekludert(k.hovedkategori, k.underkategori, varsletITide);
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
      ...kategoriFraKatalogen(g),
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
  const k = kategoriFraKatalogen({ hovedkategori, underkategori });
  try {
    grunnlag.kontrollerGrunnlagssvar(
      GJELDENDE_REGLER,
      k.hovedkategori,
      k.underkategori,
      grunnlagsresultat(resultat),
      varsletITide
    );
  } catch (feil) {
    // Meldingen viser resultatet; klienten og Python har katalogens kode.
    if (!(feil instanceof UgyldigVurdering) || feil.feil.resultat === undefined) throw feil;
    const kjernens = String(grunnlagsresultat(resultat));
    throw new UgyldigVurdering({
      ...feil.feil,
      resultat: feil.feil.resultat.replace(`«${kjernens}»`, `«${String(resultat)}»`),
    });
  }
}

export type Vederlagskrav = Omit<vederlag.Vederlagskrav, 'metode' | 'grunnlag_resultat'> & {
  metode: Vederlagsmetode | null;
  grunnlag_resultat: Grunnlagsresultat | null;
};

const BELOEPSVURDERINGER = ['hovedkrav_vurdering', 'rigg_vurdering', 'produktivitet_vurdering'];

/** Python-hendelsene har `_belop`, kjernen `_beloep` (#1192). */
type MedPythonnavn<T> = {
  [K in keyof T as K extends `${infer F}_beloep` ? `${F}_belop` : K]: T[K];
};
const omdoep = <T>(o: Record<string, T>, fra: RegExp, til: string): Record<string, T> =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k.replace(fra, til), v]));

export function beregnVederlag(krav: Vederlagskrav, v: Record<string, unknown>) {
  const vurdering = omdoep(v, /_belop$/, '_beloep');
  for (const felt of BELOEPSVURDERINGER)
    if (felt in vurdering)
      vurdering[felt] = fraKatalogen(BELOEPSVURDERING_FRA_KATALOGEN, vurdering[felt]);
  let r: vederlag.Vederlagsberegning;
  try {
    r = vederlag.beregnVederlag(
      {
        ...krav,
        metode: fraKatalogen(METODE_FRA_KATALOGEN, krav.metode) as never,
        ...kategoriFraKatalogen(krav),
        grunnlag_resultat: grunnlagsresultat(krav.grunnlag_resultat),
      },
      vurdering as Inn<vederlag.Vederlagsvurdering>,
      GJELDENDE_REGLER
    );
  } catch (feil) {
    if (!(feil instanceof UgyldigVurdering)) throw feil;
    throw new UgyldigVurdering(omdoep(feil.feil, /_beloep$/, '_belop'));
  }
  return {
    ...(omdoep(r as never, /_beloep$/, '_belop') as MedPythonnavn<vederlag.Vederlagsberegning>),
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
