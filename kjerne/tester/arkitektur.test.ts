/**
 * Grensene rundt kjernen (B-14, merknaden 09.10) og INV-MM-9.
 *
 * - Kjernen er ren kode. Ingen modul i `kjerne/` importerer fra språkprøven,
 *   frontenden, `pg` eller en annen pakke. Testene kan i tillegg bruke Vitest,
 *   TypeScript, Node og bevis-sakene i `docs/domenetabell/`.
 * - Ingen regel når visningen eller bufferen, direkte eller gjennom en annen
 *   modul. Visningen regner status og etiketter; bufferen lagrer visningen.
 * - Reglene leser bare det hvitelisten `LESBART` tillater (#308, #329,
 *   «Kontrakten først, aldri status» i CLAUDE.md). Typesjekkeren løser hver
 *   feltlesing og hver verdi importert fra en annen modul i kjernen til
 *   deklarasjonen. Det som er deklarert i kjernen, må stå i lista med en klasse:
 *   utsagn, relasjon, frosset, predikat og så videre. En status eller en annen
 *   oppsummering står ikke der, så et nytt felt eller en ny import med den gir
 *   rød test til noen har klassifisert verdien (MM-U13). Testen ser ikke
 *   lesinger gjennom refleksjon (`Object.entries`, `in`, spredning), et objekt
 *   en funksjon bygger og leser selv, en status en funksjon i samme modul
 *   regner ut og returnerer, hvilken nøkkel som leses der lista tillater `*`,
 *   eller hvilket formål en tillatt lesing har, utover avgrensningen til
 *   moduler og funksjoner.
 *
 * - Rollefilene i et spor (`spor/<spor>/<rolle>.ts`, #1783) hører til mappen rollen står
 *   for, og grensene for mappen gjelder dem. `regler/` når ikke frysingen eller teksten.
 *   Byggeklossene for postene (`spor/poster/<rolle>.ts`, #1778) er rollefiler på samme måte,
 *   og importerer bare `typer.ts`.
 *
 * Importene leses med TypeScript-parseren, ikke med et tekstsøk, så `import`,
 * `import type`, `export … from`, `import()` og `require()` teller likt, med og
 * uten filendelse.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { SPOR } from '../typer.ts';
import { DOKUMENTENE } from './lesbart/dokumentene.ts';
import { UTLEDNINGEN } from './lesbart/utledningen.ts';
import { UTREGNINGEN } from './lesbart/utregningen.ts';
import { REGELSETTET } from './lesbart/regelsettet.ts';
import { KOMMANDOENE } from './lesbart/kommandoene.ts';
import { FORMATET } from './lesbart/formatet.ts';
import { JOURNALRADEN } from './lesbart/journalraden.ts';
import { BREVTEKSTEN } from './lesbart/brevteksten.ts';
import type { Lesbar } from './lesbart/klasse.ts';

const KJERNE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROT = resolve(KJERNE, '..');
const TESTER = join(KJERNE, 'tester');

const utenEndelse = (sti: string) => sti.replace(/\.(ts|js|mjs|cjs)$/, '');

/** Rollene en fil i et spor kan ha, og mappen hver rolle hører til (#1783). */
const ROLLER = {
  format: 'format',
  frysing: 'frosset',
  tekst: 'frosset',
  utledning: 'utledning',
  visning: 'utledning',
  kommando: 'kommandoer',
} as const;
type Rolle = keyof typeof ROLLER;
/** Byggeklossene for postene i kravet og svaret per post, som sporene bruker (#1778). */
const POSTER = 'poster';
const SPORMAPPENE: readonly string[] = [...SPOR, POSTER];
const erRolle = (navn: string | undefined): navn is Rolle =>
  navn !== undefined && Object.hasOwn(ROLLER, navn);

/** Rollefilene i hvert spor og for postene, også de som ikke finnes ennå. */
const rollefilene = (...roller: Rolle[]) =>
  SPORMAPPENE.flatMap((s) => roller.map((r) => join(KJERNE, 'spor', s, `${r}.ts`)));

/**
 * Mappen `fil` hører til: mappen den står i, eller for en rollefil i et spor eller for postene
 * mappen rollen hører til. `null` for en fil utenfor kjernen eller rett i den, og for en fil i
 * `spor/` som ikke er en rollefil.
 */
export function mappenTil(fil: string): string | null {
  if (!fil.startsWith(KJERNE + sep)) return null;
  const deler = relative(KJERNE, utenEndelse(fil)).split(sep);
  if (deler[0] !== 'spor') return deler.length > 1 ? deler[0]! : null;
  const [, spor, rolle] = deler;
  return deler.length === 3 && SPORMAPPENE.includes(spor!) && erRolle(rolle) ? ROLLER[rolle] : null;
}

/** Modulene reglene ikke kan nå. */
const VISNING = [
  join(KJERNE, 'utledning', 'visning.ts'),
  join(KJERNE, 'utledning', 'buffer.ts'),
  ...rollefilene('visning'),
];
/** Pakker og filer utenfor kjernen testene kan bruke. */
const TESTPAKKER = new Set(['vitest', 'typescript']);
const TESTFILER = join(ROT, 'docs', 'domenetabell') + sep;

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
      expect.arrayContaining(['utledning/utled.ts', 'regler/frist.ts', 'tester/arkitektur.test.ts'])
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
    ["import { leggTil } from '../../sprakprove/server/lager.ts';", 'utledning/utled.ts'],
    ["import type { Hendelse } from '../../sprakprove/kjerne/typer';", 'format/leser.ts'],
    ["export * from '../../src/lib/components/varden/lesing.ts';", 'regler/frist.ts'],
    ["import pg from 'pg';", 'kommandoer/skriving.ts'],
    ["const pg = await import('pg');", 'utledning/buffer.ts'],
    ["const { Pool } = require('pg');", 'tester/kjoerer.ts'],
    ["import { leggTil } from '../../sprakprove/server/lager.ts';", 'tester/kjoerer.ts'],
    ["import x from '../../docs/annet.json' with { type: 'json' };", 'tester/kjoerer.ts'],
  ])('oppdager %s i %s', (linje, navn) => {
    const fil = join(KJERNE, navn);
    expect(utenforKjernen(fil, `${linje}\n${readFileSync(fil, 'utf8')}`)).not.toEqual([]);
  });
});

/** Importene i `fil` fra kommandoene, også fra kommandoene i et spor. */
const kommandoerI = (fil: string, kilde: string) =>
  importer(fil, kilde).filter((i) => mappenTil(i) === 'kommandoer');

// #1354: kommandoene leser utledningen, ikke omvendt.
describe('utledningen importerer ikke kommandoene (#1354)', () => {
  it.each(
    filer.filter((f) => mappenTil(f) === 'utledning').map((f) => [relative(KJERNE, f), f] as const)
  )('%s', (_navn, fil) => {
    expect(kommandoerI(fil, readFileSync(fil, 'utf8'))).toEqual([]);
  });

  it.each([
    ["import { utledJournal } from '../kommandoer/skriving.ts';", 'utledning/buffer.ts'],
    ["export type { Kommando } from '../kommandoer/kommando';", 'utledning/visning.ts'],
    ["import { standpunkter } from '../spor/vederlag/kommando.ts';", 'utledning/utled.ts'],
  ])('oppdager %s i %s', (linje, navn) => {
    const fil = join(KJERNE, navn);
    expect(kommandoerI(fil, `${linje}\n${readFileSync(fil, 'utf8')}`)).not.toEqual([]);
  });

  // #1783: rollefilene finnes ikke ennå, så forsøket er hele kilden.
  it.each([
    ["import { skriv } from '../../kommandoer/skriving.ts';", 'spor/vederlag/utledning.ts'],
    ["import { standpunkter } from './kommando';", 'spor/vederlag/visning.ts'],
    ["export * from '../frist/kommando.ts';", 'spor/vederlag/utledning.ts'],
  ])('oppdager %s i rollefila %s', (linje, navn) => {
    const fil = join(KJERNE, navn);
    expect(mappenTil(fil)).toBe('utledning');
    expect(kommandoerI(fil, linje)).not.toEqual([]);
  });
});

/** Frysingen og teksten, også i et spor. */
const FROSSET = [
  ...filer.filter((f) => f.startsWith(join(KJERNE, 'frosset') + sep)),
  ...rollefilene('frysing', 'tekst'),
];

// .claude/rules/kjerne.md, «Hvor koden hører hjemme»: en regel leser ikke en tekst.
describe('regelsettet når ikke frysingen eller teksten', () => {
  it.each(
    filer.filter((f) => mappenTil(f) === 'regler').map((f) => [relative(KJERNE, f), f] as const)
  )('%s', (_navn, modul) => {
    expect(forbudteStier(modul, new Map(), FROSSET)).toEqual([]);
  });

  it.each([
    ["import { kroner } from '../frosset/tekst.ts';"],
    ["import type { Svarinnhold } from '../frosset/standpunkt';"],
    ["import { vederlagstekst } from '../spor/vederlag/tekst.ts';"],
    ["export * from '../spor/frist/frysing';"],
  ])('oppdager %s', (linje) => {
    const regel = join(KJERNE, 'regler', 'frist.ts');
    const kilde = `${linje}\n${readFileSync(regel, 'utf8')}`;
    expect(forbudteStier(regel, new Map([[utenEndelse(regel), kilde]]), FROSSET)).not.toEqual([]);
  });

  it('oppdager teksten i et spor gjennom en annen modul', () => {
    const regel = join(KJERNE, 'regler', 'vederlag.ts');
    const format = join(KJERNE, 'spor', 'vederlag', 'format.ts');
    const filer = new Map([
      [utenEndelse(regel), "import { METODER } from '../spor/vederlag/format.ts';"],
      [utenEndelse(format), "export { METODEN as METODER } from './tekst.ts';"],
    ]);
    expect(forbudteStier(regel, filer, FROSSET)).toEqual([
      'kjerne/regler/vederlag → kjerne/spor/vederlag/format → kjerne/spor/vederlag/tekst',
    ]);
  });
});

/** Navnene på toppnivå i hver kilde som også står på toppnivå i en annen, med filene. */
function sammeNavn(kilder: Record<string, string>): string[] {
  const filene = new Map<string, string[]>();
  for (const [fil, kilde] of Object.entries(kilder))
    for (const [, navn] of kilde.matchAll(
      /^(?:export )?(?:default )?(?:declare )?(?:async )?(?:const|let|var|function\*?|type|interface|class|enum) (\w+)/gm
    ))
      filene.set(navn, [...(filene.get(navn) ?? []), fil]);
  return [...filene]
    .filter(([, f]) => new Set(f).size > 1)
    .map(([navn, f]) => `${navn}: ${f.join(' ')}`);
}

// Navneregelen i .claude/rules/kjerne.md: samme navn betyr ikke to ting i to roller i sporet.
describe('to rollefiler i et spor har ikke samme navn (#1783)', () => {
  const spor = join(KJERNE, 'spor');
  const mappene = readdirSync(spor, { withFileTypes: true }).filter((d) => d.isDirectory());
  it('finner sporene', () => {
    expect(mappene.map((d) => d.name)).toEqual(expect.arrayContaining([...SPOR]));
  });
  it.each(mappene.map((d) => d.name))('%s', (navn) => {
    const mappe = join(spor, navn);
    const kilder = Object.fromEntries(
      readdirSync(mappe)
        .filter((f) => f.endsWith('.ts'))
        .map((f) => [f, readFileSync(join(mappe, f), 'utf8')])
    );
    expect(sammeNavn(kilder)).toEqual([]);
  });

  it('finner samme navn i to rollefiler', () => {
    expect(
      sammeNavn({
        'format.ts': 'export const STANDPUNKTER_I_FRISTEN = [];',
        'kommando.ts': 'export const STANDPUNKTER_I_FRISTEN = () => [];\nfunction lokal() {}',
        'utledning.ts': 'export async function lokal() {}',
      })
    ).toEqual(['STANDPUNKTER_I_FRISTEN: format.ts kommando.ts', 'lokal: kommando.ts utledning.ts']);
  });
});

describe('et spor har bare rollefiler (#1783)', () => {
  // Alle filer, ikke bare .ts: en JSON-fil ved siden av en rollefil ville stått utenfor
  // grensene og versjonene.
  it('hver fil i spor/ er spor/<spor>/<rolle>.ts', () => {
    const spor = join(KJERNE, 'spor');
    const andre = existsSync(spor)
      ? readdirSync(spor, { recursive: true, withFileTypes: true })
          .filter((d) => d.isFile())
          .map((d) => join(d.parentPath, d.name))
          .filter((f) => !f.endsWith('.ts') || mappenTil(f) === null)
          .map((f) => relative(KJERNE, f))
      : [];
    expect(andre).toEqual([]);
  });

  it.each([
    ['spor/vederlag/frysing.ts', 'frosset'],
    ['spor/vederlag/tekst.ts', 'frosset'],
    ['spor/frist/visning.ts', 'utledning'],
    ['spor/forhold/kommando.ts', 'kommandoer'],
    ['spor/vederlag/format', 'format'],
    ['frosset/brevtekst.ts', 'frosset'],
    ['typer.ts', null],
    ['spor/vederlag/annet.ts', null],
    ['spor/vederlag/frysing/a.ts', null],
    ['spor/poster/utledning.ts', 'utledning'],
    ['spor/poster/kommando.ts', 'kommandoer'],
    ['spor/poster/annet.ts', null],
    ['spor/postene/format.ts', null],
    ['../src/kommandoer/a.ts', null],
  ])('%s hører til %s', (navn, mappe) => {
    expect(mappenTil(join(KJERNE, navn))).toBe(mappe);
  });
});

/** Importene i `fil` som ikke er `typer.ts`. */
const utenomTyper = (fil: string, kilde: string) =>
  importer(fil, kilde).filter((i) => i !== join(KJERNE, 'typer'));

// Planen i #1783 for #1778: byggeklossene for postene importerer bare `typer.ts`, så hvert spor
// kan bruke dem uten en sirkel gjennom de felles modulene.
describe('byggeklossene for postene importerer bare typer.ts (#1778)', () => {
  it.each(
    filer
      .filter((f) => f.startsWith(join(KJERNE, 'spor', POSTER) + sep))
      .map((f) => [relative(KJERNE, f), f] as const)
  )('%s', (_navn, fil) => {
    expect(utenomTyper(fil, readFileSync(fil, 'utf8'))).toEqual([]);
  });

  it.each([
    ["import type { Krav } from '../../typer.ts';", []],
    ["import { kravposterI } from '../vederlag/format.ts';", ['spor/vederlag/format']],
    ["import type { Utledning } from '../../utledning/utled';", ['utledning/utled']],
    ["export * from './kommando.ts';", ['spor/poster/kommando']],
  ])('%s gir %j', (linje, ut) => {
    const fil = join(KJERNE, 'spor', POSTER, 'utledning.ts');
    expect(utenomTyper(fil, linje).map((i) => relative(KJERNE, i))).toEqual(ut);
  });
});

describe('INV-MM-9: reglene leser ikke visningen', () => {
  it('finner reglene', () => {
    expect(regler.map((m) => relative(KJERNE, m))).toEqual(
      expect.arrayContaining([
        'kommandoer/forutsetninger.ts',
        'kommandoer/nyttelast.ts',
        'kommandoer/avvisning.ts',
        'kommandoer/handlinger.ts',
        'utledning/utled.ts',
        'kommandoer/skriving.ts',
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
    ["import { visning } from '../utledning/visning.ts';"],
    ["import type { Visning } from '../utledning/visning';"],
    ["export { visning } from '../utledning/visning.js';"],
    ["export * from '../utledning/visning.ts';"],
    ["const v = await import('../utledning/visning.ts');"],
    ["const v = require('../utledning/visning');"],
    ["import { lesSak } from '../utledning/buffer.ts';"],
    ["import { vederlagssvaret } from '../spor/vederlag/visning.ts';"],
  ])('oppdager %s', (linje) => {
    const regel = join(KJERNE, 'kommandoer', 'forutsetninger.ts');
    const kilde = `${linje}\n${readFileSync(regel, 'utf8')}`;
    expect(forbudteStier(regel, new Map([[utenEndelse(regel), kilde]]), VISNING)).not.toEqual([]);
  });

  it('oppdager visningen gjennom en annen modul', () => {
    const regel = join(KJERNE, 'kommandoer', 'forutsetninger.ts');
    const mellom = join(KJERNE, 'kommandoer', 'mellom.ts');
    const filer = new Map([
      [utenEndelse(regel), "import { x } from './mellom.ts';"],
      [utenEndelse(mellom), "export { visning as x } from '../utledning/visning.ts';"],
    ]);
    expect(forbudteStier(regel, filer, VISNING)).toEqual([
      'kjerne/kommandoer/forutsetninger → kjerne/kommandoer/mellom → kjerne/utledning/visning',
    ]);
  });
});

// ---------- Det reglene får lese (#308, #329) ----------

/**
 * Det reglene får lese: `[eier, klasse, felt, steder]`, med feltene skilt med
 * mellomrom. Eieren er typen, konstanten eller modulen feltet er deklarert i,
 * med stien gjennom nestede typer. En lesing fra en verdi uten type, som
 * `Record<string, unknown>`, har det typede feltet den kommer fra som eier, som
 * `Svar.utregning`, eller funksjonen og parameteren, som `standpunkterISvaret(svar)`.
 * `*` er en lesing med en nøkkel som regnes ut, og tillater alle nøkler. Er
 * `steder` oppgitt, får bare de modulene eller funksjonene (`modul:navn`) lese
 * feltene.
 *
 * Radene står i `lesbart/`, i én fil per område i kjernen, og klassene i
 * `lesbart/klasse.ts`. Legger du til et felt reglene leser, klassifiserer du det i fila for
 * området som leser det. Søk først etter eieren og feltet i alle filene: en rad uten `steder`
 * tillater alle lesere, også der en annen rad har en begrensning. Hører feltet ikke til noen
 * klasse, er det en oppsummering, og regelen skal lese det feltet oppsummerer i stedet.
 */
const LESBART: Lesbar[] = [
  ...DOKUMENTENE,
  ...UTLEDNINGEN,
  ...UTREGNINGEN,
  ...REGELSETTET,
  ...KOMMANDOENE,
  ...FORMATET,
  ...JOURNALRADEN,
  ...BREVTEKSTEN,
];

/**
 * Lesinger av en samlebetegnelse som står i dag (MM-U13), med issuet som
 * fjerner dem: `[sted, nøkkel, begrunnelse]`, der stedet er funksjonen som
 * leser (`modul:navn`). Lista er lukket: den kan bare bli kortere.
 * - Forholdsfeltene i regelsettets inndata (#309: fjernes fra porten) er
 *   utfallet i forholdssporet,
 *   kopiert inn i ett svar. At hele svaret er subsidiært til forholdet, er en
 *   relasjon mellom brev som utledes ved lesing (merknaden 05.10 til B-13, MM-U9),
 *   og `utledning/utled.ts` utleder den av de frosne standpunktene.
 */
const KJENTE_AVVIK: [sted: string, noekkel: string, begrunnelse: string][] = [
  ['regler/forhold.ts:standpunkt', 'ForholdForStandpunkt.hovedkategori', '#309'],
  ['regler/forhold.ts:standpunkt', 'ForholdForStandpunkt.underkategori', '#309'],
  ['regler/forhold.ts:standpunkt', 'ForholdForStandpunkt.resultat', '#309'],
  ['regler/forhold.ts:standpunkt', 'ForholdForStandpunkt.varsletITide', '#309'],
];

/**
 * Én lesing i en regel: modulen, funksjonen (`modul:navn`), linjen og nøkkelen
 * `eier.felt` den slås opp med i `LESBART`.
 */
export interface Lesing {
  modul: string;
  funksjon: string;
  linje: number;
  noekkel: string;
}

const OPSJONER = ts.parseJsonConfigFileContent(
  ts.readConfigFile(join(KJERNE, 'tsconfig.json'), ts.sys.readFile).config,
  ts.sys,
  KJERNE
).options;

/**
 * Et TypeScript-program over `filer`, med kildeteksten i `erstatt` der den er oppgitt.
 * En fil som ikke erstattes, hentes fra `forrige`, så programmet gjenbruker den i
 * stedet for å parse og binde kjernen og `lib` på nytt (#392). `forrige` må derfor
 * være bygd uten `erstatt`.
 */
export function program(
  filer: string[],
  erstatt = new Map<string, string>(),
  forrige?: ts.Program
): ts.Program {
  const vert = ts.createCompilerHost(OPSJONER, true);
  const hent = vert.getSourceFile;
  vert.getSourceFile = (fil, spraak, ...resten) => {
    const kilde = erstatt.get(fil);
    if (kilde !== undefined) return ts.createSourceFile(fil, kilde, spraak, true);
    return forrige?.getSourceFile(fil) ?? hent(fil, spraak, ...resten);
  };
  return ts.createProgram(filer, OPSJONER, vert, forrige);
}

const modulnavn = (fil: string) => relative(KJERNE, fil).split(sep).join('/');
const iKjernen = (fil: string) => fil.startsWith(KJERNE + sep) && !fil.startsWith(TESTER + sep);

/** `n` står i funksjonen `f`, også i en funksjon inne i den. */
const iFunksjonen = (n: ts.Node | undefined, f: ts.Node): boolean =>
  n !== undefined && (n === f || iFunksjonen(n.parent, f));

/**
 * Modulen og de navngitte funksjonene `n` er eller står i, ytterst først, som
 * `format/leser.ts:standpunkterISvaret` eller `utledning/utled.ts:utled.plasser`.
 */
function funksjon(n: ts.Node): string {
  const navn: string[] = [];
  for (let p: ts.Node | undefined = n; p; p = p.parent) {
    if ((ts.isFunctionDeclaration(p) || ts.isMethodDeclaration(p)) && p.name)
      navn.unshift(p.name.getText());
    else if (
      ts.isVariableDeclaration(p) &&
      ts.isIdentifier(p.name) &&
      p.initializer &&
      (ts.isArrowFunction(p.initializer) || ts.isFunctionExpression(p.initializer))
    )
      navn.unshift(p.name.text);
  }
  return `${modulnavn(n.getSourceFile().fileName)}:${navn.join('.') || '?'}`;
}

const toppnivaa = (d: ts.Node) =>
  (ts.isFunctionDeclaration(d) || ts.isClassDeclaration(d) ? d.parent : d.parent?.parent?.parent)
    ?.kind === ts.SyntaxKind.SourceFile;

/** Navnene på typene og konstantene som er deklarert på toppnivå i modulen. */
function toppnivaanavn(sf: ts.SourceFile): string[] {
  return sf.statements.flatMap((s) => {
    if (
      (ts.isInterfaceDeclaration(s) || ts.isTypeAliasDeclaration(s) || ts.isClassDeclaration(s)) &&
      s.name
    )
      return [s.name.text];
    if (ts.isVariableStatement(s))
      return s.declarationList.declarations.flatMap((d) =>
        ts.isIdentifier(d.name) ? [d.name.text] : []
      );
    return [];
  });
}

/**
 * Typene og konstantene som er deklarert på toppnivå i mer enn én modul i kjernen. Utenfor
 * `typer.ts` slås de opp med modulen foran navnet, som `regler/forhold.ts:Standpunkt`, så to
 * med samme navn ikke deler radene i `LESBART` (#1711, #1713). Navnet i `typer.ts` beholdes.
 */
function kolliderendeNavn(p: ts.Program): Set<string> {
  const moduler = new Map<string, Set<string>>();
  for (const sf of p.getSourceFiles()) {
    if (!iKjernen(sf.fileName)) continue;
    for (const navn of toppnivaanavn(sf))
      moduler.set(navn, (moduler.get(navn) ?? new Set()).add(sf.fileName));
  }
  return new Set([...moduler].filter(([, m]) => m.size > 1).map(([navn]) => navn));
}

/** Navnet på typen eller konstanten `n`, med modulen foran når navnet kolliderer. */
function kvalifisert(n: ts.Node, navn: string, kolliderende: Set<string>): string {
  const modul = modulnavn(n.getSourceFile().fileName);
  return kolliderende.has(navn) && modul !== 'typer.ts' ? `${modul}:${navn}` : navn;
}

/**
 * Eieren til deklarasjonen `d`: typen eller konstanten, med stien gjennom
 * nestede typer, modulen for en funksjon eller konstant på toppnivå, eller
 * funksjonen for en type eller et objekt som står i en funksjon. `null` når `d`
 * er et felt i et objekt som bygges i funksjonen det leses i. En type eller konstant utenfor
 * `typer.ts` med samme navn som en i en annen modul får modulen foran navnet (`kolliderende`).
 */
function eier(d: ts.Declaration, lesested: ts.Node, kolliderende: Set<string>): string | null {
  if (
    (ts.isFunctionDeclaration(d) || ts.isVariableDeclaration(d) || ts.isClassDeclaration(d)) &&
    toppnivaa(d)
  )
    return modulnavn(d.getSourceFile().fileName);
  const sti: string[] = [];
  let bygget = false;
  for (let n: ts.Node | undefined = d.parent; n; n = n.parent) {
    if (ts.isPropertySignature(n) || ts.isPropertyAssignment(n))
      sti.unshift(ts.isIdentifier(n.name) || ts.isStringLiteral(n.name) ? n.name.text : '?');
    else if (ts.isObjectLiteralExpression(n)) bygget = true;
    else if (
      ts.isInterfaceDeclaration(n) ||
      ts.isTypeAliasDeclaration(n) ||
      ts.isClassDeclaration(n)
    ) {
      return [kvalifisert(n, n.name?.text ?? '?', kolliderende), ...sti].join('.');
    } else if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && toppnivaa(n))
      return [kvalifisert(n, n.name.text, kolliderende), ...sti].join('.');
    else if (ts.isFunctionLike(n))
      return bygget && iFunksjonen(lesested, n) ? null : [funksjon(n), ...sti].join('.');
  }
  return '?';
}

const utenType = (t: ts.Type) => (t.flags & (ts.TypeFlags.Unknown | ts.TypeFlags.Any)) !== 0;

/** Lesingene i `moduler`, med nøkkelen hver slås opp med i `LESBART`. */
export function lesinger(p: ts.Program, moduler: string[]): Lesing[] {
  const tc = p.getTypeChecker();
  const kolliderende = kolliderendeNavn(p);
  const ut: Lesing[] = [];
  for (const fil of moduler) {
    const sf = p.getSourceFile(fil);
    if (!sf) throw new Error(`${fil} er ikke i programmet`);
    const legg = (n: ts.Node, noekkel: string | null) => {
      if (noekkel !== null)
        ut.push({
          modul: modulnavn(fil),
          funksjon: funksjon(n),
          linje: sf.getLineAndCharacterOfPosition(n.getStart()).line + 1,
          noekkel,
        });
    };
    /** `e` er en konstant med et objekt som bygges i en funksjon `lesested` står i. */
    const lokaltObjekt = (e: ts.Expression, lesested: ts.Node): boolean => {
      const d = ts.isIdentifier(e) ? tc.getSymbolAtLocation(e)?.valueDeclaration : undefined;
      if (!d || !ts.isVariableDeclaration(d) || !d.initializer) return false;
      if (!ts.isObjectLiteralExpression(d.initializer)) return false;
      for (let f: ts.Node | undefined = d.parent; f; f = f.parent)
        if (ts.isFunctionLike(f)) return iFunksjonen(lesested, f);
      return false;
    };
    /** Eieren til en verdi uten type: feltet den er lest fra, eller funksjonen og navnet. */
    const opphav = (e: ts.Expression): string => {
      for (;;) {
        if (
          ts.isParenthesizedExpression(e) ||
          ts.isAsExpression(e) ||
          ts.isNonNullExpression(e) ||
          ts.isSatisfiesExpression(e)
        )
          e = e.expression;
        else if (
          ts.isBinaryExpression(e) &&
          (e.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
            e.operatorToken.kind === ts.SyntaxKind.BarBarToken)
        )
          e = e.left;
        else break;
      }
      if (ts.isPropertyAccessExpression(e))
        return felt(e, e.name.text, tc.getSymbolAtLocation(e.name), e.expression) ?? '?';
      if (ts.isElementAccessExpression(e)) return elementer(e)[0] ?? '?';
      if (ts.isIdentifier(e)) {
        const s = tc.getSymbolAtLocation(e);
        const d = (s && s.flags & ts.SymbolFlags.Alias ? tc.getAliasedSymbol(s) : s)
          ?.valueDeclaration;
        if (
          d &&
          ts.isVariableDeclaration(d) &&
          d.initializer &&
          !ts.isObjectLiteralExpression(d.initializer) &&
          !ts.isCallExpression(d.initializer)
        )
          return opphav(d.initializer);
        if (d && ts.isVariableDeclaration(d) && toppnivaa(d))
          return `${modulnavn(d.getSourceFile().fileName)}.${e.text}`;
        if (d) return `${funksjon(d)}(${e.text})`;
      }
      return `${funksjon(e)}(${e.getText()})`;
    };
    /**
     * Nøkkelen til lesingen av `navn` i `n`, eller `null` når den ikke er av noe
     * kjernen har deklarert, som `length` eller `find`. `kilde` er uttrykket
     * verdien leses fra.
     */
    const felt = (
      n: ts.Node,
      navn: string,
      symbol: ts.Symbol | undefined,
      kilde: ts.Expression | null
    ): string | null => {
      const deklarasjoner = symbol?.declarations ?? [];
      const d = deklarasjoner.find((x) => iKjernen(x.getSourceFile().fileName));
      if (d) {
        const e = eier(d, n, kolliderende);
        return e === null ? null : `${e}.${navn}`;
      }
      // Et felt utenfor kjernen, som `length`, eller en av de faste nøklene i en
      // `Record`, som `u.spor.forhold`. Verdien har en type og leses videre med navn.
      if (deklarasjoner.length || (symbol && !utenType(tc.getTypeAtLocation(n)))) return null;
      // Bare et oppslag med navn i et objekt er en lesing av et felt, ikke et
      // element i en liste eller et tegn i en streng.
      const t = kilde && tc.getNonNullableType(tc.getTypeAtLocation(kilde));
      if (t && !utenType(t) && !tc.getIndexInfoOfType(t, ts.IndexKind.String)) return null;
      if (kilde && lokaltObjekt(kilde, n)) return null;
      return `${kilde ? opphav(kilde) : `${funksjon(n)}(?)`}.${navn}`;
    };
    /** Nøklene til `a[k]`: navnet når nøkkelen er en streng eller en union av strenger, ellers `*`. */
    const elementer = (n: ts.ElementAccessExpression): (string | null)[] => {
      const t = tc.getTypeAtLocation(n.argumentExpression);
      const navn = (t.isUnion() ? t.types : [t]).map((x) => (x.isStringLiteral() ? x.value : null));
      return (navn.every((x) => x !== null) ? navn : ['*']).map((x) =>
        felt(n, x, tc.getTypeAtLocation(n.expression).getProperty(x), n.expression)
      );
    };
    /** Feltene `mønster` leser fra `kilde`, i `const { a } = kilde` og `({ a } = kilde)`. */
    const destrukturering = (
      moenster: ts.ObjectBindingPattern | ts.ObjectLiteralExpression,
      kilde: ts.Expression | null
    ) => {
      const type = kilde ? tc.getTypeAtLocation(kilde) : tc.getTypeAtLocation(moenster);
      const elementer = ts.isObjectBindingPattern(moenster)
        ? moenster.elements.map((e) => [e, e.propertyName ?? e.name] as const)
        : moenster.properties.map((e) => [e, e.name] as const);
      for (const [e, navnenode] of elementer) {
        if (!navnenode || !(ts.isIdentifier(navnenode) || ts.isStringLiteral(navnenode))) continue;
        const navn = navnenode.text;
        legg(e, felt(e, navn, type.getProperty(navn), kilde));
      }
    };
    const skrives = (n: ts.Node) =>
      ts.isBinaryExpression(n.parent) &&
      n.parent.left === n &&
      n.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken;
    /** `n` er et mønster inne i et annet mønster i en tilordning, eller i `for (… of …)`. */
    const indreMoenster = (n: ts.Node): boolean => {
      let c = n;
      for (;;) {
        const p = c.parent;
        if (ts.isPropertyAssignment(p) && p.initializer === c) c = p.parent;
        else if (
          ts.isArrayLiteralExpression(p) ||
          ts.isSpreadElement(p) ||
          ts.isSpreadAssignment(p) ||
          ts.isParenthesizedExpression(p)
        )
          c = p;
        else break;
      }
      const l = c.parent;
      return (
        (c !== n && skrives(c)) ||
        ((ts.isForOfStatement(l) || ts.isForInStatement(l)) && l.initializer === c)
      );
    };
    /**
     * Nøkkelen til en importert verdi fra kjernen som `n` bruker, eller `null` når
     * `n` ikke er en slik bruk. Importen selv, en typeimport og en kortform i et
     * objekt (`{ x }`) skilles ut.
     */
    const importertVerdi = (n: ts.Identifier): string | null => {
      const p = n.parent;
      if (ts.isImportSpecifier(p) || ts.isImportClause(p) || ts.isNamespaceImport(p)) return null;
      // En lokal videreeksport (`export { x }`) er en bruk av importen.
      const lokalEksport =
        ts.isExportSpecifier(p) &&
        !p.parent.parent.moduleSpecifier &&
        (p.propertyName ?? p.name) === n;
      if (ts.isExportSpecifier(p) && !lokalEksport) return null;
      const s = ts.isShorthandPropertyAssignment(p)
        ? tc.getShorthandAssignmentValueSymbol(p)
        : lokalEksport
          ? tc.getExportSpecifierLocalTargetSymbol(p)
          : tc.getSymbolAtLocation(n);
      if (!s || !(s.flags & ts.SymbolFlags.Alias)) return null;
      const imp = s.declarations?.[0];
      if (!imp) return null;
      let navn: string;
      if (ts.isImportSpecifier(imp) && !imp.isTypeOnly && !imp.parent.parent.isTypeOnly)
        navn = (imp.propertyName ?? imp.name).getText();
      else if (ts.isImportClause(imp) && !imp.isTypeOnly) navn = 'default';
      else return null;
      const d = tc.getAliasedSymbol(s).declarations?.[0];
      if (!d || !iKjernen(d.getSourceFile().fileName)) return null;
      return `${modulnavn(d.getSourceFile().fileName)}.${navn}`;
    };
    const besoek = (n: ts.Node) => {
      if (ts.isPropertyAccessExpression(n) && !skrives(n))
        legg(n, felt(n, n.name.text, tc.getSymbolAtLocation(n.name), n.expression));
      else if (ts.isElementAccessExpression(n) && !skrives(n))
        for (const k of elementer(n)) legg(n, k);
      else if (ts.isObjectBindingPattern(n))
        destrukturering(
          n,
          ts.isVariableDeclaration(n.parent) && n.parent.initializer ? n.parent.initializer : null
        );
      else if (ts.isObjectLiteralExpression(n) && skrives(n))
        destrukturering(n, (n.parent as ts.BinaryExpression).right);
      // Typen til et indre mønster i en tilordning løses ikke, så hvert felt
      // får en eier uten oppføring i LESBART.
      else if (ts.isObjectLiteralExpression(n) && indreMoenster(n))
        for (const e of n.properties) legg(e, `${funksjon(e)}(?).${e.name?.getText() ?? '?'}`);
      else if (ts.isIdentifier(n)) {
        // En importert verdi registreres der den brukes, så den kan avgrenses til
        // funksjonen som bruker den (#344), ikke bare til modulen med importen.
        const noekkel = importertVerdi(n);
        if (noekkel !== null) legg(n, noekkel);
      }
      ts.forEachChild(n, besoek);
    };
    besoek(sf);
  }
  return ut;
}

/** Lesingene `LESBART` ikke tillater, utenom de kjente avvikene. */
export function ikkeTillatt(l: Lesing[]): Lesing[] {
  return l.filter(
    ({ modul, funksjon, noekkel }) =>
      !KJENTE_AVVIK.some(([sted, k]) => (sted === modul || sted === funksjon) && k === noekkel) &&
      !LESBART.some(
        ([eier, , felt, steder]) =>
          felt.split(/\s+/).some((f) => `${eier}.${f}` === noekkel) &&
          (!steder || steder.includes(modul) || steder.includes(funksjon))
      )
  );
}

const vis = (l: Lesing[]) => l.map((x) => `${x.modul}:${x.linje} ${x.noekkel}`);
const kjernefiler = filer.filter((f) => !f.startsWith(TESTER + sep));
const kjerneprogram = program(kjernefiler);
const alleLesinger = lesinger(kjerneprogram, regler);

describe('reglene leser bare det LESBART tillater (#308, #329)', () => {
  it.each(regler.map((m) => [modulnavn(m)] as const))('%s', (navn) => {
    expect(vis(ikkeTillatt(alleLesinger.filter((l) => l.modul === navn)))).toEqual([]);
  });

  it('to typer med samme navn i ulike moduler slås opp hver for seg (#1711)', () => {
    const eiere = new Set(alleLesinger.map((l) => l.noekkel.replace(/\.[^.]+$/, '')));
    expect(eiere).toContain('utledning/utled.ts:Element');
    expect(eiere).toContain('frosset/brevdeler.ts:Element');
    expect(eiere).not.toContain('Element');
  });

  it('LESBART har ingen felt som ikke leses', () => {
    const lest = new Set(alleLesinger.map((l) => l.noekkel));
    const ubrukt = LESBART.flatMap(([eier, , felt]) =>
      felt.split(/\s+/).map((f) => `${eier}.${f}`)
    ).filter((k) => !lest.has(k));
    expect(ubrukt).toEqual([]);
  });

  it('LESBART har ingen sted som ikke leser feltene', () => {
    const ubrukt = LESBART.flatMap(([eier, , felt, steder]) =>
      (steder ?? [])
        .filter(
          (sted) =>
            !alleLesinger.some(
              (l) =>
                (l.modul === sted || l.funksjon === sted) &&
                felt.split(/\s+/).some((f) => l.noekkel === `${eier}.${f}`)
            )
        )
        .map((sted) => `${eier} ${sted}`)
    );
    expect(ubrukt).toEqual([]);
  });

  it('de kjente avvikene leses fortsatt, og står ikke i LESBART', () => {
    for (const [sted, noekkel] of KJENTE_AVVIK) {
      expect(
        alleLesinger.some((l) => (l.modul === sted || l.funksjon === sted) && l.noekkel === noekkel)
      ).toBe(true);
      expect(
        LESBART.some(
          ([eier, , felt]) =>
            noekkel.startsWith(`${eier}.`) &&
            felt.split(/\s+/).includes(noekkel.slice(eier.length + 1))
        )
      ).toBe(false);
    }
  });

  // Lista under er låsen: et nytt avvik må føres begge steder, og det er meningen.
  it('de kjente avvikene er bare forholdsfeltene i regelsettet (#309)', () => {
    const lukket = new Set([
      'regler/forhold.ts:standpunkt ForholdForStandpunkt.hovedkategori',
      'regler/forhold.ts:standpunkt ForholdForStandpunkt.underkategori',
      'regler/forhold.ts:standpunkt ForholdForStandpunkt.resultat',
      'regler/forhold.ts:standpunkt ForholdForStandpunkt.varsletITide',
    ]);
    expect(KJENTE_AVVIK.map(([sted, k]) => `${sted} ${k}`).filter((x) => !lukket.has(x))).toEqual(
      []
    );
  });

  it('finner lesingene i reglene', () => {
    expect(alleLesinger.map((l) => l.noekkel)).toEqual(
      expect.arrayContaining([
        'Utledning.forholdAvvist',
        'Sporutledning.enighet',
        'Svar.beslutningsgrunnlag',
        'spor/forhold/utledning.ts.trekkAvPaaberopelsenErSperret',
        'Fristrad.resultat',
      ])
    );
  });

  const forutsetninger = join(KJERNE, 'kommandoer', 'forutsetninger.ts');
  const utled = join(KJERNE, 'utledning', 'utled.ts');
  const utledningIForholdet = join(KJERNE, 'spor', 'forhold', 'utledning.ts');
  const leser = join(KJERNE, 'format', 'leser.ts');
  const standpunkt = join(KJERNE, 'frosset', 'standpunkt.ts');
  /** Kode som legges til sist i en fil, så forsøkene ikke avhenger av teksten feilinnføringene endrer. */
  type Tillegg = [fil: string, kode: string];
  /** Lesingene LESBART ikke tillater i `modul` når `tillegg` er lagt til i kildene. */
  const medTillegg = (modul: string, tillegg: Tillegg[]) => {
    const erstatt = new Map<string, string>();
    for (const [fil, kode] of tillegg)
      erstatt.set(fil, `${erstatt.get(fil) ?? readFileSync(fil, 'utf8')}\n${kode}\n`);
    const p = program(kjernefiler, erstatt, kjerneprogram);
    return vis(ikkeTillatt(lesinger(p, [modul])));
  };
  const ferdig: Tillegg = [utled, 'export interface Utledning {\n  ferdig: boolean;\n}'];
  const regel = (kode: string): Tillegg => [
    forutsetninger,
    `export function proeve(u: Utledning) {\n${kode}\n}`,
  ];
  const iLeseren = (kode: string): Tillegg => [
    leser,
    `export function proeve(h: Journalrad) {\n  const data = h.data;\n${kode}\n}`,
  ];

  // Forsøkene står i minnet her; feilinnføringene F15 og F48 prøver to av dem i selve filene.
  it.each<[string, string, Tillegg[], string]>([
    [
      'et nytt felt i utledningen',
      forutsetninger,
      [ferdig, regel('return u.ferdig;')],
      'Utledning.ferdig',
    ],
    [
      'et nytt felt med oppslag',
      forutsetninger,
      [ferdig, regel("return u['ferdig'];")],
      'Utledning.ferdig',
    ],
    [
      'et nytt felt med en konstant nøkkel',
      forutsetninger,
      [ferdig, regel("const k = 'ferdig' as const;\nreturn u[k];")],
      'Utledning.ferdig',
    ],
    [
      'et nytt felt, destrukturert',
      forutsetninger,
      [ferdig, regel('const { ferdig } = u;\nreturn ferdig;')],
      'Utledning.ferdig',
    ],
    [
      'et nytt felt, destrukturert i en tilordning',
      forutsetninger,
      [ferdig, regel('let ferdig = false;\n({ ferdig } = u);\nreturn ferdig;')],
      'Utledning.ferdig',
    ],
    [
      'en funksjon som oppsummerer saken',
      forutsetninger,
      [
        [utled, 'export const sakensStatus = (u: Utledning) => u.versjon;'],
        [
          forutsetninger,
          "import { sakensStatus } from '../utledning/utled.ts';\nexport const proeve = sakensStatus;",
        ],
      ],
      'utledning/utled.ts.sakensStatus',
    ],
    [
      'et objekt en annen funksjon bygger',
      utled,
      [
        [
          utled,
          'function oppsum(u: Utledning) {\n  return { avsluttet: u.frafalt };\n}\nexport const proeve = (u: Utledning) => oppsum(u).avsluttet;',
        ],
      ],
      'utledning/utled.ts:oppsum.avsluttet',
    ],
    [
      'et felt uten type',
      forutsetninger,
      [regel('return (u as any).avsluttet;')],
      'kommandoer/forutsetninger.ts:proeve(u).avsluttet',
    ],
    [
      'et felt uten type, destrukturert',
      forutsetninger,
      [regel('const { avsluttet } = u as any;\nreturn avsluttet;')],
      'kommandoer/forutsetninger.ts:proeve(u).avsluttet',
    ],
    [
      'et felt i en type regelen selv skriver',
      forutsetninger,
      [regel('return (u as Utledning & { oppgjort: boolean }).oppgjort;')],
      'kommandoer/forutsetninger.ts:proeve.oppgjort',
    ],
    [
      'en parameter med samme navn som en tillatt',
      forutsetninger,
      [[forutsetninger, 'export const kontroller = (v: Record<string, unknown>) => v.status;']],
      'kommandoer/forutsetninger.ts:kontroller(v).status',
    ],
    [
      'det lagrede utfallet i et svar',
      forutsetninger,
      [regel('return u.spor.frist.gjeldendeSvar?.utregning.resultat;')],
      'Svar.utregning.resultat',
    ],
    [
      'journalraden utenfor leseren og skrivingen',
      forutsetninger,
      [
        [forutsetninger, "import type { Journalrad } from '../typer.ts';"],
        regel('return (u.journal.at(-1) as unknown as Journalrad).data;'),
      ],
      'Journalrad.data',
    ],
    ['journalen i utledningen', forutsetninger, [regel('return u.journal;')], 'Utledning.journal'],
    [
      '«avklart» utenfor utledningen (MM-U13)',
      forutsetninger,
      [regel('return u.forholdAvklart;')],
      'Utledning.forholdAvklart',
    ],
    [
      'det frosne svaret lest utenfor godkjennerHeleKravet',
      standpunkt,
      [[standpunkt, 'export const proeve = (svar: Svarinnhold) => svar.utregning.resultat;']],
      'Svar.utregning.resultat',
    ],
    [
      'det frosne svaret i en indre funksjon med samme navn',
      standpunkt,
      [
        [
          standpunkt,
          'export function proeve(svar: Svarinnhold) {\n  const godkjennerHeleKravet = () => svar.utregning.resultat;\n  return godkjennerHeleKravet();\n}',
        ],
      ],
      'Svar.utregning.resultat',
    ],
    [
      '«avklart» etter GR-U7 utenfor utledningen (MM-U13)',
      forutsetninger,
      [
        [
          forutsetninger,
          "import { forholdetErAvklart } from '../spor/forhold/frysing.ts';\nexport const proeve = forholdetErAvklart;",
        ],
      ],
      'spor/forhold/frysing.ts.forholdetErAvklart',
    ],
    [
      '§ 31.3 utenfor sperren mot trekk (KA-U14)',
      forutsetninger,
      [regel('return u.endringsordre;')],
      'Utledning.endringsordre',
    ],
    [
      '§ 31.3 i en annen funksjon i utledningen (KA-U14)',
      utled,
      [[utled, 'export const proeve = (u: Utledning) => u.endringsordre;']],
      'Utledning.endringsordre',
    ],
    [
      '«avklart» etter GR-U7 importert i en annen funksjon i utledningen (#344)',
      utledningIForholdet,
      [
        [
          utledningIForholdet,
          'export const proeve = (s: Svar, v: Parameters<typeof forholdetErAvklart>[1]) =>\n  forholdetErAvklart(s, v);',
        ],
      ],
      'spor/forhold/frysing.ts.forholdetErAvklart',
    ],
    [
      '«avklart» etter GR-U7 videreeksportert fra en regel (#344)',
      forutsetninger,
      [
        [
          forutsetninger,
          "import { forholdetErAvklart } from '../spor/forhold/frysing.ts';\nexport { forholdetErAvklart };",
        ],
      ],
      'spor/forhold/frysing.ts.forholdetErAvklart',
    ],
    [
      '«avklart» i en annen funksjon i utledningen',
      utled,
      [[utled, 'export const proeve = (u: Utledning) => u.forholdAvklart;']],
      'Utledning.forholdAvklart',
    ],
    [
      'et paaberopelsesfelt i en ny funksjon i samme modul som et kjent avvik',
      join(KJERNE, 'regler', 'forhold.ts'),
      [
        [
          join(KJERNE, 'regler', 'forhold.ts'),
          'export const proeve = (k: ForholdForStandpunkt) => k.varsletITide;',
        ],
      ],
      'ForholdForStandpunkt.varsletITide',
    ],
    [
      'klientens utregning utenfor nyttelastkontrollen',
      forutsetninger,
      [
        [forutsetninger, "import type { Svarutkast } from './kommando.ts';"],
        [forutsetninger, 'export const proeve = (s: Svarutkast) => s.resultat;'],
      ],
      'Svarutkast.resultat',
    ],
    [
      'et paaberopelsesfelt i en annen del av regelsettet enn de kjente avvikene',
      join(KJERNE, 'regler', 'vederlag.ts'),
      [
        [
          join(KJERNE, 'regler', 'vederlag.ts'),
          "import type { ForholdForStandpunkt } from './forhold.ts';\nexport const proeve = (k: ForholdForStandpunkt) => k.hovedkategori;",
        ],
      ],
      'ForholdForStandpunkt.hovedkategori',
    ],
    [
      'utfallet i en annen regel enn de kjente avvikene',
      forutsetninger,
      [regel('return u.spor.forhold.enighet?.grunnlag.utfall;')],
      'Enighetsgrunnlag.utfall',
    ],
    [
      'et felt i en Record med type',
      forutsetninger,
      [regel('return (u as unknown as Record<string, boolean>).avsluttet;')],
      'kommandoer/forutsetninger.ts:proeve(u).avsluttet',
    ],
    [
      'en standardimport',
      forutsetninger,
      [
        [utled, 'export default function sakensStatus(u: Utledning) {\n  return u.versjon;\n}'],
        [
          forutsetninger,
          "import sakensStatus from '../utledning/utled.ts';\nexport const proeve = sakensStatus;",
        ],
      ],
      'utledning/utled.ts.default',
    ],
    [
      'et nytt felt, destrukturert i flere ledd',
      forutsetninger,
      [
        ferdig,
        regel(
          'const { spor: { frist: { ferdig } } } = u as unknown as { spor: { frist: Utledning } };\nreturn ferdig;'
        ),
      ],
      'Utledning.ferdig',
    ],
    [
      'et nytt felt, destrukturert i flere ledd i en tilordning',
      forutsetninger,
      [ferdig, regel('let ferdig;\n({ spor: { frist: { ferdig } } } = u as any);\nreturn ferdig;')],
      'kommandoer/forutsetninger.ts:proeve(?).ferdig',
    ],
    [
      'et nytt felt, destrukturert i for … of',
      forutsetninger,
      [ferdig, regel('let ferdig;\nfor ({ ferdig } of [u]);\nreturn ferdig;')],
      'kommandoer/forutsetninger.ts:proeve(?).ferdig',
    ],
    [
      'en statuskode i journalraden med en Record med type',
      leser,
      [iLeseren('  return (data as Record<string, string>).overordnet_status;')],
      'Journalrad.data.overordnet_status',
    ],
    [
      'en statuskode i journalraden',
      leser,
      [iLeseren("  return data.overordnet_status === 'AVSLATT_AKSEPTERT';")],
      'Journalrad.data.overordnet_status',
    ],
    [
      'en statuskode i journalraden, destrukturert',
      leser,
      [iLeseren('  const { overordnet_status } = data;\n  return overordnet_status;')],
      'Journalrad.data.overordnet_status',
    ],
    [
      'en statuskode i journalraden med en konstant nøkkel',
      leser,
      [iLeseren("  const k = 'overordnet_status';\n  return data[k];")],
      'Journalrad.data.overordnet_status',
    ],
  ])('oppdager %s', (_navn, modul, tillegg, noekkel) => {
    expect(medTillegg(modul, tillegg).map((f) => f.split(' ')[1])).toContain(noekkel);
  });

  it('to konstanter med samme navn i ulike moduler slås opp hver for seg (#1713)', () => {
    const tabell = 'export const PROEVETABELL = { a: { felt: 1 } };';
    const funnet = medTillegg(forutsetninger, [
      [leser, tabell],
      [standpunkt, tabell],
      [forutsetninger, "import { PROEVETABELL } from '../format/leser.ts';"],
      regel('return PROEVETABELL.a.felt;'),
    ]).map((f) => f.split(' ')[1]);
    expect(funnet).toContain('format/leser.ts:PROEVETABELL.a.felt');
    expect(funnet).not.toContain('PROEVETABELL.a.felt');
  });
});
