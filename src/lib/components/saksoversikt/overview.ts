import type { CaseListItem } from '$lib/types/api';

export type CaseFilter = 'all' | 'active' | 'closed' | 'draft';
const closed = new Set(['OMFORENT', 'LUKKET', 'LUKKET_TRUKKET']);

export function filterCases(cases: CaseListItem[], query: string, filter: CaseFilter) {
  const needle = query.trim().toLocaleLowerCase('nb-NO');
  return cases.filter((item) => {
    const status = item.cached_status;
    const matches =
      filter === 'all' ||
      (filter === 'draft' && status === 'UTKAST') ||
      (filter === 'closed' && status !== null && closed.has(status)) ||
      (filter === 'active' && status !== null && status !== 'UTKAST' && !closed.has(status));
    return (
      matches &&
      `${item.sak_id} ${item.cached_title ?? ''}`.toLocaleLowerCase('nb-NO').includes(needle)
    );
  });
}

export function overviewStats(cases: CaseListItem[]) {
  const submitted = cases.filter(
    (item) => item.cached_status !== 'UTKAST' && item.cached_status !== 'LUKKET_TRUKKET'
  );
  const amounts = submitted.filter((item) => item.cached_sum_krevd !== null);
  const assessed = submitted.filter((item) => item.cached_sum_godkjent !== null);
  return {
    total: cases.length,
    timeClaims: cases.filter(isTimeClaim).length,
    unassessedTimeClaims: cases.filter(
      (item) => isTimeClaim(item) && item.cached_dager_godkjent == null
    ).length,
    active: filterCases(cases, '', 'active').length,
    drafts: filterCases(cases, '', 'draft').length,
    claimed: amounts.length ? amounts.reduce((sum, item) => sum + item.cached_sum_krevd!, 0) : null,
    approved: assessed.length
      ? assessed.reduce((sum, item) => sum + item.cached_sum_godkjent!, 0)
      : null,
    assessed: assessed.length,
  };
}

/** Count specified, submitted time claims; a recorded zero is still an assessment. */
export function isTimeClaim(item: CaseListItem): boolean {
  return (
    item.cached_status !== 'UTKAST' &&
    item.cached_status !== 'LUKKET_TRUKKET' &&
    item.cached_dager_krevd != null
  );
}
