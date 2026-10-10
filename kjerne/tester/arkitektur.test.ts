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
 *   gjennom refleksjon (`Object.entries`, `in`, spredning), og ikke en verdi
 *   regelen selv bygger av det den har lest.
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
  /** Utfallet og enighetsgrunnlaget, regnet av de frosne standpunktene og ikke lagret (MM-U11). */
  | 'utledet'
  /** Regelsettet: inndata og utdata når ett svar regnes ut av byggherrens vurderinger (B-13). */
  | 'regelsett'
  /** Serverens utregning, lagret i svaret, lest bare når brevet fryses (B-13, MM-U11). */
  | 'utregning'
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
  ['Svar', 'utregning', 'utregning', ['standpunkt.ts']],
  ['Svar.utregning', 'utregning', 'beregnings_resultat', ['standpunkt.ts']],
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
  ['Utledning.spor', 'relasjon', 'grunnlag frist'],
  ['Utledning.opplysninger', 'utsagn', 'opplysning'],
  ['Utledning.opplysninger', 'relasjon', 'bestridelser'],
  ['Bestridelse', 'relasjon', 'part'],
  ['Sporutledning', 'predikat', 'krav svar gjeldendeKrav gjeldendeSvar enighet trukket varsel'],
  ['Svarberegning', 'relasjon', 'svar'],
  ['Svarberegning', 'frosset', 'standpunkter'],
  ['Svarberegning', 'predikat', 'uavklart'],
  ['Enighet', 'utledet', 'grunnlag'],
  ['Enighetsgrunnlag', 'utledet', 'kilde utfall vilkaar'],
  ['Utfall', 'utledet', 'grunnlag'],
  ['utled.ts', 'predikat', 'utled kraveneErAvgjort'],

  // Standpunktene og det brevet fryser (standpunkt.ts).
  [
    'standpunkt.ts',
    'regelsett',
    `standpunkter beslutningsgrunnlag regnUtSvar SAMMENLIKNES likeResultatfelt
     utenforOmfanget`,
  ],
  ['standpunkt.ts', 'frosset', 'hovedgrunn utsagnet'],
  ['standpunkt.ts', 'utledet', 'utfall enighetsgrunnlag'],
  ['regnUtSvar', 'utsagn', 'krav grunnlagskrav'],
  [
    'Svarvurdering',
    'utsagn',
    'resultat grunnlag_varslet_i_tide frist_varsel_ok spesifisert_krav_ok vilkar_oppfylt dager',
  ],
  [
    'utenforOmfanget(v)',
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
  ['kontroller(v)', 'utsagn', '*'],
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
  ['kontrollerSvar(server)', 'regelsett', '*'],
  ['Handlingsnoekkel', 'kommando', 'type spor gjelder'],
  ['kommando.ts', 'kommando', 'formfeil'],
  ['formfeil', 'kommando', 'type spor innhold svar'],
  ['forutsetninger.ts', 'predikat', 'forutsetninger noekkel avvis'],
  ['nyttelast.ts', 'predikat', 'nyttelastkontroll'],
  ['avvisning.ts', 'predikat', 'avvisning'],
  ['typer.ts', 'relasjon', 'SPOR KRAVSPOR'],
  ['skjema.ts', 'skjema', 'erObjekt feilI tekst'],
  [
    'feilI(s)',
    'skjema',
    `$ref anyOf type const enum minLength minimum exclusiveMinimum items properties required
     additionalProperties`,
  ],
  ['oppslag(d)', 'skjema', '*'],
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
    'svarutsagn(data)',
    'rad',
    `grunnlag_varslet_i_tide resultat beregnings_resultat total_godkjent_belop frist_varsel_ok
     vilkar_oppfylt subsidiaer_resultat godkjent_dager subsidiaer_godkjent_dager`,
    ['leser.ts'],
  ],
  ['lesBeslutningsgrunnlag(o)', 'rad', 'regelversjon standpunkter linje sammenfall', ['leser.ts']],
  ['lesStandpunkter(o)', 'rad', 'utsagn art virkning', ['leser.ts']],
  ['Lesestand', 'rad', 'sisteKrav fristvarsel', ['leser.ts']],
  ['HENDELSESTYPER', 'rad', 'krav svar trekk', ['leser.ts', 'skriving.ts']],
  [
    'leser.ts',
    'rad',
    'HENDELSESTYPER KRAVREFERANSE SVARTYPER lesJournal svarreferanse svarutsagn',
    ['skriving.ts'],
  ],
  // Varselet utledet av et fristkrav (MM-U1).
  ['leser.ts', 'relasjon', 'utledetVarsel'],
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

/** Navnet på funksjonen `n` er eller står i. */
function funksjon(n: ts.Node): string {
  for (let p: ts.Node | undefined = n; p; p = p.parent) {
    if ((ts.isFunctionDeclaration(p) || ts.isMethodDeclaration(p)) && p.name)
      return p.name.getText();
    if (
      ts.isVariableDeclaration(p) &&
      ts.isIdentifier(p.name) &&
      p.initializer &&
      (ts.isArrowFunction(p.initializer) || ts.isFunctionExpression(p.initializer))
    )
      return p.name.text;
  }
  return '?';
}

const toppnivaa = (d: ts.Node) =>
  (ts.isFunctionDeclaration(d) || ts.isClassDeclaration(d) ? d.parent : d.parent?.parent?.parent)
    ?.kind === ts.SyntaxKind.SourceFile;

/**
 * Eieren til deklarasjonen `d`: typen eller konstanten, med stien gjennom
 * nestede typer, eller modulen for en funksjon eller konstant på toppnivå.
 * `null` når `d` er et felt i et objekt `fil` selv bygger.
 */
function eier(d: ts.Declaration, fil: string): string | null {
  const kilde = d.getSourceFile().fileName;
  if (
    (ts.isFunctionDeclaration(d) || ts.isVariableDeclaration(d) || ts.isClassDeclaration(d)) &&
    toppnivaa(d)
  )
    return modulnavn(kilde);
  const sti: string[] = [];
  let bygget = false;
  for (let n: ts.Node | undefined = d.parent; n; n = n.parent) {
    if ((ts.isPropertySignature(n) || ts.isPropertyAssignment(n)) && ts.isIdentifier(n.name))
      sti.unshift(n.name.text);
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
      return bygget && kilde === fil ? null : [funksjon(n), ...sti].join('.');
  }
  return '?';
}

/** Lesingene i `moduler`, med nøkkelen hver slås opp med i `LESBART`. */
export function lesinger(p: ts.Program, moduler: string[]): Lesing[] {
  const tc = p.getTypeChecker();
  const ut: Lesing[] = [];
  for (const fil of moduler) {
    const sf = p.getSourceFile(fil);
    if (!sf) throw new Error(`${fil} er ikke i programmet`);
    const legg = (n: ts.Node, noekkel: string) =>
      ut.push({
        modul: modulnavn(fil),
        linje: sf.getLineAndCharacterOfPosition(n.getStart()).line + 1,
        noekkel,
      });
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
      if (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e))
        return noekkel(e) ?? '?';
      if (ts.isIdentifier(e)) {
        const d = tc.getSymbolAtLocation(e)?.valueDeclaration;
        if (
          d &&
          ts.isVariableDeclaration(d) &&
          d.initializer &&
          !ts.isObjectLiteralExpression(d.initializer) &&
          !ts.isCallExpression(d.initializer)
        )
          return opphav(d.initializer);
        if (d) return `${funksjon(d)}(${e.text})`;
      }
      return `${funksjon(e)}(${e.getText()})`;
    };
    /** `null` når lesingen ikke er av noe kjernen har deklarert, som `length` eller `find`. */
    const noekkel = (
      n: ts.PropertyAccessExpression | ts.ElementAccessExpression
    ): string | null => {
      const navn = ts.isPropertyAccessExpression(n)
        ? n.name.text
        : ts.isStringLiteralLike(n.argumentExpression)
          ? n.argumentExpression.text
          : '*';
      const symbol = ts.isPropertyAccessExpression(n)
        ? tc.getSymbolAtLocation(n.name)
        : navn === '*'
          ? undefined
          : tc.getTypeAtLocation(n.expression).getProperty(navn);
      const d = symbol?.declarations?.[0];
      if (d) {
        if (!iKjernen(d.getSourceFile().fileName)) return null;
        const e = eier(d, fil);
        return e === null ? null : `${e}.${navn}`;
      }
      // Et oppslag med en utregnet nøkkel i en verdi med type, som `u.spor[n]`,
      // gir en verdi med type, og den leses videre med navn.
      if (
        navn === '*' &&
        !(tc.getTypeAtLocation(n).flags & (ts.TypeFlags.Unknown | ts.TypeFlags.Any))
      )
        return null;
      return `${opphav(n.expression)}.${navn}`;
    };
    const skrives = (n: ts.Node) =>
      ts.isBinaryExpression(n.parent) &&
      n.parent.left === n &&
      n.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken;
    const besoek = (n: ts.Node) => {
      if ((ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n)) && !skrives(n)) {
        const k = noekkel(n);
        if (k) legg(n, k);
      } else if (ts.isBindingElement(n) && ts.isObjectBindingPattern(n.parent)) {
        const navn = (n.propertyName ?? n.name).getText();
        const d = tc.getTypeAtLocation(n.parent).getProperty(navn)?.declarations?.[0];
        const e = d && iKjernen(d.getSourceFile().fileName) ? eier(d, fil) : null;
        if (e) legg(n, `${e}.${navn}`);
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

/** Lesingene `LESBART` ikke tillater. */
export function ikkeTillatt(l: Lesing[]): Lesing[] {
  return l.filter(
    ({ modul, noekkel }) =>
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

  it('finner lesingene i reglene', () => {
    expect(alleLesinger.map((l) => l.noekkel)).toEqual(
      expect.arrayContaining([
        'Utledning.grunnlagAvvist',
        'Sporutledning.enighet',
        'Svar.beslutningsgrunnlag',
        'utled.ts.kraveneErAvgjort',
        'svarutsagn(data).beregnings_resultat',
      ])
    );
  });

  const forutsetninger = join(KJERNE, 'forutsetninger.ts');
  const utled = join(KJERNE, 'utled.ts');
  const leser = join(KJERNE, 'leser.ts');
  /** Lesingene LESBART ikke tillater i `modul` når `endringer` er gjort i kildene. */
  const medEndring = (modul: string, endringer: [fil: string, fra: string, til: string][]) => {
    const erstatt = new Map<string, string>();
    for (const [fil, fra, til] of endringer) {
      const kilde = erstatt.get(fil) ?? readFileSync(fil, 'utf8');
      if (kilde.split(fra).length !== 2) throw new Error(`«${fra}» står ikke én gang i ${fil}`);
      erstatt.set(fil, kilde.replace(fra, til));
    }
    const p = program(kjernefiler, erstatt, kjerneprogram);
    return vis(ikkeTillatt(lesinger(p, [modul])));
  };
  const kravene = '  if (kraveneErAvgjort(u))';
  const utledningen = 'export interface Utledning {\n';

  // Forsøkene står i minnet her; feilinnføringene F15 og F27 prøver det samme i selve filene.
  it.each([
    [
      'et nytt felt i utledningen',
      [utled, utledningen, `${utledningen}  ferdig: boolean;\n`],
      [forutsetninger, kravene, '  if (u.ferdig)'],
      'Utledning.ferdig',
    ],
    [
      'et nytt felt i utledningen, med oppslag',
      [utled, utledningen, `${utledningen}  ferdig: boolean;\n`],
      [forutsetninger, kravene, "  if (u['ferdig'])"],
      'Utledning.ferdig',
    ],
    [
      'et nytt felt i utledningen, destrukturert',
      [utled, utledningen, `${utledningen}  ferdig: boolean;\n`],
      [forutsetninger, kravene, '  const { ferdig } = u;\n  if (ferdig)'],
      'Utledning.ferdig',
    ],
    [
      'en funksjon som oppsummerer saken',
      [
        utled,
        utledningen,
        `export const sakensStatus = (u: Utledning) => u.versjon;\n${utledningen}`,
      ],
      [
        forutsetninger,
        "import { kraveneErAvgjort, type Utledning } from './utled.ts';",
        "import { kraveneErAvgjort, sakensStatus, type Utledning } from './utled.ts';",
      ],
      'utled.ts.sakensStatus',
    ],
    [
      'et felt uten type',
      [forutsetninger, kravene, '  if ((u as any).avsluttet)'],
      null,
      'forutsetninger(u).avsluttet',
    ],
    [
      'et felt i en type regelen selv skriver',
      [forutsetninger, kravene, '  if ((u as Utledning & { oppgjort: boolean }).oppgjort)'],
      null,
      'forutsetninger.oppgjort',
    ],
    [
      'det lagrede utfallet i et svar',
      [
        forutsetninger,
        kravene,
        "  if (u.spor.frist.gjeldendeSvar?.utregning.beregnings_resultat === 'avslatt')",
      ],
      null,
      'Svar.utregning.beregnings_resultat',
    ],
  ] as [string, [string, string, string], [string, string, string] | null, string][])(
    'oppdager %s',
    (_navn, a, b, noekkel) => {
      const funnet = medEndring(forutsetninger, b ? [a, b] : [a]);
      expect(funnet.map((f) => f.split(' ')[1])).toContain(noekkel);
    }
  );

  it('oppdager en statuskode i journalraden', () => {
    const funnet = medEndring(leser, [
      [
        leser,
        '  const data = h.data;\n  const id = tekst(data.dokument_id) ?? h.event_id;',
        "  const data = h.data;\n  if (data.overordnet_status === 'AVSLATT_AKSEPTERT') throw new Uforstaatt('');\n  const id = tekst(data.dokument_id) ?? h.event_id;",
      ],
    ]);
    expect(funnet.map((f) => f.split(' ')[1])).toEqual(['Journalrad.data.overordnet_status']);
  });

  it('oppdager journalraden lest utenfor leseren og skrivingen', () => {
    const funnet = medEndring(forutsetninger, [
      [
        forutsetninger,
        kravene,
        "  if ((u.journal.at(-1) as unknown as Journalrad)?.data.sakstype === 'forsering')",
      ],
      [
        forutsetninger,
        "import type { Avvisning, Part, Spor } from './typer.ts';",
        "import type { Avvisning, Journalrad, Part, Spor } from './typer.ts';",
      ],
    ]);
    expect(funnet.map((f) => f.split(' ')[1])).toEqual(
      expect.arrayContaining(['Journalrad.data', 'Utledning.journal'])
    );
  });
});
