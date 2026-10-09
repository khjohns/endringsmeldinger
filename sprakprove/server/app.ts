/**
 * TS-serveren i språkprøven (#274, port 2): rutene for flyten, med kjernen som
 * eneste regelkilde. Rekkefølgen og svarene følger `routes/event_routes.py`:
 * 1. tilgang (401, 403, 503);
 * 2. konvolutten (400);
 * 3. kontrakten og serverfeltene (400), kontraktssiden mot hendelsestypen (403);
 * 4. versjonen klienten så (409);
 * 5. forretningsreglene med serverens utregning og regelversjonen (400);
 * 6. lagring, med versjonskonflikt fra basen (409).
 *
 * Unntak: et `expected_version` som ikke er et heltall, gir 400 etter
 * kontrakten. Flask sammenlikner verdien og svarer 409.
 *
 * Saker opprettes ikke her, og godkjenningspolicyen, interne notater, vedlegg,
 * Catenda og PDF er ikke portet. Godkjenningspakken vurderes, men publiseres ikke.
 */

import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Pool } from 'pg';
import { forstebrudd, rollebrudd } from '../kjerne/forretningsregler.ts';
import { vurderPakke, type Pakkeelement } from '../kjerne/godkjenning.ts';
import { tolkKommando } from '../kjerne/kommando.ts';
import { offentligTilstand } from '../kjerne/offentlig.ts';
import { anvend, projiser, type Sak } from '../kjerne/sak.ts';
import type { Hendelse, Kontekst } from '../kjerne/typer.ts';
import {
  krevInnlogging,
  krevKontraktsrolle,
  krevProsjekttilgang,
  Nektet,
  type Catenda,
} from './autorisasjon.ts';
import { leggTil, lesJournal, sakensTopic, UgyldigVerdi, Versjonskonflikt } from './lager.ts';

export interface Avhengigheter {
  pool: Pool;
  catenda: Catenda;
  /** Klokke og ID-er, så testene kan styre dem. */
  tidspunkt?: () => Date;
  nyId?: () => string;
}

type Svar = [number, Record<string, unknown>];

const STORSTE_KROPP = 1_000_000;

/** Kroppen, eller feilen den gir. Feilen meldes først etter tilgangskontrollen, som i Flask. */
type Lest = { verdi: unknown } | { feil: Nektet };

async function lesKropp(foresporsel: IncomingMessage): Promise<Lest> {
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
  try {
    return { verdi: JSON.parse(tekst) };
  } catch {
    return { feil: new Nektet(400, 'VALIDATION_ERROR', 'Kroppen er ikke gyldig JSON.') };
  }
}

const erHeltall = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0;

function versjonskonflikt(forventet: unknown, faktisk: number, melding: string): Svar {
  return [
    409,
    {
      success: false,
      error: 'VERSION_CONFLICT',
      expected_version: forventet,
      current_version: faktisk,
      message: melding,
    },
  ];
}

const forretningsbrudd = (
  regel: string,
  melding: string,
  ekstra: Record<string, unknown> = {}
): Svar => [
  400,
  { success: false, error: 'BUSINESS_RULE_VIOLATION', rule: regel, message: melding, ...ekstra },
];

const valideringsfeil = (melding: string): Svar => [
  400,
  { success: false, error: 'VALIDATION_ERROR', message: melding },
];

export function lagServer(avh: Avhengigheter) {
  const { pool, catenda } = avh;
  const tidspunkt = avh.tidspunkt ?? (() => new Date());
  const nyId = avh.nyId ?? randomUUID;

  /** En kropp som ikke kan leses, prøves som `{}`, som `get_json(silent=True)` i Flask. */
  async function tilgang(
    foresporsel: IncomingMessage,
    innhold: Lest,
    sakId: string | null,
    kontrakt: boolean
  ) {
    const bruker = await krevInnlogging(pool, foresporsel);
    const prosjekt = await krevProsjekttilgang(
      pool,
      catenda,
      foresporsel,
      bruker,
      kontrakt ? 'member' : 'viewer',
      'feil' in innhold ? {} : innhold.verdi,
      sakId
    );
    const side = kontrakt ? await krevKontraktsrolle(pool, catenda, prosjekt) : null;
    if ('feil' in innhold) throw innhold.feil;
    return { bruker, prosjekt, side };
  }

  async function lesSak(
    sakId: string,
    prosjektId: string
  ): Promise<{ sak: Sak; journal: Hendelse[]; versjon: number }> {
    const { hendelser, versjon } = await lesJournal(pool, sakId, prosjektId);
    return { sak: projiser(sakId, hendelser), journal: hendelser, versjon };
  }

  /** Kommandoene tolket og stemplet, eller avvisningen. Felles for enkelthendelse og batch. */
  function tolkAlle(
    kommandoer: unknown[],
    kontekst: Kontekst,
    forsteVersjon: number
  ): { hendelser: Hendelse[] } | { avvist: Svar } {
    const hendelser: Hendelse[] = [];
    for (const [i, kommando] of kommandoer.entries()) {
      const tolkning = tolkKommando(kommando, kontekst, forsteVersjon + i);
      if (!tolkning.godtatt) return { avvist: valideringsfeil(tolkning.avvisning.melding) };
      const rolle = rollebrudd(tolkning.hendelse);
      if (rolle) {
        return {
          avvist: [
            403,
            { success: false, error: 'CONTRACT_ROLE_REQUIRED', message: rolle.melding },
          ],
        };
      }
      hendelser.push(tolkning.hendelse);
    }
    return { hendelser };
  }

  async function send(foresporsel: IncomingMessage, innhold: Lest, batch: boolean): Promise<Svar> {
    const { bruker, prosjekt, side } = await tilgang(foresporsel, innhold, null, true);
    // `tilgang` har avvist alt annet enn et objekt.
    const kropp = (innhold as { verdi: Record<string, unknown> }).verdi;
    const sakId = kropp.sak_id;
    const forventet = kropp.expected_version;
    const kommandoer = batch ? kropp.events : [kropp.event];
    if (!batch) {
      const topic = kropp.catenda_topic_id;
      const sakens = typeof sakId === 'string' && sakId ? await sakensTopic(pool, sakId) : null;
      if (topic && topic !== sakens) {
        return [
          400,
          {
            success: false,
            error: 'CATENDA_TOPIC_MISMATCH',
            message: 'Catenda-topic tilhører ikke saken.',
          },
        ];
      }
      if ('pdf_base64' in kropp || 'pdf_filename' in kropp) {
        return [
          400,
          {
            success: false,
            error: 'CLIENT_PDF_NOT_ACCEPTED',
            message: 'Bare et frosset brev kan bli PDF i Catenda.',
          },
        ];
      }
    }
    const tomHendelse = (k: unknown) =>
      !k || (typeof k === 'object' && !Array.isArray(k) && !Object.keys(k).length);
    if (
      typeof sakId !== 'string' ||
      !sakId ||
      forventet === undefined ||
      forventet === null ||
      !Array.isArray(kommandoer) ||
      !kommandoer.length ||
      (!batch && tomHendelse(kommandoer[0]))
    ) {
      return [
        400,
        {
          success: false,
          error: batch ? 'INVALID_REQUEST' : 'MISSING_PARAMETERS',
          message: batch
            ? 'sak_id, expected_version og events[] er påkrevd'
            : 'sak_id, expected_version, and event are required',
        },
      ];
    }
    // Kontrakten (`konvolutt`) krever et heltall. Flask sammenlikner verdien og svarer 409.
    if (!erHeltall(forventet)) return valideringsfeil('expected_version må være et heltall ≥ 0.');
    const kontekst: Kontekst = {
      sakId,
      aktorId: bruker.id,
      rolle: side!.rolle,
      teamId: side!.teamId,
      tidspunkt,
      nyId,
    };
    const tolkning = tolkAlle(kommandoer, kontekst, forventet + 1);
    if ('avvist' in tolkning) return tolkning.avvist;
    const tolket = tolkning.hendelser;

    const { sak: lest, versjon } = await lesSak(sakId, prosjekt.prosjektId);
    if (versjon !== forventet) {
      return versjonskonflikt(
        forventet,
        versjon,
        batch
          ? 'Saken har blitt oppdatert. Last inn på nytt for å se endringene.'
          : 'Tilstanden har endret seg. Vennligst last inn på nytt.'
      );
    }
    let sak = lest;
    for (const hendelse of tolket) {
      const brudd = forstebrudd(hendelse, sak);
      if (brudd) {
        return forretningsbrudd(
          brudd.regel,
          brudd.melding,
          batch ? { failed_event_type: hendelse.event_type } : {}
        );
      }
      sak = anvend(sak, hendelse);
    }
    let ny: number;
    try {
      ny = await leggTil(pool, prosjekt.prosjektId, tolket, forventet);
    } catch (feil) {
      if (feil instanceof Versjonskonflikt)
        return versjonskonflikt(
          forventet,
          feil.faktisk,
          'Tilstanden har endret seg. Vennligst last inn på nytt.'
        );
      if (feil instanceof UgyldigVerdi) return valideringsfeil(feil.message);
      throw feil;
    }
    const tilstand = offentligTilstand(sak);
    return [
      201,
      batch
        ? {
            success: true,
            event_ids: tolket.map((h) => h.event_id),
            new_version: ny,
            state: tilstand,
          }
        : { success: true, event_id: tolket[0].event_id, new_version: ny, state: tilstand },
    ];
  }

  async function godkjenningspakke(
    foresporsel: IncomingMessage,
    sakId: string,
    innhold: Lest
  ): Promise<Svar> {
    const { bruker, prosjekt, side } = await tilgang(foresporsel, innhold, sakId, true);
    const kropp = (innhold as { verdi: Record<string, unknown> }).verdi;
    if (side!.rolle !== 'BH') {
      return [
        403,
        {
          success: false,
          error: 'CONTRACT_ROLE_REQUIRED',
          message: 'Bare byggherren sender en godkjenningspakke.',
        },
      ];
    }
    const elementer = kropp.elementer;
    if (
      !Array.isArray(elementer) ||
      !elementer.length ||
      elementer.some((e) => typeof e?.kommando !== 'object' || e.kommando === null)
    ) {
      return [
        400,
        {
          success: false,
          error: 'INVALID_REQUEST',
          message: 'elementer[] med kommando er påkrevd',
        },
      ];
    }
    const { sak, journal } = await lesSak(sakId, prosjekt.prosjektId);
    if (!journal.length)
      return [404, { success: false, error: 'NOT_FOUND', message: 'Saken finnes ikke.' }];
    const utfall = vurderPakke(sak, elementer as Pakkeelement[], {
      sakId,
      aktorId: bruker.id,
      rolle: 'BH',
      teamId: side!.teamId,
      tidspunkt,
      nyId,
    });
    if (!utfall.godtatt) {
      return [
        400,
        {
          success: false,
          error: 'PACKAGE_REJECTED',
          rule: utfall.avvisning.regel,
          message: utfall.avvisning.melding,
          failed_track: utfall.spor,
        },
      ];
    }
    return [200, { success: true, events: utfall.hendelser, state: offentligTilstand(utfall.sak) }];
  }

  async function rute(foresporsel: IncomingMessage): Promise<Svar> {
    const url = new URL(foresporsel.url ?? '/', 'http://localhost');
    const metode = foresporsel.method ?? 'GET';
    const sak = url.pathname.match(/^\/api\/cases\/([^/]+)\/(state|journal|godkjenningspakke)$/);
    let sakId = '';
    try {
      sakId = sak ? decodeURIComponent(sak[1]) : '';
    } catch {
      return [404, { error: 'NOT_FOUND', message: 'Ukjent sak.' }];
    }
    if (
      metode === 'POST' &&
      (url.pathname === '/api/events' || url.pathname === '/api/events/batch')
    ) {
      return send(foresporsel, await lesKropp(foresporsel), url.pathname.endsWith('/batch'));
    }
    if (sak && metode === 'GET' && sak[2] !== 'godkjenningspakke') {
      const { prosjekt } = await tilgang(foresporsel, { verdi: {} }, sakId, false);
      const { sak: s, journal, versjon } = await lesSak(sakId, prosjekt.prosjektId);
      if (!journal.length) return [404, { error: 'Sak ikke funnet' }];
      // Synlighetsfilteret i `lib/auth/event_visibility.py` er ikke portet. Et internt
      // notat i journalen vises derfor til ingen, fail-closed.
      const synlige = journal.filter((h) => (h.event_type as string) !== 'internt_notat');
      return [
        200,
        sak[2] === 'state'
          ? { version: versjon, state: offentligTilstand(s) }
          : { version: versjon, events: synlige },
      ];
    }
    if (sak && metode === 'POST' && sak[2] === 'godkjenningspakke') {
      return godkjenningspakke(foresporsel, sakId, await lesKropp(foresporsel));
    }
    return [404, { error: 'NOT_FOUND', message: 'Ukjent rute.' }];
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
