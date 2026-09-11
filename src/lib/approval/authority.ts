import type { ReviewItem } from './types';

/** User-provided matrix: endring i kontrakt, januar 2026. All limits are NOK. */
export const authorityMatrix = [
  { role: 'Prosjektleder', limit: 200_000 },
  { role: 'Prosjektdirektør', limit: 500_000 },
  { role: 'Seksjonsleder', limit: 1_500_000 },
  { role: 'Avdelingsleder', limit: 3_000_000 },
  { role: 'Divisjonsdirektør', limit: 5_000_000 },
  { role: 'Adm.dir (daglig leder)', limit: null },
] as const;

export function authorityFor(amount: number | null) {
  return amount === null
    ? null
    : authorityMatrix.find((row) => row.limit === null || amount <= row.limit)!;
}

export function calculateAuthority(items: ReviewItem[], dailyRate: number | null) {
  const number = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
  const rate = dailyRate !== null && Number.isFinite(dailyRate) && dailyRate > 0 ? dailyRate : null;
  const rows = items
    .filter((item) => item.track !== 'grunnlag')
    .map((item) => {
      const d = item.data;
      const rejected =
        item.basis?.resultat === 'avslatt' ||
        (item.basis?.hovedkategori === 'ENDRING' && item.basis.varsletITide === false);
      const assessed = number(
        item.track === 'vederlag' ? (d.total_godkjent_belop ?? d.godkjent_belop) : d.godkjent_dager
      );
      const subsidiaryValue =
        item.track === 'vederlag' ? d.subsidiaer_godkjent_belop : d.subsidiaer_godkjent_dager;
      const principal = rejected ? 0 : assessed;
      // A subsidiary assessment replaces the principal one; the two are never added.
      const subsidiary = subsidiaryValue == null ? assessed : number(subsidiaryValue);
      const amount = (value: number) =>
        item.track === 'frist' ? (value === 0 ? 0 : rate === null ? null : value * rate) : value;
      return {
        track: item.track,
        principal,
        subsidiary,
        principalAmount: amount(principal),
        subsidiaryAmount: amount(subsidiary),
      };
    });
  const total = (key: 'principalAmount' | 'subsidiaryAmount') =>
    rows.some((r) => r[key] === null) ? null : rows.reduce((sum, r) => sum + (r[key] ?? 0), 0);
  const principal = total('principalAmount');
  const subsidiary = total('subsidiaryAmount');
  const amount = principal === null || subsidiary === null ? null : Math.max(principal, subsidiary);
  return { rows, dailyRate: rate, principal, subsidiary, amount, required: authorityFor(amount) };
}
