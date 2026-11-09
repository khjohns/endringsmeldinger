/**
 * Beløp i hele øre (`regler/beloep.ts`). Tilfellene er flyttet fra `sprakprove/grensetilfeller.json`
 * (#274) da språkprøven ble slettet (#1663). De karakteriserer `Decimal(str(verdi))` med
 * ROUND_HALF_UP, som modulheaderen sier, og to av dem er reproduksjonen av SP-01 i hovedplanen.
 */

import { describe, expect, it } from 'vitest';
import { beloep, heleOere, BroekdelAvOere } from '../regler/beloep.ts';

const TILFELLER: [inn: number | string, oere: bigint, merknad?: string][] = [
  [0.005, 1n],
  [-0.005, -1n],
  [1.005, 101n],
  [0.285, 29n],
  [2.675, 268n],
  [0.30000000000000004, 30n, '0.1 + 0.2'],
  [123456.785, 12345679n],
  [-123456.785, -12345679n],
  [1234567.8949999998, 123456789n, 'SP-01: speilet i src/lib/domain gir 1234567,90'],
  [10000000000000.006, 1000000000000001n, 'SP-01: speilet i src/lib/domain mister øre her'],
  [1e16, 1000000000000000000n],
  [1e21, 100000000000000000000000n],
  [-0, 0n],
  [5e-324, 0n],
  [100000, 10000000n],
  ['-0.5', -50n],
];

describe('beløp i hele øre, avrundet halv opp bort fra null', () => {
  it.each(TILFELLER)('%s', (inn, oere) => {
    expect(beloep(inn)).toBe(oere);
  });

  it('avviser et tall som ikke er endelig', () => {
    expect(() => beloep(Number.NaN)).toThrow();
    expect(() => beloep(Number.POSITIVE_INFINITY)).toThrow();
  });

  it('et beløp med brøkdeler av øre rundes ikke av når parten har sendt det (OV-U58)', () => {
    expect(() => heleOere(0.005)).toThrow(BroekdelAvOere);
    expect(heleOere(1234567.89)).toBe(123456789n);
  });
});
