/**
 * Grensene rundt kjernen (B-14, merknaden 09.10) og INV-MM-9.
 *
 * - Kjernen er ren kode. Ingen modul i `kjerne/` importerer fra språkprøven,
 *   frontenden, `pg` eller en annen pakke. Testene kan i tillegg bruke Vitest,
 *   TypeScript, Node og bevis-sakene i `docs/domenetabell/`.
 * - Ingen regel når visningen eller bufferen, direkte eller gjennom en annen
 *   modul. Visningen regner status og etiketter; bufferen lagrer visningen.
 * - Ingen regel leser en status eller en verdi som oppsummerer et spor eller
 *   saken (#308, «Kontrakten først, aldri status» i AGENTS.md). Navnene og
 *   strengene i reglene leses med parseren; et navn som `avsluttet`,
 *   `oppgjort`, `grunnlagLaast` eller en statuskode gir feil.
 *
 * Importene leses med TypeScript-parseren, ikke med et tekstsøk, så `import`,
 * `import type`, `export … from`, `import()` og `require()` teller likt, med og
 * uten filendelse.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const KJERNE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROT = resolve(KJERNE, '..');
const TESTER = join(KJERNE, 'tester');

/** Modulene reglene ikke kan nå. */
const VISNING = [join(KJERNE, 'visning.ts'), join(KJERNE, 'buffer.ts')];
/** Pakker og filer utenfor kjernen testene kan bruke. */
const TESTPAKKER = new Set(['vitest', 'typescript']);
const TESTFILER = join(ROT, 'docs', 'domenetabell') + sep;

/** Navn og strenger en regel ikke kan bruke: statusen, etikettene og oppsummeringene. */
const OPPSUMMERING = /status|etikett|oppgjort|avsluttet|laast|lukket|omforent/i;

/** Navnene og strengene i `kilde` som ser ut som en status eller en oppsummering. Kommentarer teller ikke. */
export function statuslesing(kilde: string): string[] {
  const fil = ts.createSourceFile('regel.ts', kilde, ts.ScriptTarget.ES2022, true);
  const funnet: string[] = [];
  const besoek = (n: ts.Node) => {
    if (
      (ts.isIdentifier(n) || ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) &&
      OPPSUMMERING.test(n.text)
    )
      funnet.push(n.text);
    ts.forEachChild(n, besoek);
  };
  besoek(fil);
  return funnet;
}

const utenEndelse = (sti: string) => sti.replace(/\.(ts|js|mjs|cjs)$/, '');

/** Det `fil` importerer: relative stier løst til absolutte uten endelse, og pakkenavn som de står. */
export function importer(fil: string, kilde: string): string[] {
  const { importedFiles } = ts.preProcessFile(kilde, true, true);
  return importedFiles.map((i) =>
    i.fileName.startsWith('.') ? utenEndelse(resolve(dirname(fil), i.fileName)) : i.fileName
  );
}

/** Importer som går ut av kjernen uten å være tillatt. */
export function utenforKjernen(fil: string, kilde: string): string[] {
  const test = fil.startsWith(TESTER + sep);
  return importer(fil, kilde).filter((i) => {
    if (i.startsWith(KJERNE + sep)) return false;
    if (!test) return true;
    if (i.startsWith('node:') || TESTPAKKER.has(i)) return false;
    return !(i.startsWith(TESTFILER) && i.endsWith('.json'));
  });
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
  const besoek = (fil: string, sti: string[]) => {
    const noekkel = utenEndelse(fil);
    if (sett.has(noekkel)) return;
    sett.add(noekkel);
    const kilde = filer.get(noekkel) ?? lesFil(noekkel);
    if (kilde === null) return;
    for (const neste of importer(fil, kilde).filter((i) => i.startsWith(ROT))) {
      if (mal.has(neste)) funnet.push([...sti, neste].map((s) => relative(ROT, s)).join(' → '));
      else besoek(`${neste}.ts`, [...sti, neste]);
    }
  };
  besoek(start, [utenEndelse(start)]);
  return funnet;
}

function lesFil(utenEnd: string): string | null {
  try {
    return readFileSync(`${utenEnd}.ts`, 'utf8');
  } catch {
    return null;
  }
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

const filer = alleFiler(KJERNE);
const regler = filer.filter((f) => !f.startsWith(TESTER + sep) && !VISNING.includes(f));

describe('kjernen er ren kode (B-14)', () => {
  it('finner kjernens moduler og testene', () => {
    const navn = filer.map((f) => relative(KJERNE, f));
    expect(navn).toEqual(
      expect.arrayContaining(['utled.ts', 'regler/frist.ts', 'tester/arkitektur.test.ts'])
    );
  });

  it.each(filer.map((f) => [relative(KJERNE, f), f] as const))(
    '%s importerer ingenting utenfor kjernen',
    (_navn, fil) => {
      expect(utenforKjernen(fil, readFileSync(fil, 'utf8'))).toEqual([]);
    }
  );

  // Et forbudt importforsøk gir feil, uansett skrivemåte. Forsøket står i
  // minnet her; feilinnføringen F11 prøver det samme i selve fila.
  it.each([
    ["import { leggTil } from '../sprakprove/server/lager.ts';", 'utled.ts'],
    ["import type { Hendelse } from '../sprakprove/kjerne/typer';", 'leser.ts'],
    ["export * from '../../src/lib/domain/fristDomain.ts';", 'regler/frist.ts'],
    ["import pg from 'pg';", 'skriving.ts'],
    ["const pg = await import('pg');", 'buffer.ts'],
    ["const { Pool } = require('pg');", 'tester/kjoerer.ts'],
    ["import { leggTil } from '../../sprakprove/server/lager.ts';", 'tester/kjoerer.ts'],
    ["import x from '../../docs/annet.json' with { type: 'json' };", 'tester/kjoerer.ts'],
  ])('oppdager %s i %s', (linje, navn) => {
    const fil = join(KJERNE, navn);
    expect(utenforKjernen(fil, `${linje}\n${readFileSync(fil, 'utf8')}`)).not.toEqual([]);
  });
});

describe('INV-MM-9: reglene leser ikke visningen', () => {
  it('finner reglene', () => {
    expect(regler.map((m) => relative(KJERNE, m))).toEqual(
      expect.arrayContaining([
        'forutsetninger.ts',
        'nyttelast.ts',
        'avvisning.ts',
        'handlinger.ts',
        'utled.ts',
        'skriving.ts',
      ])
    );
  });

  it.each(regler.map((m) => [relative(KJERNE, m), m] as const))(
    '%s når ikke visningen eller bufferen',
    (_navn, modul) => {
      expect(forbudteStier(modul, new Map(), VISNING)).toEqual([]);
    }
  );

  it.each([
    ["import { visning } from './visning.ts';"],
    ["import type { Visning } from './visning';"],
    ["export { visning } from './visning.js';"],
    ["export * from './visning.ts';"],
    ["const v = await import('./visning.ts');"],
    ["const v = require('./visning');"],
    ["import { lesSak } from './buffer.ts';"],
  ])('oppdager %s', (linje) => {
    const regel = join(KJERNE, 'forutsetninger.ts');
    const kilde = `${linje}\n${readFileSync(regel, 'utf8')}`;
    expect(forbudteStier(regel, new Map([[utenEndelse(regel), kilde]]), VISNING)).not.toEqual([]);
  });

  it('oppdager visningen gjennom en annen modul', () => {
    const regel = join(KJERNE, 'forutsetninger.ts');
    const mellom = join(KJERNE, 'mellom.ts');
    const filer = new Map([
      [utenEndelse(regel), "import { x } from './mellom.ts';"],
      [utenEndelse(mellom), "export { visning as x } from './visning.ts';"],
    ]);
    expect(forbudteStier(regel, filer, VISNING)).toEqual([
      'kjerne/forutsetninger → kjerne/mellom → kjerne/visning',
    ]);
  });
});

describe('reglene leser ingen status eller oppsummering (#308)', () => {
  it.each(regler.map((m) => [relative(KJERNE, m), m] as const))('%s', (_navn, modul) => {
    expect(statuslesing(readFileSync(modul, 'utf8'))).toEqual([]);
  });

  // Forsøket står i minnet her; feilinnføringen F15 prøver det samme i selve fila.
  it.each([
    ['if (u.avsluttet) return null;'],
    ["if (u['oppgjort']) return null;"],
    ['const { status } = beregn(u);'],
    ['if (u.grunnlagLaast) return null;'],
    ["if (kode === 'avsluttet_oppgjort') return null;"],
    ['const lukket = u.spor.grunnlag.trukket;'],
  ])('oppdager %s', (linje) => {
    const regel = join(KJERNE, 'forutsetninger.ts');
    expect(
      statuslesing(`${readFileSync(regel, 'utf8')}\nfunction f(u: any) { ${linje} }`)
    ).not.toEqual([]);
  });

  it('teller ikke kommentarer', () => {
    expect(statuslesing('// Saken er avsluttet når status er oppgjort.\nconst x = 1;')).toEqual([]);
  });
});
