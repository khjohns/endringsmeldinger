/**
 * TS-serveren for KOE-sakene (B-18), med kjernen i `kjerne/` som eneste
 * regelkilde. Skiva i #347: et krav fra skjemaet går gjennom tilgangskontrollen
 * og kjernen til journalen og leveringsoppdraget, og tilbake til visningen.
 *
 * Hver inngang står i `RUTER` med tilgangen den krever. Ruteren kontrollerer
 * innlogging (med CSRF), prosjekttilgang og kontraktsrolle fra registeret før
 * behandleren kalles, så en behandler ikke kan glemme dem. Testen i
 * `tester/register.test.ts` prøver hver inngang i registeret over HTTP.
 *
 * Saker opprettes ikke her (#370). Catenda kalles ikke;
 * leveringen stopper ved det frosne oppdraget (#371).
 */

import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Pool } from 'pg';
import { utledJournal, vurder, type Kontekst } from '../kjerne/kommandoer/skriving.ts';
import type { Journalrad } from '../kjerne/typer.ts';
import { KJERNE, type Kjerne } from '../kjerne/versjon.ts';
import { visning } from '../kjerne/utledning/visning.ts';
import { ulagringsbarTekst } from '../kjerne/format/skjema.ts';
import {
  krevInnlogging,
  krevKontraktsrolle,
  krevProsjekttilgang,
  Nektet,
  type Bruker,
  type Catenda,
  type Kontraktstilgang,
  type Prosjekttilgang,
} from './autorisasjon.ts';
import type { Pool as Datalag } from './datalag.ts';
import { lesSaken, SakFinnesIkke, skrivMedOppdrag, Versjonskonflikt } from './lager.ts';
import { filnavn, lagOppdrag } from './levering.ts';

export interface Avhengigheter {
  /** PostgreSQL, med journalen og oppdraget fram til F0b-7 (#661). */
  pool: Pool;
  /** SQL Server, med sesjonen, medlemskapet, kontraktsteamene og sakene i prosjektet (#658). */
  datalag: Datalag;
  catenda: Catenda;
  kjerne?: Kjerne;
  /** Klokke og ID-er, så testene kan styre dem. */
  tidspunkt?: () => Date;
  nyId?: () => string;
}

type Svar = [number, Record<string, unknown>];

/** Tilgangen en inngang krever. Prosjekttilgang kreves alltid (AGENTS.md). */
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

export interface Rute {
  metode: 'GET' | 'POST';
  /** Stien som mønster. Første gruppe er saken. */
  sti: RegExp;
  /** Eksempelsti for testen av registeret. */
  eksempel: (sakId: string) => string;
  tilgang: Tilgang;
  behandle: (f: Forespoersel, avh: Required<Avhengigheter>) => Promise<Svar>;
}

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
  { prosjekt, sakId }: Forespoersel,
  avh: Required<Avhengigheter>
): Promise<Svar> {
  const { journal, oppdrag } = await lesSaken(avh.pool, sakId, prosjekt.prosjektId);
  if (!journal.length) return finnesIkke();
  return [
    200,
    {
      success: true,
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

async function sendKommando(f: Forespoersel, avh: Required<Avhengigheter>): Promise<Svar> {
  const { bruker, prosjekt, side, sakId, kropp } = f;
  const ukjente = Object.keys(kropp).filter((k) => !KOMMANDOKROPP.has(k));
  if (ukjente.length) return ugyldig(`Ukjente felt: ${ukjente.join(', ')}.`);
  const forventet = kropp.expected_version;
  if (!erHeltall(forventet)) return ugyldig('expected_version må være et heltall ≥ 0.');
  if (kropp.kommando === undefined) return ugyldig('kommando er påkrevd.');
  // Aktøren, tidspunktet og ID-ene settes her, aldri av klienten.
  const kontekst: Kontekst = {
    sakId,
    aktoerId: bruker.id,
    part: side!.rolle,
    teamId: side!.teamId,
    tidspunkt: avh.tidspunkt,
    nyId: avh.nyId,
  };
  let utfall;
  try {
    utfall = await skrivMedOppdrag(
      avh.pool,
      prosjekt.prosjektId,
      sakId,
      forventet,
      ({ journal, maal }) => {
        const vurdert = vurder(kropp.kommando, kontekst, journal, avh.kjerne);
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
    throw feil;
  }
  if (!utfall.skriv) {
    const { feil, avvisning } = utfall.avvisning;
    return [
      400,
      { success: false, error: feil, rule: avvisning.regel, message: avvisning.melding },
    ];
  }
  // Visningen leses av det basen lagret, så svaret også prøver gjenlesingen.
  const { journal } = await lesSaken(avh.pool, sakId, prosjekt.prosjektId);
  return [
    201,
    {
      success: true,
      event_id: utfall.rad.event_id,
      leveringsoppdrag: utfall.oppdrag.id,
      ...sakenSomVises(journal, avh.kjerne),
    },
  ];
}

const SAK = '([^/]+)';

/** Registeret over inngangene. En ny inngang står her, ellers finnes den ikke. */
export const RUTER: readonly Rute[] = [
  {
    metode: 'GET',
    sti: new RegExp(`^/api/kjerne/saker/${SAK}$`),
    eksempel: (s) => `/api/kjerne/saker/${s}`,
    tilgang: {
      prosjektrolle: 'viewer',
      kontraktsrolle: {
        ikke: 'Lesing: et prosjektmedlem uten kontraktsside ser saken, som `GET /api/cases/<sak_id>/state` i Python.',
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

export function lagServer(avh: Avhengigheter) {
  const full: Required<Avhengigheter> = {
    kjerne: KJERNE,
    tidspunkt: () => new Date(),
    nyId: randomUUID,
    ...avh,
  };

  async function rute(foresporsel: IncomingMessage): Promise<Svar> {
    const url = new URL(foresporsel.url ?? '/', 'http://localhost');
    const metode = foresporsel.method ?? 'GET';
    for (const r of RUTER) {
      const treff = url.pathname.match(r.sti);
      if (!treff || r.metode !== metode) continue;
      let sakId: string;
      try {
        sakId = decodeURIComponent(treff[1]);
      } catch {
        return feilsvar(404, 'NOT_FOUND', 'Ukjent sak.');
      }
      // Innloggingen først, så en uinnlogget forespørsel ikke får kroppen lest og tolket.
      // En kropp som ikke kan leses, avvises etter tilgangskontrollen, som i Flask.
      const bruker = await krevInnlogging(full.datalag, foresporsel);
      const innhold = metode === 'GET' ? { verdi: {} } : await lesKropp(foresporsel);
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
    return feilsvar(404, 'NOT_FOUND', 'Ukjent rute.');
  }

  return async function behandle(foresporsel: IncomingMessage, respons: ServerResponse) {
    let [status, kropp]: Svar = [
      500,
      { success: false, error: 'INTERNAL_ERROR', message: 'Uventet feil.' },
    ];
    try {
      [status, kropp] = await rute(foresporsel);
    } catch (feil) {
      if (feil instanceof Nektet) [status, kropp] = [feil.status, feil.kropp];
      else console.error(feil);
    }
    respons.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
    respons.end(JSON.stringify(kropp));
  };
}
