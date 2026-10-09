/**
 * INV-MM-9: ingen forretningsregel leser statusen eller etikettene. Ingen modul
 * i kjernen utenom visningen importerer visningen, direkte eller gjennom en
 * annen modul. Heller ikke modulene i språkprøvens kjerne som regner status
 * (`sak.ts`, `offentlig.ts`, `forretningsregler.ts`), og ikke
 * `sammenlikning.ts`, som bygger på `sak.ts`.
 *
 * Importene leses med TypeScript-parseren, ikke med et tekstsøk, så `import`,
 * `import type`, `export … from`, `import()` og `require()` teller likt, med og
 * uten filendelse.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const KJERNE = resolve(dirname(fileURLToPath(import.meta.url)), '../kjerne');
const SPRAKPROVE = resolve(KJERNE, '../..');

const FORBUDT = [
  join(KJERNE, 'visning.ts'),
  join(SPRAKPROVE, 'kjerne/sak.ts'),
  join(SPRAKPROVE, 'kjerne/offentlig.ts'),
  join(SPRAKPROVE, 'kjerne/forretningsregler.ts'),
  join(SPRAKPROVE, 'kjerne/sammenlikning.ts'),
];

const utenEndelse = (sti: string) => sti.replace(/\.(ts|js|mjs|cjs)$/, '');

/** Modulene `fil` importerer, løst til absolutte stier uten endelse. Pakker utenfor repoet tas ikke med. */
export function importer(fil: string, kilde: string): string[] {
  const { importedFiles } = ts.preProcessFile(kilde, true, true);
  return importedFiles
    .map((i) => i.fileName)
    .filter((navn) => navn.startsWith('.'))
    .map((navn) => utenEndelse(resolve(dirname(fil), navn)));
}

/** Stiene fra `start` til en forbudt modul, gjennom importene i `filer`. */
export function forbudteStier(
  start: string,
  filer: Map<string, string>,
  forbudt: string[]
): string[] {
  const mal = new Set(forbudt.map(utenEndelse));
  const funnet: string[] = [];
  const sett = new Set<string>();
  const besok = (fil: string, sti: string[]) => {
    const nokkel = utenEndelse(fil);
    if (sett.has(nokkel)) return;
    sett.add(nokkel);
    const kilde = filer.get(nokkel) ?? lesFil(nokkel);
    if (kilde === null) return;
    for (const neste of importer(fil, kilde)) {
      if (mal.has(neste))
        funnet.push([...sti, neste].map((s) => relative(SPRAKPROVE, s)).join(' → '));
      else besok(`${neste}.ts`, [...sti, neste]);
    }
  };
  besok(start, [utenEndelse(start)]);
  return funnet;
}

function lesFil(utenEnd: string): string | null {
  try {
    return readFileSync(`${utenEnd}.ts`, 'utf8');
  } catch {
    return null;
  }
}

const moduler = readdirSync(KJERNE)
  .filter((f) => f.endsWith('.ts') && f !== 'visning.ts')
  .map((f) => join(KJERNE, f));

describe('INV-MM-9: reglene leser ikke visningen', () => {
  it('finner kjernens moduler', () => {
    expect(moduler.map((m) => relative(KJERNE, m))).toEqual(
      expect.arrayContaining([
        'forutsetninger.ts',
        'nyttelast.ts',
        'avvisning.ts',
        'handlinger.ts',
        'utled.ts',
      ])
    );
  });

  it.each(moduler.map((m) => [relative(KJERNE, m), m] as const))(
    '%s når ikke visningen eller statusmodulene',
    (_navn, modul) => {
      expect(forbudteStier(modul, new Map(), FORBUDT)).toEqual([]);
    }
  );

  // Et forbudt importforsøk i en regel gir feil, uansett skrivemåte. Forsøket
  // står i minnet her; feilinnføringen F1 prøver det samme i selve fila.
  it.each([
    ["import { visning } from './visning.ts';"],
    ["import type { Visning } from './visning';"],
    ["export { visning } from './visning.js';"],
    ["export * from './visning.ts';"],
    ["const v = await import('./visning.ts');"],
    ["const v = require('./visning');"],
    ["import { visning } from '../kjerne/visning.ts';"],
    ["import { samletStatus } from '../../kjerne/sak.ts';"],
  ])('oppdager %s', (linje) => {
    const regel = join(KJERNE, 'forutsetninger.ts');
    const kilde = `${linje}\n${readFileSync(regel, 'utf8')}`;
    expect(forbudteStier(regel, new Map([[utenEndelse(regel), kilde]]), FORBUDT)).not.toEqual([]);
  });

  it('oppdager visningen gjennom en annen modul', () => {
    const regel = join(KJERNE, 'forutsetninger.ts');
    const mellom = join(KJERNE, 'mellom.ts');
    const filer = new Map([
      [utenEndelse(regel), "import { x } from './mellom.ts';"],
      [utenEndelse(mellom), "export { visning as x } from './visning.ts';"],
    ]);
    expect(forbudteStier(regel, filer, FORBUDT)).toEqual([
      'maalmodell/kjerne/forutsetninger → maalmodell/kjerne/mellom → maalmodell/kjerne/visning',
    ]);
  });
});
