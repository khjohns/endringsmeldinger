/**
 * Vederlagskravet TE sender på TS-stien (#667, #718, B-17). I prøven gjelder bare
 * tilbud (fast beløp): formatet har ingen annen metode ennå, så regningsarbeid og
 * enhetspriser avvises og tilbys ikke (OV-U1). Det samme gjelder rigg og drift,
 * produktivitet og varslene etter § 34.1.2 og § 34.1.3. TEs begrunnelse er
 * utdypningen under kravet og er valgfri (oppdragsgiver 17.10, #667).
 */

import { METODE_FRA_KATALOGEN } from '$kjerne/format/koder';
import { letterText } from '$lib/approval/letter';
import type { VederlagSubmissionEventData } from '$lib/domain/vederlagSubmissionDomain';

export interface Vederlagsvalg {
  /** Katalogens kode, som `FASTPRIS_TILBUD`. */
  metode: string;
  beloep: number;
  /** TEs begrunnelse som ren tekst. */
  utdypning: string;
}

export type Vederlagskrav = {
  type: 'krav';
  spor: 'vederlag';
  innhold: { metode: 'tilbud'; beloep: number };
  utdypning?: string;
};

/** Katalogens metode kan sendes til kjernen. Bare tilbud kan det i prøven. */
export const metodeKanSendesTilKjernen = (metode: string) =>
  METODE_FRA_KATALOGEN[metode] === 'tilbud';

/** Vederlagskravet. En metode kjernen ikke kan ta imot, avvises her og sendes ikke. */
export function vederlagskrav(valg: Vederlagsvalg): Vederlagskrav {
  if (!metodeKanSendesTilKjernen(valg.metode))
    throw new Error(`Metoden ${valg.metode} kan ikke sendes i TS-stien ennå. Bare tilbud kan det.`);
  const utdypning = valg.utdypning.trim();
  return {
    type: 'krav',
    spor: 'vederlag',
    innhold: { metode: 'tilbud', beloep: valg.beloep },
    ...(utdypning ? { utdypning } : {}),
  };
}

/**
 * Kravet fra dataene `TeVederlagForm` bygger (#718). Begrunnelsen er HTML fra
 * editoren og blir utdypningen som ren tekst. Særskilte krav og vedlegg kan ikke
 * sendes ennå (OV-U1), så de avvises her og sendes ikke.
 */
export function vederlagskravFraSkjema(
  data: VederlagSubmissionEventData & { vedlegg_ids?: string[] }
): Vederlagskrav {
  if (data.saerskilt_krav)
    throw new Error('Særskilte krav etter § 34.1.3 kan ikke sendes i TS-stien ennå.');
  if (data.vedlegg_ids?.length) throw new Error('Vedlegg kan ikke sendes i TS-stien ennå.');
  return vederlagskrav({
    metode: data.metode,
    beloep: data.belop_direkte ?? 0,
    utdypning: letterText(data.begrunnelse),
  });
}
