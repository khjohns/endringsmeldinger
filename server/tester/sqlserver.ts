/**
 * Testbaser i SQL Server for datalaget i F0b (#488). `KOE_SQLSERVER_TILKOBLING`
 * er tilkoblingsstrengen til en kastbar server, fra
 * `scripts/testbase/docker_sqlserver.sh` (hooken i skyøkta og CI-jobben
 * `sqlserver`). Hver testfil får sin egen base med innstillingene Azure SQL
 * Database har som standard, og basen slettes etterpå.
 *
 * Hjelperen nekter en server som ikke er Developer Edition, så den aldri
 * oppretter eller sletter baser i Azure eller på en delt server.
 */

import { randomBytes } from 'node:crypto';
import sql from 'mssql';

export const SQLSERVER_TILKOBLING = process.env.KOE_SQLSERVER_TILKOBLING ?? '';

/** Standardinnstillingene i Azure SQL Database (#78, svaret på A3). */
export const AZURE_INNSTILLINGER = {
  sortering: 'Latin1_General_100_BIN2_UTF8',
  readCommittedSnapshot: true,
  akselerertGjenoppretting: true,
} as const;

export type Pool = sql.ConnectionPool;

export interface Testbase {
  navn: string;
  pool: Pool;
  slett(): Promise<void>;
}

const vent = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

async function koble(database: string, maks: number): Promise<Pool> {
  const config = sql.ConnectionPool.parseConnectionString(SQLSERVER_TILKOBLING);
  return new sql.ConnectionPool({
    ...config,
    database,
    pool: { max: maks, min: 0 },
    connectionTimeout: 5_000,
    requestTimeout: 60_000,
  }).connect();
}

/**
 * En forbindelse til `master`. Hooken starter serveren i bakgrunnen, så de
 * første testene etter oppstarten av økta venter på den, i opptil `frist` ms.
 */
async function kobleTilServer(frist: number): Promise<Pool> {
  const slutt = Date.now() + frist;
  for (;;) {
    try {
      return await koble('master', 2);
    } catch (feil) {
      if (Date.now() > slutt) {
        throw new Error(
          `SQL Server i KOE_SQLSERVER_TILKOBLING svarte ikke på ${frist / 1000} s. ` +
            'I skyøkta starter hooken den i bakgrunnen; se /tmp/koe-sqlserver.log.',
          { cause: feil }
        );
      }
      await vent(2_000);
    }
  }
}

/** Avvikene fra `AZURE_INNSTILLINGER` i basen `pool` er koblet til, lest i `sys.databases`. */
export async function avvikFraAzure(pool: Pool): Promise<string[]> {
  const svar = await pool.request().query<{
    collation_name: string;
    is_read_committed_snapshot_on: boolean;
    is_accelerated_database_recovery_on: boolean;
  }>(
    `SELECT collation_name, is_read_committed_snapshot_on, is_accelerated_database_recovery_on
       FROM sys.databases WHERE name = DB_NAME()`
  );
  const rad = svar.recordset[0];
  const avvik: string[] = [];
  if (rad.collation_name !== AZURE_INNSTILLINGER.sortering)
    avvik.push(`collation_name er ${rad.collation_name}`);
  if (rad.is_read_committed_snapshot_on !== AZURE_INNSTILLINGER.readCommittedSnapshot)
    avvik.push('READ_COMMITTED_SNAPSHOT er av');
  if (rad.is_accelerated_database_recovery_on !== AZURE_INNSTILLINGER.akselerertGjenoppretting)
    avvik.push('ACCELERATED_DATABASE_RECOVERY er av');
  return avvik;
}

/**
 * En ny, tom base med navnet `koe_test_<navn>_<tilfeldig>`. Med
 * `azure: false` får den standardinnstillingene i SQL Server, som kontrollen
 * av innstillingene prøves mot.
 */
export async function opprettTestbase(
  navn: string,
  { maks = 8, azure = true, frist = 180_000 } = {}
): Promise<Testbase> {
  if (!SQLSERVER_TILKOBLING) throw new Error('KOE_SQLSERVER_TILKOBLING er ikke satt.');
  const database = `koe_test_${navn}_${randomBytes(4).toString('hex')}`;
  const master = await kobleTilServer(frist);
  try {
    const utgave = await master.request().query<{
      utgave: string;
    }>(`SELECT CAST(SERVERPROPERTY('Edition') AS nvarchar(128)) AS utgave`);
    if (!utgave.recordset[0].utgave.includes('Developer Edition')) {
      throw new Error(
        `KOE_SQLSERVER_TILKOBLING peker på ${utgave.recordset[0].utgave}, ikke på en kastbar server i Developer Edition.`
      );
    }
    if (azure) {
      await master.request().batch(
        `CREATE DATABASE [${database}] COLLATE ${AZURE_INNSTILLINGER.sortering};
         ALTER DATABASE [${database}] SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE;
         ALTER DATABASE [${database}] SET ACCELERATED_DATABASE_RECOVERY = ON;`
      );
    } else {
      await master.request().batch(`CREATE DATABASE [${database}]`);
    }
  } finally {
    await master.close();
  }
  const pool = await koble(database, maks);
  return {
    navn: database,
    pool,
    async slett() {
      await pool.close();
      const m = await kobleTilServer(frist);
      try {
        await m
          .request()
          .batch(
            `ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}];`
          );
      } finally {
        await m.close();
      }
    },
  };
}

/** Feilnummeret fra SQL Server: 2627 for brudd på en unik nøkkel, et eget nummer fra THROW osv. */
export function feilnummer(feil: unknown): number | undefined {
  const f = feil as { number?: number; originalError?: { info?: { number?: number } } };
  return f?.number ?? f?.originalError?.info?.number;
}

export { sql };
