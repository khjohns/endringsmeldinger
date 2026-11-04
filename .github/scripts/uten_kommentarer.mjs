// Skriver TypeScript-koden på stdin uten kommentarer og JSDoc, for
// regelversjonsvakten (#1549). Argumentet er stien, som avgjør språket.
// Kan ikke koden parses, er utgangskoden 3, og vakten regner fila som endret.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const ts = createRequire(import.meta.url)('typescript');
const sti = process.argv[2] ?? '';
const kind = /\.[mc]?ts$/.test(sti) ? ts.ScriptKind.TS : /\.[mc]?js$/.test(sti) ? ts.ScriptKind.JS : null;
if (kind === null) process.exit(3);

// setParentNodes: med foreldrene skriver printeren strengene slik de står i kilden.
const kilde = ts.createSourceFile(sti, readFileSync(0, 'utf8'), ts.ScriptTarget.Latest, true, kind);
if (!Array.isArray(kilde.parseDiagnostics) || kilde.parseDiagnostics.length > 0) process.exit(3);
process.stdout.write(ts.createPrinter({ removeComments: true }).printFile(kilde));
