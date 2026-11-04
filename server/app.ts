/**
 * TS-serveren for KOE-sakene (B-18), med kjernen i `kjerne/` som eneste
 * regelkilde. Skiva i #347: et krav fra skjemaet går gjennom tilgangskontrollen
 * og kjernen til journalen og leveringsoppdraget, og tilbake til visningen.
 *
 * Hver inngang står i `RUTER` med tilgangen den krever. Ruteren kontrollerer
 * innlogging (med CSRF), prosjekttilgang og kontraktsrolle fra registeret før
 * behandleren kalles, så en behandler ikke kan glemme dem. En inngang uten
 * prosjekt eller uten sesjon står i registeret med en skriftlig begrunnelse,
 * og det gjør også en inngang til prosjektet selv, uten sak. Hvert område har sin modul med ruter, som `innlogging.ts`. Testen i
 * `tester/register.test.ts` prøver hver inngang i registeret over HTTP.
 *
 * Leveringen stopper ved det frosne oppdraget og kaller ikke Catenda (#371). En ny
 * sak får topicen i Catenda av jobbkjøreren i `jobber.ts` etter commit (#741).
 */

import { randomUUID } from 'node:crypto';
import { STATUS_CODES, type IncomingMessage, type ServerResponse } from 'node:http';
import { opprettelse } from '../kjerne/kommandoer/opprettelse.ts';
import { utledJournal, vurder } from '../kjerne/kommandoer/skriving.ts';
import type { Avvisning, Journalrad, Sakskode as Kjernesakskode } from '../kjerne/typer.ts';
import { KJERNE, type Kjerne } from '../kjerne/versjon.ts';
import { visning } from '../kjerne/utledning/visning.ts';
import { ulagringsbarTekst } from '../kjerne/format/skjema.ts';
import {
  krevInnlogging,
  krevKontraktsrolle,
  krevLesing,
  krevProsjekttilgang,
  lesekontekst,
  krevSesjon,
  Nektet,
  UTEN_STI,
  type Bruker,
  type FraSti,
  type Catenda,
  type Kontraktstilgang,
  type Prosjekttilgang,
} from './autorisasjon.ts';
import { UsikkertUtfall, UUID, type Pool as Datalag } from './datalag.ts';
import { INNLOGGINGSRUTER, type Innlogging } from './innlogging.ts';
import {
  fast,
  feilsvar,
  FOR_STOR,
  lagret,
  lesInntil,
  loggFeil,
  reserveFor,
  svarhoder,
  ugyldig,
} from './inngang.ts';
import { PROSJEKTRUTER } from './prosjekter.ts';
import { SAKSLISTERUTER } from './saksliste.ts';
import { lesSaken, type Leveringsmaal } from './lager.ts';
import {
  IngenTopicBoard,
  KommandoIdBrukt,
  kommandosum,
  KvittertBrevMangler,
  LaasIkkeGitt,
  opprettSak,
  opprettSakMedPaaberopelse,
  SakFinnesIkke,
  SakIdBrukt,
  SkrivingAvvist,
  skrivHendelse,
  UgyldigKommando,
  Versjonskonflikt,
  type Sakskode,
} from './kommandoer.ts';
import { filnavn, KontraktsforkortelseMangler, lagOppdrag } from './levering.ts';
import type { Sesjon } from './sesjon.ts';
import { lesFil, VEDLEGG_FOER_SAKEN, VEDLEGGSRUTER, type Fil } from './vedlegg.ts';
import { feilINySak, vedleggIder } from './nysak.ts';
import { BREVRUTER } from './brev.ts';
import { WEBHOOKRUTER, type Webhook } from './webhook.ts';

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

interface Felles {
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
  metode: 'POST' | 'DELETE';
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

const STORSTE_KROPP = 1_000_000;

async function lesKropp(
  foresporsel: IncomingMessage
): Promise<{ verdi: unknown } | { feil: Nektet }> {
  const kropp = await lesInntil(foresporsel, STORSTE_KROPP);
  if (!kropp) return { feil: new Nektet(413, ...FOR_STOR) };
  const tekst = kropp.toString('utf8');
  if (!tekst) return { verdi: {} };
  let verdi: unknown;
  try {
    verdi = JSON.parse(tekst);
  } catch {
    return { feil: new Nektet(400, 'UGYLDIG_FORESPOERSEL', 'Kroppen er ikke gyldig JSON.') };
  }
  const galt = kroppsfeil(verdi);
  // Kroppen gis ikke til tilgangskontrollen; den avvises etter kontrollen, som ugyldig JSON.
  return galt ? { feil: new Nektet(400, 'UGYLDIG_FORESPOERSEL', galt) } : { verdi };
}

/** Dypere enn dette har ingen kommando. */
const STORSTE_DYBDE = 32;

/** Hva som er galt med innholdet i kroppen. Uten rekursjon, så dyp nesting ikke sprenger stakken. */
function kroppsfeil(verdi: unknown): string | null {
  const igjen: [unknown, number][] = [[verdi, 0]];
  while (igjen.length) {
    const [v, dybde] = igjen.pop()!;
    if (dybde > STORSTE_DYBDE) return 'Kroppen er for dypt nestet.';
    if (typeof v === 'string' && ulagringsbarTekst(v))
      return 'Teksten har tegn som ikke kan lagres.';
    if (v !== null && typeof v === 'object')
      for (const [k, del] of Object.entries(v)) igjen.push([k, dybde + 1], [del, dybde + 1]);
  }
  return null;
}

/** Et nytt svar hver gang, så ingen kode kan endre kroppen i et senere svar (#763 punkt 7). */
const uventet = () => feilsvar(500, 'INTERNAL_ERROR', 'Uventet feil.');
const finnesIkke = () => feilsvar(404, 'SAK_FINNES_IKKE', 'Saken finnes ikke.');

/** Kjernens avvisning av kommandoen, i samme form fra hver inngang (#743). */
const regelavvisning = ({ feil, avvisning }: { feil: string; avvisning: Avvisning }): Svar => [
  400,
  { success: false, error: feil, rule: avvisning.regel, message: avvisning.melding },
];

/**
 * Kommandoen kan være lagret. Klienten sender på nytt med samme kommando-ID og får
 * kvitteringen hvis den er det (#418). En annen feil enn `UsikkertUtfall` og
 * `LaasIkkeGitt` logges.
 */
function usikkert(feil: unknown): Svar {
  if (!(feil instanceof UsikkertUtfall || feil instanceof LaasIkkeGitt))
    loggFeil('Kommandoen feilet etter at skrivingen kan ha begynt', feil);
  return utfallUsikkert();
}

const utfallUsikkert = () =>
  feilsvar(
    503,
    'UTFALL_USIKKERT',
    'Det er usikkert om kommandoen ble lagret. Send den på nytt med samme kommando-ID.'
  );

/**
 * Svaret på en feil fra skrivelaget, felles for inngangene (#743). Skrivingen går i
 * én `transaksjon()`, som ruller tilbake når arbeidet kaster eller COMMIT ikke
 * sendes. Bare `UsikkertUtfall` (COMMIT uten svar) og `LaasIkkeGitt` (et annet
 * forsøk med samme ID kan committe) lar utfallet være uvisst. Hver annen feil er
 * kjent, med ingenting lagret, og gir 500 med en feilkode, ikke «Prøv igjen»
 * (oppdragsgiver 19.10, svar 3 i #764; #877 #893-1 og #893-2).
 */
function skriveavvisning(feil: unknown): Svar {
  if (feil instanceof SkrivingAvvist) return feilsvar(403, 'FORBIDDEN', 'Du har ikke tilgang.');
  if (feil instanceof KontraktsforkortelseMangler)
    return feilsvar(
      409,
      'KONTRAKTSFORKORTELSE_MANGLER',
      'Prosjektet mangler kontraktsforkortelsen, så brevet kan ikke merkes. Brevet er ikke sendt.'
    );
  if (feil instanceof UgyldigKommando) return ugyldig('Basen avviste kommandoen.');
  if (feil instanceof KommandoIdBrukt)
    return feilsvar(422, 'KOMMANDO_ID_BRUKT', 'Kommando-ID-en er brukt for en annen kommando.');
  if (feil instanceof UsikkertUtfall || feil instanceof LaasIkkeGitt) return utfallUsikkert();
  if (feil instanceof KvittertBrevMangler) {
    loggFeil('Brevet i kvitteringen ble ikke lest tilbake', feil);
    return feilsvar(
      500,
      'KVITTERT_BREV_MANGLER',
      'Kommandoen er kvittert som lagret, men brevet kunne ikke leses tilbake.'
    );
  }
  loggFeil('Kommandoen ble ikke lagret', feil);
  return feilsvar(500, 'INTERNAL_ERROR', 'Kommandoen ble ikke lagret på grunn av en feil.');
}

/** Kommando-ID-en fra kroppen når den er en UUID med små bokstaver, som basen krever (51422). */
const kommandoId = (kropp: Record<string, unknown>): string | null =>
  typeof kropp.kommando_id === 'string' && UUID.test(kropp.kommando_id) ? kropp.kommando_id : null;

/** Siden `kontraktsrolle: 'kreves'` i registeret har krevd; uten den er svaret 403 (#743). */
function medSide(side: Kontraktstilgang | null): Kontraktstilgang {
  if (!side)
    throw new Nektet(403, 'CONTRACT_ROLE_REQUIRED', 'Du har ikke nødvendig TE/BH-teamtilknytning.');
  return side;
}

const erHeltall = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0;

/** Visningen av journalen, med versjonen den er regnet fra. */
function sakenSomVises(journal: Journalrad[], kjerne: Kjerne) {
  const u = utledJournal(journal, kjerne);
  return { versjon: u.versjon, visning: visning(u, kjerne.regler) };
}

async function visSaken(
  { bruker, prosjekt, side, sakId }: Forespoersel,
  avh: Required<Avhengigheter>
): Promise<Svar> {
  const kontekst = lesekontekst(bruker, prosjekt.prosjektId, side);
  let saken;
  try {
    saken = await lesSaken(avh.datalag, kontekst, sakId, { navn: true });
  } catch (feil) {
    if (feil instanceof SakFinnesIkke) return finnesIkke();
    throw feil;
  }
  const { journal, oppdrag, navn, navnefeil } = saken;
  // Et navneoppslag som feiler, gir identiteten (AGENTS.md). Loggen har feilen, ingen navn.
  if ('navnefeil' in saken) loggFeil(`Navneoppslaget i saken ${sakId} feilet`, navnefeil, 'warn');
  return [
    200,
    {
      success: true,
      part: side?.rolle ?? null,
      ...sakenSomVises(journal, avh.kjerne),
      journal: journal.map((r) => ({
        event_id: r.event_id,
        versjon: r.versjon,
        event_type: r.event_type,
        tidsstempel: r.tidsstempel,
        aktor_rolle: r.aktor_rolle,
        // Navnet vises for alle som kan lese saken (oppdragsgiver 18.10, #820).
        aktor_navn: navn.get(r.aktor_id) ?? r.aktor_id,
        format: r.format,
        data: r.data,
      })),
      leveringsoppdrag: oppdrag.map((o) => ({
        id: o.id,
        event_id: o.event_id,
        dokumentnoekkel: o.dokumentnoekkel,
        filnavn: filnavn(o.innhold),
        innhold_sha256: o.innhold_sha256,
        opprettet: o.opprettet,
        levert: o.levert,
      })),
    },
  ];
}

/**
 * Aktøren, siden og teamet er konteksten basen stempler; tidspunktet er basens klokke.
 * Teamet står bare når det er entydig (DL-U4, `krevKontraktsrolle`).
 */
const skrivekontekst = (bruker: Bruker, prosjekt: Prosjekttilgang, side: Kontraktstilgang) => ({
  aktor: bruker.id,
  prosjekt: prosjekt.prosjektId,
  side: side.rolle,
  ...(side.teamId ? { team: side.teamId } : {}),
});

/** Sakens kode til kjernen, som setter den i tittelen (LV-U27, LV-U44). */
const tilKjernen = ({ kode, loepenummer }: Sakskode): Kjernesakskode => ({ kode, loepenummer });

const KOMMANDOKROPP = new Set(['expected_version', 'kommando', 'kommando_id']);

async function sendKommando(f: Forespoersel, avh: Required<Avhengigheter>): Promise<Svar> {
  const { bruker, prosjekt, side, sakId, kropp } = f;
  const ukjente = Object.keys(kropp).filter((k) => !KOMMANDOKROPP.has(k));
  if (ukjente.length) return ugyldig(`Ukjente felt: ${ukjente.join(', ')}.`);
  const forventet = kropp.expected_version;
  if (!erHeltall(forventet)) return ugyldig('expected_version må være et heltall ≥ 0.');
  if (kropp.kommando === undefined) return ugyldig('kommando er påkrevd.');
  const id = kommandoId(kropp);
  if (id === null) return ugyldig('kommando_id mangler eller er ikke en UUID med små bokstaver.');
  const kommando = {
    id,
    sha256: kommandosum({
      rute: 'kommando',
      sak_id: sakId,
      expected_version: forventet,
      kommando: kropp.kommando,
    }),
  };
  // Kjernen får aktøren, siden og teamet fra samme kontekst som basen (#739 punkt 4).
  const kontekst = skrivekontekst(bruker, prosjekt, medSide(side));
  let utfall;
  try {
    utfall = await skrivHendelse(
      avh.datalag,
      kontekst,
      sakId,
      forventet,
      kommando,
      ({ journal, tidspunkt, maal, vedlegg, sakskode, kontraktsforkortelse }) => {
        const vurdert = vurder(
          kropp.kommando,
          {
            sakId,
            aktoerId: kontekst.aktor,
            part: kontekst.side,
            teamId: kontekst.team ?? null,
            tidspunkt: () => tidspunkt,
            nyId: avh.nyId,
            sakskode: tilKjernen(sakskode),
          },
          journal,
          avh.kjerne,
          vedlegg
        );
        if (!vurdert.godtatt) return { skriv: false, avvisning: vurdert };
        const [rad] = vurdert.hendelser;
        const etter = sakenSomVises([...journal, rad], avh.kjerne);
        return {
          skriv: true,
          rad,
          oppdrag: lagOppdrag(rad, maal, etter.visning.status, avh.kjerne, avh.nyId, {
            kontraktsforkortelse,
            sakskode: tilKjernen(sakskode),
          }),
        };
      }
    );
  } catch (feil) {
    if (feil instanceof Versjonskonflikt)
      return [
        409,
        {
          success: false,
          error: 'VERSJONSKONFLIKT',
          expected_version: feil.forventet,
          current_version: feil.faktisk,
          message: 'Saken er endret. Last den inn på nytt.',
        },
      ];
    if (feil instanceof SakFinnesIkke) return finnesIkke();
    return skriveavvisning(feil);
  }
  if (!utfall.skriv) return regelavvisning(utfall.avvisning);
  // Visningen leses av det basen lagret, så svaret også prøver gjenlesingen. Den
  // regnes til og med brevet, så et gjentak får samme svar som det første, også om
  // saken har fått nye hendelser siden (#418, avgjørelse 2 i #764).
  try {
    const { journal, oppdrag } = await lesSaken(
      avh.datalag,
      lesekontekst(bruker, prosjekt.prosjektId, side),
      sakId
    );
    const tilBrevet = journal.filter((r) => r.versjon <= utfall.rad.versjon);
    return lagret(
      [
        201,
        {
          success: true,
          event_id: utfall.rad.event_id,
          leveringsoppdrag: oppdrag.find((o) => o.event_id === utfall.rad.event_id)?.id ?? null,
          ...sakenSomVises(tilBrevet, avh.kjerne),
        },
      ],
      utfallUsikkert
    );
  } catch (feil) {
    // Brevet er lagret; et nytt forsøk får kvitteringen og svaret.
    return usikkert(feil);
  }
}

/**
 * Oppretter saken og den første påberopelsen i én handling (KT-U11, #1487). Saks-ID-en er
 * klientens, fordi brevteksten har saksnummeret (LV-U4). Feltet heter `ny_sak_id`, ikke
 * `sak_id`, som tilgangskontrollen leser som en sak kroppen viser til og krever i prosjektet. Tittelen er én verdi, skrevet som
 * `sakstittel` i `sak_opprettet`, og brevteksten bruker den som navnet på forholdet (LV-U43). Kjernen prøver
 * påberopelsen mot `sak_opprettet` i minnet, med basens klokke, før noe skrives.
 *
 * Vedleggene i `paaberopelse.dokumentasjon` er lastet opp før saken fantes (#1037). Har TE
 * alt sendt varselet etter punkt 32.2, står det i `varsel` med datoen og dokumentet, som
 * også ligger ved påberopelsen (VS-U38, D-8). Kjernen prøver varselet mot påberopelsen før
 * noe skrives, så datoen ikke kan være senere enn påberopelsen (`oppgittDatoEtterBrevet`),
 * og det skrives som versjon 3 i samme transaksjon.
 */
async function opprettMedPaaberopelse(
  { bruker, prosjekt, side, kropp }: Opprettelsesforespoersel,
  avh: Required<Avhengigheter>
): Promise<Svar> {
  const feil = feilINySak(kropp);
  if (feil) return ugyldig(feil);
  // `feilINySak` har prøvd formen på feltene.
  const {
    kommando_id: id,
    ny_sak_id: sakId,
    tittel,
    paaberopelse,
    brevtekst,
    varsel,
  } = kropp as {
    kommando_id: string;
    ny_sak_id: string;
    tittel: string;
    paaberopelse: Record<string, unknown> & { innhold: Record<string, unknown> };
    brevtekst?: unknown;
    varsel?: Record<string, unknown>;
  };
  const vedleggider = vedleggIder(paaberopelse);
  const krav = {
    ...paaberopelse,
    // LV-U43: tittelen er sakstittelen og navnet på forholdet; kravet har ingen egen.
    innhold: paaberopelse.innhold,
    ...(brevtekst === undefined ? {} : { brevtekst }),
  };
  const kommando = {
    id,
    sha256: kommandosum({
      rute: 'ny_sak',
      ny_sak_id: sakId,
      tittel,
      paaberopelse,
      brevtekst,
      varsel,
    }),
  };
  const kontekst = skrivekontekst(bruker, prosjekt, side);
  let utfall;
  try {
    utfall = await opprettSakMedPaaberopelse(
      avh.datalag,
      kontekst,
      sakId,
      kommando,
      vedleggider,
      ({ tidspunkt, vedlegg, sakskode, kontraktsforkortelse }) => {
        const nySak = opprettelse({ type: 'opprett_sak', sakstittel: tittel }, side.rolle);
        if (!nySak.godtatt) return { skriv: false, avvisning: nySak };
        const opprettet: Journalrad = {
          event_id: avh.nyId(),
          sak_id: sakId,
          event_type: 'sak_opprettet',
          versjon: 1,
          tidsstempel: tidspunkt.toISOString(),
          aktor_id: kontekst.aktor.toLowerCase(),
          aktor_rolle: kontekst.side,
          aktor_team_id: kontekst.team ?? null,
          refererer_til_event_id: null,
          format: nySak.format,
          data: nySak.data,
        };
        // Uten kode (BH) avviser `opprettSakMedPaaberopelse` kommandoen etter `lag`.
        const kjernekontekst = (t: Date) => ({
          sakId,
          aktoerId: kontekst.aktor,
          part: kontekst.side,
          teamId: kontekst.team ?? null,
          tidspunkt: () => t,
          nyId: avh.nyId,
          sakskode: tilKjernen(sakskode),
        });
        // Uten sakens kode avvises opprettelsen før oppdraget lages (`opprettSakMedPaaberopelse`).
        const merkingsgrunnlag = () => {
          return { kontraktsforkortelse, sakskode: tilKjernen(sakskode) };
        };
        const vurdert = vurder(krav, kjernekontekst(tidspunkt), [opprettet], avh.kjerne, vedlegg);
        if (!vurdert.godtatt) return { skriv: false, avvisning: vurdert };
        const [rad] = vurdert.hendelser;
        const status = sakenSomVises([opprettet, rad], avh.kjerne).visning.status;
        const varselet =
          varsel === undefined
            ? null
            : { type: 'varsel', spor: 'forhold', hjemmel: '32.2', ...varsel };
        const lagVarsel = (t: Date) => {
          const v = vurder(varselet, kjernekontekst(t), [opprettet, rad], avh.kjerne, vedlegg);
          if (!v.godtatt) return { skriv: false as const, avvisning: v };
          const [varselrad] = v.hendelser;
          const etter = sakenSomVises([opprettet, rad, varselrad], avh.kjerne).visning.status;
          return {
            skriv: true as const,
            rad: varselrad,
            oppdrag: (maal: Leveringsmaal) =>
              lagOppdrag(varselrad, maal, etter, avh.kjerne, avh.nyId, merkingsgrunnlag()),
          };
        };
        // Varselet prøves med påberopelsens klokke før noe skrives, så datoen ikke kan være
        // senere enn påberopelsen (VS-U38); det skrives med basens klokke for sin skriving.
        if (varselet) {
          const proeve = lagVarsel(tidspunkt);
          if (!proeve.skriv) return proeve;
        }
        return {
          skriv: true,
          opprettet,
          rad,
          oppdrag: (maal) =>
            lagOppdrag(rad, maal, status, avh.kjerne, avh.nyId, merkingsgrunnlag()),
          varsel: varselet ? ({ tidspunkt: t }) => lagVarsel(t) : null,
        };
      }
    );
  } catch (feil) {
    if (feil instanceof IngenTopicBoard)
      return feilsvar(
        409,
        'INGEN_TOPIC_BOARD',
        'Prosjektet har ikke noe topic-board i Catenda for nye saker. Saken er ikke opprettet.'
      );
    if (feil instanceof SakIdBrukt)
      return feilsvar(409, 'SAK_ID_BRUKT', 'Saks-ID-en er brukt. Saken er ikke opprettet.');
    return skriveavvisning(feil);
  }
  if (utfall.skriv === false) return regelavvisning(utfall.avvisning);
  try {
    avh.vekkJobbkjoereren();
  } catch (feil) {
    // Saken og påberopelsen er lagret; et nytt forsøk får kvitteringen og vekker igjen.
    return usikkert(feil);
  }
  // `versjon` er sakens, så klienten kan sende den som `expected_version` (#1507). Varselet
  // er skrevet etter påberopelsen i samme transaksjon, og kommandosummen omfatter det, så
  // også et gjentak fra kvitteringen har det. `event_id` er påberopelsens, som kvitteringen.
  const { rad } = utfall;
  const versjon = rad.versjon + (varsel === undefined ? 0 : 1);
  return lagret(
    [201, { success: true, sak_id: rad.sak_id, event_id: rad.event_id, versjon }],
    utfallUsikkert
  );
}

/**
 * Oppretter saken med `sak_opprettet` som versjon 1. Kjernen avgjør om kommandoen
 * godtas, med parten fra kontraktsteamet; basen lager saks-ID-en. En kropp med `ny_sak_id`
 * oppretter saken med den første påberopelsen (#1487). Formen uten påberopelse brukes av
 * skjemaet og `saksrute.ts` til de går over (#1499).
 */
async function opprettNySak(
  forespoersel: Opprettelsesforespoersel,
  avh: Required<Avhengigheter>
): Promise<Svar> {
  if ('ny_sak_id' in forespoersel.kropp) return opprettMedPaaberopelse(forespoersel, avh);
  const { bruker, prosjekt, side, kropp } = forespoersel;
  const ukjente = Object.keys(kropp).filter((k) => k !== 'kommando' && k !== 'kommando_id');
  if (ukjente.length) return ugyldig(`Ukjente felt: ${ukjente.join(', ')}.`);
  if (kropp.kommando === undefined) return ugyldig('kommando er påkrevd.');
  const id = kommandoId(kropp);
  if (id === null) return ugyldig('kommando_id mangler eller er ikke en UUID med små bokstaver.');
  let utfall;
  try {
    const kommando = { id, sha256: kommandosum({ rute: 'opprettelse', kommando: kropp.kommando }) };
    // Kjernen vurderer etter at kvitteringen er lest, så et gjentak får saken (#792 punkt 2).
    utfall = await opprettSak(avh.datalag, skrivekontekst(bruker, prosjekt, side), kommando, () => {
      const vurdert = opprettelse(kropp.kommando, side.rolle);
      if (!vurdert.godtatt) return { skriv: false as const, avvisning: vurdert };
      return { format: vurdert.format, data: vurdert.data };
    });
  } catch (feil) {
    if (feil instanceof IngenTopicBoard)
      return feilsvar(
        409,
        'INGEN_TOPIC_BOARD',
        'Prosjektet har ikke noe topic-board i Catenda for nye saker. Saken er ikke opprettet.'
      );
    return skriveavvisning(feil);
  }
  if ('avvisning' in utfall) return regelavvisning(utfall.avvisning);
  try {
    avh.vekkJobbkjoereren();
  } catch (feil) {
    // Saken er lagret; et nytt forsøk får kvitteringen og vekker igjen.
    return usikkert(feil);
  }
  return lagret(
    [201, { success: true, sak_id: utfall.sak_id, versjon: utfall.versjon }],
    utfallUsikkert
  );
}

const SAK = '([^/]+)';

const KJERNERUTER: readonly Saksrute[] = [
  {
    metode: 'GET',
    sti: new RegExp(`^/api/kjerne/saker/${SAK}$`),
    eksempel: (s) => `/api/kjerne/saker/${s}`,
    tilgang: {
      prosjektrolle: 'viewer',
      kontraktsrolle: 'lesing',
    },
    behandle: visSaken,
  },
  {
    metode: 'POST',
    sti: new RegExp(`^/api/kjerne/saker/${SAK}/kommandoer$`),
    eksempel: (s) => `/api/kjerne/saker/${s}/kommandoer`,
    tilgang: { prosjektrolle: 'member', kontraktsrolle: 'kreves' },
    behandle: sendKommando,
  },
];

const OPPRETTELSE: Opprettelsesrute = {
  metode: 'POST',
  ...fast('/api/kjerne/saker'),
  tilgang: {
    prosjektrolle: 'member',
    kontraktsrolle: 'kreves',
    nySak:
      'Opprettelsen: saken finnes ikke før kommandoen er lagret, så stien har ingen sak. Prosjektet er det i `X-Project-ID`, og bare TE oppretter (OV-U1, #696).',
  },
  behandle: opprettNySak,
};

/** Registeret over inngangene. En ny inngang står her, ellers finnes den ikke. */
export const RUTER: readonly Rute[] = [
  ...KJERNERUTER,
  ...VEDLEGGSRUTER,
  ...BREVRUTER,
  OPPRETTELSE,
  ...VEDLEGG_FOER_SAKEN,
  ...INNLOGGINGSRUTER,
  ...PROSJEKTRUTER,
  ...SAKSLISTERUTER,
  ...WEBHOOKRUTER,
];

export function lagServer(avh: Avhengigheter) {
  const full: Required<Avhengigheter> = {
    kjerne: KJERNE,
    tidspunkt: () => new Date(),
    nyId: randomUUID,
    vekkJobbkjoereren: () => {},
    ...avh,
    innlogging: avh.innlogging ?? null,
    webhook: avh.webhook ?? null,
  };

  /**
   * Innloggingen, prosjekttilgangen og kontraktsrollen fra registeret, og kroppen,
   * i én rekkefølge for hver inngang med prosjekt (#825). Uten sak i stien prøves
   * bare sakene kroppen viser til.
   */
  async function tilgangOgKropp(
    tilgang: Tilgang | Prosjektrute['tilgang'],
    metode: Felles['metode'],
    foresporsel: IncomingMessage,
    fraSti: FraSti,
    fil = false
  ) {
    // Innloggingen først, så en uinnlogget forespørsel ikke får kroppen lest og tolket.
    // En kropp som ikke kan leses, avvises etter tilgangskontrollen, som i Flask.
    const bruker = await krevInnlogging(full.datalag, foresporsel);
    const innhold = metode === 'GET' || fil ? { verdi: {} } : await lesKropp(foresporsel);
    const krav = 'kontraktsrolle' in tilgang ? tilgang.kontraktsrolle : undefined;
    const { side, ...prosjekt } = await krevProsjekttilgang(
      full.datalag,
      full.catenda,
      foresporsel,
      bruker,
      tilgang.prosjektrolle,
      'feil' in innhold ? {} : innhold.verdi,
      fraSti,
      async (t) =>
        krav === 'kreves'
          ? krevKontraktsrolle(full.datalag, full.catenda, t)
          : krav === 'lesing'
            ? krevLesing(full.datalag, full.catenda, t)
            : null
    );
    if ('feil' in innhold) throw innhold.feil;
    // `krevProsjekttilgang` har avvist en kropp som ikke er et objekt (403).
    const kropp = innhold.verdi as Record<string, unknown>;
    return { bruker, prosjekt, side, kropp };
  }

  async function saksrute(
    r: Saksrute,
    treff: RegExpMatchArray,
    foresporsel: IncomingMessage
  ): Promise<Svar> {
    let sakId: string;
    let ressurs: string | null;
    try {
      sakId = decodeURIComponent(treff[1]);
    } catch {
      return feilsvar(404, 'NOT_FOUND', 'Ukjent sak.');
    }
    try {
      ressurs = treff[2] === undefined ? null : decodeURIComponent(treff[2]);
    } catch {
      return feilsvar(404, 'NOT_FOUND', 'Ukjent ressurs i saken.');
    }
    const f = await tilgangOgKropp(r.tilgang, r.metode, foresporsel, { sakId }, r.fil);
    const fil = r.fil ? await lesFil(foresporsel, f.side) : null;
    return r.behandle({ ...f, sakId, ressurs, fil }, full);
  }

  async function opprettelsesrute(
    r: Opprettelsesrute,
    treff: RegExpMatchArray,
    foresporsel: IncomingMessage
  ): Promise<Svar> {
    let ressurs: string | null;
    try {
      ressurs = treff[1] === undefined ? null : decodeURIComponent(treff[1]);
    } catch {
      return feilsvar(404, 'NOT_FOUND', 'Ukjent ressurs.');
    }
    const f = await tilgangOgKropp(r.tilgang, r.metode, foresporsel, UTEN_STI, r.fil);
    if (r.bareTE !== undefined && f.side?.rolle !== 'TE')
      return feilsvar(403, 'FORBIDDEN', r.bareTE);
    const fil = r.fil ? await lesFil(foresporsel, f.side) : null;
    return r.behandle({ ...f, side: medSide(f.side), ressurs, fil }, full);
  }

  async function prosjektrute(
    r: Prosjektrute,
    treff: RegExpMatchArray,
    foresporsel: IncomingMessage
  ): Promise<Svar> {
    let prosjektId: string;
    let ressurs: string | null;
    try {
      prosjektId = decodeURIComponent(treff[1]);
    } catch {
      return feilsvar(404, 'NOT_FOUND', 'Ukjent prosjekt.');
    }
    try {
      ressurs = treff[2] === undefined ? null : decodeURIComponent(treff[2]);
    } catch {
      return feilsvar(404, 'NOT_FOUND', 'Ukjent ressurs i prosjektet.');
    }
    const { bruker, prosjekt, side, kropp } = await tilgangOgKropp(
      r.tilgang,
      r.metode,
      foresporsel,
      { prosjektId }
    );
    return r.behandle({ bruker, prosjekt, side, ressurs, kropp }, full);
  }

  async function kjoer(
    r: Rute,
    treff: RegExpMatchArray,
    foresporsel: IncomingMessage
  ): Promise<Svar> {
    if (erAapen(r)) return r.behandle(foresporsel, full, treff);
    if (erUtenProsjekt(r)) return r.behandle(await krevSesjon(full.datalag, foresporsel), full);
    if (erUtenSak(r)) return prosjektrute(r, treff, foresporsel);
    if (erOpprettelse(r)) return opprettelsesrute(r, treff, foresporsel);
    return saksrute(r, treff, foresporsel);
  }

  return async function behandle(foresporsel: IncomingMessage, respons: ServerResponse) {
    // Stien leses som den står; `URL.parse` ville lest `//x/api/…` som verten `x` (#763 punkt 6).
    const pathname = (foresporsel.url ?? '/').split('?')[0];
    const metode = foresporsel.method ?? 'GET';
    let funnet: { r: Rute; treff: RegExpMatchArray } | null = null;
    for (const r of RUTER) {
      const treff = pathname.match(r.sti);
      if (treff && r.metode === metode) funnet = { r, treff };
      if (funnet) break;
    }
    let svar: Svar = uventet();
    try {
      svar = funnet
        ? await kjoer(funnet.r, funnet.treff, foresporsel)
        : feilsvar(404, 'NOT_FOUND', 'Ukjent rute.');
    } catch (feil) {
      if (feil instanceof Nektet) svar = [feil.status, feil.kropp];
      else loggFeil(`${metode} ${funnet?.r.sti} feilet`, feil);
    }
    const [status, kropp] = svar;
    // Et hode Node ikke godtar, eller en kropp som ikke kan serialiseres, gir 500 (#716 punkt 2),
    // eller reservesvaret behandleren ga for en skriving som er lagret (#893).
    let tekst: string | Buffer | undefined;
    try {
      tekst = kropp === null ? undefined : Buffer.isBuffer(kropp) ? kropp : JSON.stringify(kropp);
      respons.writeHead(status, svarhoder(svar, funnet?.r.hoder));
    } catch (feil) {
      loggFeil('Svaret kunne ikke skrives', feil);
      const reserve = (reserveFor(svar) ?? uventet)();
      tekst = JSON.stringify(reserve[1]);
      // Node beholder årsaksfrasen fra det første forsøket, og rutens hoder gjelder også dette svaret.
      // Er det rutens hoder Node ikke godtar, skrives svaret uten dem, så klienten får et svar.
      const skriv = (rute?: Record<string, string>) =>
        respons.writeHead(reserve[0], STATUS_CODES[reserve[0]], svarhoder(reserve, rute));
      try {
        skriv(funnet?.r.hoder);
      } catch (igjen) {
        loggFeil('Reservesvaret kunne ikke skrives med rutens hoder', igjen);
        skriv(undefined);
      }
    }
    respons.end(tekst);
  };
}
