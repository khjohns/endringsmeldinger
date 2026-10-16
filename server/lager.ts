/**
 * Journalen i `hendelse` og leveringsoppdragene i `leveringsoppdrag`, for
 * kjernens rader. Lesingen er avgrenset til det autoriserte prosjektet.
 *
 * En skriving er én transaksjon (LV-U1, invariant 3 i hovedplanen): saken
 * låses, journalen leses i transaksjonen, versjonen må være den klienten så,
 * og hendelsen og leveringsoppdraget skrives sammen eller ikke. Unik-skranken
 * `unique_hendelse_sak_versjon` stopper i tillegg to skrivinger på samme
 * versjon.
 */

import type { ClientBase, Pool } from 'pg';
import type { Journalrad, Part } from '../kjerne/typer.ts';

type Klient = Pool | ClientBase;

export const VERSJONSSKRANKE = 'unique_hendelse_sak_versjon';

export class Versjonskonflikt extends Error {
  readonly forventet: number;
  readonly faktisk: number;

  constructor(forventet: number, faktisk: number, valg?: ErrorOptions) {
    super(`Forventet versjon ${forventet}, journalen har ${faktisk}`, valg);
    this.forventet = forventet;
    this.faktisk = faktisk;
  }
}

/** Saken finnes ikke i det autoriserte prosjektet. */
export class SakFinnesIkke extends Error {}

interface Lagret {
  event_id: string;
  sak_id: string;
  event_type: string;
  tid: string;
  actorid: string;
  actorrole: Part;
  actorteam: string | null;
  referstoid: string | null;
  format: number | null;
  data: Record<string, unknown>;
  versjon: number;
}

/** Et tidspunkt i formen kjernen skriver, `toISOString()`, så en rad leses som den ble skrevet. */
const iso = (kolonne: string) =>
  `to_char(${kolonne} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;

const LES = `SELECT event_id::text AS event_id, sak_id, event_type, ${iso('time')} AS tid,
                    actorid, actorrole, actorteam, referstoid::text AS referstoid, format, data, versjon
               FROM hendelse WHERE sak_id = $1 AND prosjekt_id = $2 ORDER BY versjon`;

function journalrad(r: Lagret): Journalrad {
  return {
    event_id: r.event_id,
    sak_id: r.sak_id,
    event_type: r.event_type,
    versjon: r.versjon,
    tidsstempel: r.tid,
    aktor_id: r.actorid,
    aktor_rolle: r.actorrole,
    aktor_team_id: r.actorteam,
    refererer_til_event_id: r.referstoid,
    format: r.format,
    data: r.data,
  };
}

/** Journalen i saken, tom når saken ikke finnes i prosjektet. */
export async function lesJournal(
  db: Klient,
  sakId: string,
  prosjektId: string
): Promise<Journalrad[]> {
  const svar = await db.query<Lagret>(LES, [sakId, prosjektId]);
  return svar.rows.map(journalrad);
}

const KOLONNER = [
  'event_id',
  'source',
  'type',
  'time',
  'subject',
  'actorid',
  'actorrole',
  'actorteam',
  'referstoid',
  'format',
  'data',
  'prosjekt_id',
  'sak_id',
  'event_type',
  'versjon',
] as const;

const SETT_INN_HENDELSE = `INSERT INTO hendelse (${KOLONNER.join(', ')}) VALUES (${KOLONNER.map(
  (k, i) => `$${i + 1}${k === 'data' ? '::jsonb' : ''}`
).join(', ')})`;

function kolonneverdier(rad: Journalrad, prosjektId: string): unknown[] {
  const verdi: Record<(typeof KOLONNER)[number], unknown> = {
    event_id: rad.event_id,
    source: `/projects/${prosjektId}/cases/${rad.sak_id}`,
    type: `no.oslo.koe.${rad.event_type}`,
    time: rad.tidsstempel,
    subject: rad.sak_id,
    actorid: rad.aktor_id,
    actorrole: rad.aktor_rolle,
    actorteam: rad.aktor_team_id,
    referstoid: rad.refererer_til_event_id,
    format: rad.format,
    data: JSON.stringify(rad.data),
    prosjekt_id: prosjektId,
    sak_id: rad.sak_id,
    event_type: rad.event_type,
    versjon: rad.versjon,
  };
  return KOLONNER.map((k) => verdi[k]);
}

/** Målet i Catenda for brevene i saken, fra registeret for prosjektet og saken. */
export interface Leveringsmaal {
  catenda_project_id: string;
  library_id: string;
  folder_id: string | null;
  topic_id: string | null;
}

export interface Oppdragsrad {
  id: string;
  event_id: string;
  dokumentnoekkel: string;
  innhold: Record<string, unknown>;
  innhold_sha256: string;
}

/** Det skrivingen ser inne i transaksjonen, før raden lages. */
export interface Skrivegrunnlag {
  journal: Journalrad[];
  maal: Leveringsmaal;
}

/** Raden og oppdraget som skal lagres, eller en avvisning som avbryter uten å skrive. */
export type Skriveutfall<A> =
  | { skriv: true; rad: Journalrad; oppdrag: Oppdragsrad }
  | { skriv: false; avvisning: A };

/** Kroker i transaksjonen, for prøven av avbrudd før commit. */
export interface Kroker {
  /** Kjøres etter at radene er skrevet, rett før `COMMIT`. Kaster den, rulles alt tilbake. */
  foerCommit?: (klient: ClientBase) => Promise<void>;
}

/**
 * Skriv én rad og oppdraget for den i én transaksjon. `lag` får journalen lest
 * etter at saken er låst, og avgjør hva som skrives. Versjonen kontrolleres før
 * `lag` kalles.
 *
 * @throws Versjonskonflikt, SakFinnesIkke
 */
export async function skrivMedOppdrag<A>(
  pool: Pool,
  prosjektId: string,
  sakId: string,
  forventet: number,
  lag: (grunnlag: Skrivegrunnlag) => Skriveutfall<A>,
  kroker: Kroker = {}
): Promise<Skriveutfall<A>> {
  const klient = await pool.connect();
  // En forbindelse som brytes under transaksjonen, sender `error` i tillegg til at
  // spørringen feiler. Uten lytter ville prosessen falle.
  const vedBrudd = () => {};
  klient.on('error', vedBrudd);
  let oedelagt: Error | undefined;
  let utfall: Skriveutfall<A>;
  try {
    await klient.query('BEGIN');
    const sak = await klient.query<Leveringsmaal>(
      `SELECT c.catenda_project_id::text AS catenda_project_id,
              c.library_id::text AS library_id, c.folder_id::text AS folder_id,
              m.catenda_topic_id AS topic_id
         FROM sak_metadata m
         JOIN catenda_project_configs c ON c.internal_project_id = m.prosjekt_id AND c.is_active
        WHERE m.sak_id = $1 AND m.prosjekt_id = $2
          FOR UPDATE OF m`,
      [sakId, prosjektId]
    );
    if (!sak.rows[0]) throw new SakFinnesIkke(`Saken ${sakId} finnes ikke i prosjektet.`);
    const maal = sak.rows[0];
    const journal = await lesJournal(klient, sakId, prosjektId);
    const versjon = journal.at(-1)?.versjon ?? 0;
    if (versjon !== forventet) throw new Versjonskonflikt(forventet, versjon);
    utfall = lag({ journal, maal });
    if (!utfall.skriv) {
      await klient.query('ROLLBACK');
    } else {
      const { rad, oppdrag } = utfall;
      if (rad.sak_id !== sakId || rad.versjon !== forventet + 1)
        throw new Error('Raden gjelder ikke saken og versjonen som er låst.');
      await klient.query(SETT_INN_HENDELSE, kolonneverdier(rad, prosjektId));
      await klient.query(
        `INSERT INTO leveringsoppdrag (id, prosjekt_id, sak_id, event_id, dokumentnoekkel, innhold, innhold_sha256)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
        [
          oppdrag.id,
          prosjektId,
          sakId,
          oppdrag.event_id,
          oppdrag.dokumentnoekkel,
          JSON.stringify(oppdrag.innhold),
          oppdrag.innhold_sha256,
        ]
      );
      await kroker.foerCommit?.(klient);
      await klient.query('COMMIT');
    }
  } catch (feil) {
    try {
      await klient.query('ROLLBACK');
    } catch (brudd) {
      // En forbindelse som ikke kan rulle tilbake, skal ikke tilbake i poolen.
      oedelagt = brudd as Error;
    }
    if (!oedelagt && (feil as { constraint?: string }).constraint === VERSJONSSKRANKE) {
      const sist = await klient.query<{ versjon: number }>(
        `SELECT coalesce(max(versjon), 0)::int AS versjon FROM hendelse
          WHERE sak_id = $1 AND prosjekt_id = $2`,
        [sakId, prosjektId]
      );
      throw new Versjonskonflikt(forventet, sist.rows[0].versjon);
    }
    throw feil;
  } finally {
    klient.off('error', vedBrudd);
    klient.release(oedelagt);
  }
  return utfall;
}

export type LagretOppdrag = Oppdragsrad & { opprettet: string };

/** Journalen og oppdragene i saken fra samme øyeblikksbilde av basen. */
export async function lesSaken(
  pool: Pool,
  sakId: string,
  prosjektId: string
): Promise<{ journal: Journalrad[]; oppdrag: LagretOppdrag[] }> {
  let oedelagt: Error | undefined;
  const klient = await pool.connect();
  const vedBrudd = () => {};
  klient.on('error', vedBrudd);
  try {
    await klient.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const journal = await lesJournal(klient, sakId, prosjektId);
    const oppdrag = await lesOppdrag(klient, sakId, prosjektId);
    await klient.query('COMMIT');
    return { journal, oppdrag };
  } catch (feil) {
    // En forbindelse som ikke kan rulle tilbake, skal ikke tilbake i poolen.
    oedelagt = await klient.query('ROLLBACK').then(
      () => undefined,
      (brudd: Error) => brudd
    );
    throw feil;
  } finally {
    klient.off('error', vedBrudd);
    klient.release(oedelagt);
  }
}

/** Leveringsoppdragene i saken, i rekkefølgen brevene ble skrevet. */
export async function lesOppdrag(
  db: Klient,
  sakId: string,
  prosjektId: string
): Promise<LagretOppdrag[]> {
  const svar = await db.query<LagretOppdrag>(
    `SELECT o.id::text AS id, o.event_id::text AS event_id, o.dokumentnoekkel, o.innhold,
            o.innhold_sha256,
            ${iso('o.opprettet')} AS opprettet
       FROM leveringsoppdrag o JOIN hendelse h ON h.event_id = o.event_id
      WHERE o.sak_id = $1 AND o.prosjekt_id = $2 ORDER BY h.versjon`,
    [sakId, prosjektId]
  );
  return svar.rows;
}
