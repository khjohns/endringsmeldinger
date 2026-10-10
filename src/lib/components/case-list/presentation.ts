/**
 * Lesepunktet for sakslisten (#313). Radene og sorteringen leser statusen og
 * etiketten bare herfra, så byttet til kjernens visning skjer her.
 */
import type { CaseListItem } from '$lib/types/api';
import type { OverordnetStatus } from '$lib/types/timeline';
import { getOverordnetStatusLabel } from '$lib/constants/statusLabels';
import { caseStatus } from '$lib/components/saksoversikt/overview';

export { caseStatus };

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

export type StatusBadge = 'godkjent' | 'avslatt' | 'delvis' | 'uavklart' | 'na';

function statusBadge(status: string | null): StatusBadge {
  switch (status) {
    case 'OMFORENT':
    case 'LUKKET':
    case 'akseptert':
      return 'godkjent';
    case 'LUKKET_TRUKKET':
    case 'bestridt':
      return 'avslatt';
    case 'SENDT':
    case 'VENTER_PAA_SVAR':
    case 'UNDER_BEHANDLING':
    case 'UNDER_FORHANDLING':
    case 'utstedt':
    case 'revidert':
      return 'delvis';
    case 'UTKAST':
    default:
      return 'uavklart';
  }
}

const EO_STATUS_LABELS: Record<string, string> = {
  utkast: 'Utkast',
  utstedt: 'Utstedt',
  akseptert: 'Akseptert',
  bestridt: 'Bestridt',
  revidert: 'Revidert',
};

/** Statusmerket i raden: etiketten og varianten. */
export function caseStatusBadge(item: CaseListItem): { label: string; variant: StatusBadge } {
  const status = caseStatus(item);
  return {
    label: status
      ? (EO_STATUS_LABELS[status] ?? getOverordnetStatusLabel(status as OverordnetStatus))
      : '—',
    variant: statusBadge(status),
  };
}
