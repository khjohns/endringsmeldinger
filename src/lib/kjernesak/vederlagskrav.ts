/**
 * Vederlagskravet TE sender på TS-stien (#667, #718, B-17). I prøven gjelder bare
 * tilbud (fast beløp): formatet har ingen annen metode ennå, så regningsarbeid og
 * enhetspriser avvises og tilbys ikke (OV-U1). Kravet kan ha posten for produktivitetstap
 * etter § 34.1.3 annet ledd, med eller uten hovedbeløp (OV-U23). Rigg og drift er ikke i
 * formatet og avvises (#1171). TEs begrunnelse er utdypningen under kravet og er valgfri
 * (oppdragsgiver 17.10, #667). Varselet etter § 34.1.2 og det særskilte varselet etter
 * § 34.1.3 sendes fra appen uten beløp og uten fritekst, eller registreres med datoen og
 * brevet som vedlegg når det er sendt utenfor appen (OV-U5, OV-U25, MM-U17).
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
  /** Hovedbeløpet. Uten: kravet gjelder bare posten. */
  beloep?: number;
  /** Posten for produktivitetstap etter § 34.1.3 annet ledd. */
  produktivitet?: number;
  /** TEs begrunnelse som ren tekst. */
  utdypning: string;
}

export type Vederlagskrav = {
  type: 'krav';
  spor: 'vederlag';
  innhold: {
    metode: 'tilbud';
    beloep?: number;
    saerskilt?: { produktivitet: { beloep: number } };
  };
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
    innhold: {
      metode: 'tilbud',
      ...(valg.beloep !== undefined ? { beloep: valg.beloep } : {}),
      ...(valg.produktivitet !== undefined
        ? { saerskilt: { produktivitet: { beloep: valg.produktivitet } } }
        : {}),
    },
    ...(utdypning ? { utdypning } : {}),
  };
}

/** Det `TeVederlagForm` sender på TS-stien. Begrunnelsen er HTML fra editoren. */
export interface Vederlagsskjemadata {
  /** Katalogens kode, som `FASTPRIS_TILBUD`. */
  metode?: string;
  belop_direkte?: number;
  begrunnelse?: string;
  /** Formen fra katalogen. Bare `produktivitet` kan sendes (OV-U23, #1171). */
  saerskilt_krav?: {
    rigg_drift?: { belop?: number };
    produktivitet?: { belop?: number };
  };
  vedlegg_ids?: string[];
  /** `varsel` for varselet fra appen. Uten: kravet. */
  varsel_type?: string;
  /** Varselet sendt utenfor appen, som registreres for seg. */
  registrert?: RegistrertVarsel;
  /** Hjemmelen for varselet. Uten: § 34.1.2. */
  hjemmel?: Vederlagsvarsel;
}

/** Varselet i sporet etter § 34.1.2, og det særskilte etter § 34.1.3 (OV-U25). */
export type Vederlagsvarsel = '34.1.2' | '34.1.3';

export type Vederlagskommando =
  | Vederlagskrav
  | { type: 'send_varsel'; spor: 'vederlag'; hjemmel: Vederlagsvarsel }
  | ReturnType<typeof registrering<Vederlagsvarsel>>;

/**
 * Kommandoen fra dataene `TeVederlagForm` bygger (#718, #1096). Begrunnelsen er HTML fra
 * editoren og blir utdypningen som ren tekst. Varselet fra appen og det registrerte
 * varselet har ingen fritekst (OV-U5, MM-U17). Rigg og drift og vedlegg kan ikke sendes
 * ennå (#1171, #828), så de avvises her og sendes ikke.
 */
export function vederlagskommandoFraSkjema(
  data: Vederlagsskjemadata,
  idag = dagensDato()
): Vederlagskommando {
  if (data.saerskilt_krav?.rigg_drift)
    throw new Error('Kravet om rigg og drift etter § 34.1.3 kan ikke sendes for denne saken ennå.');
  utenVedlegg(data);
  const utdypning = letterText(data.begrunnelse ?? '').trim();
  const hjemmel = data.hjemmel ?? '34.1.2';
  if (data.registrert) return registrering(hjemmel, data.registrert, utdypning, idag);
  if (data.varsel_type === 'varsel') return varselFraAppen(hjemmel, utdypning);
  const produktivitet = data.saerskilt_krav?.produktivitet?.belop;
  // OV-U23: hovedbeløpet kan mangle når kravet har posten. Uten noen av dem sendes 0, som
  // kjernen avviser.
  return vederlagskrav({
    metode: data.metode ?? '',
    beloep: data.belop_direkte ?? (produktivitet === undefined ? 0 : undefined),
    produktivitet,
    utdypning,
  });
}
