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
 * Saker opprettes ikke her (#370). Leveringen stopper ved det frosne oppdraget
 * og kaller ikke Catenda (#371).
 */

import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { utledJournal, vurder } from '../kjerne/kommandoer/skriving.ts';
import type { Journalrad } from '../kjerne/typer.ts';
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
import type { Pool as Datalag } from './datalag.ts';
import { INNLOGGINGSRUTER, type Innlogging } from './innlogging.ts';
import { PROSJEKTRUTER } from './prosjekter.ts';
import { lesSaken } from './lager.ts';
import {
  SakFinnesIkke,
  SkrivingAvvist,
  skrivHendelse,
  UgyldigKommando,
  Versjonskonflikt,
} from './kommandoer.ts';
import { filnavn, lagOppdrag } from './levering.ts';
import type { Sesjon } from './sesjon.ts';

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
}

/** Status, JSON-kroppen eller ingen kropp, og hoder. */
export type Svar = [number, Record<string, unknown> | null, Record<string, string | string[]>?];

/** Tilgangen en saksinngang krever. */
export interface Tilgang {
  prosjektrolle: 'viewer' | 'member';
  /** Kontraktsrolle, eller begrunnelsen for at inngangen ikke krever den. */
  kontraktsrolle: 'kreves' | { ikke: string };
}

interface Forespoersel {
  bruker: Bruker;
  prosjekt: Prosjekttilgang;
  /** Satt når inngangen krever kontraktsrolle. */
  side: Kontraktstilgang | null;
  sakId: string;
  kropp: Record<string, unknown>;
}

/** Forespørselen til en inngang til prosjektet selv. */
export interface Prosjektforespoersel {
  bruker: Bruker;
  prosjekt: Prosjekttilgang;
}

/** Forespørselen til en inngang uten prosjekt, etter innloggingen og CSRF. */
export interface Innlogget {
  sesjon: Sesjon;
  /** Verdien i sesjonskapselen. */
  token: string;
}

interface Felles {
  metode: 'GET' | 'POST';
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
  behandle: Behandler<Forespoersel>;
}

/**
 * En inngang med sesjon og prosjekttilgang, men uten sak. Prosjektet i stien
 * må være prosjektet i `X-Project-ID`. Begrunnelsen står i registeret.
 */
export interface Prosjektrute extends Felles {
  /** Kroppen leses ikke. */
  metode: 'GET';
  tilgang: { prosjektrolle: 'viewer' | 'member'; utenSak: string };
  behandle: Behandler<Prosjektforespoersel>;
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

export type Rute = Saksrute | Prosjektrute | Sesjonsrute | AapenRute;

export const erAapen = (r: Rute): r is AapenRute => 'utenSesjon' in r.tilgang;
export const erUtenProsjekt = (r: Rute): r is Sesjonsrute => 'utenProsjekt' in r.tilgang;
export const erUtenSak = (r: Rute): r is Prosjektrute => 'utenSak' in r.tilgang;
export const erSaksrute = (r: Rute): r is Saksrute =>
  !erAapen(r) && !erUtenProsjekt(r) && !erUtenSak(r);

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

const feilsvar = (status: number, error: string, message: string): Svar => [
  status,
  { success: false, error, message },
];
const ugyldig = (melding: string) => feilsvar(400, 'UGYLDIG_FORESPOERSEL', melding);
const finnesIkke = () => feilsvar(404, 'SAK_FINNES_IKKE', 'Saken finnes ikke.');

const erHeltall = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0;

/** Visningen av journalen, med versjonen den er regnet fra. */
function sakenSomVises(journal: Journalrad[], kjerne: Kjerne) {
  const u = utledJournal(journal, kjerne);
  return { versjon: u.versjon, visning: visning(u, kjerne.regler) };
}

async function visSaken(
  { bruker, prosjekt, sakId }: Forespoersel,
  avh: Required<Avhengigheter>
): Promise<Svar> {
  // Leserens side er for visningen; lesingen krever den ikke (#705).
  let saken, side;
  try {
    [saken, side] = await Promise.all([
      lesSaken(avh.datalag, { aktor: bruker.id, prosjekt: prosjekt.prosjektId }, sakId),
      lesKontraktsside(avh.datalag, avh.catenda, prosjekt),
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
      })),
    },
  ];
}

const KOMMANDOKROPP = new Set(['expected_version', 'kommando']);

/** Hvorfor et brev ikke skrives: kjernen avviste, eller prosjektet har ikke noe leveringsmål. */
type Avslag = Exclude<ReturnType<typeof vurder>, { godtatt: true }> | { maalMangler: true };

async function sendKommando(f: Forespoersel, avh: Required<Avhengigheter>): Promise<Svar> {
  const { bruker, prosjekt, side, sakId, kropp } = f;
  const ukjente = Object.keys(kropp).filter((k) => !KOMMANDOKROPP.has(k));
  if (ukjente.length) return ugyldig(`Ukjente felt: ${ukjente.join(', ')}.`);
  const forventet = kropp.expected_version;
  if (!erHeltall(forventet)) return ugyldig('expected_version må være et heltall ≥ 0.');
  if (kropp.kommando === undefined) return ugyldig('kommando er påkrevd.');
  // Aktøren, siden og teamet er konteksten basen stempler; tidspunktet er basens klokke.
  // Teamet står bare når det er entydig (DL-U4, `krevKontraktsrolle`).
  const kontekst = {
    aktor: bruker.id,
    prosjekt: prosjekt.prosjektId,
    side: side!.rolle,
    ...(side!.teamId ? { team: side!.teamId } : {}),
  };
  let utfall;
  try {
    utfall = await skrivHendelse<Avslag>(
      avh.datalag,
      kontekst,
      sakId,
      forventet,
      ({ journal, tidspunkt, maal }) => {
        if (!maal) return { skriv: false, avvisning: { maalMangler: true } };
        const vurdert = vurder(
          kropp.kommando,
          {
            sakId,
            aktoerId: bruker.id,
            part: side!.rolle,
            teamId: side!.teamId,
            tidspunkt: () => tidspunkt,
            nyId: avh.nyId,
          },
          journal,
          avh.kjerne
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
    if (feil instanceof SkrivingAvvist) return feilsvar(403, 'FORBIDDEN', 'Du har ikke tilgang.');
    if (feil instanceof UgyldigKommando) return ugyldig('Basen avviste kommandoen.');
    throw feil;
  }
  if (!utfall.skriv) {
    if ('maalMangler' in utfall.avvisning)
      return feilsvar(
        409,
        'LEVERINGSMAAL_MANGLER',
        'Prosjektet har ikke noe bibliotek i Catenda for brevene.'
      );
    const { feil, avvisning } = utfall.avvisning;
    return [
      400,
      { success: false, error: feil, rule: avvisning.regel, message: avvisning.melding },
    ];
  }
  // Visningen leses av det basen lagret, så svaret også prøver gjenlesingen.
  const { journal } = await lesSaken(
    avh.datalag,
    { aktor: bruker.id, prosjekt: prosjekt.prosjektId },
    sakId
  );
  return [
    201,
    {
      success: true,
      event_id: utfall.rad.event_id,
      leveringsoppdrag: utfall.oppdrag!.id,
      ...sakenSomVises(journal, avh.kjerne),
    },
  ];
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

/** Registeret over inngangene. En ny inngang står her, ellers finnes den ikke. */
export const RUTER: readonly Rute[] = [...KJERNERUTER, ...INNLOGGINGSRUTER, ...PROSJEKTRUTER];

export function lagServer(avh: Avhengigheter) {
  const full: Required<Avhengigheter> = {
    kjerne: KJERNE,
    tidspunkt: () => new Date(),
    nyId: randomUUID,
    ...avh,
    innlogging: avh.innlogging ?? null,
  };

  async function saksrute(
    r: Saksrute,
    treff: RegExpMatchArray,
    foresporsel: IncomingMessage
  ): Promise<Svar> {
    let sakId: string;
    try {
      sakId = decodeURIComponent(treff[1]);
    } catch {
      return feilsvar(404, 'NOT_FOUND', 'Ukjent sak.');
    }
    // Innloggingen først, så en uinnlogget forespørsel ikke får kroppen lest og tolket.
    // En kropp som ikke kan leses, avvises etter tilgangskontrollen, som i Flask.
    const bruker = await krevInnlogging(full.datalag, foresporsel);
    const innhold = r.metode === 'GET' ? { verdi: {} } : await lesKropp(foresporsel);
    const prosjekt = await krevProsjekttilgang(
      full.datalag,
      full.catenda,
      foresporsel,
      bruker,
      r.tilgang.prosjektrolle,
      'feil' in innhold ? {} : innhold.verdi,
      sakId
    );
    const side =
      r.tilgang.kontraktsrolle === 'kreves'
        ? await krevKontraktsrolle(full.datalag, full.catenda, prosjekt)
        : null;
    if ('feil' in innhold) throw innhold.feil;
    // `krevProsjekttilgang` har avvist en kropp som ikke er et objekt (403).
    const kropp = innhold.verdi as Record<string, unknown>;
    return r.behandle({ bruker, prosjekt, side, sakId, kropp }, full);
  }

  async function prosjektrute(
    r: Prosjektrute,
    treff: RegExpMatchArray,
    foresporsel: IncomingMessage
  ): Promise<Svar> {
    let prosjektId: string;
    try {
      prosjektId = decodeURIComponent(treff[1]);
    } catch {
      return feilsvar(404, 'NOT_FOUND', 'Ukjent prosjekt.');
    }
    const bruker = await krevInnlogging(full.datalag, foresporsel);
    // Ellers kunne stien vise et annet prosjekt enn det tilgangen er avgjort for.
    if (foresporsel.headers['x-project-id'] !== prosjektId)
      throw new Nektet(403, 'FORBIDDEN', 'Du har ikke tilgang.');
    const prosjekt = await krevProsjekttilgang(
      full.datalag,
      full.catenda,
      foresporsel,
      bruker,
      r.tilgang.prosjektrolle,
      {}
    );
    return r.behandle({ bruker, prosjekt }, full);
  }

  async function kjoer(
    r: Rute,
    treff: RegExpMatchArray,
    foresporsel: IncomingMessage
  ): Promise<Svar> {
    if (erAapen(r)) return r.behandle(foresporsel, full);
    if (erUtenProsjekt(r)) return r.behandle(await krevSesjon(full.datalag, foresporsel), full);
    if (erUtenSak(r)) return prosjektrute(r, treff, foresporsel);
    return saksrute(r, treff, foresporsel);
  }

  return async function behandle(foresporsel: IncomingMessage, respons: ServerResponse) {
    const { pathname } = new URL(foresporsel.url ?? '/', 'http://localhost');
    const metode = foresporsel.method ?? 'GET';
    let funnet: { r: Rute; treff: RegExpMatchArray } | null = null;
    for (const r of RUTER) {
      const treff = pathname.match(r.sti);
      if (treff && r.metode === metode) funnet = { r, treff };
      if (funnet) break;
    }
    let [status, kropp, hoder]: Svar = [
      500,
      { success: false, error: 'INTERNAL_ERROR', message: 'Uventet feil.' },
    ];
    try {
      [status, kropp, hoder] = funnet
        ? await kjoer(funnet.r, funnet.treff, foresporsel)
        : feilsvar(404, 'NOT_FOUND', 'Ukjent rute.');
    } catch (feil) {
      if (feil instanceof Nektet) [status, kropp] = [feil.status, feil.kropp];
      else console.error(feil);
    }
    respons.writeHead(status, {
      ...(kropp ? { 'content-type': 'application/json; charset=utf-8' } : {}),
      ...funnet?.r.hoder,
      ...hoder,
    });
    respons.end(kropp ? JSON.stringify(kropp) : undefined);
  };
}
