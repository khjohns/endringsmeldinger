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
import { opprettPool } from '../datalag.ts';

export { feilnummer } from '../datalag.ts';

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

/** Fristen `slett()` venter på serveren i, ms. */
const SLETTEFRIST = 30_000;

const vent = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

/** En pool med konfigurasjonen datalaget bruker (`opprettPool`), mot `database`. */
export function koble(database: string, maks: number): Promise<Pool> {
  const config = sql.ConnectionPool.parseConnectionString(SQLSERVER_TILKOBLING);
  return opprettPool(
    { ...config, database, connectionTimeout: 5_000, requestTimeout: 60_000 },
    { maks }
  );
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
      try {
        // Kortere enn grensen i `afterAll`, så feilmeldingen her kommer fram.
        const m = await kobleTilServer(SLETTEFRIST);
        try {
          await m
            .request()
            .batch(
              `ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}];`
            );
        } finally {
          await m.close();
        }
      } catch (feil) {
        throw new Error(`Basen ${database} ble ikke slettet og blir stående på serveren.`, {
          cause: feil,
        });
      }
    },
  };
}

/**
 * En innlogging som er medlem av `rolle` (standard `koe_runtime`) i basen, og en pool som logger inn
 * med den, så rollen prøves med sine egne rettigheter gjennom `transaksjon()`
 * (#53, del 3a). Innloggingen hører til serveren og slettes med `slett()`, før basen.
 */
export async function opprettKjoeretid(
  base: Testbase,
  { maks = 4, rolle = 'koe_runtime' } = {}
): Promise<{ pool: Pool; slett(): Promise<void> }> {
  const navn = `koe_kjoeretid_${randomBytes(4).toString('hex')}`;
  const passord = `${randomBytes(24).toString('base64url')}aA1!`;
  const master = await kobleTilServer(SLETTEFRIST);
  try {
    await master
      .request()
      .batch(
        `CREATE LOGIN [${navn}] WITH PASSWORD = N'${passord}', DEFAULT_DATABASE = [${base.navn}], CHECK_POLICY = OFF;`
      );
  } finally {
    await master.close();
  }
  let pool: Pool;
  try {
    await base.pool
      .request()
      .batch(
        `CREATE USER [${navn}] FOR LOGIN [${navn}]; ALTER ROLE [${rolle}] ADD MEMBER [${navn}];`
      );
    const config = sql.ConnectionPool.parseConnectionString(SQLSERVER_TILKOBLING);
    pool = await opprettPool(
      {
        ...config,
        user: navn,
        password: passord,
        database: base.navn,
        connectionTimeout: 5_000,
        requestTimeout: 60_000,
      },
      { maks }
    );
  } catch (feil) {
    await slettInnlogging(navn).catch(() => undefined);
    throw feil;
  }
  return {
    pool,
    async slett() {
      try {
        await pool.close();
      } finally {
        await slettInnlogging(navn);
      }
    },
  };
}

/**
 * Sletter testressursene i rekkefølgen de er gitt, typisk kjøretiden før basen,
 * og prøver hver av dem også når en tidligere sletting feiler (#874 punkt 1). En
 * ressurs som ikke ble opprettet, hoppes over. Feiler én, kastes feilen; feiler
 * flere, kastes de samlet.
 */
export async function slettAlle(
  ...ressurser: ({ slett(): Promise<void> } | undefined)[]
): Promise<void> {
  const feil: unknown[] = [];
  for (const r of ressurser) {
    try {
      await r?.slett();
    } catch (f) {
      feil.push(f);
    }
  }
  if (feil.length === 1) throw feil[0];
  if (feil.length > 1) throw new AggregateError(feil, 'Flere testressurser kunne ikke slettes.');
}

/**
 * Sletter innloggingen `navn` fra serveren. `pool.close()` venter ikke på at
 * serveren har lukket øktene, så `DROP LOGIN` kan komme mens en av dem ennå
 * står i `sys.dm_exec_sessions` (#727). Øktene til innloggingen avsluttes derfor
 * med `KILL`, og innloggingen slettes først når ingen står igjen.
 */
async function slettInnlogging(navn: string): Promise<void> {
  const m = await kobleTilServer(SLETTEFRIST);
  try {
    await m
      .request()
      .input('navn', sql.NVarChar(128), navn)
      .batch(
        `DECLARE @oekt int, @setning nvarchar(40), @runder int = 0;
       WHILE EXISTS (SELECT 1 FROM sys.dm_exec_sessions WHERE login_name = @navn)
       BEGIN
         IF @runder = 100 THROW 50000, N'Øktene til innloggingen ble ikke avsluttet på 10 s', 1;
         SET @oekt = (SELECT MIN(session_id) FROM sys.dm_exec_sessions WHERE login_name = @navn);
         SET @setning = CONCAT(N'KILL ', @oekt);
         -- KILL venter ikke på at økta er borte, og økta kan ha lukket seg selv (6106).
         BEGIN TRY EXEC (@setning); END TRY
         BEGIN CATCH IF ERROR_NUMBER() <> 6106 THROW; END CATCH
         WAITFOR DELAY '00:00:00.100';
         SET @runder += 1;
       END
       DROP LOGIN [${navn}];`
      );
  } finally {
    await m.close();
  }
}

export { sql };
