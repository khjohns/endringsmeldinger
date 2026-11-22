/**
 * Vurderingen av én Vitest-rapport i feilinnføringene (`feilinnfoering.ts`): skiller
 * målassertions, øvrige feil i målfilene, suitefeil og uhåndterte feil (#1133, #1425, #2108).
 */
import { relative } from 'node:path';
import { treffer } from './maltreff.ts';
import type { Suitefeil } from './suitefeil.ts';

export interface Mutasjon {
  id: string;
  feilklasse: string;
  fil: string;
  /** Tekst som erstattes, hver nøyaktig én gang i fila. */
  endringer: [fra: string, til: string][];
  /** Deler av testnavnet (`fullName`) som må feile, avgrenset som i `treffer`. */
  mal: string[];
  /**
   * Forutsetningene som hører til atferden mutasjonen endrer, og som derfor kan feile uten en
   * assertion (#1859). `test` er en del av testnavnet eller suitenavnet, avgrenset som i
   * `treffer`, og `melding` en del av feilmeldingen. Bare en uvedkommende forutsetning skal
   * stoppe mutasjonen (`.claude/rules/tester.md`), så hver oppføring er en forutsetning om
   * akkurat det mutasjonen fjerner.
   */
  forutsetninger?: { test: string; melding: string }[];
}

export interface Testresultat {
  fullName: string;
  status: string;
  failureMessages: string[];
}

export interface Rapport {
  testResults: {
    name: string;
    status: string;
    message: string;
    assertionResults: Testresultat[];
  }[];
  /** Feilene på filene, i hver `describe` og uhåndterte feil, fra `suitefeil.ts` (#1133, #1425). */
  suitefeil: Suitefeil[];
}

/** Meldingen Vitest gir når en test eller en hook går over grensen sin. */
export const TIDSAVBRUDD = /\b(Test|Hook) timed out in \d+ms/;

/**
 * Feilene som ikke hører til én test: fra reporteren, og for en fil som feilet uten en slik
 * feil og uten en test som feilet, meldingen i JSON-rapporten.
 */
export function suitefeilene(rapport: Rapport): Suitefeil[] {
  const medFeil = new Set(rapport.suitefeil.filter((f) => f.fil).map((f) => f.fil));
  return [
    ...rapport.suitefeil,
    ...rapport.testResults
      .filter(
        (f) =>
          f.status === 'failed' &&
          !medFeil.has(f.name) &&
          !f.assertionResults.some((t) => t.status === 'failed')
      )
      .map((f) => ({ fil: f.name, suite: '', melding: f.message })),
  ];
}

/** Elementene som ikke oppfyller `godtatt`, og de som gjør det. */
function delEtter<T>(liste: T[], godtatt: (x: T) => boolean): [T[], T[]] {
  return [liste.filter((x) => !godtatt(x)), liste.filter(godtatt)];
}

export const suitenavn = (f: Suitefeil, rot: string) =>
  f.fil ? `${relative(rot, f.fil)}${f.suite ? ` > ${f.suite}` : ''}` : 'uhåndtert';

/**
 * Utfallet av én mutasjon. `tidsavbrudd` er satt når den ikke ble oppdaget og tidsavbrudd
 * forklarer det: da er utfallet uavgjort, ikke en overlevende mutasjon (#1122, #1133).
 */
export interface Utfall {
  oppdaget: boolean;
  tidsavbrudd: boolean;
  linjer: string[];
}

/** Om feilen er en av forutsetningene `m` oppgir (#1859). */
const iForutsetningene = (m: Mutasjon, navn: string, melding: string) =>
  (m.forutsetninger ?? []).some((f) => treffer(navn, f.test) && melding.includes(f.melding));

const erAssertion = (t: Testresultat) => t.failureMessages.join('\n').includes('AssertionError');

export function vurder(
  m: Mutasjon,
  rapport: Rapport,
  rot: string,
  maalfiler: ReadonlySet<string>
): Utfall {
  // #2108. Vitest melder filene med realpath.
  const iMaalfilene = (fil: string) => maalfiler.has(relative(rot, fil));
  const [andreFiler, filene] = delEtter(rapport.testResults, (f) => iMaalfilene(f.name));
  // #1425: en uhåndtert feil har ingen fil og hører alltid til vurderingen.
  const [utenforMaalene, iMaalene] = delEtter(
    suitefeilene(rapport),
    (f) => !f.fil || iMaalfilene(f.fil)
  );
  const tester = filene.flatMap((f) => f.assertionResults);
  const feilet = tester.filter((t) => t.status === 'failed');
  const [suitefeil, godtattSuite] = delEtter(
    iMaalene,
    (f) => Boolean(f.fil) && iForutsetningene(m, suitenavn(f, rot), f.melding)
  );
  const utenfor = new Map<string, number>();
  const tell = (fil: string, antall: number) => {
    const sti = relative(rot, fil);
    if (antall) utenfor.set(sti, (utenfor.get(sti) ?? 0) + antall);
  };
  for (const f of utenforMaalene) tell(f.fil, 1);
  for (const f of andreFiler)
    tell(f.name, f.assertionResults.filter((t) => t.status === 'failed' && !erAssertion(t)).length);
  const [ikkeAssertion, godtattTest] = delEtter(
    feilet.filter((t) => !erAssertion(t)),
    (t) => iForutsetningene(m, t.fullName, t.failureMessages.join('\n'))
  );
  const manglerMal = m.mal.filter(
    (mal) =>
      !feilet.some(
        (t) => treffer(t.fullName, mal) && !ikkeAssertion.includes(t) && !godtattTest.includes(t)
      )
  );
  const oppdaget = !suitefeil.length && !ikkeAssertion.length && !manglerMal.length;
  // #1133: uavgjort bare når hver feil som ikke er en assertion, er et tidsavbrudd, og hvert mål
  // som ikke feilet på en assertion, har en test som fikk tidsavbrudd eller ikke ble kjørt. Et
  // mål som kjørte og bestod, er en overlevende mutasjon, uansett tidsavbrudd i andre tester.
  const andreFeil = [
    ...ikkeAssertion.map((t) => t.failureMessages.join('\n')),
    ...suitefeil.map((f) => f.melding),
  ];
  const ikkeKjoert = (t: Testresultat) => t.status !== 'passed' && t.status !== 'failed';
  const tidsavbrudd =
    !oppdaget &&
    andreFeil.length > 0 &&
    andreFeil.every((melding) => TIDSAVBRUDD.test(melding)) &&
    manglerMal.every((mal) =>
      tester.some((t) => treffer(t.fullName, mal) && (ikkeKjoert(t) || ikkeAssertion.includes(t)))
    );
  return {
    oppdaget,
    tidsavbrudd,
    linjer: [
      `\n${m.id} ${m.feilklasse}: ${oppdaget ? 'oppdaget' : tidsavbrudd ? 'IKKE AVGJORT (tidsavbrudd)' : 'IKKE OPPDAGET'}`,
      ...m.endringer.map(([fra, til]) => `  ${m.fil}: ${fra.trim()} → ${til.trim()}`),
      ...feilet.map((t) => `  feilet: ${t.fullName}\n    ${t.failureMessages[0]?.split('\n')[0]}`),
      ...suitefeil.map((f) => `  suitefeil: ${suitenavn(f, rot)}: ${f.melding.split('\n')[0]}`),
      ...ikkeAssertion.map(
        (t) =>
          `  ${TIDSAVBRUDD.test(t.failureMessages.join('\n')) ? 'tidsavbrudd' : 'ikke en assertion'}: ${t.fullName}`
      ),
      ...godtattSuite.map((f) => `  forutsetning (oppgitt): ${suitenavn(f, rot)}`),
      ...[...utenfor].map(
        ([fil, antall]) =>
          `  utenfor målfilene, avgjør ikke utfallet: ${fil}: ${antall} feil som ikke er assertions`
      ),
      ...godtattTest.map((t) => `  forutsetning (oppgitt): ${t.fullName}`),
      ...manglerMal.flatMap((mal) => [
        `  målet feilet ikke på en assertion: ${mal}`,
        ...tester
          .filter((t) => treffer(t.fullName, mal) && ikkeKjoert(t))
          .map((t) => `    ikke kjørt: ${t.fullName}`),
      ]),
    ],
  };
}

/** Hver test, fil eller `describe` som feilet, og hver uhåndtert feil, med den første linjen i feilen. */
export function kontrollfeil(kontroll: Rapport, rot: string): string[] {
  return [
    ...kontroll.testResults
      .flatMap((f) => f.assertionResults)
      .filter((t) => t.status === 'failed')
      .map((t) => `${t.fullName}: ${t.failureMessages[0]?.split('\n')[0]}`),
    ...suitefeilene(kontroll).map((f) => `${suitenavn(f, rot)}: ${f.melding.split('\n')[0]}`),
  ];
}
