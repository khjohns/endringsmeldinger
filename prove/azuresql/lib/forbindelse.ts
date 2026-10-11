/**
 * Forbindelsene til SQL Server i prøven (#395). `kjor.sh` starter containeren
 * og setter miljøvariablene; uten dem hoppes testene over.
 *
 * Konteksten settes med `koe_api.sett_kontekst` inne i transaksjonen og
 * gjelder bare den (02_sikkerhet.sql). `transaksjon` er den eneste veien
 * prøven skriver og leser med kontekst.
 */

import sql from 'mssql';

export const VERT = process.env.PROVE_MSSQL_VERT ?? '127.0.0.1';
export const PORT = Number(process.env.PROVE_MSSQL_PORT ?? 0);
export const SA_PASSORD = process.env.PROVE_MSSQL_SA_PASSORD ?? '';
export const RUNTIME_PASSORD = process.env.PROVE_MSSQL_RUNTIME_PASSORD ?? '';
export const MUTASJON = process.env.PROVE_MUTASJON ?? '';
export const AKTIV = Boolean(PORT && SA_PASSORD && RUNTIME_PASSORD);

export type Pool = sql.ConnectionPool;

export async function koble(bruker: 'sa' | 'runtime', database: string, maks = 4): Promise<Pool> {
  return new sql.ConnectionPool({
    server: VERT,
    port: PORT,
    user: bruker === 'sa' ? 'sa' : 'koe_runtime_login',
    password: bruker === 'sa' ? SA_PASSORD : RUNTIME_PASSORD,
    database,
    options: { trustServerCertificate: true, encrypt: true },
    pool: { max: maks, min: 0 },
    requestTimeout: 60_000,
  }).connect();
}

export interface Kontekst {
  aktor: string;
  prosjekt: string;
  side?: 'TE' | 'BH';
  team?: string;
}

export interface Kroker {
  /** Kalles etter arbeidet og før COMMIT. Kaster den, rulles alt tilbake. */
  foerCommit?: (foresp: () => sql.Request) => Promise<void>;
}

/** Feilnummeret fra SQL Server: 51403 fra THROW, 229 for manglende rettighet osv. */
export function feilnummer(feil: unknown): number | undefined {
  const f = feil as { number?: number; originalError?: { info?: { number?: number } } };
  return f?.number ?? f?.originalError?.info?.number;
}

/**
 * Én transaksjon med konteksten satt først. Feiler arbeidet, rulles
 * transaksjonen tilbake; med XACT_ABORT kan serveren alt ha gjort det.
 */
export async function transaksjon<T>(
  pool: Pool,
  kontekst: Kontekst | null,
  arbeid: (foresp: () => sql.Request) => Promise<T>,
  kroker: Kroker = {}
): Promise<T> {
  const tx = new sql.Transaction(pool);
  await tx.begin();
  const foresp = () => new sql.Request(tx);
  try {
    if (kontekst) {
      await foresp()
        .input('aktor', sql.NVarChar(36), kontekst.aktor)
        .input('prosjekt', sql.NVarChar(100), kontekst.prosjekt)
        .input('side', sql.NVarChar(2), kontekst.side ?? null)
        .input('team', sql.NVarChar(32), kontekst.team ?? null)
        .execute('koe_api.sett_kontekst');
    }
    const svar = await arbeid(foresp);
    await kroker.foerCommit?.(foresp);
    await tx.commit();
    return svar;
  } catch (feil) {
    await tx.rollback().catch(() => undefined);
    throw feil;
  }
}

/** Antall rader i tabellen som er synlige med konteksten. */
export async function tell(
  pool: Pool,
  kontekst: Kontekst | null,
  tabell: string,
  hvor = '1 = 1',
  verdier: Record<string, string> = {}
): Promise<number> {
  return transaksjon(pool, kontekst, async (f) => {
    const r = f();
    for (const [navn, verdi] of Object.entries(verdier)) r.input(navn, sql.NVarChar(100), verdi);
    const svar = await r.query<{ n: number }>(`SELECT COUNT(*) AS n FROM ${tabell} WHERE ${hvor}`);
    return svar.recordset[0].n;
  });
}

export { sql };
