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
   * avslått, beløp eller dager» (MM-U11). Leses bare av `godkjennerHeleKravet`,
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
  | 'skjema';

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
  ['Domenehendelse', 'relasjon', 'art id versjon dokument grunn'],
  ['Krav', 'relasjon', 'id spor erstatter'],
  ['Krav', 'utsagn', 'innhold'],
  ['Krav.innhold', 'utsagn', 'hovedkategori underkategori beloep dager'],
  ['Svar', 'relasjon', 'id spor gjelder erstatter dokument'],
  ['Svar', 'utsagn', 'standpunkter'],
  ['Svar', 'frosset', 'beslutningsgrunnlag'],
  ['Svar', 'frosset svar', 'utregning', ['standpunkt.ts:godkjennerHeleKravet']],
  ['Svar.utregning', 'frosset svar', 'resultat', ['standpunkt.ts:godkjennerHeleKravet']],
  ['Utsagn', 'relasjon', 'id art gjelder spor'],
  ['Utsagn', 'utsagn', 'hva'],
  ['Standpunkt', 'relasjon', 'id art gjelder'],
  ['Standpunkt', 'utsagn', 'hjemmel iTide resultat godkjent oppfylt vurdert'],
  ['Opplysning', 'relasjon', 'id hva gjelder dokument brev oppgittAv'],
  ['Opplysning', 'utsagn', 'dato oppfylt'],
  ['Beslutningsgrunnlag', 'frosset', 'regelversjon virkninger sammenfall varslingsplikt'],
  ['Standpunktsvirkning', 'frosset', 'standpunkt art virkning'],

  // Utledningen (utled.ts).
  ['Utledning', 'predikat', 'forstaatt spor svar opplysninger grunnlagAvvist frafalt'],
  // § 31.3 for godkjenningen av grunnlaget (GR-U13, KA-U14): ja, nei eller ikke avklart,
  // utledet av opplysningene. Leses bare av sperren mot trekk og avvisningen av den.
  [
    'Utledning',
    'predikat',
    'endringsordre',
    ['utled.ts:trekkAvGrunnlagetErSperret', 'forutsetninger.ts:forutsetninger'],
  ],
  // Hvorfor saken ikke er forstått, i meldingen når kjernen ikke forstår det den skriver.
  ['Utledning', 'predikat', 'begrensninger', ['skriving.ts:vurder']],
  ['Utledning.begrensninger', 'predikat', 'grunn', ['skriving.ts:vurder']],
  // «Avklart» etter GR-U7 brukes bare der vedtakene sier det (MM-U13): vilkåret for
  // enigheten (GR-U7) og at kravene er avgjort (KA-U11, som EO-U5 bygger på).
  [
    'Utledning',
    'predikat',
    'grunnlagAvklart',
    ['utled.ts:enighetensVirkning', 'utled.ts:kraveneErAvgjort'],
  ],
  ['Utledning.svar', 'relasjon', '*'],
  ['Utledning.opplysninger', 'utsagn', 'opplysning'],
  ['Utledning.opplysninger', 'relasjon', 'bestridelser'],
  ['Bestridelse', 'relasjon', 'part'],
  [
    'Sporutledning',
    'predikat',
    'krav svar gjeldendeKrav gjeldendeSvar enighet trukket ingenKrav varsel',
  ],
  ['Svarberegning', 'relasjon', 'svar'],
  ['Svarberegning', 'frosset', 'virkninger'],
  ['Svarberegning', 'predikat', 'uavklart'],
  ['Enighet', 'predikat', 'grunnlag'],
  ['Enighetsgrunnlag', 'predikat', 'kilde vilkaar'],
  ['utled.ts', 'predikat', 'utled kraveneErAvgjort trekkAvGrunnlagetErSperret'],
  ['utled.ts', 'relasjon', 'grunnlagskravFor'],
  // Plassen hvert element har i journalen: dokumentet og saksversjonen (4.2 i designnotatet).
  ['utled.ts:utled', 'relasjon', 'hendelse versjon'],
  ['utled.ts:utled.plasser', 'relasjon', 'id versjon'],

  // Standpunktene og det brevet fryser (standpunkt.ts).
  [
    'standpunkt.ts',
    'regelsett',
    `beslutningsgrunnlag regnUtSvar SAMMENLIKNES likeResultatfelt utenforOmfanget`,
  ],
  ['standpunkt.ts', 'frosset', 'prinsipalt'],
  ['standpunkt.ts', 'utsagn', 'standpunktet'],
  ['standpunkt.ts', 'predikat', 'enighetsgrunnlag'],
  // GR-U7 med unntaket i MM-U13: utledningen regner `grunnlagAvklart` og `grunnlagAvvist` av den.
  ['standpunkt.ts', 'predikat', 'grunnlagetErAvklart', ['utled.ts']],
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
  [
    'Fristkrav',
    'regelsett',
    `krevd_dager varsel_type er_svar_paa_foresporsel har_innsigelse_mot_varsel
     har_tidligere_varsel_i_tide`,
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
     hovedkategori underkategori`,
  ],
  [
    'Vederlagsvurdering',
    'utsagn',
    `hovedkrav_vurdering hovedkrav_godkjent_belop hovedkrav_varslet_i_tide aksepterer_metode
     hold_tilbake varsel_justert_ep_ok rigg_vurdering rigg_godkjent_belop rigg_varslet_i_tide
     produktivitet_vurdering produktivitet_godkjent_belop produktivitet_varslet_i_tide`,
  ],
  ['Preklusjon', 'regelsett', 'hovedkrav rigg produktivitet'],
  ['Vederlagsberegning', 'regelsett', 'beregnings_resultat total_godkjent_belop'],

  // Kommandoene og kontrollen av dem.
  [
    'Kommando',
    'kommando',
    'type spor svar innhold varsel erstatter regelversjon sendt hjemmel dokumentasjon gjelder hva',
  ],
  ['Kommando.varsel', 'kommando', 'sendt'],
  ['Svarutkast', 'kommando', 'spor gjelder regelversjon vurderinger'],
  ['Svarutkast', 'kommando', 'resultat', ['nyttelast.ts']],
  ['Svarutkast.resultat', 'kommando', '*', ['nyttelast.ts']],
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
    `$ref anyOf type const enum minLength minItems minimum exclusiveMinimum items properties
     required additionalProperties`,
  ],
  ['skjema.ts:feilI(s).properties', 'skjema', '*'],
  ['skjema.ts:oppslag(d)', 'skjema', '*'],
  ['Kontekst', 'kontekst', 'sakId aktoerId part teamId tidspunkt nyId'],
  ['Kjerne', 'kontekst', 'regler format'],

  // Formatet (format.ts): skjemaene radene leses og kommandoene kontrolleres mot.
  [
    'format.ts',
    'rad',
    `BESLUTNINGSGRUNNLAG DOKUMENT KRAV OPPLYSNING SAK_OPPRETTET STANDPUNKT STANDPUNKTER_I_SPORET
     SVAR UTSAGN`,
    ['leser.ts'],
  ],
  ['format.ts', 'rad', 'HJEMMEL', ['leser.ts', 'skriving.ts']],
  ['format.ts', 'kontekst', 'FORMAT', ['versjon.ts']],
  ['format.ts', 'skjema', 'DATO ID KRAVINNHOLD liste objekt', ['kommando.ts']],
  ['STANDPUNKTER_I_SPORET', 'rad', 'art paakrevd', ['leser.ts']],
  ['KRAVINNHOLD', 'skjema', 'properties required'],
  [
    'regler/typer.ts',
    'regelsett',
    'FRISTRESULTATER GRUNNLAGSRESULTATER VEDERLAGSRESULTATER',
    ['format.ts'],
  ],

  // Journalraden i format 1 (leser.ts, skriving.ts). `data` er uten type, så feltene har
  // funksjonen og parameteren som eier.
  [
    'Journalrad',
    'rad',
    'event_id event_type versjon tidsstempel aktor_rolle refererer_til_event_id format data',
    ['leser.ts', 'skriving.ts'],
  ],
  ['Journalrad.data', 'rad', 'svar', ['skriving.ts']],
  ['leser.ts:element(verdi)', 'rad', 'art hva spor', ['leser.ts']],
  ['leser.ts:element(skjemaer)', 'rad', '*', ['leser.ts']],
  ['leser.ts:lesDokument', 'rad', 'krav svar utsagn opplysninger dokumentasjon', ['leser.ts']],
  ['leser.ts:lesDokument(e)', 'rad', 'id art spor erstatter innhold', ['leser.ts']],
  ['leser.ts:lesDokument(o)', 'rad', 'id hva dato gjelder oppfylt', ['leser.ts']],
  ['leser.ts:lesDokument(s)', 'rad', 'spor', ['leser.ts']],
  [
    'leser.ts:lesSvar(e)',
    'rad',
    'id spor gjelder erstatter utregning beslutningsgrunnlag',
    ['leser.ts'],
  ],
  [
    'leser.ts:standpunkterISvaret(e)',
    'rad',
    'id art gjelder hjemmel i_tide resultat oppfylt',
    ['leser.ts'],
  ],
  // Beløpet og dagene i standpunktet leses av utregningen, som har ett hjem (4.3 i
  // designnotatet). Resultatet i dager-standpunktet tas i #309 (#331 punkt 4).
  ['leser.ts:standpunkterISvaret(svar)', 'rad', 'standpunkter utregning', ['leser.ts']],
  [
    'leser.ts:standpunkterISvaret(svar).utregning',
    'rad',
    'resultat godkjent_beloep godkjent_dager subsidiaert_resultat subsidiaert_godkjent_dager',
    ['leser.ts'],
  ],
  [
    'leser.ts:lesBeslutningsgrunnlag(v)',
    'rad',
    'regelversjon virkninger uten_virkning linje sammenfall varslingsplikt',
    ['leser.ts'],
  ],
  ['leser.ts:lesBeslutningsgrunnlag(p)', 'rad', 'standpunkt virkning', ['leser.ts']],
  ['leser.ts:erRegistrert', 'rad', 'hva gjelder', ['leser.ts']],
  ['leser.ts:datoFor', 'relasjon', 'id dokument', ['leser.ts']],
  ['skriving.ts:frys(svar)', 'rad', 'spor utregning', ['skriving.ts']],
  ['skriving.ts:frysBrev(s)', 'rad', 'spor gjelder', ['skriving.ts']],
  ['skriving.ts:lagret(?)', 'frosset', 'resten', ['skriving.ts']],
  ['leser.ts', 'rad', 'lesJournal standpunkterISvaret Uforstaatt', ['skriving.ts']],
  // Leseregler som deles: registrert korrespondanse, datoen for et varsel og bestridelsen
  // av samme slag (MM-U1, MM-U7).
  ['leser.ts', 'relasjon', 'erRegistrert datoFor sammeSlag'],
];

/**
 * Lesinger av en samlebetegnelse som står i dag (MM-U13), med issuet som
 * fjerner dem: `[sted, nøkkel, begrunnelse]`, der stedet er funksjonen som
 * leser (`modul:navn`). Lista er lukket: den kan bare bli kortere.
 * - Grunnlagsfeltene i regelsettets inndata (#309: fjernes fra porten) er
 *   utfallet i grunnlagssporet,
 *   kopiert inn i ett svar. At hele svaret er subsidiært til grunnlaget, er en
 *   relasjon mellom brev som utledes ved lesing (merknaden 05.10 til B-13, MM-U9),
 *   og `utled.ts` utleder den av de frosne standpunktene.
 */
const KJENTE_AVVIK: [sted: string, noekkel: string, begrunnelse: string][] = [
  ['regler/vederlag.ts:beregnVederlag', 'Vederlagskrav.grunnlag_resultat', '#309'],
  ['regler/vederlag.ts:beregnVederlag', 'Vederlagskrav.grunnlag_varslet_i_tide', '#309'],
  ['regler/frist.ts:beregnFrist', 'Fristkrav.er_grunnlag_subsidiaert', '#309'],
  ['regler/frist.ts:beregnFrist', 'Fristkrav.er_hele_fristen_subsidiaer_pga_grunnlag', '#309'],
  ['regler/grunnlag.ts:standpunkt', 'GrunnlagForStandpunkt.hovedkategori', '#309'],
  ['regler/grunnlag.ts:standpunkt', 'GrunnlagForStandpunkt.underkategori', '#309'],
  ['regler/grunnlag.ts:standpunkt', 'GrunnlagForStandpunkt.resultat', '#309'],
  ['regler/grunnlag.ts:standpunkt', 'GrunnlagForStandpunkt.varsletITide', '#309'],
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

/**
 * Modulen og de navngitte funksjonene `n` er eller står i, ytterst først, som
 * `leser.ts:standpunkterISvaret` eller `utled.ts:utled.plasser`.
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
  it('de kjente avvikene er bare grunnlagsfeltene i regelsettet (#309)', () => {
    const lukket = new Set([
      'regler/vederlag.ts:beregnVederlag Vederlagskrav.grunnlag_resultat',
      'regler/vederlag.ts:beregnVederlag Vederlagskrav.grunnlag_varslet_i_tide',
      'regler/frist.ts:beregnFrist Fristkrav.er_grunnlag_subsidiaert',
      'regler/frist.ts:beregnFrist Fristkrav.er_hele_fristen_subsidiaer_pga_grunnlag',
      'regler/grunnlag.ts:standpunkt GrunnlagForStandpunkt.hovedkategori',
      'regler/grunnlag.ts:standpunkt GrunnlagForStandpunkt.underkategori',
      'regler/grunnlag.ts:standpunkt GrunnlagForStandpunkt.resultat',
      'regler/grunnlag.ts:standpunkt GrunnlagForStandpunkt.varsletITide',
    ]);
    expect(KJENTE_AVVIK.map(([sted, k]) => `${sted} ${k}`).filter((x) => !lukket.has(x))).toEqual(
      []
    );
  });

  it('finner lesingene i reglene', () => {
    expect(alleLesinger.map((l) => l.noekkel)).toEqual(
      expect.arrayContaining([
        'Utledning.grunnlagAvvist',
        'Sporutledning.enighet',
        'Svar.beslutningsgrunnlag',
        'utled.ts.kraveneErAvgjort',
        'leser.ts:standpunkterISvaret(svar).utregning.resultat',
      ])
    );
  });

  const forutsetninger = join(KJERNE, 'forutsetninger.ts');
  const utled = join(KJERNE, 'utled.ts');
  const leser = join(KJERNE, 'leser.ts');
  const standpunkt = join(KJERNE, 'standpunkt.ts');
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
      [regel('return u.spor.frist.gjeldendeSvar?.utregning.resultat;')],
      'Svar.utregning.resultat',
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
      '«avklart» utenfor utledningen (MM-U13)',
      forutsetninger,
      [regel('return u.grunnlagAvklart;')],
      'Utledning.grunnlagAvklart',
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
          "import { grunnlagetErAvklart } from './standpunkt.ts';\nexport const proeve = grunnlagetErAvklart;",
        ],
      ],
      'standpunkt.ts.grunnlagetErAvklart',
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
      '«avklart» i en annen funksjon i utledningen',
      utled,
      [[utled, 'export const proeve = (u: Utledning) => u.grunnlagAvklart;']],
      'Utledning.grunnlagAvklart',
    ],
    [
      'et grunnlagsfelt i en ny funksjon i samme modul som et kjent avvik',
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
      'et grunnlagsfelt i en annen del av regelsettet enn de kjente avvikene',
      join(KJERNE, 'regler', 'frist.ts'),
      [
        [
          join(KJERNE, 'regler', 'frist.ts'),
          "import type { Vederlagskrav } from './vederlag.ts';\nexport const proeve = (k: Vederlagskrav) => k.grunnlag_resultat;",
        ],
      ],
      'Vederlagskrav.grunnlag_resultat',
    ],
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
