/**
 * Rutetypene og feilsvarene som ruteren i `app.ts` og inngangene deler (#1702). Verdiene
 * kommer bare fra `autorisasjon.ts` og `inngang.ts`, og fra inngangene bare typer, så en
 * inngang kan importere herfra uten en sirkulær import.
 */

import type { IncomingMessage } from 'node:http';
import type { Kjerne } from '../kjerne/versjon.ts';
import {
  Nektet,
  type Bruker,
  type Catenda,
  type Kontraktstilgang,
  type Prosjekttilgang,
} from './autorisasjon.ts';
import type { Pool as Datalag } from './datalag.ts';
import type { Innlogging } from './innlogging.ts';
import { feilsvar } from './inngang.ts';
import type { Sesjon } from './sesjon.ts';
import type { Fil } from './vedlegg.ts';
import type { Webhook } from './webhook.ts';

export interface Avhengigheter {
  /** SQL Server, med sesjonen, medlemskapet, kontraktsteamene, journalen og oppdragene (#658, #661). */
  datalag: Datalag;
  catenda: Catenda;
  /** Catenda-innloggingen. Uten den svarer innloggingen 503, som når oppsettet mangler i Python. */
  innlogging?: Innlogging | null;
  /** Den hemmelige stien til webhooken fra Catenda. Uten den svarer mottaket 404, som en ukjent sti. */
  webhook?: Webhook | null;
  kjerne?: Kjerne;
  /** Klokke og ID-er, så testene kan styre dem. Et brev får basens klokke (DL-U3). */
  tidspunkt?: () => Date;
  nyId?: () => string;
  /** Vekker jobbkjøreren etter en opprettelse, så topicen kommer uten å vente på pollingen. */
  vekkJobbkjoereren?: () => void;
}

/** Status, JSON-kroppen, bytene i en fil eller ingen kropp, og hoder. */
export type Svar = [
  number,
  Record<string, unknown> | Buffer | null,
  Record<string, string | string[]>?,
];

/** Tilgangen en saksinngang krever. */
export interface Tilgang {
  prosjektrolle: 'viewer' | 'member';
  /**
   * Kontraktsrolle; `lesing` er kontraktsrolle eller leserolle (DL-U15). Ellers
   * begrunnelsen for at inngangen ikke krever den.
   */
  kontraktsrolle: 'kreves' | 'lesing' | { ikke: string };
}

export interface Forespoersel {
  bruker: Bruker;
  prosjekt: Prosjekttilgang;
  /** Satt når inngangen krever kontraktsrolle, og ved `lesing` uten leserolle. */
  side: Kontraktstilgang | null;
  sakId: string;
  /** Andre gruppe i stien, som vedlegget, eller `null`. */
  ressurs: string | null;
  kropp: Record<string, unknown>;
  /** Kroppen som fil, for en inngang med `fil`. */
  fil: Fil | null;
}

/** Forespørselen til en inngang for en sak som ennå ikke finnes. */
export interface Opprettelsesforespoersel {
  bruker: Bruker;
  prosjekt: Prosjekttilgang;
  side: Kontraktstilgang;
  kropp: Record<string, unknown>;
  /** Første gruppe i stien, som vedlegget, eller `null`. */
  ressurs: string | null;
  /** Filen for en inngang med `fil`, ellers `null`. */
  fil: Fil | null;
}

/** Forespørselen til en inngang til prosjektet selv. */
export interface Prosjektforespoersel {
  bruker: Bruker;
  prosjekt: Prosjekttilgang;
  /** Satt ved `kontraktsrolle: 'lesing'` uten leserolle, ellers `null`. */
  side: Kontraktstilgang | null;
  /** Andre gruppe i stien, som medlemmet, eller `null`. */
  ressurs: string | null;
  /** `{}` for `GET`. */
  kropp: Record<string, unknown>;
}

/** Forespørselen til en inngang uten prosjekt, etter innloggingen og CSRF. */
export interface Innlogget {
  sesjon: Sesjon;
  /** Verdien i sesjonskapselen. */
  token: string;
}

export interface Felles {
  metode: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  /** Stien som mønster. For en saksinngang er første gruppe saken, for en prosjektinngang prosjektet. */
  sti: RegExp;
  /** Eksempelsti for testen av registeret, med saken eller prosjektet. */
  eksempel: (id: string) => string;
  /** Hoder på hvert svar fra inngangen, også en avvisning. */
  hoder?: Record<string, string>;
}

type Behandler<F> = (f: F, avh: Required<Avhengigheter>) => Promise<Svar>;

/** En inngang med sesjon og prosjekttilgang (AGENTS.md). */
export interface Saksrute extends Felles {
  tilgang: Tilgang;
  /** Kroppen er en fil, som leses etter tilgangskontrollen og ikke tolkes som JSON. */
  fil?: true;
  behandle: Behandler<Forespoersel>;
}

/**
 * En inngang med sesjon og prosjekttilgang, men uten sak. Prosjektet i stien
 * må være prosjektet i `X-Project-ID`. Begrunnelsen står i registeret.
 */
export interface Prosjektrute extends Felles {
  metode: 'GET' | 'POST' | 'PATCH';
  tilgang: {
    prosjektrolle: 'viewer' | 'member' | 'admin';
    utenSak: string;
    /** Lister saker: kontraktsrolle eller leserolle (DL-U15). */
    kontraktsrolle?: 'lesing';
  };
  behandle: Behandler<Prosjektforespoersel>;
}

/**
 * Inngangen som oppretter en sak, og vedleggene til den før den finnes (#1037): sesjon,
 * prosjekttilgang og kontraktsrolle som en saksinngang, men uten sak i stien, fordi saken
 * ikke finnes ennå (#370). Prosjektet er det i `X-Project-ID`. Begrunnelsen står i registeret.
 */
export interface Opprettelsesrute extends Felles {
  metode: 'GET' | 'POST' | 'DELETE';
  tilgang: { prosjektrolle: 'member'; kontraktsrolle: 'kreves'; nySak: string };
  /** Kroppen er en fil, som leses etter tilgangskontrollen og ikke tolkes som JSON. */
  fil?: true;
  /** Bare TE bruker inngangen, med meldingen BH får (KT-U10). Prøves før en fil leses. */
  bareTE?: string;
  behandle: Behandler<Opprettelsesforespoersel>;
}

/** En inngang med sesjon, men uten prosjekt. Begrunnelsen står i registeret. */
export interface Sesjonsrute extends Felles {
  tilgang: { utenProsjekt: string };
  behandle: Behandler<Innlogget>;
}

/** En inngang uten sesjon. Begrunnelsen står i registeret. */
export interface AapenRute extends Felles {
  tilgang: { utenSesjon: string };
  /** Med treffet fra ruteren, så stien tolkes ett sted (#942). */
  behandle: (
    foresporsel: IncomingMessage,
    avh: Required<Avhengigheter>,
    treff: RegExpMatchArray
  ) => Promise<Svar>;
}

export type Rute = Saksrute | Opprettelsesrute | Prosjektrute | Sesjonsrute | AapenRute;

export const erAapen = (r: Rute): r is AapenRute => 'utenSesjon' in r.tilgang;
export const erUtenProsjekt = (r: Rute): r is Sesjonsrute => 'utenProsjekt' in r.tilgang;
export const erUtenSak = (r: Rute): r is Prosjektrute => 'utenSak' in r.tilgang;
export const erOpprettelse = (r: Rute): r is Opprettelsesrute => 'nySak' in r.tilgang;
export const erSaksrute = (r: Rute): r is Saksrute =>
  !erAapen(r) && !erUtenProsjekt(r) && !erUtenSak(r) && !erOpprettelse(r);

/** Et nytt svar hver gang, så ingen kode kan endre kroppen i et senere svar (#763 punkt 7). */
export const uventet = () => feilsvar(500, 'INTERNAL_ERROR', 'Uventet feil.');
export const finnesIkke = () => feilsvar(404, 'SAK_FINNES_IKKE', 'Saken finnes ikke.');

/** Siden `kontraktsrolle: 'kreves'` i registeret har krevd; uten den er svaret 403 (#743). */
export function medSide(side: Kontraktstilgang | null): Kontraktstilgang {
  if (!side)
    throw new Nektet(403, 'CONTRACT_ROLE_REQUIRED', 'Du har ikke nødvendig TE/BH-teamtilknytning.');
  return side;
}
