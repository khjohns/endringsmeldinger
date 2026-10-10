/**
 * Ett lesepunkt per visning for statusene fra Python (#313). Komponentene leser
 * ikke `SporStatus`, `overordnet_status` eller `cached_status` selv, og ikke
 * etikett- og stiltabellene for dem. Det gjør lesepunktene, så byttet til
 * kjernen skjer der.
 *
 * Vakten er et tekstsøk i `.svelte`-filene, i skript og markup. Den fanger
 * `.status` på et spor bare når sporet er nevnt ved navn (`sak.frist.status`),
 * ikke gjennom en variabel eller en destrukturering. TS-modulene i `src/` dekkes
 * ikke: lesepunktene er selv slike moduler, og det samme er `$lib/domain/`,
 * mockupens demolager og fullmakten i `$lib/approval/authority.ts`.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
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

/** Lesingene av statusene i en komponent, med linjenummer. */
export function statuslesing(kilde: string): string[] {
  const uten = kilde.replace(/<style\b[\s\S]*?<\/style>/g, (s) => s.replace(/[^\n]/g, ''));
  return uten
    .split('\n')
    .flatMap((linje, i) =>
      FORBUDT.filter(([, m]) => m.test(linje)).map(([navn]) => `${i + 1}: ${navn}`)
    );
}

const komponenter = readdirSync(SRC, { recursive: true, encoding: 'utf8' })
  .filter((f) => f.endsWith('.svelte'))
  .map((f) => join(SRC, f));

describe('lesepunktene for statusene', () => {
  it('ingen komponent leser statusene eller tabellene deres selv', () => {
    const funnet = komponenter.flatMap((fil) =>
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
