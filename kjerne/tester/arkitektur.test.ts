/**
 * Grensene rundt kjernen (B-14, merknaden 09.10) og INV-MM-9.
 *
 * - Kjernen er ren kode. Ingen modul i `kjerne/` importerer fra språkprøven,
 *   frontenden, `pg` eller en annen pakke. Testene kan i tillegg bruke Vitest,
 *   TypeScript, Node og bevis-sakene i `docs/domenetabell/`.
 * - Ingen regel når visningen eller bufferen, direkte eller gjennom en annen
 *   modul. Visningen regner status og etiketter; bufferen lagrer visningen.
 * - Reglene leser bare det hvitelisten `LESBART` tillater (#308, #329,
 *   «Kontrakten først, aldri status» i AGENTS.md). Typesjekkeren løser hver
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
import { SPOR, type Spor } from '../typer.ts';

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
const erRolle = (navn: string | undefined): navn is Rolle =>
  navn !== undefined && Object.hasOwn(ROLLER, navn);

/** Rollefilene i hvert spor, også de som ikke finnes ennå. */
const rollefilene = (...roller: Rolle[]) =>
  SPOR.flatMap((s) => roller.map((r) => join(KJERNE, 'spor', s, `${r}.ts`)));

/**
 * Mappen `fil` hører til: mappen den står i, eller for en rollefil i et spor mappen rollen
 * hører til. `null` for en fil utenfor kjernen eller rett i den, og for en fil i `spor/` som
 * ikke er en rollefil.
 */
export function mappenTil(fil: string): string | null {
  if (!fil.startsWith(KJERNE + sep)) return null;
  const deler = relative(KJERNE, utenEndelse(fil)).split(sep);
  if (deler[0] !== 'spor') return deler.length > 1 ? deler[0]! : null;
  const [, spor, rolle] = deler;
  return deler.length === 3 && SPOR.includes(spor as Spor) && erRolle(rolle) ? ROLLER[rolle] : null;
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
    ["export * from '../../src/lib/domain/fristDomain.ts';", 'regler/frist.ts'],
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
    ['spor/poster/tekst.ts', null],
    ['../src/kommandoer/a.ts', null],
  ])('%s hører til %s', (navn, mappe) => {
    expect(mappenTil(join(KJERNE, navn))).toBe(mappe);
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
 * Hva en verdi reglene leser, er. En oppsummering har ingen klasse: et utfall,
 * en status eller en etikett som står for flere utsagn, leses ikke av noen regel
 * («Kontrakten først, aldri status» i AGENTS.md, MM-U11, MM-U50).
 */
type Klasse =
  /** Det en part har sagt i et dokument: krav, svar, varsel, aksept, trekk, opplysning (2.2). */
  | 'utsagn'
  /** Identiteten og relasjonene mellom utsagnene: `id`, `gjelder`, `erstatter`, spor og avsender. */
  | 'relasjon'
  /** Beslutningsgrunnlaget slik brevet ble sendt (MM-U9, MM-U11 (opphevet av MM-U50)). */
  | 'frosset'
  /** Utledet av utsagnene og relasjonene, med vedtaket ved siden av (`utledning/utled.ts`, 2.6). */
  | 'predikat'
  /** Regelsettet: inndata og utdata når ett svar regnes ut av byggherrens vurderinger (B-13). */
  | 'regelsett'
  /**
   * Byggherrens frosne svar etter B-13, i serverens utregning: «godkjent eller
   * avslått, beløp eller dager» (MM-U11 (opphevet av MM-U50)). Leses bare av `godkjennerHeleKravet`,
   * når brevet fryses, og ikke av `utfall()` eller annet som kalles ved lesing.
   */
  | 'frosset svar'
  /** Kommandoen klienten sender, før den er godtatt. */
  | 'kommando'
  /** Det serveren stempler og kjernens versjoner. Klienten bestemmer ingen av dem. */
  | 'kontekst'
  /** Journalraden i lagret form. Bare leseren og skrivingen leser den. */
  | 'rad'
  /** JSON-skjemaet kommandoene kontrolleres mot. */
  | 'skjema'
  /**
   * Det brevteksten lages av og består av (LV-U2, LV-U3): utsagnene og relasjonene i
   * brevet og journalen før det, med navnene i kontrakten. Bare tekstgeneratoren og
   * skrivingen leser det, og ingen regel leser teksten.
   */
  | 'brevtekst';

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
 * Legger du til et felt reglene leser, klassifiserer du det her. Hører det ikke
 * til noen klasse, er det en oppsummering, og regelen skal lese det feltet
 * oppsummerer i stedet.
 */
const LESBART: [eier: string, klasse: Klasse, felt: string, steder?: string[]][] = [
  // Dokumentene og utsagnene i dem (typer.ts).
  ['Dokument', 'relasjon', 'avsender'],
  ['Dokument', 'utsagn', 'krav svar utsagn opplysninger'],
  // OV-U16: sporene et brev registrert som dokumentasjon hører til. Ingen regel leser dem (OV-U4).
  ['Dokument', 'relasjon', 'spor', ['format/leser.ts:dokumentasjonsbrev']],
  ['Domenehendelse', 'relasjon', 'art id versjon dokument grunn'],
  ['Krav', 'relasjon', 'id spor erstatter gjelder'],
  ['Krav', 'utsagn', 'innhold'],
  // #1707, #1711: kravinnholdet leses gjennom den typede tilgangen per spor i `format/kravinnhold.ts`.
  ['Krav.innhold', 'utsagn', 'hovedkategori underkategori dager', ['format/kravinnhold.ts']],
  [
    'Krav.innhold',
    'utsagn',
    'endringsordre paalegg_mottatt klar_over_forholdet',
    ['format/kravinnhold.ts:innholdIForholdet'],
  ],
  ['Forholdsinnhold', 'utsagn', 'hovedkategori underkategori'],
  [
    'Forholdsinnhold',
    'utsagn',
    'endringsordre',
    ['frosset/brevtekst.ts', 'kommandoer/nyttelast.ts:kategorisperre'],
  ],
  ['Fristinnhold', 'utsagn', 'dager'],
  // OV-U95 punkt 19–22 og arbeidsvalget 07.11 i domenetabellen: kravpostene i vederlagskravet, og kravpostene
  // fra forrige versjon TE trekker (KA-U56).
  [
    'Vederlagsinnhold',
    'utsagn',
    'kravposter',
    ['spor/vederlag/format.ts:innholdIVederlaget', 'spor/vederlag/format.ts:kravposterI'],
  ],
  [
    'Vederlagsinnhold',
    'utsagn',
    'trekker',
    ['spor/vederlag/format.ts:innholdIVederlaget', 'spor/vederlag/tekst.ts'],
  ],
  ['Kravpost', 'relasjon', 'id betegnelse'],
  [
    'Kravpost',
    'utsagn',
    'oppgjoersform beloep',
    ['spor/vederlag/format.ts', 'spor/vederlag/tekst.ts'],
  ],
  // VS-U49, D-16, VS-U55: om kravet er varselet for posten, eller et varsel før kravet gjelder den.
  ['Kravpost', 'utsagn', 'oppgjoersform justert', ['spor/vederlag/utledning.ts:varselhjemmel']],
  // VS-U50, VS-U54: varselet kravposten viser til, en relasjon til et varsel i saken.
  [
    'Kravpost',
    'relasjon',
    'varsel',
    [
      'spor/vederlag/utledning.ts:kravpostvarslene',
      'spor/vederlag/utledning.ts:kravpostvarseletStrider',
      'spor/vederlag/utledning.ts:kontrollerVedleggeneVedKravet',
    ],
  ],
  // KA-U54, KA-U64, KA-U68, OV-U95 punkt 5: svaret på en kravpost etter en beregningsregel.
  [
    'Kravpost',
    'utsagn',
    'oppgjoersform justert',
    ['spor/vederlag/frysing.ts', 'spor/vederlag/kommando.ts', 'spor/vederlag/utledning.ts'],
  ],
  [
    'Kravpost',
    'utsagn',
    'beskrivelse pns justert anslag kostnadsoverslag',
    ['spor/vederlag/tekst.ts'],
  ],
  // OV-U89 punkt 17: rigg og drift i forlenget byggetid, utenfor kravpostene.
  [
    'Vederlagsinnhold.saerskilt',
    'utsagn',
    'rigg_og_drift rigg_og_drift.beloep',
    ['spor/vederlag/format.ts:krevdRigg'],
  ],
  // OV-U23: posten etter § 34.1.3 annet ledd i vederlagskravet.
  ['Vederlagsinnhold', 'utsagn', 'saerskilt', ['spor/vederlag/format.ts']],
  [
    'Vederlagsinnhold.saerskilt',
    'utsagn',
    'produktivitet',
    ['spor/vederlag/format.ts:harProduktivitetspost', 'spor/vederlag/format.ts:krevdProduktivitet'],
  ],
  [
    'Vederlagsinnhold.saerskilt',
    'utsagn',
    'produktivitet.beloep',
    ['spor/vederlag/format.ts:krevdProduktivitet'],
  ],
  ['Svar', 'relasjon', 'id spor gjelder erstatter dokument paaberopelse'],
  ['Svar', 'utsagn', 'standpunkter'],
  ['Svar', 'frosset', 'beslutningsgrunnlag'],
  [
    'Svar',
    'frosset svar',
    'utregning',
    ['frosset/standpunkt.ts:fristenGodkjent', 'spor/vederlag/frysing.ts:godkjennerHeleKravet'],
  ],
  [
    'Vederlagsutregning',
    'frosset svar',
    'resultat',
    ['spor/vederlag/frysing.ts:godkjennerHeleKravet'],
  ],
  ['Fristutregning', 'frosset svar', 'resultat', ['frosset/standpunkt.ts:fristenGodkjent']],
  ['Utsagn', 'relasjon', 'id art gjelder spor'],
  ['Utsagn', 'utsagn', 'hva'],
  // OV-U5: bestemmelsen TEs varsel er gitt etter, § 33.4 eller § 34.1.2.
  ['Utsagn', 'utsagn', 'hjemmel'],
  // VS-U29: at TEs begrunnelse etter § 33.6.2 annet ledd b ikke er et svar etter annet ledd.
  ['Utsagn', 'utsagn', 'grunn'],
  ['Standpunkt', 'relasjon', 'id art gjelder'],
  [
    'Standpunkt',
    'utsagn',
    'hjemmel iTide resultat godkjent oppfylt vurdert aksepterer oensket dager godtar kreverTilbud',
  ],
  // OV-U26, OV-U31, VS-U5: posten beløpet gjelder, og beløpet etter begrensningen etter § 34.1.3.
  ['Standpunkt', 'utsagn', 'saerskilt begrenset'],
  ['Opplysning', 'relasjon', 'id hva gjelder dokument brev oppgittAv'],
  // KA-U20: sporene en merking gjelder, som partens vurdering.
  ['Opplysning', 'utsagn', 'spor'],
  ['Opplysning', 'utsagn', 'dato oppfylt'],
  ['Beslutningsgrunnlag', 'frosset', 'regelversjon virkninger sammenfall varslingsplikt'],
  ['Standpunktsvirkning', 'frosset', 'standpunkt art virkning'],

  // Utledningen (utled.ts).
  ['Utledning', 'predikat', 'forstaatt spor opplysninger forholdAvvist frafalt'],
  // § 31.3 for godkjenningen av forholdet (GR-U13, KA-U14): ja, nei eller ikke avklart,
  // utledet av opplysningene. Leses bare av sperren mot trekk (OV-U6).
  ['Utledning', 'predikat', 'endringsordre', ['utledning/utled.ts:trekkAvPaaberopelsenErSperret']],
  // Hvorfor saken ikke er forstått, i meldingen når kjernen ikke forstår det den skriver.
  [
    'Utledning',
    'predikat',
    'begrensninger',
    ['kommandoer/skriving.ts:skriv', 'utledning/utled.ts:utled'],
  ],
  ['Utledning.begrensninger', 'predikat', 'grunn hendelse', ['kommandoer/skriving.ts:skriv']],
  // «Avklart» etter GR-U7 brukes bare der vedtakene sier det (MM-U13): vilkåret for
  // enigheten (GR-U7) og at kravene er avgjort (KA-U11, som EO-U5 (opphevet av MM-U34) bygger på).
  [
    'Utledning',
    'predikat',
    'forholdAvklart',
    ['utledning/utled.ts:enighetensVirkning', 'utledning/utled.ts:kraveneErAvgjort'],
  ],
  ['Utledning.opplysninger', 'utsagn', 'opplysning'],
  // Hvem som sa hvert element, og hva det er (§ 5, VS-U12, KA-U20, MM-U43).
  ['Utledning', 'relasjon', 'elementer'],
  ['Utledning.elementer', 'relasjon', '*'],
  ['utledning/utled.ts:Element', 'relasjon', 'hendelse part art innsigelse registrertBrev'],
  // VS-U1, MP-U6: hva en innsigelse og en protest kan gjelde, delt av utledningen og kommandoene.
  ['utledning/utled.ts', 'relasjon', 'kanFaaInnsigelse KAN_FAA_INNSIGELSE'],
  ['utledning/utled.ts:kanFaaProtest(elementer)', 'relasjon', '*'],
  ['utledning/utled.ts:kontrollerHenvisningene(elementer)', 'relasjon', '*'],
  ['utledning/utled.ts:kontrollerSvaretPaaForesporselen(elementer)', 'relasjon', '*'],
  ['utledning/utled.ts:paaberopelser(elementer)', 'relasjon', '*'],
  // MM-U43 punkt 6: stridene ett dokument har med journalen før det.
  ['Strid', 'predikat', 'element grunn', ['utledning/utled.ts:utled']],
  [
    'Sporutledning',
    'predikat',
    'krav svar gjeldendeKrav gjeldendeSvar enighet trukket ingenKrav varsler',
  ],
  // § 33.6.2 (VS-U17, VS-U19, VS-U27): hver forespørsel og kravet eller begrunnelsen som
  // svarte, utledet av rekkefølgen i journalen, og hvordan fristkravene står til den.
  ['Sporutledning', 'relasjon', 'foresporsler'],
  // VS-U48, VS-U52: varslene etter § 34.3.3 og § 34.4, utledet av utsagnene i journalen.
  ['Sporutledning', 'relasjon', 'kravpostvarsler'],
  ['ForesporselOgSvar', 'relasjon', 'foresporsel svar medKrav'],
  ['Foresporselsrelasjon', 'relasjon', 'art gjelder'],
  ['frosset/standpunkt.ts', 'relasjon', 'svarPaaForesporsler foresporselsrelasjon'],
  ['utledning/utled.ts', 'relasjon', 'foresporselForFristsvar'],
  [
    'Utledning',
    'utsagn',
    'journal',
    [
      'utledning/utled.ts:datoenDetBleSendt',
      'utledning/utled.ts:foresporselForFristsvar',
      'utledning/utled.ts:fristkravErFremmet',
    ],
  ],
  // VS-U19: om TE har krevd dager i saken, kontrollert likt i kommandoene og utledningen.
  ['utledning/utled.ts', 'predikat', 'fristkravErFremmet', ['kommandoer/forutsetninger.ts']],
  // VS-U20, OV-U5, HF-U1, VS-U43 punkt 6: varselet en påberopelse i et nytt svar gjelder, og
  // sperren for svaret på grunnlaget med et registrert varsel etter § 32.2 (#496, #766, #1600).
  [
    'utledning/utled.ts',
    'relasjon',
    'varseletForNyttSvar',
    ['kommandoer/standpunkter.ts', 'spor/vederlag/kommando.ts', 'kommandoer/forutsetninger.ts'],
  ],
  // VS-U60: kravet som er det første varselet, når det ikke finnes et eget varsel.
  [
    'utledning/utled.ts',
    'relasjon',
    'kravSomVarsler',
    ['kommandoer/nyttelast.ts:varseletOmForholdet'],
  ],
  // VS-U38: varselet etter § 32.2 kan ikke være sendt etter påberopelsen. VS-U59: en korrigering
  // kan ikke flytte datoen i grunnlagskravet til etter et varsel om forholdet.
  [
    'utledning/utled.ts',
    'relasjon',
    'datoenDetBleSendt',
    [
      'kommandoer/nyttelast.ts:varseletEtter322',
      'kommandoer/nyttelast.ts:korrigeringEtterVarslene',
    ],
  ],
  ['utledning/utled.ts:settSubsidiaer(svar)', 'relasjon', '*'],
  ['utledning/utled.ts:forholdet(svar)', 'relasjon', '*'],
  // MM-U17, MM-U50: om svaret er registrert korrespondanse, for visningen.
  ['Utledning', 'relasjon', 'svar', ['utledning/utled.ts:vurdertVedRegistreringen']],
  ['Utledning.svar', 'relasjon', '*', ['utledning/utled.ts:vurdertVedRegistreringen']],
  ['Svarberegning', 'relasjon', 'svar'],
  ['Svarberegning', 'frosset', 'virkninger'],
  ['Enighet', 'predikat', 'grunnlag'],
  ['Enighetsgrunnlag', 'predikat', 'kilde vilkaar'],
  ['utledning/utled.ts', 'predikat', 'utled utledJournal trekkAvPaaberopelsenErSperret'],
  ['utledning/utled.ts', 'relasjon', 'paaberopelseFor'],
  ['utledning/utled.ts:paaberopelseFor', 'relasjon', 'paaberopelse'],
  // Plassen hvert element har i journalen: dokumentet og saksversjonen (4.2 i designnotatet).
  ['utledning/utled.ts:utledSporene', 'relasjon', 'hendelse versjon'],
  ['utledning/utled.ts:utledSporene.plasser', 'relasjon', 'id versjon'],
  ['utledning/utled.ts:utledSporene.registrer', 'relasjon', 'id'],

  // Utregningen av svaret (utregning.ts), standpunktene (standpunkt.ts) og det brevet fryser.
  ['frosset/utregning.ts', 'regelsett', `regnUtSvar SAMMENLIKNES likeResultatfelt utenforOmfanget`],
  ['frosset/byggeklosser.ts', 'frosset', 'prinsipalt'],
  // GR-U11 og VS-U12: passivitetsregelen gjelder der § 32.2 gjelder. KA-46: innsigelsen mot
  // varselet etter § 34.1.2 avvises der § 34.1.2 ikke gjelder kategorien.
  [
    'frosset/byggeklosser.ts',
    'regelsett',
    'gjelderVarslingsplikten hjemmelenGjelder',
    [
      'kommandoer/nyttelast.ts',
      'frosset/frysing.ts:beslutningsgrunnlag',
      'frosset/standpunkt.ts',
      'spor/vederlag/frysing.ts',
    ],
  ],
  // § 32.3 første ledd a for et brev sendt i appen, lest av beslutningsgrunnlaget (GR-U12, #351).
  [
    'frosset/standpunkt.ts',
    'frosset',
    'blirEndringsordre',
    ['utledning/utled.ts', 'frosset/frysing.ts'],
  ],
  ['frosset/byggeklosser.ts', 'utsagn', 'standpunktet'],
  // Standpunktene til oppgjørsformen etter § 34.2.2, ett per kravpost (KA-U57 (d)).
  ['frosset/standpunkt.ts', 'predikat', 'enighetsgrunnlag'],
  // Vedtaket 05.10: hvorfor svaret i sporet er subsidiært til forholdet. Brevteksten sier
  // det samme (A2).
  [
    'frosset/standpunkt.ts',
    'predikat',
    'grunnerFraForholdet',
    [
      'utledning/utled.ts:settSubsidiaer',
      'frosset/brevtekst.ts:forholdetsStandpunkter',
      'spor/vederlag/kommando.ts:lagForUtkastet',
    ],
  ],
  // OV-U32, OV-U33: lagene forholdet opptar foran sporet, som linjen etiketteres med.
  ['frosset/standpunkt.ts', 'predikat', 'lagFraForholdet', ['kommandoer/skriving.ts:frysSvarene']],
  // GR-U7 med unntaket i MM-U13: utledningen regner `forholdAvklart` og `forholdAvvist` av den.
  ['frosset/standpunkt.ts', 'predikat', 'forholdetErAvklart', ['utledning/utled.ts:forholdet']],
  // VS-U24: en egen innsigelse er en påberopelse etter § 33.4 eller § 32.2 bare mot varselet.
  ['frosset/standpunkt.ts', 'relasjon', 'innsigelsenPaaberoper', ['frosset/brevtekst.ts']],
  // OV-U4: kravene i et registrert brev er dokumentasjon (#787).
  ['frosset/standpunkt.ts', 'relasjon', 'kravetErDokumentasjon', ['utledning/utled.ts']],
  // MM-U43 punkt 8: sammenfallet stemmer med standpunktene i samme frosne brev.
  [
    'frosset/standpunkt.ts',
    'frosset',
    'sammenfallStemmer',
    ['utledning/utled.ts:kontrollerSvarene'],
  ],
  ['frosset/utregning.ts:regnUtSvar', 'utsagn', 'krav paaberopelse'],
  [
    'frosset/byggeklosser.ts',
    'regelsett',
    'avvisUkjenteFelt',
    ['frosset/utregning.ts', 'spor/vederlag/frysing.ts'],
  ],
  // #1783: det som er sporets eget i utregningen av svaret.
  ['Svarsutregning', 'regelsett', 'regnUt utenforOmfanget', ['frosset/utregning.ts']],
  ['Utregningsgrunnlag', 'utsagn', 'krav paaberopelse'],
  ['Utregningsgrunnlag', 'relasjon', 'foresporsel'],
  [
    'spor/vederlag/frysing.ts',
    'regelsett',
    'UTREGNING_I_VEDERLAGET SAMMENLIKNES_I_VEDERLAGET',
    ['frosset/utregning.ts'],
  ],
  ['frosset/utregning.ts:regnUtSvar', 'relasjon', 'foresporsel'],
  // OV-U95 punkt 19–22: kravpostene og beløpene i dem, som brevet og versjonsreglene leser,
  // og utledningen, som prøver postene i svaret mot dem (OV-U23).
  [
    'spor/vederlag/format.ts',
    'utsagn',
    'kravposterI',
    [
      // KA-U57 (c) og (d): linjen navngir kravposten når kravet har flere.
      'spor/vederlag/tekst.ts',
      'frosset/brevdeler.ts',
      'kommandoer/skriving.ts',
      'spor/vederlag/utledning.ts',
      // KA-U54, KA-U64, KA-U68: TEs oppgjørsform for standpunktene til kravposten.
      'spor/vederlag/kommando.ts',
    ],
  ],
  // KA-U64: varselet en kravpost trenger, for standpunktet til varselet i svaret.
  [
    'spor/vederlag/utledning.ts',
    'predikat',
    'varselhjemmel',
    ['spor/vederlag/kommando.ts', 'kommandoer/skriving.ts:medVarslene'],
  ],
  // KA-U57 (d), KA-U54: hjemmelen i standpunktet til oppgjørsformen etter TEs oppgjørsform.
  [
    'spor/vederlag/format.ts',
    'skjema',
    'OPPGJOERSHJEMMEL',
    ['spor/vederlag/kommando.ts', 'spor/vederlag/utledning.ts'],
  ],
  [
    'OPPGJOERSHJEMMEL',
    'skjema',
    'tilbud enhetspriser regningsarbeid',
    ['spor/vederlag/kommando.ts', 'spor/vederlag/utledning.ts'],
  ],
  ['OPPGJOERSFORM_I_HJEMMELEN', 'skjema', '34.2.2 34.3 34.4', ['spor/vederlag/format.ts']],
  // Kravposten standpunktene gjelder (KA-U57 (c) og (d)).
  ['spor/vederlag/frysing.ts:beregningsregelLag', 'relasjon', 'gjelder'],
  ['spor/vederlag/kommando.ts:innenforKravposten', 'relasjon', 'gjelder'],
  // KA-U59: til svaret per kravpost er bygget, avvises et svar på et krav med rigg og drift (#1663).
  [
    'spor/vederlag/format.ts',
    'regelsett',
    'krevdRigg',
    ['spor/vederlag/kommando.ts:hindrerSvarPaaKravet', 'spor/vederlag/tekst.ts'],
  ],
  [
    'spor/vederlag/format.ts',
    'regelsett',
    'krevdIKravposten',
    // KA-U72: en kravpost der tilbudet ikke er akseptert, regnes ikke med i beløpet.
    ['spor/vederlag/tekst.ts', 'spor/vederlag/frysing.ts', 'kommandoer/nyttelast.ts'],
  ],
  // OV-U23, OV-U26: det samlede krevde beløpet og beløpet byggherren godtar for hver post.
  ['spor/vederlag/frysing.ts', 'regelsett', 'vederlagsposter', ['spor/vederlag/kommando.ts']],
  ['spor/vederlag/format.ts', 'regelsett', 'krevdSamlet', ['kommandoer/nyttelast.ts']],
  ['spor/vederlag/frysing.ts:vederlagsposter', 'regelsett', 'godkjent gjelder saerskilt svar'],
  // KA-U57 (c) og (d), KA-U59: svaret på hver kravpost i kommandoen, lest ett sted.
  [
    'spor/vederlag/frysing.ts',
    'regelsett',
    'kravpostvurderinger',
    ['spor/vederlag/kommando.ts', 'kommandoer/nyttelast.ts'],
  ],
  ['spor/vederlag/frysing.ts:kravpostvurderinger', 'regelsett', 'post svar'],
  [
    'Kravpostvurdering',
    'utsagn',
    'gjelder vurdering godkjent_beloep aksepterer oensket_oppgjoersform krever_tilbud varslet_i_tide godtar_justering',
  ],
  ['spor/vederlag/kommando.ts:besvart', 'utsagn', 'saerskilt gjelder'],
  // OV-U32, OV-U33: plassen hvert standpunkt har i det frosne brevet, som postlisten og
  // visningen leser.
  [
    'frosset/byggeklosser.ts:plassene',
    'frosset',
    'standpunkt',
    ['spor/vederlag/frysing.ts:postlisten'],
  ],
  ['frosset/byggeklosser.ts', 'frosset', 'plassene', ['spor/vederlag/frysing.ts:postlisten']],
  // Valg 4 i #1047: postene i det frosne brevet, med beløpet etter en virksom begrensning.
  // Utfallet summerer dem; visningen leser resten av postlisten.
  [
    'spor/vederlag/frysing.ts:postlisten',
    'frosset',
    'poster',
    ['spor/vederlag/frysing.ts:prinsipaltIVederlaget'],
  ],
  [
    'Vederlagspost',
    'utsagn',
    'godkjent begrensning saerskilt gjelder',
    ['spor/vederlag/frysing.ts:prinsipaltIVederlaget'],
  ],
  // OV-U73: en kravpost med beløpet i et senere lag regnes ikke med i det prinsipale.
  ['Plass', 'frosset', 'lag', ['spor/vederlag/frysing.ts:prinsipaltIVederlaget']],
  [
    'Vederlagspost.begrensning',
    'utsagn',
    'beloep',
    ['spor/vederlag/frysing.ts:prinsipaltIVederlaget'],
  ],
  // OV-U23, OV-U24: posten etter § 34.1.3 leses ett sted, av brevet og første kjente varsel.
  [
    'spor/vederlag/format.ts',
    'regelsett',
    'krevdProduktivitet harProduktivitetspost',
    [
      'utledning/utled.ts',
      'spor/vederlag/utledning.ts',
      'spor/vederlag/frysing.ts',
      'spor/vederlag/tekst.ts',
    ],
  ],
  // #814: standpunktene og utregningen nyttelastkontrollen leste, er de brevet lagrer.
  ['Bygde', 'regelsett', 'standpunkter utregning', ['kommandoer/skriving.ts:svar']],
  ['format/kravinnhold.ts:kategori', 'utsagn', 'hovedkategori underkategori'],
  // OV-U23, OV-U95 punkt 19: kravet har kravposter i vederlagsjusteringen.
  ['spor/vederlag/format.ts', 'regelsett', 'kravposterI', ['spor/vederlag/frysing.ts']],
  [
    'Svarvurdering',
    'utsagn',
    `resultat grunnlag_varslet_i_tide hovedkrav_varslet_i_tide kravposter
     frist_varsel_ok spesifisert_krav_ok foresporsel_svar_ok dager_maatte_forstaa vilkar_oppfylt
     dager produktivitet_vurdering
     produktivitet_godkjent_beloep produktivitet_varslet_i_tide produktivitet_begrenset_beloep
     rigg_vurdering rigg_varslet_i_tide hold_tilbake`,
  ],
  // #1663, 2a-1b: kommandoens felt oversatt til postene i regelen, og feilene tilbake.
  ['spor/vederlag/frysing.ts:vederlagssvaret', 'regelsett', 'svar felt'],
  ['UgyldigVurdering', 'regelsett', 'feil', ['spor/vederlag/frysing.ts']],
  // Kontrollene av vurderingene i svaret, med feltene fra `Svarvurdering` (#1695).
  [
    'regler/svarkontroll.ts',
    'regelsett',
    'kontrollerForholdet kontrollerSpesifiseringen',
    ['frosset/utregning.ts'],
  ],
  [
    'regler/vederlag.ts',
    'regelsett',
    'kontrollerVarseletForVederlag kontrollerOppgjoersformen',
    ['spor/vederlag/frysing.ts'],
  ],
  ['regler/svarkontroll.ts:kontrollerForholdet', 'utsagn', 'resultat grunnlag_varslet_i_tide'],
  ['regler/vederlag.ts:kontrollerVarseletForVederlag', 'utsagn', 'hovedkrav_varslet_i_tide'],
  [
    'regler/vederlag.ts:kontrollerOppgjoersformen',
    'utsagn',
    'aksepterer oensket_oppgjoersform krever_tilbud varslet_i_tide godtar_justering',
  ],
  ['regler/vederlag.ts:kontrollerOppgjoersformen', 'utsagn', 'oppgjoersform justert'],
  [
    'regler/svarkontroll.ts:kontrollerSpesifiseringen',
    'utsagn',
    'spesifisert_krav_ok dager_maatte_forstaa dager',
  ],
  ['spor/vederlag/frysing.ts:utenforOmfanget(v)', 'utsagn', `hold_tilbake rigg_vurdering`],

  // Regelsettet (regler/).
  [
    'Regelsett',
    'regelsett',
    'versjon gjelderVarslingsplikten gjelderVarslingspliktenForVederlag gyldigeForholdsresultater',
  ],
  ['regler/regelsett.ts', 'regelsett', 'GJELDENDE_REGLER'],
  ['regler/beloep.ts', 'regelsett', 'beloep heleOere tilTall NULL_OERE'],
  ['regler/feil.ts', 'regelsett', 'UgyldigVurdering'],
  // #550: et beløp som ikke er et tall, avvises som en ugyldig vurdering.
  [
    'regler/beloep.ts',
    'regelsett',
    'UgyldigBeloep',
    ['kommandoer/nyttelast.ts', 'spor/vederlag/format.ts', 'regler/vederlag.ts'],
  ],
  // OV-U58: brøkdeler av øre avvises og rundes ikke av.
  [
    'regler/beloep.ts',
    'regelsett',
    'BroekdelAvOere',
    ['regler/vederlag.ts', 'kommandoer/kommando.ts'],
  ],
  [
    'regler/forhold.ts',
    'regelsett',
    'erEndringMedVarslingsplikt foersteUnderkategori gyldigeResultater',
  ],
  ['regler/frist.ts', 'regelsett', 'beregnFrist resultatAvDager'],
  [
    'regler/vederlag.ts',
    'regelsett',
    'beregnVederlag gjelderVarslingspliktenForVederlag erBeloepetGodkjentFullt',
  ],
  ['regler/vederlag.ts', 'regelsett', 'beregnGodkjentBeloep', ['spor/vederlag/frysing.ts']],
  // Vurderingen av beløpet er en av verdiene i regelsettet.
  ['regler/typer.ts', 'regelsett', 'BELOEPSVURDERINGER', ['regler/vederlag.ts']],
  [
    'Fristkrav',
    'regelsett',
    `krevd_dager varsel_type er_svar_paa_foresporsel har_innsigelse_mot_varsel
     har_tidligere_varsel_i_tide har_begrunnelse_etter_b`,
  ],
  [
    'Fristvurdering',
    'utsagn',
    'frist_varsel_ok spesifisert_krav_ok foresporsel_svar_ok vilkar_oppfylt godkjent_dager',
  ],
  [
    'Fristberegning',
    'regelsett',
    'beregnings_resultat godkjent_dager subsidiaer_resultat subsidiaer_godkjent_dager',
  ],
  [
    'regler/frist.ts:beregnSynlighet',
    'regelsett',
    'frist_varsel_ok spesifisert_krav_ok foresporsel_svar_ok',
  ],
  // Svaret per post (#1663, 2a-1b): kravposten med `gjelder`, de særskilte med `saerskilt`.
  ['Vederlagssvar', 'regelsett', 'hovedkategori poster'],
  ['Vederlagssvar', 'utsagn', 'varslet_i_tide'],
  ['Postbeloep', 'regelsett', 'krevd'],
  ['Postbeloep', 'utsagn', 'vurdering godkjent_beloep'],
  ['Kravpostsvar', 'relasjon', 'gjelder'],
  ['Kravpostsvar', 'utsagn', 'aksepterer beregningsregel'],
  ['Kravpostsvar.beregningsregel', 'utsagn', 'varselForSent justering'],
  ['Produktivitetssvar', 'regelsett', 'saerskilt'],
  ['Produktivitetssvar', 'utsagn', 'varslet_i_tide begrenset_beloep'],
  ['RiggOgDriftsvar', 'utsagn', 'varslet_i_tide'],
  ['Postresultat', 'regelsett', 'post krevd lag'],
  // Arbeidsvalg 1 i spørsmålsfila 09.11 for #1663: lagene i sporet og beløpet i hvert.
  ['Postlag', 'regelsett', 'lag beloep'],
  ['regler/vederlag.ts:lagene', 'regelsett', 'foerste antall'],
  // #1774: lagene for en kravpost etter en beregningsregel, lest av utregningen, virkningene og
  // forutsetningene i skjemaet.
  ['Kravpostinnsigelser', 'utsagn', 'godtarRegelen varselForSent justering'],
  ['LagIKravposten', 'regelsett', 'regelen varselet justeringen beloepet'],
  [
    'regler/vederlag.ts',
    'regelsett',
    'lagIKravposten',
    ['spor/vederlag/frysing.ts:beregningsregelLag'],
  ],
  [
    'spor/vederlag/frysing.ts',
    'regelsett',
    'beregningsregelLag',
    ['spor/vederlag/kommando.ts:innenforKravposten'],
  ],
  ['Preklusjon', 'regelsett', 'hovedkrav produktivitet'],
  [
    'Vederlagsberegning',
    'regelsett',
    'beregnings_resultat total_godkjent_beloep subsidiaer_resultat subsidiaer_godkjent_beloep poster',
  ],

  // Kommandoene og kontrollen av dem.
  [
    'Kommando',
    'kommando',
    'type spor svar innhold varsel erstatter regelversjon sendt hjemmel dokumentasjon gjelder grunn',
  ],
  // OV-U5: varselet i fristkravet har datoen og brevet som vedlegg.
  ['Kommando.varsel', 'kommando', 'sendt dokumentasjon'],
  // GR-U22: hjemmelen i en ny påberopelsesversjon sammenliknes med gjeldende versjon.
  [
    'Kommando.innhold',
    'utsagn',
    'hovedkategori underkategori',
    ['kommandoer/nyttelast.ts:kategorisperre'],
  ],
  // MM-U52 punkt 14: endringsordren i underkategorien endringsordre står.
  ['Kommando.innhold', 'utsagn', 'endringsordre', ['kommandoer/nyttelast.ts:kategorisperre']],
  ['Svarutkast', 'kommando', 'spor gjelder regelversjon vurderinger'],
  ['Svarutkast', 'kommando', 'resultat', ['kommandoer/nyttelast.ts']],
  ['Svarutkast.resultat', 'kommando', '*', ['kommandoer/nyttelast.ts']],
  ['kommandoer/nyttelast.ts:kontrollerSvar(server)', 'regelsett', '*'],
  ['Handlingsnoekkel', 'kommando', 'type spor gjelder hjemmel'],
  // #1703: nøkkelen i den tilbudte handlingen. De andre feltene leses bare av visningen.
  ['TilbudtHandling', 'kommando', 'noekkel'],
  // LV-U14: ID-ene i kommandoen slås opp i vedleggene serveren leste (arbeidsvalg 3 i #790).
  ['kommandoer/kommando.ts', 'kommando', 'formfeil vedleggI'],
  // VS-U51, VS-U53: dokumentet kravskjemaet legger til som varselet for en kravpost, skrives
  // som et registrert varsel før kravet, og kravet er neste rad i samme handling.
  [
    'Kommando.innhold',
    'kommando',
    'kravposter',
    [
      'kommandoer/kommando.ts:vedleggI',
      'kommandoer/skriving.ts:handlingen',
      'kommandoer/skriving.ts:medVarslene',
    ],
  ],
  ['kommandoer/kommando.ts:vedleggI', 'kommando', 'varsel dokumentasjon'],
  ['kommandoer/skriving.ts:handlingen(p)', 'kommando', 'varsel'],
  ['kommandoer/skriving.ts:medVarslene(p)', 'kommando', 'varsel'],
  ['Dokumentvarsel', 'kommando', 'dokumentasjon sendt korrespondansetype'],
  ['kommandoer/skriving.ts:Utfall', 'kommando', 'godtatt hendelser neste avvisning'],
  ['Avvisning', 'kommando', 'melding', ['kommandoer/skriving.ts:medVarslene']],
  ['Journalrad.data', 'rad', 'utsagn', ['kommandoer/skriving.ts:medVarslene']],
  ['kommandoer/skriving.ts:medVarslene', 'rad', 'id'],
  ['kommandoer/skriving.ts:medVarslene', 'utsagn', 'hjemmel'],
  ['Dokumentpost', 'kommando', 'varsel'],
  // VS-U51, VS-U53: dokumentet fra kravskjemaet gjelder bare kravposten som viser til det.
  ['Dokument', 'utsagn', 'dokumentasjon', ['kommandoer/skriving.ts:foranKravet']],
  ['Utsagn', 'relasjon', 'dokument', ['kommandoer/skriving.ts:foranKravet']],
  [
    'kommandoer/kommando.ts:formfeil',
    'kommando',
    'type spor innhold svar dokumentasjon hjemmel beskrivelse',
  ],
  // OV-U16: beskrivelsen lagres slik avsenderen skrev den, og ingen regel leser den.
  ['Kommando', 'kommando', 'beskrivelse', ['kommandoer/skriving.ts:dokument']],
  // LV-U42: typen registrert korrespondanse lagres slik avsenderen oppga den.
  ['Kommando', 'kommando', 'korrespondansetype', ['kommandoer/skriving.ts:dokument']],
  // OV-U17, OV-U18: registreringen en retting viser til, kontrollert mot utledningen.
  [
    'Kommando',
    'kommando',
    'retter',
    ['kommandoer/nyttelast.ts:nyttelastkontroll', 'kommandoer/skriving.ts:dokument'],
  ],
  // OV-U4, OV-U16: brevene registrert som dokumentasjon og rettingene av dem. Bare
  // kontrollen av rettingen leser dem; beskrivelsen og sporene går uendret til visningen.
  ['Dokument', 'relasjon', 'id retter', ['utledning/utled.ts:registreringer']],
  // OV-U19: brevene appen ikke vurderer, for visningen. Ingen regel leser dem.
  ['Dokument', 'relasjon', 'id', ['utledning/utled.ts:ikkeVurderte']],
  ['Dokument', 'relasjon', 'id', ['utledning/utled.ts:datoenDetBleSendt']],
  ['RegistrertBrev', 'relasjon', 'dokument rettetAv', ['utledning/utled.ts:ikkeVurderte']],
  [
    'Dokument',
    'relasjon',
    'ikkeISaken',
    ['kommandoer/skriving.ts:brevtekstFor', 'utledning/utled.ts:kilden'],
  ],
  ['Dokument', 'utsagn', 'beskrivelse spor dokumentasjon', ['utledning/utled.ts:registreringer']],
  ['utledning/utled.ts:registreringer', 'relasjon', 'brev feil', ['utledning/utled.ts']],
  [
    'Utledning',
    'relasjon',
    'registrerteBrev',
    ['kommandoer/nyttelast.ts:retting', 'utledning/utled.ts:utled'],
  ],
  [
    'RegistrertBrev',
    'relasjon',
    'dokument avsender rettetAv',
    ['utledning/utled.ts:registreringer', 'kommandoer/nyttelast.ts:retting'],
  ],
  // #984: datoen og vedleggene i kommandoen, med stien feilmeldingene viser til.
  ['kommandoer/kommando.ts:brevfelt', 'kommando', 'sti sendt dokumentasjon'],
  // OV-U5: sporet og bestemmelsen i TEs varsel, også det registrerte etter § 32.2 (VS-U34),
  // og varslene etter § 34.3.3 og § 34.4 (VS-U48, VS-U52).
  ['Hjemmelsvarsel', 'kommando', 'spor hjemmel'],
  // OV-U5: varselet i sporet, som handlingsnøkkelen uten hjemmel gjelder.
  // #1703: også hjemmelen i den tilbudte handlingen, så visningen ikke utleder den.
  [
    'VARSEL_I_SPORET',
    'relasjon',
    'frist vederlag',
    ['kommandoer/forutsetninger.ts', 'kommandoer/handlinger.ts:handling'],
  ],
  ['kommandoer/forutsetninger.ts', 'relasjon', 'VARSEL_I_SPORET', ['kommandoer/handlinger.ts']],
  ['kommandoer/forutsetninger.ts', 'predikat', 'forutsetninger noekkel'],
  // KA-U1, HF-U8: meldingen når aksepten ikke gjelder det gjeldende svaret, lik i
  // forutsetningene og nyttelastkontrollen.
  ['kommandoer/forutsetninger.ts', 'brevtekst', 'ELDRE_SVAR', ['kommandoer/nyttelast.ts']],
  ['kommandoer/nyttelast.ts', 'predikat', 'nyttelastkontroll'],
  ['kommandoer/avvisning.ts', 'predikat', 'avvisning'],
  [
    'typer.ts',
    'relasjon',
    'SPOR KRAVSPOR VARSELSPOR erVarselhjemmel erKravpostvarselhjemmel utenGren',
  ],
  // Avvisningen med regelkoden og meldingen, felles for forutsetningene, nyttelasten og skrivingen.
  ['typer.ts', 'predikat', 'avvis'],
  // OV-U32: laget en fryst virkning står i, og laget i et svarutkast (#1400).
  [
    'frosset/byggeklosser.ts',
    'frosset',
    'laget',
    [
      'frosset/brevtekst.ts',
      'spor/vederlag/kommando.ts',
      'frosset/linje.ts',
      'frosset/standpunkt.ts',
      'spor/vederlag/frysing.ts',
      'spor/vederlag/tekst.ts',
    ],
  ],
  // OV-U32, OV-U33: lagene i et svarutkast regnes som brevet regner dem (S1-A i #1400).
  [
    'frosset/standpunkt.ts',
    'predikat',
    'virkninger',
    ['spor/vederlag/kommando.ts:lagForUtkastet', 'frosset/frysing.ts:beslutningsgrunnlag'],
  ],
  // GR-U7 og MM-U9: sammenfallet og begrensningen etter § 34.1.3 (VS-U5), lest når brevet fryses.
  [
    'frosset/standpunkt.ts',
    'frosset',
    'godkjennerHeleKravet',
    ['frosset/frysing.ts:beslutningsgrunnlag'],
  ],
  ['spor/vederlag/frysing.ts', 'frosset', 'begrensningen', ['spor/vederlag/tekst.ts']],
  // #1783: det som er sporets eget i frysingen av svaret.
  ['Svarsfrysing', 'frosset', 'virkninger utfall godkjennerHeleKravet', ['frosset/standpunkt.ts']],
  ['spor/vederlag/frysing.ts', 'frosset', 'FRYSING_I_VEDERLAGET', ['frosset/standpunkt.ts']],
  // #1783: lesereglene i 4.2 som er sporets egne.
  ['Sporskontroller', 'predikat', 'kravet kravene svaret', ['utledning/utled.ts']],
  [
    'Sporsforutsetninger',
    'predikat',
    'innsigelsenErIkkeBygget svaret',
    ['kommandoer/forutsetninger.ts'],
  ],
  [
    'spor/vederlag/kommando.ts',
    'predikat',
    'FORUTSETNINGER_I_VEDERLAGET',
    ['kommandoer/forutsetninger.ts'],
  ],
  ['spor/vederlag/utledning.ts', 'predikat', 'KONTROLLER_I_VEDERLAGET', ['utledning/utled.ts']],
  [
    'format/kravinnhold.ts',
    'utsagn',
    'kategori',
    [
      'frosset/linje.ts:beslutningslinje',
      'frosset/standpunkt.ts',
      'frosset/byggeklosser.ts',
      'frosset/utregning.ts',
      'spor/vederlag/frysing.ts',
      'kommandoer/forutsetninger.ts:korrigering',
      'kommandoer/nyttelast.ts:kontrollerKorrigering',
      'kommandoer/nyttelast.ts:grunnlagsdatoen',
    ],
  ],
  [
    'format/kravinnhold.ts',
    'utsagn',
    'innholdIForholdet',
    [
      'frosset/brevtekst.ts',
      'frosset/brevtittel.ts',
      'utledning/utled.ts:opplysningerOmDatoen',
      'kommandoer/nyttelast.ts:kategorisperre',
    ],
  ],
  [
    'spor/vederlag/format.ts',
    'utsagn',
    'innholdIVederlaget',
    ['spor/vederlag/utledning.ts', 'spor/vederlag/tekst.ts'],
  ],
  [
    'format/kravinnhold.ts',
    'utsagn',
    'innholdIFristen',
    ['frosset/brevtekst.ts', 'frosset/utregning.ts'],
  ],
  ['VARSELSPOR', 'relasjon', '32.2 33.4 34.1.2 34.1.3 34.3.3 34.4'],
  ['format/skjema.ts', 'skjema', 'erObjekt feilI tekst erKalenderdato'],
  // #373: det basen ikke kan lagre, avvises før kommandoen vurderes.
  [
    'format/skjema.ts',
    'skjema',
    'tekstSomIkkeKanLagres',
    ['kommandoer/skriving.ts:formen', 'kommandoer/opprettelse.ts:opprettelse'],
  ],
  // #801: et tegn PDF-en av brevet ikke kan vise, avvises før brevet skrives.
  [
    'format/skjema.ts',
    'skjema',
    'kommandoenHarTegnSomIkkeKanVises',
    ['kommandoer/skriving.ts:skriv', 'kommandoer/opprettelse.ts:opprettelse'],
  ],
  ['format/skjema.ts', 'skjema', 'tegnSomIkkeKanVises', ['kommandoer/skriving.ts:skriv']],
  ['format/tegnsett.ts', 'skjema', 'SETTBARE_TEGN', ['format/skjema.ts:kanSettes']],
  ['Avsnitt', 'brevtekst', 'laast', ['kommandoer/skriving.ts:skriv']],
  // Opprettelsen av saken (#664): kommandoen og raden `sak_opprettet` den gir.
  ['Opprettelse', 'kommando', 'sakstittel', ['kommandoer/opprettelse.ts:opprettelse']],
  ['format/skjema.ts', 'skjema', 'objekt TEKST', ['kommandoer/opprettelse.ts']],
  ['format/format.ts', 'rad', 'FORMAT SAK_OPPRETTET', ['kommandoer/opprettelse.ts:opprettelse']],
  ['format/skjema.ts.TYPER', 'skjema', '*'],
  [
    'format/skjema.ts:feilI(s)',
    'skjema',
    `$ref anyOf type const enum minLength pattern minItems minimum exclusiveMinimum items properties
     required additionalProperties`,
  ],
  ['format/skjema.ts:feilI(s).properties', 'skjema', '*'],
  ['format/skjema.ts:oppslag(d)', 'skjema', '*'],
  [
    'Kontekst',
    'kontekst',
    'sakId aktoerId part teamId tidspunkt nyId sakskode kontraktsforkortelse',
  ],
  // LV-U27, LV-U44: sakens kode i tittelen.
  ['Sakskode', 'kontekst', 'kode loepenummer', ['frosset/brevtittel.ts']],
  // LV-U44, S3 i #1497: brevteksten omtaler saken og tidligere brev med koden.
  ['frosset/brevtittel.ts', 'brevtekst', 'sakensKode', ['frosset/brevtekst.ts']],
  // LV-U53, LV-U24: merkingen fryses i brevet når det skrives, og leseren prøver den (#1570).
  [
    'frosset/brevtittel.ts',
    'brevtekst',
    'brevmerking avvikIMerkingen',
    ['kommandoer/skriving.ts:skriv', 'format/leser.ts:lesDokument'],
  ],
  // LV-U53: henvisningen til et tidligere brev bruker merkingen som er frosset på det.
  ['Dokument', 'brevtekst', 'merking', ['frosset/brevtekst.ts', 'frosset/brevdeler.ts']],
  // LV-U42, D1 A i #1497: typen registrert korrespondanse, i skjemaene.
  [
    'typer.ts',
    'skjema',
    'KORRESPONDANSETYPER',
    ['format/format.ts', 'kommandoer/kommando.ts', 'spor/vederlag/format.ts'],
  ],
  ['Kjerne', 'kontekst', 'regler format leserformat'],

  // Formatet (format.ts): skjemaene radene leses og kommandoene kontrolleres mot.
  [
    'format/format.ts',
    'rad',
    `BESLUTNINGSGRUNNLAG DOKUMENT KRAV OPPLYSNING SAK_OPPRETTET STANDPUNKT STANDPUNKTER_I_SPORET
     SVAR UTSAGN`,
    ['format/leser.ts'],
  ],
  [
    'format/format.ts',
    'rad',
    'HJEMMEL',
    [
      'format/leser.ts',
      'kommandoer/standpunkter.ts',
      'spor/vederlag/kommando.ts',
      'frosset/frysing.ts',
      'frosset/standpunkt.ts',
      'frosset/brevtekst.ts',
    ],
  ],
  ['format/format.ts', 'kontekst', 'FORMAT LESERFORMAT', ['versjon.ts']],
  // Arbeidsvalget i #479: metodene byggherren kan oppgi etter § 34.2.2.
  [
    'spor/vederlag/format.ts',
    'skjema',
    'METODER',
    ['regler/vederlag.ts:kontrollerOppgjoersformen'],
  ],
  ['format/format.ts', 'skjema', 'KRAVINNHOLD OPPLYSNINGSSLAG', ['kommandoer/kommando.ts']],
  [
    'format/skjema.ts',
    'skjema',
    'DATO ID liste objekt TEKST',
    ['format/format.ts', 'kommandoer/kommando.ts', 'spor/vederlag/format.ts'],
  ],
  // VS-U26: datoen TE oppgir i påberopelsen. Bare formkontrollen, kontrollen mot
  // brevets dato og brevteksten leser den, så ingen regel vurderer rettidigheten av den.
  ['OPPGITT_DATO', 'skjema', 'endring svikt andre_forhold', ['format/format.ts']],
  [
    'format/format.ts',
    'skjema',
    'oppgittDato',
    [
      'kommandoer/kommando.ts:datofeil',
      'kommandoer/nyttelast.ts:oppgittDatoI',
      'kommandoer/nyttelast.ts:datosperre',
      'kommandoer/nyttelast.ts:kontrollerKorrigering',
      'kommandoer/nyttelast.ts:grunnlagsdatoen',
      'kommandoer/forutsetninger.ts:korrigering',
      'utledning/utled.ts:opplysningerOmDatoen',
    ],
  ],
  // Punkt 10 i samlevedtaket for retting av sendt brev (MM-U41 (opphevet av MM-U52)): TEs korrigering av datoen
  // etter VS-U26, og TEs opplysninger om datoen i grunnlagskravet og i korrigeringene. Den
  // siste er TEs siste opplysning; ingen regel vurderer rettidigheten (punkt 11).
  ['Utsagn', 'utsagn', 'felt dato'],
  ['Utledning', 'utsagn', 'datoopplysninger'],
  ['Datoopplysning', 'relasjon', 'id'],
  ['Datoopplysning', 'utsagn', 'felt dato'],
  ['Dokument', 'relasjon', 'id', ['utledning/utled.ts:opplysningerOmDatoen']],
  ['Forholdsinnhold', 'utsagn', 'datoer', ['utledning/utled.ts:opplysningerOmDatoen']],
  ['utledning/utled.ts:kontrollerKorrigeringene(elementer)', 'relasjon', '*'],
  [
    'utledning/utled.ts',
    'utsagn',
    'sisteDatoopplysning',
    [
      'kommandoer/forutsetninger.ts:korrigering',
      'kommandoer/nyttelast.ts:datosperre',
      'kommandoer/nyttelast.ts:kontrollerKorrigering',
      'kommandoer/nyttelast.ts:grunnlagsdatoen',
    ],
  ],
  // VS-U58: datoen i grunnlagskravet, som varselet om forholdet kontrolleres mot.
  ['kommandoer/nyttelast.ts:grunnlagsdatoen', 'utsagn', 'felt dag'],
  [
    'Kommando',
    'kommando',
    'paalegg_mottatt klar_over_forholdet',
    ['kommandoer/kommando.ts:korrigertDato'],
  ],
  ['kommandoer/kommando.ts:korrigertDato', 'kommando', 'felt dato'],
  [
    'kommandoer/kommando.ts',
    'kommando',
    'korrigertDato',
    ['kommandoer/nyttelast.ts', 'kommandoer/skriving.ts:dokument'],
  ],
  [
    'kommandoer/kommando.ts:datofeil(innhold)',
    'kommando',
    'hovedkategori underkategori paalegg_mottatt klar_over_forholdet',
    ['kommandoer/kommando.ts:datofeil'],
  ],
  // OV-U58: beløpene TE krever, som formkontrollen leser for å avvise brøkdeler av øre.
  [
    'kommandoer/kommando.ts:oerefeil(innhold)',
    'kommando',
    'kravposter saerskilt saerskilt.produktivitet',
    ['kommandoer/kommando.ts:oerefeil'],
  ],
  // #1775: rigg og drift i forlenget byggetid avvises til #1724 har satt formen.
  [
    'kommandoer/kommando.ts:harRiggOgDrift(innhold)',
    'kommando',
    'saerskilt',
    ['kommandoer/kommando.ts:harRiggOgDrift'],
  ],
  [
    'kommandoer/kommando.ts:oerefeil(p)',
    'kommando',
    'beloep anslag kostnadsoverslag',
    ['kommandoer/kommando.ts:oerefeil'],
  ],
  ['kommandoer/kommando.ts:oerefeil', 'kommando', 'beloep', ['kommandoer/kommando.ts:oerefeil']],
  // OV-U95 punkt 19–22, arbeidsvalget 07.11 i domenetabellen: skjemaet for vederlagskravet i kommandoen.
  [
    'spor/vederlag/format.ts',
    'skjema',
    'vederlagsinnhold',
    ['kommandoer/kommando.ts:formfeil', 'format/format.ts'],
  ],
  // #1783: formatet for vederlaget i sporet.
  [
    'spor/vederlag/format.ts',
    'skjema',
    'STANDPUNKTER_I_VEDERLAGET STANDPUNKT_I_VEDERLAGET UTREGNING_I_VEDERLAGET',
    ['format/format.ts'],
  ],
  ['format/skjema.ts', 'skjema', 'artfelt', ['format/format.ts', 'spor/vederlag/format.ts']],
  // KA-U53, KA-U56, KA-U75: kravpostene en ny versjon får id og betegnelse for, og
  // versjonsreglene kommandoen og lesingen av journalen bruker.
  [
    'kommandoer/skriving.ts:medKravposter(innhold)',
    'kommando',
    'kravposter',
    ['kommandoer/skriving.ts:medKravposter'],
  ],
  [
    'kommandoer/skriving.ts:medKravposter(p)',
    'kommando',
    'id',
    ['kommandoer/skriving.ts:medKravposter'],
  ],
  [
    'Kravversjonsinndata',
    'kommando',
    'kravposter trekker',
    ['spor/vederlag/utledning.ts:kravposteneStrider'],
  ],
  ['Postinndata', 'kommando', 'id betegnelse', ['spor/vederlag/utledning.ts:kravposteneStrider']],
  ['spor/vederlag/utledning.ts', 'predikat', 'kravposteneStrider', ['kommandoer/nyttelast.ts']],
  [
    'spor/vederlag/utledning.ts',
    'relasjon',
    'brukteBetegnelser nesteBetegnelse',
    ['kommandoer/skriving.ts:medKravposter'],
  ],
  // VS-U49, D-16, VS-U55: varselet for hver kravpost, lest av skriveren for brevteksten (A6).
  [
    'spor/vederlag/utledning.ts',
    'relasjon',
    'kravpostvarslene',
    ['kommandoer/skriving.ts:brevtekstFor'],
  ],
  [
    'spor/vederlag/utledning.ts:kravpostvarslene',
    'utsagn',
    'hjemmel id',
    ['spor/vederlag/utledning.ts:kravpostvarslene'],
  ],
  // VS-U50: om kravposten viser til et varsel etter samme bestemmelse før kravet.
  [
    'spor/vederlag/utledning.ts',
    'predikat',
    'kravpostvarseletStrider',
    ['kommandoer/nyttelast.ts'],
  ],
  [
    'spor/vederlag/utledning.ts:kravpostvarseletStrider',
    'utsagn',
    'hjemmel id',
    ['spor/vederlag/utledning.ts:kravpostvarseletStrider'],
  ],
  [
    'Kommando.innhold',
    'kommando',
    'hovedkategori underkategori paalegg_mottatt klar_over_forholdet',
    ['kommandoer/nyttelast.ts:oppgittDatoI', 'kommandoer/nyttelast.ts:datosperre'],
  ],
  // Datoen parten oppgir, det den gjelder og hvem som oppgir den, som bare kontrollen mot
  // brevets dato leser.
  [
    'kommandoer/nyttelast.ts:OppgittDato',
    'kommando',
    'dato gjelder av',
    ['kommandoer/nyttelast.ts:oppgittDatoEtterBrevet'],
  ],
  [
    'kommandoer/nyttelast.ts',
    'kommando',
    'oppgittDatoEtterBrevet',
    ['kommandoer/avvisning.ts:avvisning'],
  ],
  // #698: det datoen gjelder, med de samme ordene i meldingene og skjemaet. Brevet skriver
  // partene fullt ut (LV-U35) og har ordene i `DATOEN_I_BREVET`.
  [
    'format/format.ts',
    'brevtekst',
    'DATOEN_GJELDER',
    ['kommandoer/kommando.ts', 'kommandoer/nyttelast.ts', 'kommandoer/forutsetninger.ts'],
  ],
  // Brevets dato er serverens tidspunkt i norsk tid (VS-U8).
  ['format/leser.ts', 'kontekst', 'registrertDato', ['kommandoer/skriving.ts:skriv']],
  // VS-U38: dagen påberopelsen fra appen ble sendt.
  ['format/leser.ts', 'kontekst', 'registrertDato', ['utledning/utled.ts:datoenDetBleSendt']],
  ['STANDPUNKTER_I_SPORET', 'rad', 'art paakrevd', ['format/leser.ts']],
  ['KRAVINNHOLD', 'skjema', 'properties required anyOf'],
  // Kodene i formatet for kategoriene (#335): formen på påberopelsen.
  ['format/koder.ts', 'skjema', 'HOVEDKATEGORIER UNDERKATEGORIER', ['format/format.ts']],
  // #516: kategoriene står i regelsettet, så reglene types mot dem.
  ['regler/typer.ts', 'skjema', 'KATEGORIER', ['format/format.ts', 'format/koder.ts']],
  ['KATEGORIER', 'skjema', 'endring svikt andre_forhold force_majeure', ['format/format.ts']],
  // Oversettelsen fra katalogens koder, for klienten og språkprøven (#335).
  ['format/koder.ts:fraKatalogen(tabell)', 'kommando', '*', ['format/koder.ts']],
  [
    'format/koder.ts:kategoriFraKatalogen',
    'kommando',
    'hovedkategori underkategori',
    ['format/koder.ts'],
  ],
  ['regler/typer.ts', 'regelsett', 'FRISTRESULTATER FORHOLDSRESULTATER', ['format/format.ts']],
  ['regler/typer.ts', 'regelsett', 'VEDERLAGSRESULTATER SAERSKILTE', ['spor/vederlag/format.ts']],

  // Journalraden i format 1 (leser.ts, skriving.ts). `data` er uten type, så feltene har
  // funksjonen og parameteren som eier.
  [
    'Journalrad',
    'rad',
    'event_id event_type versjon tidsstempel aktor_rolle refererer_til_event_id format data',
    ['format/leser.ts', 'kommandoer/skriving.ts'],
  ],
  ['Journalrad.data', 'rad', 'svar', ['kommandoer/skriving.ts']],
  ['format/leser.ts:element(verdi)', 'rad', 'art hva spor', ['format/leser.ts']],
  ['format/leser.ts:element(skjemaer)', 'rad', '*', ['format/leser.ts']],
  [
    'format/leser.ts:lesDokument',
    'rad',
    'krav svar utsagn opplysninger dokumentasjon beskrivelse spor retter ikke_i_saken',
    ['format/leser.ts'],
  ],
  ['format/leser.ts:ikkeISaken(data)', 'rad', 'retter', ['format/leser.ts']],
  [
    'format/leser.ts:lesDokument(e)',
    'rad',
    'id art spor erstatter gjelder innhold hjemmel paalegg_mottatt klar_over_forholdet',
    ['format/leser.ts'],
  ],
  ['format/leser.ts:lesDokument(o)', 'rad', 'id hva dato gjelder oppfylt', ['format/leser.ts']],
  ['format/leser.ts:lesDokument(s)', 'rad', 'spor', ['format/leser.ts']],
  [
    'format/leser.ts:lesSvar(e)',
    'rad',
    'id spor gjelder erstatter paaberopelse utregning beslutningsgrunnlag',
    ['format/leser.ts'],
  ],
  [
    'format/leser.ts:standpunkterISvaret(e)',
    'rad',
    'id art gjelder hjemmel i_tide resultat oppfylt dager begrenset_beloep',
    ['format/leser.ts'],
  ],
  [
    'spor/vederlag/format.ts:standpunktIVederlaget(e)',
    'rad',
    'id art gjelder hjemmel aksepterer oensket_oppgjoersform beloep saerskilt krever_tilbud godtar',
    ['spor/vederlag/format.ts'],
  ],
  // #1783: det som er sporets eget i lesingen av svaret.
  [
    'Svarlesing',
    'skjema',
    `gjentas rettidighet subsidiaertVerdi standpunkt kontrollerStandpunktene kontrollerUtregningen
     innsigelserMotPosten`,
    ['format/leser.ts'],
  ],
  ['spor/vederlag/format.ts', 'rad', 'LESING_I_VEDERLAGET', ['format/leser.ts']],
  // OV-U31, KA-U57 (e): radene i utregningen per post og lag, mot standpunktene og totalene.
  // Resultatet og dagene i standpunktet leses av utregningen (4.3 i designnotatet, #331 punkt 4).
  // Utregningen leses med typen for sporet (#1777).
  [
    'format/leser.ts:standpunkterISvaret(svar)',
    'rad',
    'standpunkter utregning',
    ['format/leser.ts'],
  ],
  [
    'format/svarinnhold.ts',
    'rad',
    'utregningIFristen',
    ['format/leser.ts', 'frosset/standpunkt.ts:fristenGodkjent'],
  ],
  [
    'spor/vederlag/format.ts',
    'rad',
    'utregningIVederlaget',
    ['spor/vederlag/frysing.ts:godkjennerHeleKravet'],
  ],
  [
    'Vederlagsutregning',
    'rad',
    'resultat subsidiaert_resultat godkjent_beloep subsidiaert_godkjent_beloep poster',
    ['spor/vederlag/format.ts'],
  ],
  [
    'Fristutregning',
    'rad',
    'resultat godkjent_dager subsidiaert_resultat subsidiaert_godkjent_dager',
    ['format/leser.ts'],
  ],
  ['Utregningsrad', 'rad', 'gjelder saerskilt lag', ['spor/vederlag/format.ts']],
  ['Utregningslag', 'rad', 'lag beloep', ['spor/vederlag/format.ts']],
  [
    'format/leser.ts:lesBeslutningsgrunnlag(v)',
    'rad',
    'regelversjon virkninger upaavirket uten_virkning linje sammenfall varslingsplikt',
    ['format/leser.ts'],
  ],
  ['format/leser.ts:lesBeslutningsgrunnlag(p)', 'rad', 'standpunkt lag', ['format/leser.ts']],
  ['format/leser.ts:erRegistrert', 'rad', 'hva gjelder', ['format/leser.ts']],
  ['format/leser.ts:datoFor', 'relasjon', 'id dokument', ['format/leser.ts']],
  // Det brevet fryser, som skrivingen og predikatet for et svarutkast deler (#351).
  ['frosset/frysing.ts', 'regelsett', 'frys', ['kommandoer/skriving.ts']],
  ['frosset/frysing.ts', 'regelsett', 'forholdsstandpunkter', ['kommandoer/standpunkter.ts']],
  // Standpunktene i et svarutkast, som skrivingen lagrer og revisjonen sammenliknes med (HF-U5).
  ['kommandoer/standpunkter.ts', 'utsagn', 'standpunkter', ['kommandoer/skriving.ts']],
  // Standpunktene i vederlaget, som standpunktene i et svarutkast og lagene slår opp i (#1783).
  [
    'spor/vederlag/kommando.ts',
    'utsagn',
    'STANDPUNKTER_I_VEDERLAGET',
    ['kommandoer/standpunkter.ts'],
  ],
  ['frosset/frysing.ts:frys(svar)', 'rad', 'spor utregning', ['frosset/frysing.ts']],
  [
    'kommandoer/skriving.ts:frysBrev(s)',
    'rad',
    'spor gjelder paaberopelse',
    ['kommandoer/skriving.ts'],
  ],
  ['kommandoer/skriving.ts:frysSvarene(s)', 'rad', 'spor', ['kommandoer/skriving.ts']],
  ['kommandoer/skriving.ts:frosneSvar(s)', 'rad', 'spor gjelder', ['kommandoer/skriving.ts']],
  ['kommandoer/skriving.ts:lagret(?)', 'frosset', 'resten', ['kommandoer/skriving.ts']],
  [
    'format/leser.ts',
    'rad',
    'lesJournal',
    ['kommandoer/skriving.ts', 'utledning/utled.ts:utledJournal'],
  ],
  [
    'format/leser.ts',
    'rad',
    'standpunkterISvaret',
    ['frosset/frysing.ts', 'kommandoer/skriving.ts', 'spor/vederlag/kommando.ts'],
  ],
  [
    'format/skjema.ts',
    'rad',
    'Uforstaatt',
    ['format/leser.ts', 'kommandoer/skriving.ts', 'frosset/frysing.ts', 'spor/vederlag/format.ts'],
  ],
  // Leseregler som deles: registrert korrespondanse, datoen for et varsel og bestridelsen
  // av samme slag (MM-U1, MM-U7).
  ['format/leser.ts', 'relasjon', 'erRegistrert datoFor sammeSlag'],
  // #474: datoene i KA-U36 (opphevet av KA-U46) og VS-U26 sammenliknes som kalenderdager.
  [
    'format/leser.ts',
    'relasjon',
    'kalenderdag',
    ['kommandoer/nyttelast.ts', 'frosset/brevdeler.ts', 'utledning/utled.ts:datoenDetBleSendt'],
  ],

  // Brevteksten (frosset/brevtekst.ts, LV-U2, LV-U3, #369). Leses bare når brevet skrives.
  [
    'format/leser.ts:lesDokument',
    'rad',
    'brevtekst brevtittel brevnummer merking deres_ref korrespondansetype',
    ['format/leser.ts'],
  ],
  ['Avsnitt', 'brevtekst', 'gjelder', ['format/leser.ts', 'frosset/brevdeler.ts']],
  ['Avsnitt', 'brevtekst', 'laast utdypning', ['frosset/brevtekst.ts', 'frosset/brevdeler.ts']],
  ['Journalrad.data', 'rad', 'sakstittel', ['format/leser.ts']],
  // #801, #1138: skriv kontrollerer tegnene i sakstittelen og filnavnene i brevet.
  [
    'Domenehendelse',
    'brevtekst',
    'tittel',
    ['kommandoer/skriving.ts:brevtekstFor', 'kommandoer/skriving.ts:skriv'],
  ],
  // Utdypningen kopieres til teksten. Kontrollene leser bare om den finnes (A6 i
  // paragrafmatrisen, KA-U31–KA-U34 (opphevet av KA-U46), GR-U15).
  [
    'Svarutkast',
    'kommando',
    'utdypning',
    ['kommandoer/skriving.ts:svar', 'kommandoer/nyttelast.ts:kontrollerSvar'],
  ],
  [
    'Kommando',
    'kommando',
    'utdypning',
    [
      'kommandoer/skriving.ts:dokument',
      'kommandoer/nyttelast.ts:kravetsUtdypning',
      'kommandoer/nyttelast.ts:begrunnelsensTekst',
    ],
  ],
  // KA-U24, KA-U32: avgrensningene som krever begrunnelse, av serverens utregning.
  [
    'kommandoer/nyttelast.ts:avgrensninger(server)',
    'regelsett',
    'resultat subsidiaert_resultat godkjent_beloep subsidiaert_godkjent_beloep',
    ['kommandoer/nyttelast.ts:avgrensninger'],
  ],
  // A1: den låste teksten klienten viste, sammenliknet med teksten serveren lager.
  ['Brevtekst', 'kommando', 'brevtekst', ['kommandoer/skriving.ts:skriv']],
  // #864: brevteksten i en lagret rad leses ett sted, med formen i formatet.
  ['Journalrad.data', 'rad', 'brevtekst', ['format/leser.ts:brevtekstI']],
  ['format/format.ts', 'skjema', 'BREVTEKST', ['format/leser.ts:brevtekstI']],
  ['format/leser.ts', 'rad', 'brevtekstI', ['kommandoer/skriving.ts:laastTekst']],
  [
    'Avsnitt',
    'brevtekst',
    'laast',
    ['kommandoer/skriving.ts:laastTekst', 'kommandoer/skriving.ts:tekstavvik'],
  ],
  [
    'frosset/brevtekst.ts',
    'brevtekst',
    'lagBrevtekst lagDeresRef BrevetAvvises',
    ['kommandoer/skriving.ts:brevtekstFor', 'kommandoer/skriving.ts:skriv'],
  ],
  [
    'frosset/brevdeler.ts',
    'brevtekst',
    'KanIkkeUttrykkes',
    ['kommandoer/skriving.ts:brevtekstFor'],
  ],
  // MM-U3, MM-U50, #1536: brevtittelen fryses med teksten, og leseren avviser en tittel skrivingen ikke lager (#1533).
  [
    'frosset/brevtittel.ts',
    'brevtekst',
    'lagBrevtittel avvikITittelen medSakskode',
    ['kommandoer/skriving.ts:brevtekstFor', 'format/leser.ts:lesDokument'],
  ],
  ['UTSAGNSTITTEL', 'brevtekst', 'aksept trekk innsigelse korrigering', ['frosset/brevtittel.ts']],
  // LV-U44, LV-U45: brevets nummer i saken, det neste etter det høyeste.
  ['Dokument', 'brevtekst', 'brevnummer', ['kommandoer/skriving.ts:nesteBrevnummer']],
  // LV-U49, U-2 i BF-07: Deres ref. står i rekkefølgen etter brevnummeret.
  ['Dokument', 'brevtekst', 'brevnummer', ['frosset/brevtekst.ts:lagDeresRef']],
  // LV-U42: registrert korrespondanse omtales med parten, typen og datoen.
  ['Dokument', 'brevtekst', 'korrespondansetype', ['frosset/brevdeler.ts']],
  [
    'kommandoer/skriving.ts:brevtekstFor',
    'brevtekst',
    'tekst tittel deresRef',
    ['kommandoer/skriving.ts:skriv'],
  ],
  ['BrevetAvvises', 'brevtekst', 'regel', ['kommandoer/skriving.ts:skriv']],
  ['frosset/tekst.ts', 'brevtekst', 'dager', ['frosset/brevtekst.ts']],
  ['frosset/tekst.ts', 'brevtekst', 'kroner', ['frosset/brevdeler.ts']],
  // Oppslaget i sporet for en rolle, og virkningen av et standpunkt (#1783).
  [
    'frosset/byggeklosser.ts',
    'frosset',
    'iSporet',
    [
      'frosset/brevtekst.ts',
      'frosset/linje.ts',
      'frosset/standpunkt.ts',
      'frosset/utregning.ts',
      'utledning/utled.ts',
      'kommandoer/standpunkter.ts',
      'kommandoer/forutsetninger.ts',
    ],
  ],
  [
    'frosset/byggeklosser.ts',
    'frosset',
    'virkningen',
    ['frosset/linje.ts', 'spor/vederlag/tekst.ts'],
  ],
  // Teksten i sporene, som brevteksten og linjen slår opp (#1783).
  [
    'Sporsbrevtekst',
    'brevtekst',
    'krav navn ogsaaInnsigelserEtter svaretGjelder',
    ['frosset/brevtekst.ts'],
  ],
  ['Kravsporsbrevtekst', 'brevtekst', 'enigI ingenKrav kravetOm trukket', ['frosset/brevtekst.ts']],
  [
    'spor/vederlag/tekst.ts',
    'brevtekst',
    'BREVTEKSTEN_I_VEDERLAGET STANDPUNKTENE_I_VEDERLAGET',
    ['frosset/brevtekst.ts'],
  ],
  ['Sporslinje', 'brevtekst', 'egetLedd ledd', ['frosset/linje.ts']],
  ['spor/vederlag/tekst.ts', 'brevtekst', 'LINJEN_I_VEDERLAGET', ['frosset/linje.ts']],
  // Byggeklossene i brevteksten (#1783).
  [
    'frosset/brevdeler.ts',
    'brevtekst',
    'Journalen KanIkkeUttrykkes PRODUKTIVITET eksMva erDato kravpostenI norskDato opplistet punktum tidligere verdi',
    ['frosset/brevtekst.ts', 'spor/vederlag/tekst.ts'],
  ],
  // OV-U32: etiketten brevet bruker for laget.
  [
    'frosset/byggeklosser.ts',
    'brevtekst',
    'etikett',
    ['frosset/brevtekst.ts', 'spor/vederlag/kommando.ts', 'frosset/linje.ts'],
  ],
  ['frosset/linje.ts:beslutningslinje', 'brevtekst', 'tekst', ['frosset/linje.ts']],
  ['frosset/linje.ts:beslutningslinje.plass', 'brevtekst', 'virkning', ['frosset/linje.ts']],
  // OV-U32: leddene i samme lag under én etikett, i linjen og brevteksten.
  ['frosset/tekst.ts:iLagene', 'brevtekst', 'k l', ['frosset/tekst.ts']],
  ['frosset/tekst.ts', 'brevtekst', 'iLagene', ['frosset/brevtekst.ts', 'frosset/linje.ts']],
  // MM-U9: linjen i beslutningsgrunnlaget, frosset når brevet sendes.
  ['frosset/linje.ts', 'brevtekst', 'beslutningslinje', ['frosset/frysing.ts:beslutningsgrunnlag']],
  [
    'frosset/tekst.ts',
    'brevtekst',
    'kroner SENT_I_LINJEN SVARET_PAA_PAABEROPELSEN',
    ['frosset/linje.ts', 'spor/vederlag/tekst.ts'],
  ],
  // Arbeidsvalget i #479: metoden byggherren ønsker, slik brevet sier den.
  ['METODEN', 'brevtekst', 'enhetspriser regningsarbeid', ['spor/vederlag/tekst.ts']],
  ['REGELEN', 'brevtekst', '34.3 34.4', ['spor/vederlag/tekst.ts']],
  // A2 og LV-U4 punkt 6: svaret på påberopelsen og om sporene er subsidiære, lest av
  // utledningen før brevet, så `frosset/` ikke når utledningen (A6).
  // MM-U9, OV-U32: om tallet i gjeldende svar er subsidiært, som den gamle sakslisten leser til #1545 (#1050).
  [
    'Sporutledning',
    'predikat',
    'subsidiaer',
    ['kommandoer/skriving.ts:brevtekstFor', 'utledning/utled.ts:standpunktetErSubsidiaert'],
  ],
  // GR-U26: forbeholdet for ubesvart forhold skrives ikke når forholdet er avklart ved frafall.
  [
    'Saken',
    'brevtekst',
    'sakskode tittel svarPaaPaaberopelsen datoopplysninger subsidiaer avklartVedFrafall',
    ['frosset/brevtekst.ts'],
  ],
  // VS-U49, VS-U55: varselet for hver kravpost, utledet før brevet (`kravpostvarslene`, A6).
  ['Saken', 'relasjon', 'kravpostvarsler kravpostvarsler.*', ['spor/vederlag/tekst.ts']],
  ['Kravpostvarselet', 'relasjon', 'art varsel', ['spor/vederlag/tekst.ts']],
  // LV-U56: TEs opplysninger om datoen, fra utledningen (`Datoopplysning`).
  ['Saken.datoopplysninger', 'utsagn', 'felt dato', ['frosset/brevtekst.ts']],
  ['Saken.datoopplysninger', 'relasjon', 'dokument', ['frosset/brevtekst.ts']],
  ['Tekst', 'brevtekst', 'j saken nytt sak', ['frosset/brevtekst.ts', 'spor/vederlag/tekst.ts']],
  ['frosset/brevtekst.ts:svartekst', 'brevtekst', 'tekst plass', ['frosset/brevtekst.ts']],
  ['Dokument', 'relasjon', 'id registrert', ['frosset/brevtekst.ts', 'frosset/brevdeler.ts']],
  // Datoen appen registrerte brevet.
  ['Dokument', 'relasjon', 'registrert', ['format/leser.ts:registrertDato']],
  // Datoene i meldingen, skrevet som i brevet.
  [
    'frosset/brevdeler.ts',
    'brevtekst',
    'norskDato',
    [
      'kommandoer/nyttelast.ts:oppgittDatoEtterBrevet',
      'kommandoer/nyttelast.ts:varseletEtter322',
      'kommandoer/nyttelast.ts:datosperre',
      'kommandoer/nyttelast.ts:kontrollerKorrigering',
      'kommandoer/nyttelast.ts:varseletFoerGrunnlagsdatoen',
      'kommandoer/nyttelast.ts:korrigeringEtterVarslene',
    ],
  ],
  // A4: vedleggene står i teksten, og et avsnitt kan gjelde dem.
  [
    'Dokument',
    'utsagn',
    'dokumentasjon',
    ['frosset/brevtekst.ts', 'format/leser.ts', 'spor/vederlag/tekst.ts'],
  ],
  // VS-U51, VS-U53: dokumentet med varselet for en kravpost ligger ved kravet, og teksten sier det.
  [
    'Dokument',
    'utsagn',
    'dokumentasjon',
    ['spor/vederlag/utledning.ts:kontrollerVedleggeneVedKravet'],
  ],
  [
    'Vedlegg',
    'relasjon',
    'vedlegg_id',
    [
      'spor/vederlag/utledning.ts:kontrollerVedleggeneVedKravet',
      'kommandoer/skriving.ts:foranKravet',
      'spor/vederlag/tekst.ts',
    ],
  ],
  // Arbeidsvalg 10 i #790: teksten lister vedleggene med filnavnet.
  ['Vedlegg', 'utsagn', 'filnavn', ['frosset/brevtekst.ts', 'kommandoer/skriving.ts:skriv']],
  // GR-U14: TEs beskrivelse siteres fra teksten i brevet kravet står i.
  // Unntaket fra «ingen regel leser teksten»: PAALEGGET_IKKE_BESKREVET leser bare om
  // utdypningen finnes (A6).
  ['Dokument', 'brevtekst', 'brevtekst', ['frosset/brevdeler.ts']],
  [
    'Krav',
    'relasjon',
    'dokument',
    ['frosset/brevtekst.ts', 'frosset/brevdeler.ts', 'spor/vederlag/tekst.ts'],
  ],
  ['Krav', 'relasjon', 'dokument', ['utledning/utled.ts:datoenDetBleSendt']],
  ['Forholdsinnhold', 'utsagn', 'datoer', ['frosset/brevtekst.ts']],
  [
    'Journalen',
    'brevtekst',
    'legg brev brevet dokument dokumentetTil dokumentMed dokumenter element elementer erRegistrert iDokument krav svar utdypning versjon',
    ['frosset/brevtekst.ts', 'frosset/brevdeler.ts', 'spor/vederlag/tekst.ts'],
  ],
  // #1711: brevtekstens egen `Element`, ikke elementet i utledningen.
  [
    'frosset/brevdeler.ts:Element',
    'brevtekst',
    'art dokument krav opplysning svar utsagn',
    ['frosset/brevtekst.ts', 'frosset/brevdeler.ts'],
  ],
  // Forholdene med navnet og hjemmelen (svaret på Q3 i #1488, LV-U43).
  ['frosset/forholdene.ts', 'brevtekst', 'forholdet', ['frosset/brevtekst.ts']],
  ['frosset/forholdene.ts', 'brevtekst', 'forholdet paaberopelsenAv', ['frosset/brevtittel.ts']],
  ['FORHOLDSGRUPPER', 'brevtekst', 'forhold', ['frosset/forholdene.ts']],
  ['Forholdet', 'brevtekst', 'kode', ['frosset/forholdene.ts', 'frosset/brevtekst.ts']],
  ['Forholdet', 'brevtekst', 'navn hjemmel', ['frosset/brevtekst.ts']],
  ['Forholdet', 'brevtekst', 'navn', ['frosset/brevtittel.ts']],
  ['frosset/brevtekst.ts.LEDD_I_33_1', 'brevtekst', '*', ['frosset/brevtekst.ts']],
  ['frosset/brevtekst.ts:aapneInnsigelser', 'relasjon', 'fra', ['frosset/brevtekst.ts']],
  ['Innsigelse', 'relasjon', 'dokument gjelder hjemmel', ['frosset/brevtekst.ts']],
  // Teksten sier det brevet sier: § 32.2 for kravet, endringsordren etter GR-U12 og
  // innsigelsen svaret gjentar eller gir opp (VS-U9, VS-U11).
  [
    'frosset/standpunkt.ts',
    'brevtekst',
    'blirEndringsordre innsigelsenErOppgitt',
    ['frosset/brevtekst.ts'],
  ],
  [
    'frosset/byggeklosser.ts',
    'brevtekst',
    'gjelderVarslingsplikten standpunktet',
    ['frosset/brevtekst.ts'],
  ],
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
  ['regler/frist.ts:beregnFrist', 'Fristkrav.er_grunnlag_subsidiaert', '#309'],
  ['regler/frist.ts:beregnFrist', 'Fristkrav.er_hele_fristen_subsidiaer_pga_grunnlag', '#309'],
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
      'regler/frist.ts:beregnFrist Fristkrav.er_grunnlag_subsidiaert',
      'regler/frist.ts:beregnFrist Fristkrav.er_hele_fristen_subsidiaer_pga_grunnlag',
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
        'utledning/utled.ts.trekkAvPaaberopelsenErSperret',
        'Fristutregning.resultat',
      ])
    );
  });

  const forutsetninger = join(KJERNE, 'kommandoer', 'forutsetninger.ts');
  const utled = join(KJERNE, 'utledning', 'utled.ts');
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
          "import { forholdetErAvklart } from '../frosset/standpunkt.ts';\nexport const proeve = forholdetErAvklart;",
        ],
      ],
      'frosset/standpunkt.ts.forholdetErAvklart',
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
      utled,
      [
        [
          utled,
          'export const proeve = (s: Svar, v: Standpunktsvirkning[]) => forholdetErAvklart(s, v);',
        ],
      ],
      'frosset/standpunkt.ts.forholdetErAvklart',
    ],
    [
      '«avklart» etter GR-U7 videreeksportert fra en regel (#344)',
      forutsetninger,
      [
        [
          forutsetninger,
          "import { forholdetErAvklart } from '../frosset/standpunkt.ts';\nexport { forholdetErAvklart };",
        ],
      ],
      'frosset/standpunkt.ts.forholdetErAvklart',
    ],
    [
      '«avklart» i en annen funksjon i utledningen',
      utled,
      [[utled, 'export const proeve = (u: Utledning) => u.forholdAvklart;']],
      'Utledning.forholdAvklart',
    ],
    [
      'et paaberopelsesfelt i en ny funksjon i samme modul som et kjent avvik',
      join(KJERNE, 'regler', 'frist.ts'),
      [
        [
          join(KJERNE, 'regler', 'frist.ts'),
          'export const proeve = (k: Fristkrav) => k.er_hele_fristen_subsidiaer_pga_grunnlag;',
        ],
      ],
      'Fristkrav.er_hele_fristen_subsidiaer_pga_grunnlag',
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
          "import type { Fristkrav } from './frist.ts';\nexport const proeve = (k: Fristkrav) => k.er_grunnlag_subsidiaert;",
        ],
      ],
      'Fristkrav.er_grunnlag_subsidiaert',
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
