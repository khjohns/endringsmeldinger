/**
 * Grensen for Varden (#1331): komponentene importerer ingen regler eller utledning utenom
 * kjernen og `lagKjernesak`. Det de kan importere, står i en hviteliste. Alt annet, som
 * oversetterne og projeksjonene i `$lib/kjernesak/`, `$lib/domain/` og dagens saksvisning,
 * gir rød test. Importene leses med TypeScript-parseren og løses til absolutte stier, så
 * alias, relative stier, `export … from`, `import()` og `require()` teller likt.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const VARDEN = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROT = resolve(VARDEN, '..', '..', '..', '..');
const LIB = join(ROT, 'src', 'lib');
const KJERNE = join(ROT, 'kjerne');

/** Pakkene og modulene utenfor kjernen og mappa Varden kan importere. */
const PAKKER = new Set(['svelte', 'lucide-svelte']);
const MODULER = new Set(
  [
    'kjernesak/kontekst.svelte',
    // Bindingsteksten i arbeidsvalget 26.10, som dagens skjema også viser. Ingen regel.
    'kjernesak/bindingstekst',
    'components/kontraktsbord/theme.css',
  ].map((m) => join(LIB, m))
);

const under = (sti: string, mappe: string) => sti === mappe || sti.startsWith(mappe + sep);
const utenEndelse = (sti: string) => sti.replace(/\.(ts|js)$/, '');

function importer(fil: string, kilde: string): string[] {
  const kode = fil.endsWith('.svelte')
    ? [...kilde.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n')
    : kilde;
  return ts.preProcessFile(kode, true, true).importedFiles.map(({ fileName: navn }) => {
    if (navn === '$lib' || navn.startsWith('$lib/')) return join(LIB, navn.slice(4));
    if (navn === '$kjerne' || navn.startsWith('$kjerne/')) return join(KJERNE, navn.slice(7));
    if (navn.startsWith('/')) return join(ROT, navn);
    return navn.startsWith('.') ? resolve(dirname(fil), navn) : navn;
  });
}

/** Importene i `kilder` som ikke står i hvitelisten, som «fil → import». */
export function forbudte(kilder: Map<string, string>): string[] {
  return [...kilder].flatMap(([fil, kilde]) =>
    importer(fil, kilde)
      .filter((i) => {
        if (PAKKER.has(i)) return false;
        if (under(i, KJERNE)) return under(i, join(KJERNE, 'tester'));
        if (MODULER.has(utenEndelse(i))) return false;
        return !(under(i, VARDEN) && !under(i, join(VARDEN, '__tests__')));
      })
      .map((i) => `${relative(ROT, fil)} → ${i.startsWith(ROT) ? relative(ROT, i) : i}`)
  );
}

const komponentene = readdirSync(VARDEN, { recursive: true, encoding: 'utf8' })
  .map((f) => join(VARDEN, f))
  .filter((f) => /\.(ts|svelte)$/.test(f) && statSync(f).isFile() && !f.includes('__tests__'));

describe('grensen for Varden', () => {
  it('komponentene importerer bare kjernen, lagKjernesak og hvitelisten', () => {
    expect(komponentene.length).toBeGreaterThan(5);
    expect(forbudte(new Map(komponentene.map((f) => [f, readFileSync(f, 'utf8')])))).toEqual([]);
  });

  it('vakten kjenner igjen en forbudt import i hver form', () => {
    const fil = join(VARDEN, 'Eksempel.svelte');
    const ts_ = join(VARDEN, 'eksempel.ts');
    const kilder = new Map([
      [
        fil,
        `<script lang="ts">\n  import { vederlagslag } from '$lib/kjernesak/vederlagssvar';\n  import { lagKjernesak } from '$lib/kjernesak/kontekst.svelte';\n</script>`,
      ],
      [
        ts_,
        [
          `import { lagSaksbilde } from '../../kjernesak/saksbilde';`,
          `export * from '$lib/domain/vederlagDomain';`,
          `const d = await import('$lib/components/kontraktsbord/derive');`,
          `import { kjoer } from '$kjerne/tester/kjoerer';`,
          `import { handlinger } from '$kjerne/kommandoer/handlinger';`,
          `import x from 'bits-ui';`,
          `import { brevene } from './lesing';`,
          `import { hjelp } from './__tests__/hjelp';`,
        ].join('\n'),
      ],
    ]);
    expect(forbudte(kilder)).toEqual([
      'src/lib/components/varden/Eksempel.svelte → src/lib/kjernesak/vederlagssvar',
      'src/lib/components/varden/eksempel.ts → src/lib/kjernesak/saksbilde',
      'src/lib/components/varden/eksempel.ts → src/lib/domain/vederlagDomain',
      'src/lib/components/varden/eksempel.ts → src/lib/components/kontraktsbord/derive',
      'src/lib/components/varden/eksempel.ts → kjerne/tester/kjoerer',
      'src/lib/components/varden/eksempel.ts → bits-ui',
      'src/lib/components/varden/eksempel.ts → src/lib/components/varden/__tests__/hjelp',
    ]);
  });
});
