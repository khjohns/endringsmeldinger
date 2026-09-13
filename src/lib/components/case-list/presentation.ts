import type { CaseListItem } from '$lib/types/api';

export function caseAmount(item: CaseListItem): number | null {
  return item.sakstype === 'endringsordre'
    ? (item.endringsordre_data?.netto_belop ?? null)
    : item.cached_sum_krevd;
}

export function caseDays(item: CaseListItem): number | null {
  return item.sakstype === 'endringsordre'
    ? (item.endringsordre_data?.frist_dager ?? null)
    : item.cached_dager_krevd;
}
