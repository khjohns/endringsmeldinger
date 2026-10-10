/**
 * Lesepunktet for prosjektoversikten (#313). Arbeidslisten og oversikten leser
 * `cached_status`, statusen til endringsordren og oppfølgingen bare herfra, så
 * byttet til kjernens predikater og handlinger skjer her.
 */
import type { CaseListItem } from '$lib/types/api';

export { caseFollowUp, taskHref } from '$lib/domain/followUp';

export type CaseFilter = 'all' | 'active' | 'closed' | 'draft';
export type CaseTypeFilter = 'all' | CaseListItem['sakstype'];
const closed = new Set(['OMFORENT', 'LUKKET', 'LUKKET_TRUKKET', 'akseptert']);

export function caseStatus(item: CaseListItem): string | null {
  return item.endringsordre_data?.status ?? item.cached_status;
}

export function filterCases(
  cases: CaseListItem[],
  query: string,
  filter: CaseFilter,
  caseType: CaseTypeFilter = 'all'
) {
  const needle = query.trim().toLocaleLowerCase('nb-NO');
  return cases.filter((item) => {
    const status = caseStatus(item);
    const draft = status === 'UTKAST' || status === 'utkast';
    const matches =
      filter === 'all' ||
      (filter === 'draft' && draft) ||
      (filter === 'closed' && status !== null && closed.has(status)) ||
      (filter === 'active' && status !== null && !draft && !closed.has(status));
    return (
      matches &&
      (caseType === 'all' || item.sakstype === caseType) &&
      `${item.sak_id} ${item.endringsordre_data?.eo_nummer ?? ''} ${item.cached_title ?? ''}`
        .toLocaleLowerCase('nb-NO')
        .includes(needle)
    );
  });
}

export function overviewStats(cases: CaseListItem[]) {
  const submitted = cases.filter(
    (item) =>
      item.sakstype === 'standard' &&
      item.cached_status !== 'UTKAST' &&
      item.cached_status !== 'LUKKET_TRUKKET'
  );
  const amounts = submitted.filter((item) => item.cached_sum_krevd !== null);
  const assessed = submitted.filter((item) => item.cached_sum_godkjent !== null);
  return {
    total: cases.length,
    claims: cases.filter((item) => item.sakstype === 'standard').length,
    orders: cases.filter((item) => item.sakstype === 'endringsordre').length,
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
    item.sakstype === 'standard' &&
    item.cached_status !== 'UTKAST' &&
    item.cached_status !== 'LUKKET_TRUKKET' &&
    item.cached_dager_krevd != null
  );
}

/** EO records formalize these claims; their old track tasks must not reappear. */
export function formalizedClaims(cases: CaseListItem[]): Set<string> {
  return new Set(
    cases.flatMap((item) =>
      item.sakstype === 'endringsordre' && caseStatus(item) !== 'utkast'
        ? (item.endringsordre_data?.relaterte_koe_saker ?? [])
        : []
    )
  );
}

/** Hvem en endringsordre venter på: TE skal svare på en utstedt eller revidert, BH følger opp en bestridt. */
export function endringsordreVenterPaa(item: CaseListItem): 'TE' | 'BH' | null {
  const status = caseStatus(item);
  if (status === 'utstedt' || status === 'revidert') return 'TE';
  return status === 'bestridt' ? 'BH' : null;
}
