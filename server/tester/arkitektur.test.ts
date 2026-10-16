/**
 * Grensene rundt TS-serveren (B-18, B-17):
 * - Serveren importerer kjernen fra `kjerne/`, ikke kjernens tester og ikke
 *   språkprøven (`sprakprove/` er prøvekode, AGENTS.md) eller frontenden.
 * - Ut over det bruker serveren bare Node og `pg`. Testene kan i tillegg bruke
 *   Vitest.
 * - `mssql` brukes bare i datalaget (`datalag.ts`, #419), i migreringen
 *   (`migrering.ts`, #53) og i testene av dem og av testbasen (#532). Testen ser bare de statiske importene av `mssql`, ikke et
 *   lager som bruker `sql` fra `datalag.ts` eller en pool fra `opprettPool`
 *   utenom `transaksjon` (#542).
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
const PAKKER = new Set(['pg']);
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
        (test && TESTPAKKER.has(i))
        ? []
        : [i];
    const sti = resolve(dirname(fil), i);
    if (sti.startsWith(SERVER + sep)) return [];
    if (sti.startsWith(KJERNE + sep) && !sti.startsWith(join(KJERNE, 'tester') + sep)) return [];
    return [i];
  });
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
    '%s importerer bare kjernen, serveren, Node, pg og, i datalaget, mssql',
    (_navn, fil) => {
      expect(forbudteImporter(fil, readFileSync(fil, 'utf8'))).toEqual([]);
    }
  );

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
  ])('oppdager %s i %s', (linje, navn) => {
    const fil = join(SERVER, navn);
    expect(forbudteImporter(fil, `${linje}\n${readFileSync(fil, 'utf8')}`)).not.toEqual([]);
  });
});
