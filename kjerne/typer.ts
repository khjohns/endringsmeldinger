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

export type Hjemmel = '32.2' | '33.4' | '33.6.2' | '34.1.2';

/** TEs eget varsel: om fristforlengelse etter § 33.4, om vederlagsjustering etter § 34.1.2 (OV-U5). */
export type Varselhjemmel = '33.4' | '34.1.2';
export const VARSELSPOR = { '33.4': 'frist', '34.1.2': 'vederlag' } as const satisfies Record<
  Varselhjemmel,
  Kravspor
>;
export const erVarselhjemmel = (hjemmel: Hjemmel): hjemmel is Varselhjemmel =>
  hjemmel in VARSELSPOR;

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
    }
  /**
   * KA-U16, KA-U20: merkingen av et registrert brev. Er ikke med i første versjon
   * (OV-U7): formatet tar ikke imot den, og typen står for brevteksten i `frosset/`.
   */
  | {
      id: string;
      dokument: string;
      hva: 'kan_ikke_uttrykkes';
      spor: Spor[];
      oppgittAv: Part;
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
  /**
   * § 34.2.2: om byggherren aksepterer TEs tilbud. Uten aksept oppgir byggherren metoden
   * byggherren mener vederlaget skal justeres etter (`oensket`); appen avgjør ikke om
   * § 34.3 eller § 34.4 gjelder (arbeidsvalget i #479, MM-U12).
   */
  | {
      id: string;
      art: 'metode';
      hjemmel: '34.2.2';
      aksepterer: boolean;
      oensket?: 'enhetspriser' | 'regningsarbeid';
    }
  /** § 33.1: om byggherren godtar at fremdriften hindres som følge av forholdet saken gjelder. */
  | { id: string; art: 'hindring'; oppfylt: boolean }
  /**
   * § 33.6.1, VS-U4: om TE spesifiserte kravet i tide. Ved «nei» er `dager` det byggherren
   * mener at byggherren måtte forstå at TE hadde krav på, og står prinsipalt.
   */
  | {
      id: string;
      art: 'spesifisering';
      gjelder: string;
      hjemmel: '33.6.1';
      iTide: boolean;
      dager?: number;
    }
  /** `vurdert` er dagene byggherren har vurdert, også når de står subsidiært. */
  | { id: string; art: 'dager'; resultat: Fristresultat; vurdert: number };

export type Standpunktsart = Standpunkt['art'];

/** Utsagnene i et dokument som ikke er krav eller svar. */
export type Utsagn =
  | { id: string; art: 'varsel'; hjemmel: Varselhjemmel; dokument: string }
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
  | { id: string; art: 'bestridelse'; gjelder: string; hva: Opplysningsslag }
  /** KA-U12: TE krever ikke noe i sporet. */
  | { id: string; art: 'ingen_krav'; spor: Kravspor }
  /**
   * § 5 tredje ledd (VS-U1, VS-U9, VS-U14): parten gjør gjeldende at motpartens
   * varsel, krav eller svar kom for sent. `gjelder` er det.
   */
  | {
      id: string;
      art: 'innsigelse';
      gjelder: string;
      /** VS-U29: byggherren mener at TEs begrunnelse etter § 33.6.2 annet ledd b ikke er et svar etter annet ledd. Uten feltet kom det for sent. */
      grunn?: 'ikke_svar';
    }
  /** § 33.6.2 første ledd (VS-U19): byggherren ber TE angi og begrunne antall dager. */
  | { id: string; art: 'foresporsel'; hjemmel: '33.6.2' }
  /**
   * § 33.6.2 annet ledd b (VS-U17, VS-U27): TE begrunner hvorfor grunnlaget for å beregne
   * kravet ikke foreligger. `gjelder` er forespørselen. Ikke en kravversjon; teksten står i brevteksten.
   */
  | { id: string; art: 'foresporselssvar'; gjelder: string }
  /**
   * VS-U1, MP-U6: protest mot en innsigelse: innsigelsen, påberopelsen i et svar
   * (standpunktet om rettidighet), eller et dokument, som da gjelder alle
   * innsigelsene i det.
   */
  | { id: string; art: 'protest'; gjelder: string }
  /** VS-U12: TE påberoper byggherrens passivitet etter § 32.3 annet ledd. `gjelder` er TEs varsel etter § 32.2. */
  | { id: string; art: 'passivitet'; gjelder: string }
  /** KA-U20: avklaringen av en merking. Som merkingen ikke i formatet (OV-U7). */
  | { id: string; art: 'avklaring'; gjelder: string }
  /**
   * KA-U34: byggherrens senere begrunnelse av et svar. `gjelder` er svaret, og
   * teksten står i brevteksten. Endrer ingen standpunkter.
   */
  | { id: string; art: 'begrunnelse'; gjelder: string };

/** OV-U7: det formatet tar imot, uten merkingen og avklaringen av den. */
export type LestOpplysning = Exclude<Opplysning, { hva: 'kan_ikke_uttrykkes' }>;
export type LestUtsagn = Exclude<Utsagn, { art: 'avklaring' }>;
export type Opplysningsslag = LestOpplysning['hva'];
export type Utsagnsart = LestUtsagn['art'];

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
  /**
   * HF-U1, #342: grunnlagsversjonen et svar på vederlag eller frist ble regnet mot.
   * `null` i et svar på grunnlaget.
   */
  grunnlagskrav: string | null;
  standpunkter: Standpunkt[];
  /** Serverens utregning etter B-13, slik den er lagret. */
  utregning: Record<string, unknown>;
  /** Brevet slik det ble sendt. Virkningen leses herfra (MM-U9). */
  beslutningsgrunnlag: Beslutningsgrunnlag;
}

/**
 * Ett avsnitt i brevteksten (LV-U2, LV-U3): det appen lager av partens valg for
 * elementet `gjelder`, og partens utdypning hver for seg (B-13 om
 * begrunnelsestekst). Ingen regel leser teksten.
 */
export interface Avsnitt {
  gjelder: string;
  laast: string;
  utdypning?: string;
}

/**
 * Et vedlegg brevet binder (LV-U14): ID-en klienten oppga, og filnavnet og summen
 * av innholdet serveren fant i mellomlageret.
 */
export interface Vedlegg {
  vedlegg_id: string;
  filnavn: string;
  innhold_sha256: string;
}

export interface Dokument {
  id: string;
  avsender: Part;
  /** Satt av serveren. Det eneste tidspunktet systemet selv vet (2.4). */
  registrert: string;
  opplysninger: LestOpplysning[];
  dokumentasjon: Vedlegg[];
  krav: Krav[];
  svar: Svar[];
  utsagn: LestUtsagn[];
  /** Teksten i et brev appen sendte, frosset da det ble skrevet. Et registrert brev har ingen (MM-U17). */
  brevtekst: Avsnitt[] | null;
  /**
   * OV-U16: beskrivelsen av et brev registrert som dokumentasjon (OV-U4), med ordene til den
   * som registrerte. Appen tolker den ikke. `null` i et annet dokument.
   */
  beskrivelse: string | null;
  /** OV-U16: sporene brevet med beskrivelsen hører til. Tom når det hører til saken. */
  spor: Spor[];
  /** OV-U17, OV-U18: registreringen av et brev som dokumentasjon som dette dokumentet retter. */
  retter: string | null;
  /** OV-U18: rettingen sier at brevet ikke hører til saken, og har ellers ingenting. */
  ikkeISaken: boolean;
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
  | { art: 'sak'; id: string; versjon: number; type: string; tittel: string }
  | { art: 'dokument'; id: string; versjon: number; type: string; dokument: Dokument }
  | { art: 'ukjent'; id: string; versjon: number; type: string; grunn: string };

/**
 * Virkningen et standpunkt har i brevet: prinsipalt eller subsidiært, slik brevet
 * ordner standpunktene, eller uten virkning, som er appens vurdering og ikke noe
 * byggherren har sagt. At svaret gjaldt et annet varsel enn
 * det TE senere har registrert, er ikke en virkning, men en relasjon som visningen
 * leser (OV-U5).
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
