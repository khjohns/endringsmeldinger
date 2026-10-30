/**
 * Reporter for feilinnføringene (#1133): skriver feilene på hver fil og hver `describe` til
 * fila i `FEILINNFOERING_SUITEFEIL`. JSON-rapporten fra Vitest tar bare med feilen på
 * filnivå, så en hook i en `describe` som feiler, står der uten melding.
 */
import { writeFileSync } from 'node:fs';

/** Det reporteren leser av en fil eller en `describe` i Vitest. */
interface Suite {
  errors(): { message?: string }[];
}
interface Testfil extends Suite {
  moduleId: string;
  children: { allSuites(): Iterable<Suite & { fullName: string }> };
}

/** En feil som ikke hører til én test, med navnet på `describe` eller tomt for fila. */
export interface Suitefeil {
  fil: string;
  suite: string;
  melding: string;
}

export default class SuitefeilReporter {
  onTestRunEnd(filer: readonly Testfil[]) {
    const ut = process.env.FEILINNFOERING_SUITEFEIL;
    if (!ut) return;
    const feil: Suitefeil[] = filer.flatMap((f) => [
      ...f.errors().map((e) => ({ fil: f.moduleId, suite: '', melding: e.message ?? '' })),
      ...[...f.children.allSuites()].flatMap((s) =>
        s.errors().map((e) => ({ fil: f.moduleId, suite: s.fullName, melding: e.message ?? '' }))
      ),
    ]);
    writeFileSync(ut, JSON.stringify(feil));
  }
}
