import type { SporStatus } from '$lib/types/timeline';
import type { Krav, ReviewItem } from './types';

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

/** TEs krav slik fullmakten for godkjent ansvar leser det (GFK-06). Speiler `krav_fra_tilstand`. */
export function kravFraSak(sak: {
  vederlag: {
    status: SporStatus;
    krevd_belop?: number | null;
    saerskilt_krav?: Record<string, { belop?: number } | undefined>;
  };
  frist: { status: SporStatus; krevd_dager?: number | null };
}): Krav {
  const ikkeSendt = (status: SporStatus) => status === 'ikke_relevant' || status === 'utkast';
  const { vederlag, frist } = sak;
  const saerskilt = Object.values(vederlag.saerskilt_krav ?? {}).reduce(
    (sum, krav) => sum + Math.abs(krav?.belop ?? 0),
    0
  );
  return {
    vederlag:
      vederlag.status === 'trukket'
        ? 0
        : ikkeSendt(vederlag.status) || vederlag.krevd_belop == null
          ? null
          : Math.abs(vederlag.krevd_belop) + saerskilt,
    frist:
      frist.status === 'trukket' ? 0 : ikkeSendt(frist.status) ? null : (frist.krevd_dager ?? null),
  };
}

interface SvarRad {
  track: 'vederlag' | 'frist';
  fraKrav: false;
  principal: number;
  subsidiary: number;
  principalAmount: number | null;
  subsidiaryAmount: number | null;
}

/** Et spor som ikke besvares i brevet, men åpnes av godkjent ansvar: TEs krav gjelder. */
interface KravRad {
  track: 'vederlag' | 'frist';
  fraKrav: true;
  principal: number | null;
  subsidiary: number | null;
  principalAmount: number | null;
  subsidiaryAmount: number | null;
}

export function calculateAuthority(items: ReviewItem[], dailyRate: number | null, krav?: Krav) {
  const number = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
  const rate = dailyRate !== null && Number.isFinite(dailyRate) && dailyRate > 0 ? dailyRate : null;
  const rows: SvarRad[] = items
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
      const track = item.track as SvarRad['track'];
      // A subsidiary assessment replaces the principal one; the two are never added.
      const subsidiary = subsidiaryValue == null ? assessed : number(subsidiaryValue);
      const amount = (value: number) =>
        item.track === 'frist' ? (value === 0 ? 0 : rate === null ? null : value * rate) : value;
      return {
        track,
        fraKrav: false as const,
        principal,
        subsidiary,
        principalAmount: amount(principal),
        subsidiaryAmount: amount(subsidiary),
      };
    });
  const besvart = new Set(items.map((item) => item.track));
  const ansvarGodkjent = items.some(
    (item) => item.track === 'grunnlag' && item.data.resultat === 'godkjent'
  );
  const kravRows: KravRad[] = ansvarGodkjent
    ? (['vederlag', 'frist'] as const)
        .filter((track) => !besvart.has(track))
        .map((track) => {
          const value = krav?.[track] ?? null;
          const kroner =
            value === null
              ? null
              : track === 'frist'
                ? value === 0
                  ? 0
                  : rate === null
                    ? null
                    : value * rate
                : value;
          return {
            track,
            fraKrav: true as const,
            principal: value,
            subsidiary: value,
            principalAmount: kroner,
            subsidiaryAmount: kroner,
          };
        })
    : [];
  const allRows: (SvarRad | KravRad)[] = [...rows, ...kravRows];
  const manglerSats = allRows.some(
    (r) => r.principal !== null && (r.principalAmount === null || r.subsidiaryAmount === null)
  );
  // Et krav som ikke er tallfestet, krever hele kjeden; det verdsatte er gulvet.
  const ukjent = !manglerSats && kravRows.some((r) => r.principal === null);
  const total = (key: 'principalAmount' | 'subsidiaryAmount') =>
    manglerSats ? null : allRows.reduce((sum, r) => sum + (r[key] ?? 0), 0);
  const principal = total('principalAmount');
  const subsidiary = total('subsidiaryAmount');
  const verdsatt =
    principal === null || subsidiary === null ? null : Math.max(principal, subsidiary);
  const amount = ukjent ? null : verdsatt;
  return {
    rows: allRows,
    dailyRate: rate,
    principal,
    subsidiary,
    amount,
    ukjent,
    minimum: ukjent ? (verdsatt ?? undefined) : undefined,
    required: authorityFor(amount),
  };
}
