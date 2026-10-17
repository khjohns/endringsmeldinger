/**
 * Lesingen av journalen, leveringsoppdragene og leveringsmålet i SQL Server, for
 * sakene TS-kjernen har skrevet. Alt leses under radsikkerheten, med aktøren og
 * prosjektet i konteksten (DL-U5), så en sak utenfor prosjektet finnes ikke.
 * Skrivingen står i `server/kommandoer.ts`.
 *
 * En sak der første rad mangler kjernens `format`, er ikke skrevet av TS-kjernen
 * (#705, #712). `skrevetAvKjernen` avgjør det for både lesingen og skrivingen.
 */

import type { Journalrad, Part } from '../kjerne/typer.ts';
import { sql, transaksjon, type Kontekst, type Pool } from './datalag.ts';

export class Versjonskonflikt extends Error {
  readonly forventet: number;
  readonly faktisk: number;

  constructor(forventet: number, faktisk: number, valg?: ErrorOptions) {
    super(`Forventet versjon ${forventet}, journalen har ${faktisk}`, valg);
    this.forventet = forventet;
    this.faktisk = faktisk;
  }
}

/** Saken finnes ikke i det autoriserte prosjektet, eller er ikke skrevet av TS-kjernen. */
export class SakFinnesIkke extends Error {}

/** Saken har ingen aktiv kobling til Catenda og dermed ikke noe leveringsmål (#739 punkt 1). */
export class IngenLeveringsmaal extends Error {}

/** Målet i Catenda for brevene i saken: koblingen for prosjektet og topicen for saken, når den finnes. */
export interface Leveringsmaal {
  catenda_project_id: string;
  library_id: string;
  folder_id: string | null;
  board_id: string | null;
  topic_id: string | null;
}

export interface Oppdragsrad {
  id: string;
  event_id: string;
  dokumentnoekkel: string;
  innhold: Record<string, unknown>;
  innhold_sha256: string;
}

export type LagretOppdrag = Oppdragsrad & { opprettet: string };

type Foresp = () => sql.Request;

/** Første rad har kjernens format, som `lesJournal` i `kjerne/format/leser.ts` krever. */
export function skrevetAvKjernen(journal: readonly Journalrad[]): boolean {
  const format = journal[0]?.format;
  return Number.isInteger(format) && (format as number) >= 1;
}

interface LagretRad {
  event_id: string;
  sak_id: string;
  event_type: string;
  versjon: number;
  tidsstempel: Date;
  aktor_id: string;
  aktor_rolle: Part;
  aktor_team_id: string | null;
  refererer_til_event_id: string | null;
  format: number | null;
  data: string;
}

/** Journalen i saken, i versjonsrekkefølge. Med `laas` holder transaksjonen saken til den er ferdig. */
export async function lesJournal(
  foresp: Foresp,
  sakId: string,
  laas: boolean
): Promise<Journalrad[]> {
  const svar = await foresp()
    .input('sak_id', sql.NVarChar(36), sakId)
    .query<LagretRad>(
      `SELECT event_id, sak_id, event_type, versjon, tidsstempel, aktor_id, aktor_rolle, aktor_team_id,
              refererer_til_event_id, format, data
         FROM koe.hendelse ${laas ? 'WITH (UPDLOCK, HOLDLOCK)' : ''}
        WHERE sak_id = @sak_id ORDER BY versjon`
    );
  return svar.recordset.map((r) => ({
    ...r,
    tidsstempel: r.tidsstempel.toISOString(),
    aktor_id: r.aktor_id.toLowerCase(),
    data: JSON.parse(r.data) as Record<string, unknown>,
  }));
}

interface LagretOppdragsrad extends Omit<LagretOppdrag, 'innhold' | 'opprettet'> {
  innhold: string;
  opprettet: Date;
}

/**
 * Leveringsoppdragene til brevene til og med `versjon`, i rekkefølgen brevene ble
 * skrevet. Et oppdrag skrives i samme transaksjon som brevet og endres ikke, så
 * grensen gir samme bilde som journalen som er lest før.
 */
async function lesOppdrag(
  foresp: Foresp,
  sakId: string,
  versjon: number
): Promise<LagretOppdrag[]> {
  const svar = await foresp()
    .input('sak_id', sql.NVarChar(36), sakId)
    .input('versjon', sql.Int, versjon)
    .query<LagretOppdragsrad>(
      `SELECT LOWER(CONVERT(nvarchar(36), o.id)) AS id, o.event_id, o.dokumentnoekkel, o.innhold,
              o.innhold_sha256, o.opprettet
         FROM koe.leveringsoppdrag o
         JOIN koe.hendelse h ON h.event_id = o.event_id AND h.sak_id = o.sak_id
        WHERE o.sak_id = @sak_id AND h.versjon <= @versjon
        ORDER BY h.versjon`
    );
  return svar.recordset.map((o) => ({
    ...o,
    innhold: JSON.parse(o.innhold) as Record<string, unknown>,
    opprettet: o.opprettet.toISOString(),
  }));
}

/**
 * Journalen og oppdragene i en sak TS-kjernen har skrevet, i prosjektet i
 * konteksten.
 *
 * @throws SakFinnesIkke
 */
export async function lesSaken(
  pool: Pool,
  kontekst: Kontekst,
  sakId: string
): Promise<{ journal: Journalrad[]; oppdrag: LagretOppdrag[] }> {
  return transaksjon(pool, kontekst, async (foresp) => {
    const journal = await lesJournal(foresp, sakId, false);
    if (!skrevetAvKjernen(journal))
      throw new SakFinnesIkke(`Saken ${sakId} finnes ikke i prosjektet.`);
    const oppdrag = await lesOppdrag(foresp, sakId, journal.at(-1)!.versjon);
    return { journal, oppdrag };
  });
}

/**
 * Leveringsmålet for saken i prosjektet i konteksten, fra `koe_api.leveringsmaal`.
 * Kalles etter at saken er funnet; en sak uten aktiv kobling har ikke noe mål, og
 * da skrives ikke brevet.
 */
export async function lesLeveringsmaal(foresp: Foresp, sakId: string): Promise<Leveringsmaal> {
  const svar = await foresp()
    .input('sak_id', sql.NVarChar(36), sakId)
    .execute<Leveringsmaal>('koe_api.leveringsmaal');
  if (!svar.recordset[0])
    throw new IngenLeveringsmaal(`Saken ${sakId} har ingen aktiv kobling til Catenda.`);
  return svar.recordset[0];
}
