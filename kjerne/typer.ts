/**
 * Begrepene i kjernen (modellforslaget, avsnitt 2, og domenetabellen): dokument,
 * svar og utsagn med `gjelder`, `erstatter` og bestridelse, brevets
 * beslutningsgrunnlag og enighetsgrunnlaget. Bare det forløp A–E trenger
 * (#304, #308).
 */

import type { Fristresultat, Grunnlagsresultat, Vederlagsresultat } from './regler/typer.ts';

export type Spor = 'grunnlag' | 'vederlag' | 'frist';
export type Part = 'TE' | 'BH';
export const SPOR: readonly Spor[] = ['grunnlag', 'vederlag', 'frist'];
export const KRAVSPOR = ['vederlag', 'frist'] as const;
export type Kravspor = (typeof KRAVSPOR)[number];

export type Hjemmel = '32.2' | '33.4';

/** Et faktum en part oppgir om et dokument: når det ble sendt eller mottatt (2.4). */
export interface Opplysning {
  id: string;
  dokument: string;
  hva: 'sendt' | 'mottatt';
  verdi: string;
  oppgittAv: Part;
}

export type Utsagn =
  | { id: string; art: 'rettidighet'; gjelder: string; hjemmel: Hjemmel; iTide: boolean }
  | { id: string; art: 'ansvar'; gjelder: string; resultat: Grunnlagsresultat }
  | { id: string; art: 'belop'; gjelder: string; resultat: Vederlagsresultat; godkjent: number }
  /** § 33.1: om byggherren godtar at det er en fremdriftshindring. */
  | { id: string; art: 'hindring'; gjelder: string; oppfylt: boolean }
  /** `vurdert` er dagene byggherren har vurdert, også når de står subsidiært. */
  | { id: string; art: 'dager'; gjelder: string; resultat: Fristresultat; vurdert: number }
  | { id: string; art: 'varsel'; gjelder: Spor; hjemmel: Hjemmel; dokument: string }
  | { id: string; art: 'trekk'; gjelder: string }
  | {
      id: string;
      art: 'aksept';
      gjelder: string;
      /** Regelversjonen klienten forhåndsviste aksepten med (B-13). */
      regelversjon: number;
      enighetsgrunnlag: Enighetsgrunnlag;
    }
  | { id: string; art: 'bestridelse'; gjelder: string; hva: 'sendt' | 'mottatt' };

export type Utsagnsart = Utsagn['art'];

export interface Krav {
  id: string;
  spor: Spor;
  dokument: string;
  innhold: Record<string, unknown>;
}

export interface Svar {
  id: string;
  spor: Spor;
  dokument: string;
  /** Kravversjonen svaret gjelder. */
  gjelder: string;
  /** Svaret denne revisjonen erstatter, på samme kravversjon. */
  erstatter: string | null;
  utsagn: Utsagn[];
  /** Serverens utregning etter B-13, slik den er lagret. */
  utregning: Record<string, unknown>;
  /** Brevet slik det ble sendt. Virkningen leses herfra (MM-U9). */
  beslutningsgrunnlag: Beslutningsgrunnlag;
  /** Enighetsgrunnlaget svaret skapte ved sammenfall (GR-U7, GR-U10), ellers `null`. */
  enighetsgrunnlag: Enighetsgrunnlag | null;
}

export interface Dokument {
  id: string;
  avsender: Part;
  /** Satt av serveren. Det eneste tidspunktet systemet selv vet (2.4). */
  registrert: string;
  opplysninger: Opplysning[];
  dokumentasjon: string[];
  krav: Krav[];
  svar: Svar[];
  utsagn: Utsagn[];
}

/**
 * Én rad i journalen, i formen `hendelse` har i dag. Feltene er de API-et
 * bruker. Formatet velges i #273.
 */
export interface Journalrad {
  event_id: string;
  sak_id: string;
  event_type: string;
  versjon: number;
  tidsstempel: string;
  aktor_id: string;
  aktor_rolle: Part;
  aktor_team_id: string | null;
  refererer_til_event_id: string | null;
  data: Record<string, unknown>;
}

/** Én rad i journalen, lest av leseren. */
export type Domenehendelse =
  | { art: 'sak'; id: string; versjon: number; type: string }
  | { art: 'dokument'; id: string; versjon: number; type: string; dokument: Dokument }
  | { art: 'ukjent'; id: string; versjon: number; type: string; grunn: string };

/**
 * Virkningen et utsagn har i brevet: grunnen svaret hviler på, et subsidiært
 * standpunkt eller ingen virkning. Om et standpunkt er uavklart, er ikke en
 * virkning, men en relasjon som utledes ved lesing (MM-U8).
 */
export type Virkning = 'hovedgrunn' | 'subsidiaer' | 'uten_virkning';

/** Virkningen ett utsagn i et svar har etter regelsettet brevet ble regnet med. */
export interface Standpunkt {
  utsagn: string;
  art: Utsagnsart;
  virkning: Virkning;
}

/** Utledningen frosset da brevet ble sendt (2.2, MM-U9). */
export interface Beslutningsgrunnlag {
  regelversjon: number;
  standpunkter: Standpunkt[];
  linje: string;
}

export interface Utfall {
  belop?: number;
  dager?: number;
  grunnlag?: 'avklart' | 'avvist';
}

/** Innholdet i en enighet, frosset der den oppstår (2.5, MM-U3). */
export interface Enighetsgrunnlag {
  spor: Spor;
  svar: string;
  kilde: 'aksept' | 'sammenfall';
  regelversjon: number;
  standpunkter: Standpunkt[];
  utfall: Utfall;
  /** Vilkåret for at enigheten får virkning: grunnlaget er avklart (GR-U7). Ingen for grunnlaget. */
  vilkaar: 'grunnlag_avklart' | null;
}

export interface Avvisning {
  regel: string;
  melding: string;
}
