/**
 * Begrepene i kjernen (modellforslaget, avsnitt 2, og domenetabellen): dokument,
 * krav, svar med standpunkter, andre utsagn med `gjelder` og `erstatter`, brevets
 * beslutningsgrunnlag og enighetsgrunnlaget. Lagringsformatet står i `format.ts`
 * (B-10, #273).
 */

import type { Fristresultat, Grunnlagsresultat, Vederlagsresultat } from './regler/typer.ts';

export type Spor = 'grunnlag' | 'vederlag' | 'frist';
export type Part = 'TE' | 'BH';
export const SPOR: readonly Spor[] = ['grunnlag', 'vederlag', 'frist'];
export const KRAVSPOR = ['vederlag', 'frist'] as const;
export type Kravspor = (typeof KRAVSPOR)[number];

export type Hjemmel = '32.2' | '33.4';

/**
 * En opplysning en part oppgir om et dokument (2.4): når det ble sendt eller
 * mottatt, eller, for registrert korrespondanse, om brevet var en endringsordre
 * etter § 31.3. Opplysningen er ikke en rettslig avgjørelse (GR-U13).
 */
export type Opplysning =
  | {
      id: string;
      dokument: string;
      hva: 'sendt' | 'mottatt';
      dato: string;
      oppgittAv: Part;
      /** Varselet i dokumentet opplysningen gjelder; uten den gjelder den dokumentet (HF-U1). */
      gjelder?: string;
    }
  | {
      id: string;
      dokument: string;
      hva: 'endringsordre';
      oppfylt: boolean;
      oppgittAv: Part;
      /** Brevet opplysningen gjelder: dokumentet selv, eller et registrert brev før det (MM-U12). */
      brev: string;
    };

/**
 * Byggherrens standpunkter i ett svar. Standpunktene gjelder kravet svaret
 * gjelder, unntatt rettidigheten, som `gjelder` et varsel eller kravversjonen
 * varselet er utledet av (MM-U1). Beløp og dager leses fra serverens utregning i
 * svaret, så de har ett hjem (4.3 i designnotatet).
 */
export type Standpunkt =
  | { id: string; art: 'rettidighet'; gjelder: string; hjemmel: Hjemmel; iTide: boolean }
  /** «Frafalt» gjelder pålegget (§ 32.3 c), ikke TEs krav. */
  | { id: string; art: 'grunnlag'; resultat: Grunnlagsresultat }
  | { id: string; art: 'beloep'; resultat: Vederlagsresultat; godkjent: number }
  /** § 33.1: om byggherren godtar at fremdriften hindres som følge av forholdet saken gjelder. */
  | { id: string; art: 'hindring'; oppfylt: boolean }
  /** `vurdert` er dagene byggherren har vurdert, også når de står subsidiært. */
  | { id: string; art: 'dager'; resultat: Fristresultat; vurdert: number };

export type Standpunktsart = Standpunkt['art'];

/** Utsagnene i et dokument som ikke er krav eller svar. */
export type Utsagn =
  | { id: string; art: 'varsel'; hjemmel: '33.4'; dokument: string }
  | { id: string; art: 'trekk'; gjelder: string }
  | {
      id: string;
      art: 'aksept';
      gjelder: string;
      /** Regelversjonen TE fikk se (B-13, KA-U10). Innholdet står i brevet. */
      regelversjon: number;
    }
  /**
   * MM-U1, MM-U7: bestrider en opplysning fra motparten: at dokumentet ble sendt
   * eller mottatt, eller at det var en endringsordre.
   */
  | { id: string; art: 'bestridelse'; gjelder: string; hva: Opplysning['hva'] }
  /** KA-U12: TE krever ikke noe i sporet. */
  | { id: string; art: 'ingen_krav'; spor: Kravspor };

export type Utsagnsart = Utsagn['art'];

export interface Krav {
  id: string;
  spor: Spor;
  dokument: string;
  /** Forrige kravversjon i sporet; `null` for den første. */
  erstatter: string | null;
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
  standpunkter: Standpunkt[];
  /** Serverens utregning etter B-13, slik den er lagret. */
  utregning: Record<string, unknown>;
  /** Brevet slik det ble sendt. Virkningen leses herfra (MM-U9). */
  beslutningsgrunnlag: Beslutningsgrunnlag;
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
 * Én rad i `hendelse`, med feltene API-et bruker. `format` er kolonnen med
 * formatversjonen (4.4 i designnotatet); en rad uten den er ikke skrevet av
 * TS-kjernen. `refererer_til_event_id` er kolonnen `referstoid`, som formatet
 * ikke bruker.
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
  format: number | null;
  data: Record<string, unknown>;
}

/** Én rad i journalen, lest av leseren. */
export type Domenehendelse =
  | { art: 'sak'; id: string; versjon: number; type: string }
  | { art: 'dokument'; id: string; versjon: number; type: string; dokument: Dokument }
  | { art: 'ukjent'; id: string; versjon: number; type: string; grunn: string };

/**
 * Virkningen et standpunkt har i brevet: prinsipalt eller subsidiært, slik brevet
 * ordner standpunktene, eller uten virkning, som er appens vurdering og ikke noe
 * byggherren har sagt. Om et standpunkt er uavklart, er ikke en
 * virkning, men en relasjon som utledes ved lesing (MM-U8).
 */
export type Virkning = 'prinsipalt' | 'subsidiaert' | 'uten_virkning';

/** Virkningen ett standpunkt i et svar har etter regelsettet brevet ble regnet med. */
export interface Standpunktsvirkning {
  standpunkt: string;
  art: Standpunktsart;
  virkning: Virkning;
}

/**
 * Utledningen frosset da brevet ble sendt (2.2, MM-U9, MM-U11): virkningen hvert
 * standpunkt hadde, og om svaret godkjenner hele kravet. Det er også innholdet
 * i en enighet om svaret (KA-U10). Utfallet og vilkåret lagres ikke, men
 * utledes av standpunktene.
 */
export interface Beslutningsgrunnlag {
  regelversjon: number;
  virkninger: Standpunktsvirkning[];
  linje: string;
  /** Svaret godkjenner hele kravet, så partene er enige uten aksept (GR-U7, GR-U10). */
  sammenfall: boolean;
  /**
   * GR-U12: appens vurdering av om § 32.2 gjaldt, etter reglene og
   * underkategorien da brevet ble sendt. Ikke en rettslig avgjørelse (MM-U9).
   * Bare i et svar på grunnlaget.
   */
  varslingsplikt?: boolean;
}

export interface Utfall {
  beloep?: number;
  dager?: number;
}

/**
 * Innholdet i en enighet: brevets standpunkter, med kilden, og utfallet og
 * vilkåret utledet av dem. Det lagres ikke, men leses fra brevet, så innholdet
 * har ett hjem (KA-U10, MM-U3, MM-U11).
 */
export interface Enighetsgrunnlag {
  spor: Spor;
  svar: string;
  kilde: 'aksept' | 'sammenfall';
  regelversjon: number;
  virkninger: Standpunktsvirkning[];
  utfall: Utfall;
  /** Vilkåret for at enigheten får virkning: grunnlaget er avklart (GR-U7). Ingen for grunnlaget. */
  vilkaar: 'grunnlag_avklart' | null;
}

export interface Avvisning {
  regel: string;
  melding: string;
}
