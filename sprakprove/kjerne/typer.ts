/**
 * Verdiene er de samme som i `docs/domenetabell/kontrakt.json` og Python-enumene
 * skjemaet viser til (`x-python`). Kontrakttesten holder dem like.
 */

export type Spor = 'grunnlag' | 'vederlag' | 'frist';
export type Rolle = 'TE' | 'BH';

export const SPORSTATUSER = [
  'ikke_relevant',
  'utkast',
  'sendt',
  'under_behandling',
  'godkjent',
  'delvis_godkjent',
  'avslatt',
  'under_forhandling',
  'trukket',
  'avslatt_akseptert',
  'laast',
] as const;
export type Sporstatus = (typeof SPORSTATUSER)[number];

export const SAKSSTATUSER = [
  'UTKAST',
  'VENTER_PAA_SVAR',
  'UNDER_BEHANDLING',
  'UNDER_FORHANDLING',
  'OMFORENT',
  'LUKKET_AVSLATT',
  'LUKKET_TRUKKET',
  'INGEN_AKTIVE_SPOR',
  'UKJENT',
] as const;
export type Saksstatus = (typeof SAKSSTATUSER)[number];

export {
  BELOEPSVURDERINGER as BELOPSVURDERINGER,
  FRISTRESULTATER,
  GRUNNLAGSRESULTATER,
  SUBSIDIAERE_UTLOSERE,
  VEDERLAGSRESULTATER,
} from '../../kjerne/regler/typer.ts';
export type {
  Beloepsvurdering as Belopsvurdering,
  Fristresultat,
  Fristvarseltype,
  Grunnlagsresultat,
  SubsidiaerUtloser,
  Vederlagsmetode,
  Vederlagsresultat,
} from '../../kjerne/regler/typer.ts';

export type Hendelsestype =
  | 'sak_opprettet'
  | 'grunnlag_opprettet'
  | 'grunnlag_oppdatert'
  | 'respons_grunnlag'
  | 'vederlag_krav_sendt'
  | 'vederlag_krav_oppdatert'
  | 'respons_vederlag'
  | 'respons_vederlag_oppdatert'
  | 'frist_krav_sendt'
  | 'respons_frist'
  | 'te_aksepterer_respons';

/** Én hendelse i journalen. Feltene er de API-et bruker; raden i `hendelse` er `tilRad`. */
export interface Hendelse {
  event_id: string;
  sak_id: string;
  event_type: Hendelsestype;
  versjon: number;
  tidsstempel: string;
  aktor_id: string;
  aktor_rolle: Rolle;
  aktor_team_id: string | null;
  refererer_til_event_id: string | null;
  data: Record<string, unknown>;
}

/** Konteksten serveren stempler en kommando med. Klienten bestemmer ingen av dem. */
export interface Kontekst {
  sakId: string;
  aktorId: string;
  rolle: Rolle;
  teamId: string | null;
  tidspunkt: () => Date;
  nyId: () => string;
}
