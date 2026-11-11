/**
 * Begrepene i kjernen (modellforslaget, avsnitt 2, og domenetabellen): dokument,
 * krav, svar med standpunkter, andre utsagn med `gjelder` og `erstatter`, brevets
 * beslutningsgrunnlag og enighetsgrunnlaget. Lagringsformatet står i `format.ts`
 * (B-10, #273).
 */

import type { Fristresultat, Forholdsresultat, Vederlagsresultat } from './regler/typer.ts';

export type Spor = 'forhold' | 'vederlag' | 'frist';
export type Part = 'TE' | 'BH';

/**
 * Sakens kode i kontrakten og løpenummeret for koden i prosjektet (LV-U44, LV-U46): koden
 * saken har, eller den sakens første brev fra løsningen gir den. Lagret i sakens metadata.
 */
export interface Sakskode {
  kode: 'koe' | 'eo';
  loepenummer: number;
}
/** Typen registrert korrespondanse (D1 A i #1497). */
export const KORRESPONDANSETYPER = ['brev', 'e_post'] as const;
export type Korrespondansetype = (typeof KORRESPONDANSETYPER)[number];
export const SPOR: readonly Spor[] = ['forhold', 'vederlag', 'frist'];
export const KRAVSPOR = ['vederlag', 'frist'] as const;
export type Kravspor = (typeof KRAVSPOR)[number];
/**
 * Siste gren der hvert spor, hver standpunktsart eller hver oppgjørsform har sin egen gren.
 * Argumentet har typen `never`, så en verdi ingen gren har tatt stilling til, gir en typefeil (#1781).
 */
export function utenGren(verdi: never): never {
  throw new Error(`Kjernen har ingen gren for ${JSON.stringify(verdi)}`);
}

/**
 * Hjemlene byggherren kan påberope i et standpunkt om rettidighet. Etter § 34.3.3 og § 34.4
 * gjelder standpunktet en kravpost (KA-U64, VS-U56).
 */
export type Hjemmel = '32.2' | '33.4' | '33.6.2' | '34.1.2' | '34.1.3' | Kravpostvarselhjemmel;

/**
 * TEs eget varsel: om fristforlengelse etter § 33.4, om vederlagsjustering etter § 34.1.2
 * (OV-U5), og det særskilte varselet etter § 34.1.3 tredje ledd for kravet etter annet ledd,
 * som etter OV-U25 er det eneste særskilte varselet. Varselet etter § 32.2 i forholdet er
 * påberopelsen, eller et varsel sendt utenfor løsningen og registrert (VS-U34, VS-U38).
 * Varslene etter § 34.3.3 første ledd og § 34.4 gjelder kravpostene (`Kravpostvarselhjemmel`).
 */
export type Varselhjemmel = '32.2' | '33.4' | '34.1.2' | '34.1.3' | Kravpostvarselhjemmel;
/**
 * VS-U48, VS-U52: varselet om justering av enhetsprisene etter § 34.3.3 første ledd og varselet
 * før regningsarbeid etter § 34.4. Saken kan ha flere av dem, og løsningen ser ikke hvilket
 * arbeid de gjelder (arbeidsvalget i D-16 i BF-14).
 */
export type Kravpostvarselhjemmel = '34.3.3' | '34.4';
/**
 * Varselet etter § 34.3.3 eller § 34.4 for en kravpost i en ny kravversjon: kravet er varselet
 * (`kravet`), eller varselet ble gitt før kravet (`varsel` er utsagnet). Utledes i
 * `utledning/kravposter.ts` (VS-U49, VS-U50, VS-U55).
 */
export type Kravpostvarselet = { art: 'kravet' } | { art: 'gitt'; varsel: string };
export const erKravpostvarselhjemmel = (hjemmel: Hjemmel): hjemmel is Kravpostvarselhjemmel =>
  hjemmel === '34.3.3' || hjemmel === '34.4';
/** Varslene TE kan sende fra løsningen. Fra løsningen er påberopelsen varselet etter § 32.2 (GR-U31). */
export type Kravvarselhjemmel = Exclude<Varselhjemmel, '32.2'>;
export const VARSELSPOR = {
  '32.2': 'forhold',
  '33.4': 'frist',
  '34.1.2': 'vederlag',
  '34.1.3': 'vederlag',
  '34.3.3': 'vederlag',
  '34.4': 'vederlag',
} as const satisfies Record<Varselhjemmel, Spor>;
export const erVarselhjemmel = (hjemmel: Hjemmel | Varselhjemmel): hjemmel is Varselhjemmel =>
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
      /** Brevet opplysningen gjelder: dokumentet selv, eller et registrert brev før det (MM-U12, MM-U50). */
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
 * varselet er utledet av (MM-U1). Resultatet og dagene i fristen leses fra serverens
 * utregning i svaret. I vederlaget bærer standpunktet `beloep` beløpet for posten og
 * rettidigheten etter § 34.1.3 beløpet etter begrensningen; leseren kontrollerer beløpet for
 * posten mot det siste laget i raden i utregningen, og summen mot totalene (OV-U31, KA-U57 (e)).
 */
export type Standpunkt =
  /**
   * `begrenset` er beløpet byggherren godtar for posten etter begrensningen etter § 34.1.3, og
   * står bare når varselet etter § 34.1.3 kom for sent (VS-U5, OV-U22).
   */
  | {
      id: string;
      art: 'rettidighet';
      gjelder: string;
      hjemmel: Hjemmel;
      iTide: boolean;
      begrenset?: number;
    }
  /** «Frafalt» gjelder pålegget (§ 32.3 c), ikke TEs krav. */
  | { id: string; art: 'forhold'; resultat: Forholdsresultat }
  /**
   * OV-U26: `godkjent` er beløpet byggherren godtar for posten uten begrensningen etter
   * § 34.1.3. Standpunktet har enten `gjelder`, kravpostens `id`, eller `saerskilt`
   * (KA-U57 (c); spørsmålsfila 09.11 for #1663, det tekniske avsnittet punkt 4). `resultat` er
   * svarets, som utregningen gir det. Uten `godkjent` når tilbudet for kravposten ikke er
   * akseptert (KA-U72).
   */
  | {
      id: string;
      art: 'beloep';
      resultat: Vederlagsresultat;
      godkjent?: number;
      gjelder?: string;
      saerskilt?: 'produktivitet';
    }
  /**
   * Standpunktet til TEs oppgjørsform for kravposten `gjelder` (KA-U57 (d), KA-U54). `hjemmel` er
   * TEs oppgjørsform: § 34.2.2 for tilbudet, § 34.3 eller § 34.4 for en beregningsregel.
   * `aksepterer` er om byggherren aksepterer tilbudet eller godtar beregningsregelen. Uten aksept
   * oppgir byggherren oppgjørsformen byggherren mener (`oensket`); appen avgjør ikke om § 34.3
   * eller § 34.4 gjelder (arbeidsvalget i #479, MM-U12, MM-U50). `kreverTilbud` er kravet om
   * spesifisert tilbud etter § 34.2.1 for en kravpost etter en beregningsregel (KA-U69, KA-U71),
   * og da kan `oensket` mangle (svar 3 A i spørsmålsfila 10.11 for #1663).
   */
  | {
      id: string;
      art: 'oppgjoersform';
      gjelder: string;
      hjemmel: '34.2.2' | '34.3' | '34.4';
      aksepterer: boolean;
      oensket?: 'enhetspriser' | 'regningsarbeid';
      kreverTilbud?: true;
    }
  /**
   * § 34.3.2: om byggherren godtar justeringen av enhetsprisene for kravposten `gjelder`
   * (KA-U68; det tekniske avsnittet punkt 2 i spørsmålsfila 09.11 for #1663). Godkjenner ingen
   * priser, mengder eller beløp (OV-U95 punkt 5).
   */
  | { id: string; art: 'justering'; gjelder: string; hjemmel: '34.3.2'; godtar: boolean }
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
      /** Regelversjonen TE fikk se (B-13, KA-U10 (opphevet av MM-U50)). Innholdet står i brevet. */
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
  | { id: string; art: 'begrunnelse'; gjelder: string }
  /**
   * Punkt 10 i samlevedtaket for retting av sendt brev (MM-U41 (opphevet av MM-U52)): TE korrigerer sin opplysning
   * etter VS-U26 i et eget brev. `gjelder` er elementet med TEs siste opplysning, kravet eller
   * en tidligere korrigering. Ikke en kravversjon, og avslår ikke byggherrens svar.
   */
  | { id: string; art: 'korrigering'; gjelder: string; felt: OppgittDatofelt; dato: string };

/**
 * VS-U26: feltet for datoen varslingsplikten løper fra, som TE oppgir i påberopelsen: datoen
 * pålegget ble mottatt, eller datoen TE ble klar over forholdet. Kategorien avgjør hvilket
 * (`OPPGITT_DATO` i `format.ts`).
 */
export type OppgittDatofelt = 'paalegg_mottatt' | 'klar_over_forholdet';

/** OV-U7: det formatet tar imot, uten merkingen og avklaringen av den. */
export type LestOpplysning = Exclude<Opplysning, { hva: 'kan_ikke_uttrykkes' }>;
export type LestUtsagn = Exclude<Utsagn, { art: 'avklaring' }>;
export type Opplysningsslag = LestOpplysning['hva'];
export type Utsagnsart = LestUtsagn['art'];

/**
 * Oppgjørsformen for en kravpost (OV-U95 punkt 19–20). `tilbud` er fast sum etter § 34.2.1;
 * `enhetspriser` og `regningsarbeid` er kontraktens beregningsregler (§ 34.3, § 34.4).
 */
export type Oppgjoersform = 'tilbud' | 'enhetspriser' | 'regningsarbeid';
export const OPPGJOERSFORMER: readonly Oppgjoersform[] = [
  'tilbud',
  'enhetspriser',
  'regningsarbeid',
];

/**
 * En kravpost i vederlagskravet, slik den er lagret (OV-U95 punkt 19–22; arbeidsvalget 07.11 i
 * domenetabellen, #1663). `id` settes av serveren og `betegnelse` av kommandoen, og
 * begge følger posten gjennom kravversjonene. Anslaget, kostnadsoverslaget og PNS er
 * opplysninger som ingen regel leser (KA-U55, KA-U66).
 */
export interface Kravpost {
  id: string;
  betegnelse: string;
  beskrivelse: string;
  oppgjoersform: Oppgjoersform;
  pns?: string;
  /** Det krevde beløpet i en kravpost med fast sum. */
  beloep?: number;
  /** Justerte enhetspriser etter § 34.3.2 (KA-U68). */
  justert?: boolean;
  anslag?: number;
  kostnadsoverslag?: number;
  /** Varselet etter § 34.3.3 eller § 34.4 for kravposten, gitt før kravet (VS-U50, VS-U54). */
  varsel?: string;
}

export interface Krav {
  id: string;
  spor: Spor;
  dokument: string;
  /** Forrige kravversjon i sporet; `null` for den første. */
  erstatter: string | null;
  /**
   * Fristkravet: byggherrens forespørsel etter § 33.6.2 kravet svarer på (HF-U1, LV-U18 punkt 3).
   * Satt når kravet sendes mens forespørselen fra løsningen er ubesvart.
   */
  gjelder?: string;
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
   * HF-U1, #342: påberopelsesversjonen et svar på vederlag eller frist ble regnet mot.
   * `null` i et svar på forholdet.
   */
  paaberopelse: string | null;
  standpunkter: Standpunkt[];
  /**
   * Serverens utregning etter B-13, slik den er lagret. Leses gjennom `format/svarinnhold.ts`
   * med typen for sporet: `Vederlagsutregning` eller `Fristutregning`.
   */
  utregning: Record<string, unknown>;
  /** Brevet slik det ble sendt. Virkningen leses herfra (MM-U9). */
  beslutningsgrunnlag: Beslutningsgrunnlag;
}

/** Ett lag i raden for en post i utregningen. Uten `beloep` når tilbudet ikke er akseptert (KA-U72). */
export interface Utregningslag {
  lag: number;
  beloep?: number;
}

/**
 * Raden for én post i utregningen, med ett element per lag (OV-U31, KA-U57 (e)). Posten er
 * kravposten `gjelder` eller den særskilte `saerskilt`.
 */
export interface Utregningsrad {
  gjelder?: string;
  saerskilt?: 'produktivitet';
  lag: Utregningslag[];
}

/** Utregningen i et svar på vederlaget, etter `UTREGNING.vederlag` i `format/format.ts`. */
export interface Vederlagsutregning {
  resultat: Vederlagsresultat;
  godkjent_beloep: number;
  subsidiaert_resultat?: Vederlagsresultat;
  subsidiaert_godkjent_beloep?: number;
  poster: Utregningsrad[];
}

/** Utregningen i et svar på fristen, etter `UTREGNING.frist` i `format/format.ts`. */
export interface Fristutregning {
  resultat: Fristresultat;
  godkjent_dager: number;
  subsidiaert_resultat?: Fristresultat;
  subsidiaert_godkjent_dager?: number;
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
  /** Teksten i et brev appen sendte, frosset da det ble skrevet. Et registrert brev har ingen (MM-U17, MM-U50). */
  brevtekst: Avsnitt[] | null;
  /** Tittelen på et brev løsningen sendte, frosset med teksten (MM-U3, MM-U50, #1536). `null` ellers. */
  brevtittel: string | null;
  /**
   * Brevets nummer i saken (LV-U44, N3 i #1497): satt av kjernen for et brev fra løsningen, og
   * oppgitt av avsenderen for registrert korrespondanse (LV-U45). Ikke unikt i saken.
   */
  brevnummer: number | null;
  /**
   * Merkingen på et brev fra løsningen, `K201-KOE-017-03`, frosset da brevet ble skrevet (LV-U53,
   * LV-U24, LV-U44, oppdragsgiver 04.11 i #1570). Henvisningene, brevhodet og dokumentnavnet leser
   * den. `null` for registrert korrespondanse og når prosjektet ikke hadde kontraktsforkortelsen.
   */
  merking: string | null;
  /**
   * Deres ref. i brevhodet: merkingen på hvert av motpartens brev som brevet svarer på, godtar
   * eller bestrider, i rekkefølgen etter brevnummeret, frosset da brevet ble skrevet (LV-U27,
   * LV-U49, LV-U50, LV-U51, A-3 A i #1497). Tom når brevet ikke viser til noe slikt brev med
   * merking, og for registrert korrespondanse.
   */
  deresRef: string[];
  /**
   * Om registrert korrespondanse var et brev eller en e-post (LV-U42, N4 og D1 A i #1497). Brevene
   * fra løsningen omtaler den med typen. `null` i et brev fra løsningen.
   */
  korrespondansetype: Korrespondansetype | null;
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
 * Virkningen et standpunkt har i brevet: laget det står i, fra 1 og uten øvre grense,
 * eller upåvirket når ingen av byggherrens innsigelser rammer det (OV-U32). Lagene
 * regnes uten forholdet. Uten virkning er appens vurdering og ikke noe byggherren har
 * sagt (HF-U2). At svaret gjaldt et annet varsel enn det TE senere har registrert,
 * er ikke en virkning, men en relasjon som visningen leser (OV-U5).
 */
export type Virkning = number | 'upaavirket' | 'uten_virkning';

/** Virkningen ett standpunkt i et svar har etter regelsettet brevet ble regnet med. */
export interface Standpunktsvirkning {
  standpunkt: string;
  art: Standpunktsart;
  virkning: Virkning;
}

/**
 * Utledningen frosset da brevet ble sendt (2.2, MM-U9, MM-U11 (opphevet av MM-U50)): virkningen hvert
 * standpunkt hadde, og om svaret godkjenner hele kravet. Det er også innholdet
 * i en enighet om svaret (KA-U10 (opphevet av MM-U50)). Utfallet og vilkåret lagres ikke, men
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
   * Bare i et svar på forholdet.
   */
  varslingsplikt?: boolean;
}

export interface Utfall {
  beloep?: number;
  /** Kravpostene uten fast beløp i det første laget, som `beloep` ikke regner med (OV-U73). */
  uten_fast_beloep?: string[];
  dager?: number;
}

/**
 * Innholdet i en enighet: brevets standpunkter, med kilden, og utfallet og
 * vilkåret utledet av dem. Det lagres ikke, men leses fra brevet, så innholdet
 * har ett hjem (KA-U10, MM-U3, MM-U11, MM-U50).
 */
export interface Enighetsgrunnlag {
  spor: Spor;
  svar: string;
  kilde: 'aksept' | 'sammenfall';
  regelversjon: number;
  virkninger: Standpunktsvirkning[];
  utfall: Utfall;
  /** Vilkåret for at enigheten får virkning: forholdet er avklart (GR-U7). Ingen for forholdet. */
  vilkaar: 'forhold_avklart' | null;
}

export interface Avvisning {
  regel: string;
  melding: string;
}
