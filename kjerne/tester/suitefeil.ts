/**
 * Reporter for feilinnføringene (#1133, #1425): skriver feilene på hver fil, i hver `describe`
 * og uhåndterte feil fra kjøringen til fila i `FEILINNFOERING_SUITEFEIL`. JSON-rapporten fra
 * Vitest tar bare med feilen på filnivå, så en hook i en `describe` som feiler, står der uten
 * melding, og uhåndterte feil står ikke per fil.
 */
import { writeFileSync } from 'node:fs';

/** Det reporteren leser av en feil i Vitest. */
export interface Vitestfeil {
  message?: unknown;
  name?: string;
  type?: string;
}

/** Det reporteren leser av en fil eller en `describe` i Vitest. */
export interface Suite {
  errors(): Vitestfeil[];
}
export interface Testfil extends Suite {
  moduleId: string;
  children: { allSuites(): Iterable<Suite & { fullName: string }> };
}

/**
 * En feil som ikke hører til én test: `suite` er `describe` eller tom for fila, og både
 * `fil` og `suite` er tomme for en uhåndtert feil (#1425).
 */
export interface Suitefeil {
  fil: string;
  suite: string;
  melding: string;
}

const melding = (e: Vitestfeil): string => {
  const tekst = e.message !== undefined && e.message !== null ? String(e.message) : '';
  return tekst || e.name || e.type || '';
};

export function samleSuitefeil(
  filer: readonly Testfil[],
  uhaandterte: readonly Vitestfeil[] = []
): Suitefeil[] {
  return [
    ...filer.flatMap((f) => [
      ...f.errors().map((e) => ({ fil: f.moduleId, suite: '', melding: melding(e) })),
      ...[...f.children.allSuites()].flatMap((s) =>
        s.errors().map((e) => ({ fil: f.moduleId, suite: s.fullName, melding: melding(e) }))
      ),
    ]),
    ...uhaandterte.map((e) => ({ fil: '', suite: '', melding: melding(e) })),
  ];
}

export default class SuitefeilReporter {
  onTestRunEnd(filer: readonly Testfil[], uhaandterte: readonly Vitestfeil[] = []) {
    const ut = process.env.FEILINNFOERING_SUITEFEIL;
    if (!ut) return;
    writeFileSync(ut, JSON.stringify(samleSuitefeil(filer, uhaandterte)));
  }
}
