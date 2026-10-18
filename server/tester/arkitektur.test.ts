/**
 * Grensene rundt TS-serveren (B-18, B-17):
 * - Serveren importerer kjernen fra `kjerne/`, ikke kjernens tester og ikke
 *   språkprøven (`sprakprove/` er prøvekode, AGENTS.md) eller frontenden.
 * - Ut over det bruker serveren bare Node. `pg` er ute av serveren (#661); den
 *   brukes bare av språkprøven. Testene kan i tillegg bruke Vitest.
 * - `mssql` importeres bare i datalaget (`datalag.ts`, #419), i migreringen
 *   (`migrering.ts`, #53), i testen av datalaget (`tester/datalag.test.ts`) og
 *   i testbasen (`tester/sqlserver*.ts`, #532). De andre testene, også
 *   `tester/migrering.test.ts`, får `sql` fra testbasen (#567). Testen ser bare
 *   de statiske importene av `mssql`, ikke et lager som bruker `sql` fra
 *   `datalag.ts` eller en pool fra `opprettPool` utenom `transaksjon` (#542).
 * - `pdf-lib` importeres bare i `brevpdf.ts`, som lager PDF-en av brevet (#371).
 *
 * - Alderen på medlemslisten røper om et prosjekt er koblet og når listen ble
 *   hentet, så utenom testene leser bare `autorisasjon.ts` den, etter at koblingen
 *   er kontrollert (#638 punkt 2). Testen ser navnet `medlemslistensAlder` og
 *   prosedyrenavnet `medlemsliste_alder` i kildeteksten, ikke et kall gjennom et
 *   annet navn.
 *
 * Importene leses med TypeScript-parseren, så `import`, `import type`,
 * `export … from`, `import()` og `require()` teller likt, med og uten endelse.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const SERVER = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROT = resolve(SERVER, '..');
const KJERNE = join(ROT, 'kjerne');
const TESTER = join(SERVER, 'tester');
const PAKKER = new Set<string>();
const TESTPAKKER = new Set(['vitest', 'typescript']);

/** Filene som kan importere `mssql`. */
function datalaget(fil: string): boolean {
  const navn = relative(SERVER, fil).split(sep).join('/');
  return (
    navn === 'datalag.ts' ||
    // Runneren anvender migrasjonsfilene som DDL i egne transaksjoner, med en
    // egen pool og utenfor `transaksjon` i datalaget: den binder ingen kontekst
    // og leser ingen saksdata, og den skal kjøres med migrasjonsidentiteten (#53).
    navn === 'migrering.ts' ||
    navn === 'tester/datalag.test.ts' ||
    /^tester\/sqlserver[^/]*\.ts$/.test(navn)
  );
}

/** Importene i `kilde` som ikke er tillatt for `fil`. */
export function forbudteImporter(fil: string, kilde: string): string[] {
  const test = fil.startsWith(TESTER + sep);
  return ts.preProcessFile(kilde, true, true).importedFiles.flatMap(({ fileName: i }) => {
    if (!i.startsWith('.'))
      return i.startsWith('node:') ||
        PAKKER.has(i) ||
        (i === 'mssql' && datalaget(fil)) ||
        (i === 'pdf-lib' && relative(SERVER, fil) === 'brevpdf.ts') ||
        (test && TESTPAKKER.has(i))
        ? []
        : [i];
    const sti = resolve(dirname(fil), i);
    if (sti.startsWith(SERVER + sep)) return [];
    if (sti.startsWith(KJERNE + sep) && !sti.startsWith(join(KJERNE, 'tester') + sep)) return [];
    return [i];
  });
}

/** Filene som kan lese alderen på medlemslisten (#638 punkt 2). */
const ALDEREN = new Set(['autorisasjon.ts']);

/** Om `kilde` viser til alderen på medlemslisten, som navn eller som prosedyre. */
export function viserTilAlderen(kilde: string): boolean {
  const fil = ts.createSourceFile('kilde.ts', kilde, ts.ScriptTarget.Latest);
  let funnet = false;
  const besok = (node: ts.Node) => {
    if (ts.isIdentifier(node) && node.text === 'medlemslistensAlder') funnet = true;
    if (ts.isStringLiteralLike(node) && node.text.includes('medlemsliste_alder')) funnet = true;
    ts.forEachChild(node, besok);
  };
  besok(fil);
  return funnet;
}

function alleFiler(mappe: string): string[] {
  return readdirSync(mappe, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory()
      ? alleFiler(join(mappe, d.name))
      : d.name.endsWith('.ts')
        ? [join(mappe, d.name)]
        : []
  );
}

const filer = alleFiler(SERVER);

describe('grensene rundt TS-serveren', () => {
  it('finner serverens moduler og testene', () => {
    expect(filer.map((f) => relative(SERVER, f))).toEqual(
      expect.arrayContaining(['app.ts', 'datalag.ts', 'lager.ts', 'tester/arkitektur.test.ts'])
    );
  });

  it.each(filer.map((f) => [relative(SERVER, f), f] as const))(
    '%s importerer bare kjernen, serveren, Node og, i datalaget, mssql',
    (_navn, fil) => {
      expect(forbudteImporter(fil, readFileSync(fil, 'utf8'))).toEqual([]);
    }
  );

  it('utenom testene leser bare autorisasjonen alderen på medlemslisten', () => {
    const lesere = filer
      .filter((f) => !f.startsWith(TESTER + sep))
      .filter((f) => viserTilAlderen(readFileSync(f, 'utf8')))
      .map((f) => relative(SERVER, f));
    expect(lesere.sort()).toEqual([...ALDEREN].sort());
  });

  it.each([
    ["import { medlemslistensAlder } from './autorisasjon.ts';"],
    ["import * as m from './autorisasjon.ts';\nawait m.medlemslistensAlder(pool, p);"],
    ["await pool.request().execute('koe_api.medlemsliste_alder');"],
    ['await pool.request().query(`EXEC koe_api.medlemsliste_alder @prosjekt = 1`);'],
  ])('oppdager at app.ts leser alderen med %s', (linje) => {
    const fil = join(SERVER, 'app.ts');
    expect(viserTilAlderen(readFileSync(fil, 'utf8'))).toBe(false);
    expect(viserTilAlderen(`${linje}\n${readFileSync(fil, 'utf8')}`)).toBe(true);
  });

  it.each([
    ["import { leggTil } from '../sprakprove/server/lager.ts';", 'app.ts'],
    ["import type { Hendelse } from '../sprakprove/kjerne/typer';", 'lager.ts'],
    ["export * from '../src/lib/api/client.ts';", 'levering.ts'],
    ["import { kjoer } from '../kjerne/tester/kjoerer.ts';", 'app.ts'],
    ["const z = await import('zod');", 'app.ts'],
    ["const { x } = require('../../sprakprove/tester/testbase.ts');", 'tester/testbase.ts'],
    ["import sql from 'mssql';", 'lager.ts'],
    ["import sql from 'mssql';", 'tester/migrering.test.ts'],
    ["import type { ConnectionPool } from 'mssql';", 'app.ts'],
    ["const sql = require('mssql');", 'tester/register.test.ts'],
    ["import { PDFDocument } from 'pdf-lib';", 'levering.ts'],
    ["import pg from 'pg';", 'lager.ts'],
    ["import type { Pool } from 'pg';", 'app.ts'],
    ["const pg = require('pg');", 'tester/testbase.ts'],
  ])('oppdager %s i %s', (linje, navn) => {
    const fil = join(SERVER, navn);
    expect(forbudteImporter(fil, `${linje}\n${readFileSync(fil, 'utf8')}`)).not.toEqual([]);
  });
});
