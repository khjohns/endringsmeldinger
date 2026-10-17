/**
 * Ett lesepunkt per visning for statusene fra Python og for TS-sakene (#313). Komponentene leser
 * ikke `SporStatus`, `overordnet_status` eller `cached_status` selv, og ikke
 * etikett- og stiltabellene for dem. Det gjør lesepunktene, så byttet til
 * kjernen skjer der.
 *
 * Vakten er et tekstsøk i `src/`, i skript og markup. Den fanger `.status` på
 * et spor bare når sporet er nevnt ved navn (`sak.frist.status`), ikke gjennom
 * en variabel eller en destrukturering. Testfilene og modulene i `TILLATT`
 * kan lese statusene.
 *
 * For TS-sakene er lesepunktet `src/lib/kjernesak/` (#665). Bare der hentes
 * saken (`hentKjernesak`) og kalles utledningen, visningen, handlingene og
 * forhåndsvisningen i kjernen. Typeimporter er tillatt. Vakten kjenner igjen
 * en import fra `$kjerne/utledning/` og `$kjerne/kommandoer/` og en import av
 * `hentKjernesak`, ikke en relativ sti inn i kjernen; den fanger
 * `src/lib/kjernegrense.test.ts`.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SRC = join(ROT, 'src');

const FORBUDT: [string, RegExp][] = [
  ['statusfelt', /\??\.\s*(overordnet_status|cached_status)\b/],
  ['sporstatus', /\b(grunnlag|vederlag|frist)\??\.\s*status\b/],
  ['statustype', /\b(SporStatus|OverordnetStatus)\b/],
  ['statustabell', /constants\/(statusLabels|statusStyles)\b/],
];

/** Lesingene av statusene i en fil, med linjenummer. */
export function statuslesing(kilde: string): string[] {
  const uten = kilde.replace(/<style\b[\s\S]*?<\/style>/g, (s) => s.replace(/[^\n]/g, ''));
  return uten
    .split('\n')
    .flatMap((linje, i) =>
      FORBUDT.filter(([, m]) => m.test(linje)).map(([navn]) => `${i + 1}: ${navn}`)
    );
}

/** Modulene som kan lese statusene, med grunnen. */
const TILLATT: Record<string, string> = {
  'src/lib/components/kontraktsbord/derive.ts': 'lesepunktet for saksvisningen',
  'src/lib/components/saksoversikt/overview.ts': 'lesepunktet for prosjektoversikten',
  'src/lib/components/case-list/presentation.ts': 'lesepunktet for sakslisten',
  'src/lib/constants/statusLabels.ts': 'etikettene lesepunktene bruker',
  'src/lib/constants/statusStyles.ts': 'stilene lesepunktene bruker',
  'src/lib/types/timeline.ts': 'typene fra Python',
  'src/lib/types/index.ts': 'typene fra Python',
  'src/lib/domain/followUp.ts': 'speilet av Python-reglene, utenfor denne delen av #313',
  'src/lib/approval/authority.ts': 'fullmakten, som speiler `krav_fra_tilstand` i Python',
  'src/lib/mockup/store.svelte.ts': 'demolageret, som har sin egen statusregel',
};

const filer = readdirSync(SRC, { recursive: true, encoding: 'utf8' })
  .map((f) => join(SRC, f))
  .filter(
    (f) =>
      /\.(svelte|ts|js)$/.test(f) &&
      !/\.test\.ts$|[\\/]__tests__[\\/]|[\\/]mocks[\\/]/.test(f) &&
      !(relative(ROT, f).split(sep).join('/') in TILLATT)
  );

describe('lesepunktene for statusene', () => {
  it('bare lesepunktene leser statusene og tabellene deres', () => {
    const funnet = filer.flatMap((fil) =>
      statuslesing(readFileSync(fil, 'utf8')).map((f) => `${relative(ROT, fil)}:${f}`)
    );
    expect(funnet).toEqual([]);
  });

  it('vakten kjenner igjen lesingene', () => {
    expect(
      statuslesing(
        [
          `<script lang="ts">`,
          `  import { getOverordnetStatusStyle } from '$lib/constants/statusStyles.js';`,
          `  const lukket = store.sak.frist.status === 'laast';`,
          `  const s: SporStatus = sak.vederlag?.status;`,
          `</script>`,
          `<span class:sendt={store.sak.overordnet_status === 'SENDT'}>{item.cached_status}</span>`,
          `<style>.frist.status { color: red; }</style>`,
        ].join('\n')
      )
    ).toEqual([
      '2: statustabell',
      '3: sporstatus',
      '4: sporstatus',
      '4: statustype',
      '6: statusfelt',
    ]);
  });
});

const KJERNELESING: [string, RegExp][] = [
  ['kjernekall', /\bimport\s+(?!type\b)[^;'"]*?from\s+['"]\$kjerne\/(utledning|kommandoer)\//g],
  ['kjernehenting', /\bhentKjernesak\b/g],
];

/** Lesingene av en TS-sak utenom lesepunktet, med linjenummer. En import over flere linjer telles på første. */
export function kjernelesing(kilde: string): string[] {
  const linje = (i: number) => kilde.slice(0, i).split('\n').length;
  return KJERNELESING.flatMap(([navn, m]) =>
    [...kilde.matchAll(m)].map((t) => [linje(t.index), navn] as const)
  )
    .sort((x, y) => x[0] - y[0])
    .map(([l, navn]) => `${l}: ${navn}`);
}

/** Lesepunktet for TS-sakene og klienten det bruker. */
const KJERNELESEPUNKT = ['src/lib/kjernesak/', 'src/lib/api/kjerne.ts'];

describe('lesepunktet for TS-sakene', () => {
  it('bare lesepunktet henter saken og kaller utledningen og visningen i kjernen', () => {
    const funnet = readdirSync(SRC, { recursive: true, encoding: 'utf8' })
      .map((f) => join(SRC, f))
      .filter((f) => /\.(svelte|ts|js)$/.test(f) && !/\.test\.ts$|[\\/]__tests__[\\/]/.test(f))
      .map((f) => [f, relative(ROT, f).split(sep).join('/')] as const)
      .filter(([, rel]) => !KJERNELESEPUNKT.some((p) => rel.startsWith(p)))
      .flatMap(([fil, rel]) => kjernelesing(readFileSync(fil, 'utf8')).map((f) => `${rel}:${f}`));
    expect(funnet).toEqual([]);
  });

  it('vakten kjenner igjen lesingene', () => {
    expect(
      kjernelesing(
        [
          `<script lang="ts">`,
          `  import { visning } from '$kjerne/utledning/visning';`,
          `  import type { Visning } from '$kjerne/utledning/visning';`,
          `  import {`,
          `    forhaandsvis,`,
          `    laastTekst,`,
          `  } from '$kjerne/kommandoer/skriving';`,
          `  import { hentKjernesak } from '$lib/api/kjerne';`,
          `  import { HOVEDKATEGORI_FRA_KATALOGEN } from '$kjerne/format/koder';`,
          `</script>`,
        ].join('\n')
      )
    ).toEqual(['2: kjernekall', '4: kjernekall', '8: kjernehenting']);
  });
});
