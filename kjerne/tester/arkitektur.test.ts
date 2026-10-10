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
 *   oppsummering står ikke der, under noe navn, så en regel som leser den, gir
 *   rød test til noen har klassifisert verdien. Testen ser ikke lesinger
 *   gjennom refleksjon (`Object.entries`, `in`, spredning), og ikke et objekt
 *   en funksjon bygger og leser selv.
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

// ---------- Det reglene får lese (#308, #329) ----------

/**
 * Hva en verdi reglene leser, er. En oppsummering har ingen klasse: et utfall,
 * en status eller en etikett som står for flere utsagn, leses ikke av noen regel
 * («Kontrakten først, aldri status» i AGENTS.md, MM-U11).
 */
type Klasse =
  /** Det en part har sagt i et dokument: krav, svar, varsel, aksept, trekk, opplysning (2.2). */
  | 'utsagn'
  /** Identiteten og relasjonene mellom utsagnene: `id`, `gjelder`, `erstatter`, spor og avsender. */
  | 'relasjon'
  /** Beslutningsgrunnlaget slik brevet ble sendt (MM-U9, MM-U11). */
  | 'frosset'
  /** Utledet av utsagnene og relasjonene, med vedtaket ved siden av (`utled.ts`, 2.6). */
  | 'predikat'
  /** Regelsettet: inndata og utdata når ett svar regnes ut av byggherrens vurderinger (B-13). */
  | 'regelsett'
  /**
   * Byggherrens frosne svar etter B-13, i serverens utregning: «godkjent eller
   * avslått, beløp eller dager» (MM-U11). Leses bare når brevet fryses.
   */
  | 'frosset svar'
  /** Kommandoen klienten sender, før den er godtatt. */
  | 'kommando'
  /** Det serveren stempler og kjernens versjoner. Klienten bestemmer ingen av dem. */
  | 'kontekst'
  /** Journalraden i lagret form. Bare leseren og skrivingen leser den. */
  | 'rad'
  /** JSON-skjemaet kommandoene kontrolleres mot. */
  | 'skjema';

/**
 * Det reglene får lese: `[eier, klasse, felt, moduler]`, med feltene skilt med
 * mellomrom. Eieren er typen, konstanten eller modulen feltet er deklarert i,
 * med stien gjennom nestede typer. En lesing fra en verdi uten type, som
 * `Record<string, unknown>`, har det typede feltet den kommer fra som eier, som
 * `Svar.utregning`, eller funksjonen og parameteren, som `svarutsagn(data)`. `*` er en lesing med en
 * nøkkel som regnes ut. Er `moduler` oppgitt, får bare de modulene lese feltene.
 *
 * Legger du til et felt reglene leser, klassifiserer du det her. Hører det ikke
 * til noen klasse, er det en oppsummering, og regelen skal lese det feltet
 * oppsummerer i stedet.
 */
const LESBART: [eier: string, klasse: Klasse, felt: string, moduler?: string[]][] = [
  // Dokumentene og utsagnene i dem (typer.ts).
  ['Dokument', 'relasjon', 'avsender'],
  ['Dokument', 'utsagn', 'krav svar utsagn opplysninger'],
  ['Domenehendelse', 'relasjon', 'art id versjon dokument grunn'],
  ['Krav', 'relasjon', 'id spor'],
  ['Krav', 'utsagn', 'innhold'],
  ['Krav.innhold', 'utsagn', 'hovedkategori underkategori belop_direkte antall_dager'],
  ['Svar', 'relasjon', 'id spor gjelder erstatter'],
  ['Svar', 'utsagn', 'utsagn'],
  ['Svar', 'frosset', 'beslutningsgrunnlag'],
  ['Svar', 'frosset svar', 'utregning', ['standpunkt.ts']],
  ['Svar.utregning', 'frosset svar', 'beregnings_resultat', ['standpunkt.ts']],
  ['Utsagn', 'relasjon', 'id art gjelder dokument'],
  ['Utsagn', 'utsagn', 'hjemmel iTide resultat godkjent oppfylt vurdert hva'],
  ['Opplysning', 'relasjon', 'id oppgittAv'],
  ['Opplysning', 'utsagn', 'verdi'],
  ['Beslutningsgrunnlag', 'frosset', 'regelversjon standpunkter sammenfall'],
  ['Standpunkt', 'frosset', 'utsagn art virkning'],

  // Utledningen (utled.ts).
  [
    'Utledning',
    'predikat',
    `forstaatt spor svar opplysninger grunnlagAvklart grunnlagAvvist frafalt
     godkjenningErEndringsordre`,
  ],
  ['Utledning.svar', 'relasjon', '*'],
  ['Utledning.opplysninger', 'utsagn', 'opplysning'],
  ['Utledning.opplysninger', 'relasjon', 'bestridelser'],
  ['Bestridelse', 'relasjon', 'part'],
  ['Sporutledning', 'predikat', 'krav svar gjeldendeKrav gjeldendeSvar enighet trukket varsel'],
  ['Svarberegning', 'relasjon', 'svar'],
  ['Svarberegning', 'frosset', 'standpunkter'],
  ['Svarberegning', 'predikat', 'uavklart'],
  ['Enighet', 'predikat', 'grunnlag'],
  ['Enighetsgrunnlag', 'predikat', 'kilde vilkaar'],
  ['utled.ts', 'predikat', 'utled kraveneErAvgjort'],

  // Standpunktene og det brevet fryser (standpunkt.ts).
  [
    'standpunkt.ts',
    'regelsett',
    `standpunkter beslutningsgrunnlag regnUtSvar SAMMENLIKNES likeResultatfelt
     utenforOmfanget`,
  ],
  ['standpunkt.ts', 'frosset', 'hovedgrunn utsagnet'],
  ['standpunkt.ts', 'predikat', 'enighetsgrunnlag'],
  ['standpunkt.ts:regnUtSvar', 'utsagn', 'krav grunnlagskrav'],
  ['standpunkt.ts:kategori', 'utsagn', 'hovedkategori underkategori'],
  [
    'Svarvurdering',
    'utsagn',
    'resultat grunnlag_varslet_i_tide frist_varsel_ok spesifisert_krav_ok vilkar_oppfylt dager',
  ],
  [
    'standpunkt.ts:utenforOmfanget(v)',
    'utsagn',
    `spesifisert_krav_ok foresporsel_svar_ok aksepterer_metode hold_tilbake rigg_vurdering
     produktivitet_vurdering *`,
  ],

  // Regelsettet (regler/).
  ['Regelsett', 'regelsett', 'versjon gjelderVarslingsplikten'],
  ['regler/regelsett.ts', 'regelsett', 'GJELDENDE_REGLER'],
  ['regler/beloep.ts', 'regelsett', 'beloep erEndelig tilKrone tilTall NULL_OERE'],
  ['regler/feil.ts', 'regelsett', 'UgyldigVurdering'],
  [
    'regler/grunnlag.ts',
    'regelsett',
    'erEndringMedVarslingsplikt erGrunnlagSubsidiaert foersteUnderkategori gyldigeResultater',
  ],
  ['regler/frist.ts', 'regelsett', 'beregnFrist'],
  ['regler/vederlag.ts', 'regelsett', 'beregnVederlag'],
  ['GrunnlagForStandpunkt', 'regelsett', 'hovedkategori underkategori resultat varsletITide'],
  [
    'Fristkrav',
    'regelsett',
    `krevd_dager varsel_type er_svar_paa_foresporsel har_innsigelse_mot_varsel
     har_tidligere_varsel_i_tide er_grunnlag_subsidiaert er_hele_fristen_subsidiaer_pga_grunnlag`,
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
  [
    'Vederlagskrav',
    'regelsett',
    `hovedkrav_belop metode rigg_belop produktivitet_belop krever_justert_ep kostnads_overslag
     hovedkategori underkategori grunnlag_varslet_i_tide grunnlag_resultat`,
  ],
  [
    'Vederlagsvurdering',
    'utsagn',
    `hovedkrav_vurdering hovedkrav_godkjent_belop hovedkrav_varslet_i_tide aksepterer_metode
     hold_tilbake varsel_justert_ep_ok rigg_vurdering rigg_godkjent_belop rigg_varslet_i_tide
     produktivitet_vurdering produktivitet_godkjent_belop produktivitet_varslet_i_tide`,
  ],
  ['Preklusjon', 'regelsett', 'hovedkrav rigg produktivitet'],
  [
    'Vederlagsberegning',
    'regelsett',
    'beregnings_resultat total_godkjent_belop total_krevd_belop hovedkrav_godkjent_belop',
  ],

  // Kommandoene og kontrollen av dem.
  [
    'Kommando',
    'kommando',
    'type spor svar innhold varsel erstatter regelversjon sendt hjemmel dokumentasjon gjelder hva',
  ],
  ['Kommando.varsel', 'kommando', 'sendt'],
  ['Svarutkast', 'kommando', 'spor gjelder regelversjon vurderinger resultat'],
  ['Svarutkast.resultat', 'kommando', '*'],
  ['Svarutkast.vurderinger', 'kommando', '*'],
  ['nyttelast.ts:kontrollerSvar(server)', 'regelsett', '*'],
  ['Handlingsnoekkel', 'kommando', 'type spor gjelder'],
  ['kommando.ts', 'kommando', 'formfeil'],
  ['kommando.ts:formfeil', 'kommando', 'type spor innhold svar'],
  ['forutsetninger.ts', 'predikat', 'forutsetninger noekkel avvis'],
  ['nyttelast.ts', 'predikat', 'nyttelastkontroll'],
  ['avvisning.ts', 'predikat', 'avvisning'],
  ['typer.ts', 'relasjon', 'SPOR KRAVSPOR'],
  ['skjema.ts', 'skjema', 'erObjekt feilI tekst'],
  ['skjema.ts.TYPER', 'skjema', '*'],
  [
    'skjema.ts:feilI(s)',
    'skjema',
    `$ref anyOf type const enum minLength minimum exclusiveMinimum items properties required
     additionalProperties`,
  ],
  ['skjema.ts:feilI(s).properties', 'skjema', '*'],
  ['skjema.ts:oppslag(d)', 'skjema', '*'],
  ['Kontekst', 'kontekst', 'sakId aktoerId part teamId tidspunkt nyId'],
  ['Kjerne', 'kontekst', 'regler format'],

  // Journalraden, i formen `hendelse` har i dag (leser.ts, skriving.ts).
  [
    'Journalrad',
    'rad',
    'event_id event_type versjon tidsstempel aktor_rolle refererer_til_event_id data',
    ['leser.ts', 'skriving.ts'],
  ],
  [
    'Journalrad.data',
    'rad',
    `sakstype hendelsesformat dokument_id dokumentasjon gjelder hva sendt mottatt
     sendt_oppgitt_av mottatt_oppgitt_av frist_varsel regelversjon original_respons_id
     beslutningsgrunnlag *`,
    ['leser.ts'],
  ],
  ['Journalrad.data.frist_varsel', 'rad', 'dato_sendt', ['leser.ts']],
  [
    'leser.ts:svarutsagn(data)',
    'rad',
    `grunnlag_varslet_i_tide resultat beregnings_resultat total_godkjent_belop frist_varsel_ok
     vilkar_oppfylt subsidiaer_resultat godkjent_dager subsidiaer_godkjent_dager`,
    ['leser.ts'],
  ],
  ['leser.ts:lesBeslutningsgrunnlag(o)', 'rad', 'regelversjon standpunkter linje sammenfall'],
  ['leser.ts:lesStandpunkter(o)', 'rad', 'utsagn art virkning'],
  ['Lesestand', 'rad', 'sisteKrav fristvarsel', ['leser.ts']],
  ['HENDELSESTYPER', 'rad', 'krav svar trekk', ['leser.ts', 'skriving.ts']],
  ['leser.ts.SVARTYPER', 'rad', '*', ['leser.ts', 'skriving.ts']],
  ['leser.ts.KRAVTYPER', 'rad', '*', ['leser.ts']],
  ['leser.ts.TREKKTYPER', 'rad', '*', ['leser.ts']],
  [
    'leser.ts',
    'rad',
    'HENDELSESTYPER KRAVREFERANSE SVARTYPER lesJournal svarreferanse svarutsagn',
    ['skriving.ts'],
  ],
  // Varselet utledet av et fristkrav (MM-U1).
  ['leser.ts', 'relasjon', 'utledetVarsel'],
];

/**
 * Lesinger av en oppsummering som står i dag, med issuet som fjerner dem:
 * `[modul, nøkkel, begrunnelse]`. `utfall()` er en lukket mengde, `avklart`
 * eller `avvist`, som slår sammen § 32.3 a og c, og ingen regel skal lese den,
 * heller ikke utledet. Lista er lukket: den kan bare bli kortere.
 */
const KJENTE_AVVIK: [modul: string, noekkel: string, begrunnelse: string][] = [
  ['utled.ts', 'standpunkt.ts.utfall', '#273: grunnlagAvklart skal lese standpunktene direkte'],
  ['utled.ts', 'Utfall.grunnlag', '#273: grunnlagAvklart og grunnlagAvvist leser utfallet'],
  ['utled.ts', 'Enighetsgrunnlag.utfall', '#273: grunnlagAvvist skal lese standpunktene direkte'],
];

/** Én lesing i en regel: modulen, linjen og nøkkelen `eier.felt` den slås opp med i `LESBART`. */
export interface Lesing {
  modul: string;
  linje: number;
  noekkel: string;
}

const OPSJONER = ts.parseJsonConfigFileContent(
  ts.readConfigFile(join(KJERNE, 'tsconfig.json'), ts.sys.readFile).config,
  ts.sys,
  KJERNE
).options;

/** Et TypeScript-program over `filer`, med kildeteksten i `erstatt` der den er oppgitt. */
export function program(
  filer: string[],
  erstatt = new Map<string, string>(),
  forrige?: ts.Program
): ts.Program {
  const vert = ts.createCompilerHost(OPSJONER, true);
  const hent = vert.getSourceFile;
  vert.getSourceFile = (fil, spraak, ...resten) => {
    const kilde = erstatt.get(fil);
    return kilde === undefined
      ? hent(fil, spraak, ...resten)
      : ts.createSourceFile(fil, kilde, spraak, true);
  };
  return ts.createProgram(filer, OPSJONER, vert, forrige);
}

const modulnavn = (fil: string) => relative(KJERNE, fil).split(sep).join('/');
const iKjernen = (fil: string) => fil.startsWith(KJERNE + sep) && !fil.startsWith(TESTER + sep);

/** `n` står i funksjonen `f`, også i en funksjon inne i den. */
const iFunksjonen = (n: ts.Node | undefined, f: ts.Node): boolean =>
  n !== undefined && (n === f || iFunksjonen(n.parent, f));

/** Modulen og navnet på funksjonen `n` er eller står i, som `leser.ts:svarutsagn`. */
function funksjon(n: ts.Node): string {
  const modul = modulnavn(n.getSourceFile().fileName);
  for (let p: ts.Node | undefined = n; p; p = p.parent) {
    if ((ts.isFunctionDeclaration(p) || ts.isMethodDeclaration(p)) && p.name)
      return `${modul}:${p.name.getText()}`;
    if (
      ts.isVariableDeclaration(p) &&
      ts.isIdentifier(p.name) &&
      p.initializer &&
      (ts.isArrowFunction(p.initializer) || ts.isFunctionExpression(p.initializer))
    )
      return `${modul}:${p.name.text}`;
  }
  return `${modul}:?`;
}

const toppnivaa = (d: ts.Node) =>
  (ts.isFunctionDeclaration(d) || ts.isClassDeclaration(d) ? d.parent : d.parent?.parent?.parent)
    ?.kind === ts.SyntaxKind.SourceFile;

/**
 * Eieren til deklarasjonen `d`: typen eller konstanten, med stien gjennom
 * nestede typer, modulen for en funksjon eller konstant på toppnivå, eller
 * funksjonen for en type eller et objekt som står i en funksjon. `null` når `d`
 * er et felt i et objekt som bygges i funksjonen det leses i.
 */
function eier(d: ts.Declaration, lesested: ts.Node): string | null {
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
    )
      return [n.name?.text ?? '?', ...sti].join('.');
    else if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && toppnivaa(n))
      return [n.name.text, ...sti].join('.');
    else if (ts.isFunctionLike(n))
      return bygget && iFunksjonen(lesested, n) ? null : [funksjon(n), ...sti].join('.');
  }
  return '?';
}

const utenType = (t: ts.Type) => (t.flags & (ts.TypeFlags.Unknown | ts.TypeFlags.Any)) !== 0;

/** Lesingene i `moduler`, med nøkkelen hver slås opp med i `LESBART`. */
export function lesinger(p: ts.Program, moduler: string[]): Lesing[] {
  const tc = p.getTypeChecker();
  const ut: Lesing[] = [];
  for (const fil of moduler) {
    const sf = p.getSourceFile(fil);
    if (!sf) throw new Error(`${fil} er ikke i programmet`);
    const legg = (n: ts.Node, noekkel: string | null) => {
      if (noekkel !== null)
        ut.push({
          modul: modulnavn(fil),
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
        const e = eier(d, n);
        return e === null ? null : `${e}.${navn}`;
      }
      // Et felt utenfor kjernen, som `length`, eller en av de faste nøklene i en
      // `Record`, som `u.spor.grunnlag`. Verdien har en type og leses videre med navn.
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
      else if (ts.isImportClause(n) && n.name && !n.isTypeOnly) {
        const d = tc.getAliasedSymbol(tc.getSymbolAtLocation(n.name)!).declarations?.[0];
        if (d && iKjernen(d.getSourceFile().fileName))
          legg(n, `${modulnavn(d.getSourceFile().fileName)}.default`);
      } else if (ts.isImportSpecifier(n) && !n.isTypeOnly && !n.parent.parent.isTypeOnly) {
        const d = tc.getAliasedSymbol(tc.getSymbolAtLocation(n.name)!).declarations?.[0];
        if (d && iKjernen(d.getSourceFile().fileName))
          legg(
            n,
            `${modulnavn(d.getSourceFile().fileName)}.${(n.propertyName ?? n.name).getText()}`
          );
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
    ({ modul, noekkel }) =>
      !KJENTE_AVVIK.some(([m, k]) => m === modul && k === noekkel) &&
      !LESBART.some(
        ([eier, , felt, moduler]) =>
          felt.split(/\s+/).some((f) => `${eier}.${f}` === noekkel) &&
          (!moduler || moduler.includes(modul))
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

  it('LESBART har ingen felt som ikke leses', () => {
    const lest = new Set(alleLesinger.map((l) => l.noekkel));
    const ubrukt = LESBART.flatMap(([eier, , felt]) =>
      felt.split(/\s+/).map((f) => `${eier}.${f}`)
    ).filter((k) => !lest.has(k));
    expect(ubrukt).toEqual([]);
  });

  it('de kjente avvikene leses fortsatt, og står ikke i LESBART', () => {
    for (const [modul, noekkel] of KJENTE_AVVIK) {
      expect(alleLesinger.some((l) => l.modul === modul && l.noekkel === noekkel)).toBe(true);
      expect(
        LESBART.some(
          ([eier, , felt]) =>
            noekkel.startsWith(`${eier}.`) &&
            felt.split(/\s+/).includes(noekkel.slice(eier.length + 1))
        )
      ).toBe(false);
    }
  });

  it('de kjente avvikene er bare lesingene av utfallet fra #273', () => {
    const fra273 = new Set(['standpunkt.ts.utfall', 'Utfall.grunnlag', 'Enighetsgrunnlag.utfall']);
    expect(KJENTE_AVVIK.filter(([, noekkel]) => !fra273.has(noekkel))).toEqual([]);
  });

  it('finner lesingene i reglene', () => {
    expect(alleLesinger.map((l) => l.noekkel)).toEqual(
      expect.arrayContaining([
        'Utledning.grunnlagAvvist',
        'Sporutledning.enighet',
        'Svar.beslutningsgrunnlag',
        'utled.ts.kraveneErAvgjort',
        'leser.ts:svarutsagn(data).beregnings_resultat',
      ])
    );
  });

  const forutsetninger = join(KJERNE, 'forutsetninger.ts');
  const utled = join(KJERNE, 'utled.ts');
  const leser = join(KJERNE, 'leser.ts');
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

  // Forsøkene står i minnet her; feilinnføringene F15 og F27 prøver to av dem i selve filene.
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
          "import { sakensStatus } from './utled.ts';\nexport const proeve = sakensStatus;",
        ],
      ],
      'utled.ts.sakensStatus',
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
      'utled.ts:oppsum.avsluttet',
    ],
    [
      'et felt uten type',
      forutsetninger,
      [regel('return (u as any).avsluttet;')],
      'forutsetninger.ts:proeve(u).avsluttet',
    ],
    [
      'et felt uten type, destrukturert',
      forutsetninger,
      [regel('const { avsluttet } = u as any;\nreturn avsluttet;')],
      'forutsetninger.ts:proeve(u).avsluttet',
    ],
    [
      'et felt i en type regelen selv skriver',
      forutsetninger,
      [regel('return (u as Utledning & { oppgjort: boolean }).oppgjort;')],
      'forutsetninger.ts:proeve.oppgjort',
    ],
    [
      'en parameter med samme navn som en tillatt',
      forutsetninger,
      [[forutsetninger, 'export const kontroller = (v: Record<string, unknown>) => v.status;']],
      'forutsetninger.ts:kontroller(v).status',
    ],
    [
      'det lagrede utfallet i et svar',
      forutsetninger,
      [regel('return u.spor.frist.gjeldendeSvar?.utregning.beregnings_resultat;')],
      'Svar.utregning.beregnings_resultat',
    ],
    [
      'journalraden utenfor leseren og skrivingen',
      forutsetninger,
      [
        [forutsetninger, "import type { Journalrad } from './typer.ts';"],
        regel('return (u.journal.at(-1) as unknown as Journalrad).data;'),
      ],
      'Journalrad.data',
    ],
    ['journalen i utledningen', forutsetninger, [regel('return u.journal;')], 'Utledning.journal'],
    [
      'utfallet i en annen regel enn de kjente avvikene',
      forutsetninger,
      [regel('return u.spor.grunnlag.enighet?.grunnlag.utfall;')],
      'Enighetsgrunnlag.utfall',
    ],
    [
      'et felt i en Record med type',
      forutsetninger,
      [regel('return (u as unknown as Record<string, boolean>).avsluttet;')],
      'forutsetninger.ts:proeve(u).avsluttet',
    ],
    [
      'en standardimport',
      forutsetninger,
      [
        [utled, 'export default function sakensStatus(u: Utledning) {\n  return u.versjon;\n}'],
        [
          forutsetninger,
          "import sakensStatus from './utled.ts';\nexport const proeve = sakensStatus;",
        ],
      ],
      'utled.ts.default',
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
      'forutsetninger.ts:proeve(?).ferdig',
    ],
    [
      'et nytt felt, destrukturert i for … of',
      forutsetninger,
      [ferdig, regel('let ferdig;\nfor ({ ferdig } of [u]);\nreturn ferdig;')],
      'forutsetninger.ts:proeve(?).ferdig',
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
});
