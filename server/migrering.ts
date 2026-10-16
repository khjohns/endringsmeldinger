/**
 * Veien fra migrasjonsfil til base i SQL Server (#53, oppdragsgiver 16.10).
 *
 * Filene i `database/migrasjoner/` heter `ÅÅÅÅMMDDTTMMSS_navn.sql`. Prefikset er
 * versjonen, og filnavnrekkefølgen er rekkefølgen de anvendes i. Hver fil deles
 * på linjer med bare `GO` og anvendes i én transaksjon, sammen med raden i
 * `koe_migrering.historikk`, som lagrer versjonen og sha256 av hele fila.
 *
 * Runneren nekter å anvende noe når en anvendt fil er endret (også bare i en
 * kommentar), mangler, eller når en ny fil har lavere versjon enn en anvendt.
 * Én applås i basen gjør at to runnere ikke anvender samme fil.
 *
 * Historikktabellen er runnerens bokføring og lages av runneren selv; alt annet
 * i skjemaet kommer fra filene (`.claude/rules/database.md`).
 */

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import sql from 'mssql';

export const MIGRASJONSMAPPE = new URL('../database/migrasjoner/', import.meta.url).pathname;

const FILNAVN = /^(\d{14})_[a-z0-9_]+\.sql$/;
const GO = /^[ \t]*GO[ \t]*(?:--.*)?$/i;
const APPLAAS = 'koe_migrering';

export interface Migrasjon {
  versjon: string;
  filnavn: string;
  sha256: string;
  satser: string[];
}

export interface Anvendt {
  versjon: string;
  filnavn: string;
  sha256: string;
}

export class MigreringAvvist extends Error {
  override name = 'MigreringAvvist';
}

/** Teksten delt på linjer med bare `GO`, uten tomme satser. */
export function delPaaGo(tekst: string): string[] {
  const satser: string[] = [];
  let linjer: string[] = [];
  for (const linje of tekst.split(/\r?\n/)) {
    if (GO.test(linje)) {
      satser.push(linjer.join('\n'));
      linjer = [];
    } else linjer.push(linje);
  }
  satser.push(linjer.join('\n'));
  return satser.filter((s) => s.trim() !== '');
}

/** Migrasjonene i `mappe`, sortert på filnavn. Et annet filnavn enn formen avvises. */
export function lesMigrasjoner(mappe = MIGRASJONSMAPPE): Migrasjon[] {
  const filer = readdirSync(mappe)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const sett = new Set<string>();
  return filer.map((filnavn) => {
    const treff = FILNAVN.exec(filnavn);
    if (!treff) throw new MigreringAvvist(`${filnavn} har ikke formen ÅÅÅÅMMDDTTMMSS_navn.sql.`);
    const versjon = treff[1];
    if (sett.has(versjon)) throw new MigreringAvvist(`To filer har versjonen ${versjon}.`);
    sett.add(versjon);
    const innhold = readFileSync(join(mappe, filnavn));
    return {
      versjon,
      filnavn,
      sha256: createHash('sha256').update(innhold).digest('hex'),
      satser: delPaaGo(innhold.toString('utf8')),
    };
  });
}

/**
 * Det som hindrer at `filer` anvendes på en base med `anvendt`. Tom liste betyr
 * at de anvendte filene er uendret og at de nye kommer etter dem.
 */
export function avvik(anvendt: Anvendt[], filer: Migrasjon[]): string[] {
  const perVersjon = new Map(filer.map((f) => [f.versjon, f]));
  const funn: string[] = [];
  for (const a of anvendt) {
    const fil = perVersjon.get(a.versjon);
    if (!fil) funn.push(`${a.filnavn} er anvendt, men finnes ikke i mappa.`);
    else if (fil.sha256 !== a.sha256 || fil.filnavn !== a.filnavn)
      funn.push(`${a.filnavn} er endret etter at den ble anvendt.`);
  }
  const hoeyeste = anvendt.reduce((m, a) => (a.versjon > m ? a.versjon : m), '');
  const kjent = new Set(anvendt.map((a) => a.versjon));
  for (const f of filer)
    if (!kjent.has(f.versjon) && f.versjon < hoeyeste)
      funn.push(`${f.filnavn} er ikke anvendt og kommer foran ${hoeyeste}, som er anvendt.`);
  return funn;
}

const HISTORIKK = `
IF SCHEMA_ID(N'koe_migrering') IS NULL EXEC (N'CREATE SCHEMA koe_migrering');
IF OBJECT_ID(N'koe_migrering.historikk', N'U') IS NULL
  CREATE TABLE koe_migrering.historikk (
    versjon char(14) NOT NULL CONSTRAINT historikk_pk PRIMARY KEY,
    filnavn nvarchar(260) NOT NULL,
    sha256 char(64) NOT NULL,
    anvendt datetime2(3) NOT NULL CONSTRAINT historikk_anvendt DEFAULT SYSUTCDATETIME()
  );`;

async function laas(tx: sql.Transaction): Promise<void> {
  const svar = await new sql.Request(tx).input('ressurs', sql.NVarChar(255), APPLAAS).query<{
    r: number;
  }>(
    `DECLARE @r int;
     EXEC @r = sp_getapplock @Resource = @ressurs, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 60000;
     SELECT @r AS r;`
  );
  if (svar.recordset[0].r < 0)
    throw new MigreringAvvist('Fikk ikke applåsen for migreringen på 60 s.');
}

/**
 * Anvender filene som ikke er anvendt, én transaksjon per fil, og returnerer
 * versjonene som ble anvendt. Avviker historikken fra filene, anvendes ingenting.
 */
export async function migrer(pool: sql.ConnectionPool, filer: Migrasjon[]): Promise<string[]> {
  const kjoert: string[] = [];
  for (;;) {
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      await new sql.Request(tx).batch('SET XACT_ABORT ON;');
      await laas(tx);
      await new sql.Request(tx).batch(HISTORIKK);
      const anvendt = (
        await new sql.Request(tx).query<Anvendt>(
          'SELECT versjon, filnavn, sha256 FROM koe_migrering.historikk ORDER BY versjon'
        )
      ).recordset;
      const funn = avvik(anvendt, filer);
      if (funn.length) throw new MigreringAvvist(funn.join(' '));
      const kjent = new Set(anvendt.map((a) => a.versjon));
      const neste = filer.find((f) => !kjent.has(f.versjon));
      if (!neste) {
        await tx.commit();
        return kjoert;
      }
      for (const [i, sats] of neste.satser.entries()) {
        try {
          await new sql.Request(tx).batch(sats);
        } catch (feil) {
          throw new MigreringAvvist(`${neste.filnavn}, sats ${i + 1}: ${(feil as Error).message}`, {
            cause: feil,
          });
        }
      }
      await new sql.Request(tx)
        .input('versjon', sql.Char(14), neste.versjon)
        .input('filnavn', sql.NVarChar(260), neste.filnavn)
        .input('sha256', sql.Char(64), neste.sha256)
        .query(
          'INSERT koe_migrering.historikk (versjon, filnavn, sha256) VALUES (@versjon, @filnavn, @sha256)'
        );
      await tx.commit();
      kjoert.push(neste.versjon);
    } catch (feil) {
      try {
        await tx.rollback();
      } catch {
        // XACT_ABORT kan ha rullet tilbake allerede.
      }
      throw feil;
    }
  }
}
