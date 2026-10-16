/**
 * Veien fra migrasjonsfil til base i SQL Server (#53, oppdragsgiver 16.10).
 *
 * Filene i `database/migrasjoner/` heter `ÅÅÅÅMMDDTTMMSS_navn.sql`. Prefikset er
 * versjonen, og filnavnrekkefølgen er rekkefølgen de anvendes i. Hver fil deles
 * på linjer med bare `GO` utenfor tekster og kommentarer og anvendes i én
 * transaksjon, sammen med raden i `koe_migrering.historikk`, som lagrer
 * versjonen og sha256 av hele fila. En fil som avslutter transaksjonen selv,
 * avvises før raden skrives.
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
import { fileURLToPath } from 'node:url';
import sql from 'mssql';

export const MIGRASJONSMAPPE = fileURLToPath(new URL('../database/migrasjoner/', import.meta.url));

const FILNAVN = /^(\d{14})_[a-z0-9_]+\.sql$/;
const GO = /^[ \t]*GO[ \t]*(?:--.*)?$/i;
/** `GO` fulgt av noe annet enn et navn, som `GO 5`, `GO;` og `GO` med en blokkommentar. */
const ANNEN_GO = /^[ \t]*GO(?![\p{L}\p{N}_@#$])/iu;
const BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const APPLAAS = 'koe_migrering';
const LAASVENT = 60_000;
/**
 * Tidsgrensen for runnerens forespørsler. Den er over låseventen, så en runner
 * som venter på applåsen, avvises med `MigreringAvvist` og ikke med `ETIMEOUT`
 * fra poolen, som har 15 s som standard (#564).
 */
const TIDSGRENSE = LAASVENT + 30_000;

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

type Tilstand =
  | { i: 'kode' }
  | { i: 'tekst' | 'navn' | 'sitert'; slutt: string; linje: number }
  | { i: 'kommentar'; dybde: number; linje: number };

/** Tilstanden etter `linje` (nummer `nr`), fra tilstanden før den. */
function skann(linje: string, nr: number, foer: Tilstand): Tilstand {
  let t = foer;
  for (let k = 0; k < linje.length; k++) {
    const to = linje.slice(k, k + 2);
    if (t.i === 'kode') {
      if (to === '--') return t;
      if (to === '/*') {
        t = { i: 'kommentar', dybde: 1, linje: nr };
        k++;
      } else if (linje[k] === "'") t = { i: 'tekst', slutt: "'", linje: nr };
      else if (linje[k] === '[') t = { i: 'navn', slutt: ']', linje: nr };
      else if (linje[k] === '"') t = { i: 'sitert', slutt: '"', linje: nr };
    } else if (t.i === 'kommentar') {
      if (to === '/*' || to === '*/') {
        const dybde = t.dybde + (to === '/*' ? 1 : -1);
        t = dybde === 0 ? { i: 'kode' } : { ...t, dybde };
        k++;
      }
    } else if (linje[k] === t.slutt) {
      // `''`, `]]` og `""` er tegnet selv, ikke slutten.
      if (linje[k + 1] === t.slutt) k++;
      else t = { i: 'kode' };
    }
  }
  return t;
}

const BESKRIVELSE = {
  tekst: 'Teksten',
  navn: 'Navnet i hakeparentes',
  sitert: 'Navnet i anførselstegn',
  kommentar: 'Kommentaren',
};

/**
 * Teksten delt på linjer med bare `GO`, uten tomme satser. `GO` i en tekst, et
 * navn eller en kommentar er en del av satsen. `GO` med noe annet etter enn en
 * `--`-kommentar, og en tekst eller kommentar som ikke er avsluttet, avvises med
 * linjenummeret.
 */
export function delPaaGo(tekst: string): string[] {
  const satser: string[] = [];
  let linjer: string[] = [];
  let t: Tilstand = { i: 'kode' };
  for (const [i, linje] of tekst.split(/\r?\n/).entries()) {
    if (t.i === 'kode' && GO.test(linje)) {
      satser.push(linjer.join('\n'));
      linjer = [];
      continue;
    }
    if (t.i === 'kode' && ANNEN_GO.test(linje))
      throw new MigreringAvvist(
        `Linje ${i + 1} begynner med GO, men har mer enn GO og en --kommentar. Runneren deler bare på GO alene.`
      );
    linjer.push(linje);
    t = skann(linje, i + 1, t);
  }
  if (t.i !== 'kode')
    throw new MigreringAvvist(
      `${BESKRIVELSE[t.i]} som begynner på linje ${t.linje}, er ikke avsluttet.`
    );
  satser.push(linjer.join('\n'));
  return satser.filter((s) => s.trim() !== '');
}

/** `filer` sortert på versjon. To filer med samme versjon avvises. */
function ordne(filer: Migrasjon[]): Migrasjon[] {
  const ordnet = [...filer].sort((a, b) =>
    a.versjon < b.versjon ? -1 : a.versjon > b.versjon ? 1 : 0
  );
  for (const [i, f] of ordnet.entries())
    if (i > 0 && ordnet[i - 1].versjon === f.versjon)
      throw new MigreringAvvist(`To filer har versjonen ${f.versjon}.`);
  return ordnet;
}

/**
 * Migrasjonene i `mappe`, sortert på filnavn. En fil med en annen endelse eller
 * et annet navn enn formen, eller med UTF-8-BOM, avvises.
 */
export function lesMigrasjoner(mappe = MIGRASJONSMAPPE): Migrasjon[] {
  const filer = readdirSync(mappe).sort();
  return ordne(
    filer.map((filnavn) => {
      if (!filnavn.endsWith('.sql'))
        throw new MigreringAvvist(
          `${filnavn} har ikke endelsen .sql. Mappa skal bare ha migrasjonsfiler.`
        );
      const treff = FILNAVN.exec(filnavn);
      if (!treff) throw new MigreringAvvist(`${filnavn} har ikke formen ÅÅÅÅMMDDTTMMSS_navn.sql.`);
      const innhold = readFileSync(join(mappe, filnavn));
      if (innhold.subarray(0, 3).equals(BOM))
        throw new MigreringAvvist(`${filnavn} begynner med UTF-8-BOM. Lagre fila uten.`);
      let satser: string[];
      try {
        satser = delPaaGo(innhold.toString('utf8'));
      } catch (feil) {
        if (feil instanceof MigreringAvvist)
          throw new MigreringAvvist(`${filnavn}: ${feil.message}`);
        throw feil;
      }
      return {
        versjon: treff[1],
        filnavn,
        sha256: createHash('sha256').update(innhold).digest('hex'),
        satser,
      };
    })
  );
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

/** En forespørsel i `tx` med runnerens tidsgrense. */
function foresporsel(tx: sql.Transaction): sql.Request {
  // Typene i @types/mssql har ikke det andre argumentet, som mssql har (`overrides`).
  const Request = sql.Request as unknown as new (
    tx: sql.Transaction,
    overstyring: { requestTimeout: number }
  ) => sql.Request;
  return new Request(tx, { requestTimeout: TIDSGRENSE });
}

async function laas(tx: sql.Transaction): Promise<void> {
  const svar = await foresporsel(tx)
    .input('ressurs', sql.NVarChar(255), APPLAAS)
    .query<{
      r: number;
    }>(
      `DECLARE @r int;
     EXEC @r = sp_getapplock @Resource = @ressurs, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = ${LAASVENT};
     SELECT @r AS r;`
    );
  if (svar.recordset[0].r < 0)
    throw new MigreringAvvist(`Fikk ikke applåsen for migreringen på ${LAASVENT / 1000} s.`);
}

/** Transaksjonen forbindelsen er i, og hvor mange nivåer den har. */
async function transaksjon(tx: sql.Transaction): Promise<{ id: string; niva: number }> {
  const svar = await foresporsel(tx).query<{ id: string | null; niva: number }>(
    'SELECT CONVERT(varchar(20), CURRENT_TRANSACTION_ID()) AS id, @@TRANCOUNT AS niva'
  );
  return { id: svar.recordset[0].id ?? '', niva: svar.recordset[0].niva };
}

/**
 * Anvender filene som ikke er anvendt, én transaksjon per fil, og returnerer
 * versjonene som ble anvendt. Avviker historikken fra filene, anvendes ingenting.
 */
export async function migrer(pool: sql.ConnectionPool, filer: Migrasjon[]): Promise<string[]> {
  filer = ordne(filer);
  const kjoert: string[] = [];
  for (;;) {
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      await foresporsel(tx).batch('SET XACT_ABORT ON;');
      await laas(tx);
      await foresporsel(tx).batch(HISTORIKK);
      const anvendt = (
        await foresporsel(tx).query<Anvendt>(
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
      const runnerens = await transaksjon(tx);
      for (const [i, sats] of neste.satser.entries()) {
        try {
          await foresporsel(tx).batch(sats);
        } catch (feil) {
          throw new MigreringAvvist(`${neste.filnavn}, sats ${i + 1}: ${(feil as Error).message}`, {
            cause: feil,
          });
        }
        const etter = await transaksjon(tx);
        if (etter.id !== runnerens.id || etter.niva !== runnerens.niva)
          throw new MigreringAvvist(
            `${neste.filnavn}, sats ${i + 1}: satsen avsluttet eller åpnet en transaksjon ` +
              `(@@TRANCOUNT ${etter.niva}). Runneren anvender hver fil i sin egen transaksjon, ` +
              'og det satsen gjorde før en COMMIT, kan være lagret.'
          );
      }
      await foresporsel(tx)
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
