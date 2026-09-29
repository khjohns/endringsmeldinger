import { describe, expect, it } from 'vitest';
import { authorityFor, authorityMatrix, calculateAuthority, kravFraSak } from './authority';
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

  describe('godkjent ansvar (GFK-06)', () => {
    const ansvar = (resultat: string) =>
      ({ track: 'grunnlag', data: { resultat } }) as unknown as ReviewItem;
    const krav = { vederlag: 50_000_000, frist: 20 };

    it('verdsetter ubesvarte spor etter kravet og besvarte etter svaret', () => {
      expect(calculateAuthority([ansvar('godkjent')], 10_000, krav).amount).toBe(50_200_000);
      expect(
        calculateAuthority(
          [ansvar('godkjent'), item('vederlag', { total_godkjent_belop: 30_000_000 })],
          10_000,
          krav
        ).amount
      ).toBe(30_200_000);
    });

    it('verdsetter avslått og frafalt ansvar til null', () => {
      for (const resultat of ['avslatt', 'frafalt'])
        expect(calculateAuthority([ansvar(resultat)], 10_000, krav).amount).toBe(0);
    });

    it('krever hele kjeden når kravet ikke er tallfestet, med det verdsatte som gulv', () => {
      const result = calculateAuthority([ansvar('godkjent')], 10_000, {
        vederlag: 2_000_000,
        frist: null,
      });
      expect(result.amount).toBeNull();
      expect(result.ukjent).toBe(true);
      expect(result.minimum).toBe(2_000_000);
      expect(calculateAuthority([ansvar('godkjent')], 10_000).ukjent).toBe(true);
    });

    it('skiller manglende sats fra ukjent krav', () => {
      const result = calculateAuthority([ansvar('godkjent')], null, { vederlag: 0, frist: 5 });
      expect(result.amount).toBeNull();
      expect(result.ukjent).toBe(false);
    });

    it('leser kravet av saken som serveren gjør', () => {
      expect(
        kravFraSak({
          vederlag: {
            status: 'sendt',
            krevd_belop: -100_000,
            saerskilt_krav: { rigg_drift: { belop: 20_000 }, produktivitet: { belop: 5_000 } },
          },
          frist: { status: 'sendt', krevd_dager: 7 },
        })
      ).toEqual({ vederlag: 125_000, frist: 7 });
      expect(
        kravFraSak({ vederlag: { status: 'utkast' }, frist: { status: 'trukket', krevd_dager: 7 } })
      ).toEqual({ vederlag: null, frist: 0 });
      expect(kravFraSak({ vederlag: { status: 'sendt' }, frist: { status: 'sendt' } })).toEqual({
        vederlag: null,
        frist: null,
      });
    });
  });
});
