/**
 * Grensen mellom appen og TS-kjernen (B-14, B-15, #313).
 *
 * - Appen når kjernen gjennom `$kjerne`.
 * - Ingen fil i `src/` utenom testene importerer fra `kjerne/tester/`, verken med
 *   aliaset eller med en relativ sti. Testene i `kjerne/tester/` bruker Node, Vitest og
 *   bevis-sakene. En test i `src/` kan bruke kjøreren for brukerforløpene, så demoruta
 *   prøves mot samme kontroller (#1330); testene kommer ikke i nettleserbunten.
 * - Det appen kan importere fra kjernen, når bare andre moduler i kjernen
 *   utenfor `kjerne/tester/`, direkte eller gjennom en annen modul. Ingen
 *   `node:`-modul og ingen pakke kommer med i nettleserbunten.
 *
 * Importene leses med TypeScript-parseren, så `import`, `import type`,
 * `export … from`, `import()` og `require()` teller likt, med og uten filendelse.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { PROJEKSJONSVERSJON } from '$kjerne/versjon';

const ROT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROT, 'src');
const KJERNE = join(ROT, 'kjerne');
const TESTER = join(KJERNE, 'tester');
const ALIAS = '$kjerne';

function filer(mappe: string, endelser: RegExp): string[] {
  return readdirSync(mappe, { recursive: true, encoding: 'utf8' })
    .map((f) => join(mappe, f))
    .filter((f) => endelser.test(f) && statSync(f).isFile());
}

/** Skriptblokkene i en Svelte-komponent; ellers hele fila. */
function kode(fil: string, kilde: string): string {
  if (!fil.endsWith('.svelte')) return kilde;
  return [...kilde.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
}

/** Aliasene som kan føre inn i kjernen, med mappa de peker på. */
const ALIASER: [string, string][] = [
  [ALIAS, KJERNE],
  ['$lib', join(SRC, 'lib')],
];

/** Importene i `kilde`: aliasene og relative stier løst til absolutte, pakkenavn som de står. */
export function importer(fil: string, kilde: string): string[] {
  const { importedFiles } = ts.preProcessFile(kode(fil, kilde), true, true);
  return importedFiles.map(({ fileName: navn }) => {
    const alias = ALIASER.find(([a]) => navn === a || navn.startsWith(a + '/'));
    if (alias) return join(alias[1], navn.slice(alias[0].length));
    if (navn.startsWith('/')) return join(ROT, navn);
    return navn.startsWith('.') ? resolve(dirname(fil), navn) : navn;
  });
}

const iKjernen = (sti: string) => sti === KJERNE || sti.startsWith(KJERNE + sep);
const iTestene = (sti: string) => sti === TESTER || sti.startsWith(TESTER + sep);

/** Stien relativt til roten når den ligger der, ellers som den står. */
const vis = (sti: string) => (sti.startsWith(ROT + sep) ? relative(ROT, sti) : sti);

/** Innholdet i fila, eller `undefined` når den ikke finnes. */
type Leser = (fil: string) => string | undefined;

const lesFil: Leser = (fil) =>
  existsSync(fil) && statSync(fil).isFile() ? readFileSync(fil, 'utf8') : undefined;

const erTest = (fil: string) => /\.test\.ts$/.test(fil) || fil.split(sep).includes('__tests__');

/** Importene fra `src/` utenom testene som går til `kjerne/tester/`. */
export function testimporter(kilder: Map<string, string>): string[] {
  return [...kilder]
    .filter(([fil]) => !erTest(fil))
    .flatMap(([fil, kilde]) =>
      importer(fil, kilde)
        .filter(iTestene)
        .map((i) => `${vis(fil)} → ${vis(i)}`)
    );
}

/**
 * Det appen kan nå i kjernen, fra `start`: hver import som går til en pakke,
 * en `node:`-modul, `kjerne/tester/` eller ut av kjernen, med stien dit.
 */
export function utenforNettleseren(start: string[], les: Leser): string[] {
  const funnet: string[] = [];
  const besokt = new Set<string>();
  const ko = start.map((fil) => [fil]);
  while (ko.length) {
    const sti = ko.shift()!;
    const fil = sti[sti.length - 1];
    if (besokt.has(fil)) continue;
    besokt.add(fil);
    for (const i of importer(fil, les(fil) ?? '')) {
      const neste =
        iKjernen(i) && !iTestene(i)
          ? [i, `${i}.ts`, i.replace(/\.js$/, '.ts'), join(i, 'index.ts')].find(
              (f) => les(f) !== undefined
            )
          : undefined;
      if (neste) ko.push([...sti, neste]);
      else funnet.push([...sti, i].map(vis).join(' → '));
    }
  }
  return funnet;
}

const appfiler = filer(SRC, /\.(ts|js|svelte)$/);
const kjernefiler = filer(KJERNE, /\.ts$/).filter((f) => !iTestene(f));

describe('grensen mellom appen og kjernen', () => {
  it('appen når kjernen gjennom aliaset', () => {
    expect(PROJEKSJONSVERSJON).toBeGreaterThan(0);
  });

  it('ingen fil i src/ utenom testene importerer fra kjerne/tester/', () => {
    expect(testimporter(new Map(appfiler.map((f) => [f, readFileSync(f, 'utf8')])))).toEqual([]);
  });

  it('det appen kan importere fra kjernen, når ingen pakke, node-modul eller test', () => {
    expect(kjernefiler.length).toBeGreaterThan(0);
    expect(utenforNettleseren(kjernefiler, lesFil)).toEqual([]);
  });

  it('vakten kjenner igjen de forbudte importene', () => {
    const app = join(SRC, 'lib', 'eksempel.svelte');
    const kilder = new Map([
      [app, `<script lang="ts">\n  import { lagKlient } from '$kjerne/tester/klient';\n</script>`],
      [join(SRC, 'lib', 'a.ts'), `export * from '../../kjerne/tester/bane.ts';`],
      [join(SRC, 'lib', 'b.ts'), `const m = await import('$kjerne/tester');`],
      [join(SRC, 'lib', 'c.ts'), `import { KJERNE } from '$kjerne/versjon';`],
      [join(SRC, 'lib', 'd.ts'), `import { lagKlient } from '$lib/../../kjerne/tester/klient';`],
      [join(SRC, 'lib', 'e.ts'), `import { lagKlient } from '/kjerne/./tester/klient';`],
      [join(SRC, 'lib', 'f.test.ts'), `import { kjoer } from '$kjerne/tester/kjoerer';`],
      [join(SRC, 'lib', '__tests__', 'g.ts'), `import { kjoer } from '$kjerne/tester/kjoerer';`],
    ]);
    expect(testimporter(kilder)).toEqual([
      'src/lib/eksempel.svelte → kjerne/tester/klient',
      'src/lib/a.ts → kjerne/tester/bane.ts',
      'src/lib/b.ts → kjerne/tester',
      'src/lib/d.ts → kjerne/tester/klient',
      'src/lib/e.ts → kjerne/tester/klient',
    ]);

    const modul = join(KJERNE, 'modul.ts');
    const hjelper = join(KJERNE, 'hjelper.ts');
    const kjernekilder: Record<string, string> = {
      [modul]: `import { b } from './hjelper.js';\nimport { c } from './tester/klient.ts';`,
      [hjelper]: `import { randomUUID } from 'node:crypto';\nimport type { Pool } from 'pg';`,
    };
    expect(utenforNettleseren([modul], (f) => kjernekilder[f])).toEqual([
      'kjerne/modul.ts → kjerne/tester/klient.ts',
      'kjerne/modul.ts → kjerne/hjelper.ts → node:crypto',
      'kjerne/modul.ts → kjerne/hjelper.ts → pg',
    ]);
  });
});
