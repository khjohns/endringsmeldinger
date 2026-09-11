import { describe, expect, it } from 'vitest';
import { authorityFor, authorityMatrix, calculateAuthority } from './authority';
import type { ReviewItem } from './types';
const item = (track: 'vederlag' | 'frist', data: Record<string, unknown>, rejected = false) =>
  ({ track, data, basis: { resultat: rejected ? 'avslatt' : 'godkjent' } }) as ReviewItem;
describe('fullmaktsgrunnlag januar 2026', () => {
  it('uses inclusive limits in kroner, including unlimited authority', () => {
    for (let index = 0; index < authorityMatrix.length - 1; index++) {
      const row = authorityMatrix[index];
      expect(authorityFor(row.limit!)?.role).toBe(row.role);
      expect(authorityFor(row.limit! + 1)?.role).toBe(authorityMatrix[index + 1].role);
    }
    expect(authorityFor(null)).toBeNull();
  });
  it('values time in kroner and adds it to monetary approval', () => {
    const result = calculateAuthority(
      [item('vederlag', { total_godkjent_belop: 200000 }), item('frist', { godkjent_dager: 10 })],
      50000
    );
    expect(result.amount).toBe(700000);
    expect(result.required?.role).toBe('Seksjonsleder');
  });
  it('includes subsidiary exposure when the contractual basis is rejected', () => {
    const result = calculateAuthority(
      [
        item('vederlag', { total_godkjent_belop: 2930000 }, true),
        item('frist', { godkjent_dager: 45 }, true),
      ],
      50000
    );
    expect(result.principal).toBe(0);
    expect(result.subsidiary).toBe(5180000);
    expect(result.required?.limit).toBeNull();
  });
  it('chooses the larger combined position without adding alternatives', () => {
    const result = calculateAuthority(
      [
        item('vederlag', { total_godkjent_belop: 150000, subsidiaer_godkjent_belop: 500000 }),
        item('frist', { godkjent_dager: 10, subsidiaer_godkjent_dager: 5 }),
      ],
      50000
    );
    expect(result.principal).toBe(650000);
    expect(result.subsidiary).toBe(750000);
    expect(result.amount).toBe(750000);
  });
  it('does not silently value approved days at zero when the daily rate is missing', () => {
    expect(calculateAuthority([item('frist', { godkjent_dager: 10 })], null).amount).toBeNull();
    expect(calculateAuthority([item('frist', { godkjent_dager: 0 })], null).amount).toBe(0);
    expect(
      calculateAuthority([item('vederlag', { total_godkjent_belop: 500000 })], null).amount
    ).toBe(500000);
  });
});
