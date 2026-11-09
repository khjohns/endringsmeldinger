/**
 * Beløp i hele øre (`regler/beloep.ts`). Tilfellene er flyttet fra `sprakprove/grensetilfeller.json`
 * (#274) da språkprøven ble slettet (#1663). De karakteriserer `Decimal(str(verdi))` med
 * ROUND_HALF_UP, som modulheaderen sier.
 */

import { describe, expect, it } from 'vitest';
import { beloep, heleOere, BroekdelAvOere, UgyldigBeloep } from '../regler/beloep.ts';

const TILFELLER: [inn: number | string, oere: bigint][] = [
  [0.005, 1n],
  [-0.005, -1n],
  [1.005, 101n],
  [0.285, 29n],
  [2.675, 268n],
  // 0.1 + 0.2
  [0.30000000000000004, 30n],
  [123456.785, 12345679n],
  [-123456.785, -12345679n],
  // Tekstformen er den korteste; med toPrecision(15) blir de to neste feil.
  [1234567.8949999998, 123456789n],
  [10000000000000.006, 1000000000000001n],
  [1e16, 1000000000000000000n],
  [1e21, 100000000000000000000000n],
  [-0, 0n],
  [5e-324, 0n],
  [100000, 10000000n],
  ['-0.5', -50n],
];

describe('beløp i hele øre, avrundet halv opp bort fra null', () => {
  it.each(TILFELLER)('%s blir %s øre', (inn, oere) => {
    expect(beloep(inn)).toBe(oere);
  });

  it('et tall som ikke er endelig, avvises', () => {
    expect(() => beloep(Number.NaN)).toThrow(new UgyldigBeloep('ikke et endelig tall: NaN'));
    expect(() => beloep(Number.POSITIVE_INFINITY)).toThrow(
      new UgyldigBeloep('ikke et endelig tall: Infinity')
    );
  });

  it('et beløp med brøkdeler av øre rundes ikke av når parten har sendt det (OV-U58)', () => {
    expect(() => heleOere(0.005)).toThrow(BroekdelAvOere);
    expect(() => heleOere('1.005')).toThrow(BroekdelAvOere);
    expect(heleOere(1234567.89)).toBe(123456789n);
    expect(heleOere('1.100')).toBe(110n);
  });
});
