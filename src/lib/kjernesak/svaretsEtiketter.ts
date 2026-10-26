import type { Spor } from '$kjerne/typer';
import type { Utledning } from '$kjerne/utledning/utled';
import type { Etikett, Saksbilde } from './saksbilde';

/**
 * VG-B-02: etikettene fra `visning` som partene ser ved byggherrens svar før TE godtar det: svaret
 * gjaldt et annet varsel (OV-U5), standpunktet er subsidiært, og enigheten er betinget av grunnlaget
 * (GR-U26) eller uten virkning (MM-U28, MM-U30). Varselet står ikke i brevteksten (OV-U5).
 */
const VED_SVARET = [
  'svaret_gjaldt_et_annet_varsel',
  'subsidiaert',
  'enige_betinget',
  'enighet_uten_virkning',
];

/**
 * Etikettene ved byggherrens gjeldende svar i sporet, lest av saksbildet, i rekkefølgen `visning`
 * gir dem. Uten svar er det ingen: «subsidiært» gjelder da TEs krav, ikke et svar.
 */
export const etiketterVedSvaret = (
  bilde: Saksbilde | null | undefined,
  u: Utledning | null | undefined,
  spor: Spor
): Etikett[] =>
  u?.spor[spor].gjeldendeSvar
    ? (bilde?.spor
        .find((s) => s.spor === spor)
        ?.etiketter.filter((e) => VED_SVARET.includes(e.kode)) ?? [])
    : [];
