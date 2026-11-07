/**
 * Varselet om vederlag TE sender fra det gamle skjemaet på TS-stien (#667, #718, B-17).
 * Vederlagskravet har kravposter (OV-U95 punkt 19), og skjemaet for dem kommer med BF-14
 * (økt 3 i #1663), så kravet avvises her og sendes ikke. Varselet etter § 34.1.2 og det
 * særskilte varselet etter § 34.1.3 sendes fra appen uten beløp og uten fritekst, eller
 * registreres med datoen og brevet som vedlegg når det er sendt utenfor appen (OV-U5, OV-U25,
 * MM-U17 (opphevet av MM-U50)).
 */

import { letterText } from '$lib/approval/letter';
import {
  dagensDato,
  registrering,
  utenVedlegg,
  varselFraAppen,
  type RegistrertKorrespondanse,
} from './skjemadata';

/**
 * Ingen av katalogens metoder kan sendes til kjernen fra dette skjemaet: vederlagskravet
 * har kravposter (OV-U95 punkt 19), og skjemaet for dem kommer med BF-14 (økt 3 i #1663).
 * Varselet og registreringen sendes fortsatt herfra.
 */
export const metodeKanSendesTilKjernen = () => false;

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
  } | null;
  vedlegg_ids?: string[];
  /** `varsel` for varselet fra appen. Uten: kravet. */
  varsel_type?: string;
  /** Varselet sendt utenfor appen, som registreres for seg. */
  registrert?: RegistrertKorrespondanse;
  /** Hjemmelen for varselet. Uten: § 34.1.2. */
  hjemmel?: Vederlagsvarsel;
}

/** Varselet i sporet etter § 34.1.2, og det særskilte etter § 34.1.3 (OV-U25). */
export type Vederlagsvarsel = '34.1.2' | '34.1.3';

export type Vederlagskommando =
  | { type: 'send_varsel'; spor: 'vederlag'; hjemmel: Vederlagsvarsel }
  | ReturnType<typeof registrering<Vederlagsvarsel>>;

/**
 * Kommandoen fra dataene `TeVederlagForm` bygger (#718, #1096). Begrunnelsen er HTML fra
 * editoren og blir utdypningen som ren tekst. Varselet fra appen og det registrerte
 * varselet har ingen fritekst (OV-U5, MM-U17 (opphevet av MM-U50)). Rigg og drift og vedlegg kan ikke sendes
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
  throw new Error(
    'Vederlagskravet har kravposter og kan ikke sendes fra dette skjemaet ennå. Send varselet, eller registrer et brev sendt utenfor løsningen.'
  );
}
