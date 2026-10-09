/**
 * Begrepene i målmodellen (docs/forslag-maalmodell-2026-10-09.md, avsnitt 2):
 * dokument, svar og utsagn med `gjelder`, `erstatter` og bestridelse, og
 * enighetsgrunnlaget. Bare det forløp A–E trenger (#304).
 */

import type {
  Fristresultat,
  Grunnlagsresultat,
  Rolle,
  Spor,
  Vederlagsresultat,
} from '../../kjerne/typer.ts';

export type { Spor };
export type Part = Rolle;
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
  /** `vurdert` er dagene byggherren har vurdert, også når de står subsidiært. */
  /** § 33.1: om byggherren godtar at det er en fremdriftshindring. */
  | { id: string; art: 'hindring'; gjelder: string; oppfylt: boolean }
  | { id: string; art: 'dager'; gjelder: string; resultat: Fristresultat; vurdert: number }
  | { id: string; art: 'varsel'; gjelder: Spor; hjemmel: Hjemmel; dokument: string }
  | { id: string; art: 'trekk'; gjelder: string }
  | {
      id: string;
      art: 'aksept';
      gjelder: string;
      regelversjon: number | null;
      /** `undefined` når aksepten er skrevet uten feltet, og kompatibilitetsleseren må utlede det. */
      enighetsgrunnlag: Enighetsgrunnlag | undefined;
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
  regelversjon: number | null;
  utsagn: Utsagn[];
  /** Serverens utregning etter B-13, slik den er lagret. */
  utregning: Record<string, unknown>;
  beslutningsgrunnlag: Beslutningsgrunnlag | null;
  /**
   * Enighetsgrunnlaget svaret skapte ved sammenfall. `null` når svaret ikke
   * godkjente hele kravet; `undefined` når svaret er skrevet uten feltet, og
   * kompatibilitetsleseren må utlede det.
   */
  enighetsgrunnlag: Enighetsgrunnlag | null | undefined;
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

/** Én rad i journalen, lest av kompatibilitetsleseren. */
export type Domenehendelse =
  | { art: 'sak'; id: string; versjon: number; type: string }
  | { art: 'dokument'; id: string; versjon: number; type: string; dokument: Dokument }
  | { art: 'ukjent'; id: string; versjon: number; type: string; grunn: string };

export type Virkning = 'hovedgrunn' | 'subsidiaer' | 'uten_virkning' | 'uavklart';

/** Virkningen ett utsagn i et svar har etter et regelsett. */
export interface Standpunkt {
  utsagn: string;
  art: Utsagnsart;
  virkning: Virkning;
}

/** Utledningen frosset da brevet ble sendt (2.2). */
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
  vilkar: 'grunnlag_avklart' | null;
}

export type Enighetsvirkning = 'betinget' | 'virksom' | 'uten_virkning';

export interface Avvisning {
  regel: string;
  melding: string;
}
