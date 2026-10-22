/**
 * Vederlagskravet TE sender på TS-stien (#667, #718, B-17). I prøven gjelder bare
 * tilbud (fast beløp): formatet har ingen annen metode ennå, så regningsarbeid og
 * enhetspriser avvises og tilbys ikke (OV-U1). Det samme gjelder rigg og drift,
 * produktivitet og varselet etter § 34.1.3 (#1047). TEs begrunnelse er utdypningen
 * under kravet og er valgfri (oppdragsgiver 17.10, #667). Varselet etter § 34.1.2 sendes
 * fra appen uten beløp og uten fritekst, eller registreres med datoen og brevet som
 * vedlegg når det er sendt utenfor appen (OV-U5, MM-U17).
 */

import { METODE_FRA_KATALOGEN } from '$kjerne/format/koder';
import { letterText } from '$lib/approval/letter';
import {
  dagensDato,
  registrering,
  utenVedlegg,
  varselFraAppen,
  type RegistrertVarsel,
} from './skjemadata';

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
    throw new Error(
      `Metoden ${valg.metode || 'som er valgt'} kan ikke sendes for denne saken ennå. Velg tilbud.`
    );
  const utdypning = valg.utdypning.trim();
  return {
    type: 'krav',
    spor: 'vederlag',
    innhold: { metode: 'tilbud', beloep: valg.beloep },
    ...(utdypning ? { utdypning } : {}),
  };
}

/** Det `TeVederlagForm` sender på TS-stien. Begrunnelsen er HTML fra editoren. */
export interface Vederlagsskjemadata {
  /** Katalogens kode, som `FASTPRIS_TILBUD`. */
  metode?: string;
  belop_direkte?: number;
  begrunnelse?: string;
  saerskilt_krav?: unknown;
  vedlegg_ids?: string[];
  /** `varsel` for varselet fra appen etter § 34.1.2. Uten: kravet. */
  varsel_type?: string;
  /** Varselet sendt utenfor appen, som registreres for seg. */
  registrert?: RegistrertVarsel;
}

export type Vederlagskommando =
  | Vederlagskrav
  | { type: 'send_varsel'; spor: 'vederlag'; hjemmel: '34.1.2' }
  | ReturnType<typeof registrering<'34.1.2'>>;

/**
 * Kommandoen fra dataene `TeVederlagForm` bygger (#718, #1096). Begrunnelsen er HTML fra
 * editoren og blir utdypningen som ren tekst. Varselet fra appen og det registrerte
 * varselet har ingen fritekst (OV-U5, MM-U17). Særskilte krav og vedlegg kan ikke
 * sendes ennå (OV-U1), så de avvises her og sendes ikke.
 */
export function vederlagskommandoFraSkjema(
  data: Vederlagsskjemadata,
  idag = dagensDato()
): Vederlagskommando {
  if (data.saerskilt_krav)
    throw new Error('Særskilte krav etter § 34.1.3 kan ikke sendes for denne saken ennå.');
  utenVedlegg(data);
  const utdypning = letterText(data.begrunnelse ?? '').trim();
  if (data.registrert) return registrering('34.1.2', data.registrert, utdypning, idag);
  if (data.varsel_type === 'varsel') return varselFraAppen('34.1.2', utdypning);
  return vederlagskrav({
    metode: data.metode ?? '',
    beloep: data.belop_direkte ?? 0,
    utdypning,
  });
}
