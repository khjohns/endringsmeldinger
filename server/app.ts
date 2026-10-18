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
import type { IncomingMessage, ServerResponse } from 'node:http';
import { opprettelse } from '../kjerne/kommandoer/opprettelse.ts';
import { utledJournal, vurder } from '../kjerne/kommandoer/skriving.ts';
import type { Avvisning, Journalrad } from '../kjerne/typer.ts';
import { KJERNE, type Kjerne } from '../kjerne/versjon.ts';
import { visning } from '../kjerne/utledning/visning.ts';
import { ulagringsbarTekst } from '../kjerne/format/skjema.ts';
import {
  krevInnlogging,
  krevKontraktsrolle,
  krevProsjekttilgang,
  krevSesjon,
  lesKontraktsside,
  Nektet,
  type Bruker,
  type Catenda,
  type Kontraktstilgang,
  type Prosjekttilgang,
} from './autorisasjon.ts';
import { UsikkertUtfall, UUID, type Kontekst, type Pool as Datalag } from './datalag.ts';
import { INNLOGGINGSRUTER, type Innlogging } from './innlogging.ts';
import { PROSJEKTRUTER } from './prosjekter.ts';
import { lesAktornavn, lesSaken } from './lager.ts';
import {
  IngenTopicBoard,
  KommandoIdBrukt,
  kommandosum,
  opprettSak,
  SakFinnesIkke,
  SkrivingAvvist,
  skrivHendelse,
  UgyldigKommando,
  Versjonskonflikt,
} from './kommandoer.ts';
import { filnavn, lagOppdrag } from './levering.ts';
import type { Sesjon } from './sesjon.ts';
import { lesFil, VEDLEGGSRUTER, type Fil } from './vedlegg.ts';

export interface Avhengigheter {
  /** SQL Server, med sesjonen, medlemskapet, kontraktsteamene, journalen og oppdragene (#658, #661). */
  datalag: Datalag;
  catenda: Catenda;
  /** Catenda-innloggingen. Uten den svarer innloggingen 503, som når oppsettet mangler i Python. */
  innlogging?: Innlogging | null;
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
  /** Kontraktsrolle, eller begrunnelsen for at inngangen ikke krever den. */
  kontraktsrolle: 'kreves' | { ikke: string };
}

export interface Forespoersel {
  bruker: Bruker;
  prosjekt: Prosjekttilgang;
  /** Satt når inngangen krever kontraktsrolle. */
  side: Kontraktstilgang | null;
  sakId: string;
  /** Andre gruppe i stien, som vedlegget, eller `null`. */
  ressurs: string | null;
  kropp: Record<string, unknown>;
  /** Kroppen som fil, for en inngang med `fil`. */
  fil: Fil | null;
}

/** Forespørselen til inngangen som oppretter en sak. */
interface Opprettelsesforespoersel {
  bruker: Bruker;
  prosjekt: Prosjekttilgang;
  side: Kontraktstilgang;
  kropp: Record<string, unknown>;
}

/** Forespørselen til en inngang til prosjektet selv. */
export interface Prosjektforespoersel {
  bruker: Bruker;
  prosjekt: Prosjekttilgang;
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
  tilgang: { prosjektrolle: 'viewer' | 'member' | 'admin'; utenSak: string };
  behandle: Behandler<Prosjektforespoersel>;
}

/**
 * Inngangen som oppretter en sak: sesjon, prosjekttilgang og kontraktsrolle som en
 * saksinngang, men uten sak i stien, fordi saken ikke finnes ennå (#370).
 * Prosjektet er det i `X-Project-ID`. Begrunnelsen står i registeret.
 */
export interface Opprettelsesrute extends Felles {
  metode: 'POST';
  tilgang: { prosjektrolle: 'member'; kontraktsrolle: 'kreves'; nySak: string };
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
  behandle: Behandler<IncomingMessage>;
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
  const deler: Buffer[] = [];
  let storrelse = 0;
  for await (const del of foresporsel) {
    storrelse += (del as Buffer).length;
    if (storrelse > STORSTE_KROPP)
      return { feil: new Nektet(413, 'PAYLOAD_TOO_LARGE', 'Forespørselen er for stor.') };
    deler.push(del as Buffer);
  }
  const tekst = Buffer.concat(deler).toString('utf8');
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

const UVENTET: Svar = [500, { success: false, error: 'INTERNAL_ERROR', message: 'Uventet feil.' }];

const feilsvar = (status: number, error: string, message: string): Svar => [
  status,
  { success: false, error, message },
];
const ugyldig = (melding: string) => feilsvar(400, 'UGYLDIG_FORESPOERSEL', melding);
const finnesIkke = () => feilsvar(404, 'SAK_FINNES_IKKE', 'Saken finnes ikke.');

/** Kjernens avvisning av kommandoen, i samme form fra hver inngang (#743). */
const regelavvisning = ({ feil, avvisning }: { feil: string; avvisning: Avvisning }): Svar => [
  400,
  { success: false, error: feil, rule: avvisning.regel, message: avvisning.melding },
];

/** Svaret på en avvisning fra skrivelaget som er felles for inngangene (#743). Andre feil kastes videre. */
function skriveavvisning(feil: unknown): Svar {
  if (feil instanceof SkrivingAvvist) return feilsvar(403, 'FORBIDDEN', 'Du har ikke tilgang.');
  if (feil instanceof UgyldigKommando) return ugyldig('Basen avviste kommandoen.');
  if (feil instanceof KommandoIdBrukt)
    return feilsvar(422, 'KOMMANDO_ID_BRUKT', 'Kommando-ID-en er brukt for en annen kommando.');
  // Klienten sender på nytt med samme kommando-ID og får kvitteringen hvis COMMIT lyktes (#418).
  if (feil instanceof UsikkertUtfall)
    return feilsvar(
      503,
      'UTFALL_USIKKERT',
      'Det er usikkert om kommandoen ble lagret. Send den på nytt med samme kommando-ID.'
    );
  throw feil;
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

/**
 * Navnet bak aktørene i saken. Navnet er en visningsdetalj: et oppslag som
 * feiler, logges og gir ingen navn, så visningen faller tilbake til identiteten
 * og aldri velter (AGENTS.md, `backend/lib/aktor_navn.py`).
 */
async function aktornavn(datalag: Datalag, kontekst: Kontekst, sakId: string) {
  try {
    return await lesAktornavn(datalag, kontekst, sakId);
  } catch (feil) {
    console.warn(
      `Navneoppslaget i saken ${sakId} feilet (${(feil as Error)?.constructor?.name ?? typeof feil})`
    );
    return new Map<string, string>();
  }
}

async function visSaken(
  { bruker, prosjekt, sakId }: Forespoersel,
  avh: Required<Avhengigheter>
): Promise<Svar> {
  const kontekst = { aktor: bruker.id, prosjekt: prosjekt.prosjektId };
  // Leserens side er for visningen; lesingen krever den ikke (#705).
  let saken, side, navn;
  try {
    [saken, side, navn] = await Promise.all([
      lesSaken(avh.datalag, kontekst, sakId),
      lesKontraktsside(avh.datalag, avh.catenda, prosjekt),
      aktornavn(avh.datalag, kontekst, sakId),
    ]);
  } catch (feil) {
    if (feil instanceof SakFinnesIkke) return finnesIkke();
    throw feil;
  }
  const { journal, oppdrag } = saken;
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
      ({ journal, tidspunkt, maal, vedlegg }) => {
        const vurdert = vurder(
          kropp.kommando,
          {
            sakId,
            aktoerId: kontekst.aktor,
            part: kontekst.side,
            teamId: kontekst.team ?? null,
            tidspunkt: () => tidspunkt,
            nyId: avh.nyId,
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
          oppdrag: lagOppdrag(rad, maal, etter.visning.status, avh.kjerne, avh.nyId),
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
  const { journal, oppdrag } = await lesSaken(
    avh.datalag,
    { aktor: bruker.id, prosjekt: prosjekt.prosjektId },
    sakId
  );
  const tilBrevet = journal.filter((r) => r.versjon <= utfall.rad.versjon);
  return [
    201,
    {
      success: true,
      event_id: utfall.rad.event_id,
      leveringsoppdrag: oppdrag.find((o) => o.event_id === utfall.rad.event_id)?.id ?? null,
      ...sakenSomVises(tilBrevet, avh.kjerne),
    },
  ];
}

/** Kjernens avvisning av opprettelsen; kastes for at transaksjonen skal rulles tilbake. */
class Regelavvisning {
  readonly vurdert: { feil: string; avvisning: Avvisning };
  constructor(vurdert: { feil: string; avvisning: Avvisning }) {
    this.vurdert = vurdert;
  }
}

/**
 * Oppretter saken med `sak_opprettet` som versjon 1. Kjernen avgjør om kommandoen
 * godtas, med parten fra kontraktsteamet; basen lager saks-ID-en.
 */
async function opprettNySak(
  { bruker, prosjekt, side, kropp }: Opprettelsesforespoersel,
  avh: Required<Avhengigheter>
): Promise<Svar> {
  const ukjente = Object.keys(kropp).filter((k) => k !== 'kommando' && k !== 'kommando_id');
  if (ukjente.length) return ugyldig(`Ukjente felt: ${ukjente.join(', ')}.`);
  if (kropp.kommando === undefined) return ugyldig('kommando er påkrevd.');
  const id = kommandoId(kropp);
  if (id === null) return ugyldig('kommando_id mangler eller er ikke en UUID med små bokstaver.');
  let rad;
  try {
    const kommando = { id, sha256: kommandosum({ rute: 'opprettelse', kommando: kropp.kommando }) };
    // Kjernen vurderer etter at kvitteringen er lest, så et gjentak får saken (#792 punkt 2).
    rad = await opprettSak(avh.datalag, skrivekontekst(bruker, prosjekt, side), kommando, () => {
      const vurdert = opprettelse(kropp.kommando, side.rolle);
      if (!vurdert.godtatt) throw new Regelavvisning(vurdert);
      return { format: vurdert.format, data: vurdert.data };
    });
  } catch (feil) {
    if (feil instanceof Regelavvisning) return regelavvisning(feil.vurdert);
    if (feil instanceof IngenTopicBoard)
      return feilsvar(
        409,
        'INGEN_TOPIC_BOARD',
        'Prosjektet har ikke noe topic-board i Catenda for nye saker. Saken er ikke opprettet.'
      );
    return skriveavvisning(feil);
  }
  avh.vekkJobbkjoereren();
  return [201, { success: true, sak_id: rad.sak_id, versjon: rad.versjon }];
}

const SAK = '([^/]+)';

const KJERNERUTER: readonly Saksrute[] = [
  {
    metode: 'GET',
    sti: new RegExp(`^/api/kjerne/saker/${SAK}$`),
    eksempel: (s) => `/api/kjerne/saker/${s}`,
    tilgang: {
      prosjektrolle: 'viewer',
      kontraktsrolle: {
        ikke: 'Lesing: et prosjektmedlem uten kontraktsside ser saken, som `GET /api/cases/<sak_id>/state` i Python. Svaret har leserens side i `part`, eller `null` (#705).',
      },
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
  sti: /^\/api\/kjerne\/saker$/,
  eksempel: () => '/api/kjerne/saker',
  tilgang: {
    prosjektrolle: 'member',
    kontraktsrolle: 'kreves',
    nySak:
      'Opprettelsen: saken finnes ikke før basen har laget saks-ID-en, så stien har ingen sak. Prosjektet er det i `X-Project-ID`, og bare TE oppretter (OV-U1, #696).',
  },
  behandle: opprettNySak,
};

/** Registeret over inngangene. En ny inngang står her, ellers finnes den ikke. */
export const RUTER: readonly Rute[] = [
  ...KJERNERUTER,
  ...VEDLEGGSRUTER,
  OPPRETTELSE,
  ...INNLOGGINGSRUTER,
  ...PROSJEKTRUTER,
];

export function lagServer(avh: Avhengigheter) {
  const full: Required<Avhengigheter> = {
    kjerne: KJERNE,
    tidspunkt: () => new Date(),
    nyId: randomUUID,
    vekkJobbkjoereren: () => {},
    ...avh,
    innlogging: avh.innlogging ?? null,
  };

  /**
   * Innloggingen, prosjekttilgangen og kontraktsrollen fra registeret, og kroppen.
   * Uten sak i stien prøves bare sakene kroppen viser til.
   */
  async function tilgangOgKropp(
    tilgang: Tilgang,
    metode: Felles['metode'],
    foresporsel: IncomingMessage,
    sakId: string | null,
    fil = false
  ) {
    // Innloggingen først, så en uinnlogget forespørsel ikke får kroppen lest og tolket.
    // En kropp som ikke kan leses, avvises etter tilgangskontrollen, som i Flask.
    const bruker = await krevInnlogging(full.datalag, foresporsel);
    const innhold = metode === 'GET' || fil ? { verdi: {} } : await lesKropp(foresporsel);
    const prosjekt = await krevProsjekttilgang(
      full.datalag,
      full.catenda,
      foresporsel,
      bruker,
      tilgang.prosjektrolle,
      'feil' in innhold ? {} : innhold.verdi,
      sakId
    );
    const side =
      tilgang.kontraktsrolle === 'kreves'
        ? await krevKontraktsrolle(full.datalag, full.catenda, prosjekt)
        : null;
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
    const f = await tilgangOgKropp(r.tilgang, r.metode, foresporsel, sakId, r.fil);
    const fil = r.fil ? await lesFil(foresporsel) : null;
    return r.behandle({ ...f, sakId, ressurs, fil }, full);
  }

  async function opprettelsesrute(r: Opprettelsesrute, foresporsel: IncomingMessage) {
    const f = await tilgangOgKropp(r.tilgang, r.metode, foresporsel, null);
    return r.behandle({ ...f, side: medSide(f.side) }, full);
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
    // Som `tilgangOgKropp`: innloggingen før kroppen, og en ugyldig kropp avvises etter tilgangen.
    const bruker = await krevInnlogging(full.datalag, foresporsel);
    const innhold = r.metode === 'GET' ? { verdi: {} } : await lesKropp(foresporsel);
    const prosjekt = await krevProsjekttilgang(
      full.datalag,
      full.catenda,
      foresporsel,
      bruker,
      r.tilgang.prosjektrolle,
      'feil' in innhold ? {} : innhold.verdi,
      null,
      prosjektId
    );
    if ('feil' in innhold) throw innhold.feil;
    const kropp = innhold.verdi as Record<string, unknown>;
    return r.behandle({ bruker, prosjekt, ressurs, kropp }, full);
  }

  async function kjoer(
    r: Rute,
    treff: RegExpMatchArray,
    foresporsel: IncomingMessage
  ): Promise<Svar> {
    if (erAapen(r)) return r.behandle(foresporsel, full);
    if (erUtenProsjekt(r)) return r.behandle(await krevSesjon(full.datalag, foresporsel), full);
    if (erUtenSak(r)) return prosjektrute(r, treff, foresporsel);
    if (erOpprettelse(r)) return opprettelsesrute(r, foresporsel);
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
    let [status, kropp, hoder]: Svar = UVENTET;
    try {
      [status, kropp, hoder] = funnet
        ? await kjoer(funnet.r, funnet.treff, foresporsel)
        : feilsvar(404, 'NOT_FOUND', 'Ukjent rute.');
    } catch (feil) {
      if (feil instanceof Nektet) [status, kropp] = [feil.status, feil.kropp];
      else console.error(feil);
    }
    // Et hode Node ikke godtar, eller en kropp som ikke kan serialiseres, gir 500 (#716 punkt 2).
    let tekst: string | Buffer | undefined;
    try {
      const json = kropp !== null && !Buffer.isBuffer(kropp);
      tekst = Buffer.isBuffer(kropp) ? kropp : json ? JSON.stringify(kropp) : undefined;
      respons.writeHead(status, {
        ...(json ? { 'content-type': 'application/json; charset=utf-8' } : {}),
        ...funnet?.r.hoder,
        ...hoder,
      });
    } catch (feil) {
      console.error(feil);
      tekst = JSON.stringify(UVENTET[1]);
      // Node beholder årsaksfrasen fra det første forsøket, og rutens hoder gjelder også dette svaret.
      respons.writeHead(500, 'Internal Server Error', {
        'content-type': 'application/json; charset=utf-8',
        ...funnet?.r.hoder,
      });
    }
    respons.end(tekst);
  };
}
