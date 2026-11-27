import { describe, expect, it } from 'vitest';
import { handlingerISporet } from '#lib/components/varden/lesing.ts';
import type { TilbudtHandling } from '#kjerne/kommandoer/handlinger.ts';
import type { Utledning } from '#kjerne/utledning/utled.ts';

const h = (noekkel: string, type: TilbudtHandling['type'], gjelder: string | null) =>
  ({ noekkel, type, spor: 'frist', hjemmel: null, gjelder }) as TilbudtHandling;

const u = {
  spor: { frist: { krav: [{ id: 'krav-1' }] } },
} as unknown as Pick<Utledning, 'spor'>;

describe('handlingene i sporet i Varden', () => {
  it('svaret bare på varselet i kravversjonen vises ikke før skjemaet er bygget (VS-U96 punkt 38, #2456)', () => {
    const tilbudt = [
      h('svare:frist', 'svare', null),
      h('svare:krav-1', 'svare', 'krav-1'),
      h('revidere:krav-1', 'revidere', 'krav-1'),
      h('svare:varsel-1', 'svare', 'varsel-1'),
    ];
    expect(handlingerISporet(tilbudt, 'frist', u).map((x) => x.noekkel)).toEqual([
      'svare:frist',
      'svare:varsel-1',
    ]);
  });
});
