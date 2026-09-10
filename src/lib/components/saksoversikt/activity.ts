import type { CaseListItem } from '$lib/types/api';
import type { Role, SporKey } from '$lib/components/kontraktsbord/types';

const tracks: Record<string, SporKey> = { K: 'ansvar', V: 'vederlag', F: 'frist' };
export function projectActivity(cases: CaseListItem[], query = '', track = '') {
  const needle = query.trim().toLocaleLowerCase('nb-NO');
  return cases
    .flatMap((item) =>
      (item.hendelser ?? []).map((event, index) => ({
        ...event,
        key: `${item.sak_id}:${event.id ?? index}`,
        caseId: item.sak_id,
        caseTitle: item.cached_title || 'Uten tittel',
        timestamp: Number.isFinite(Date.parse(event.dato)) ? Date.parse(event.dato) : null,
      }))
    )
    .filter(
      (event) =>
        (!track || event.type === track) &&
        `${event.caseId} ${event.caseTitle} ${event.label}`
          .toLocaleLowerCase('nb-NO')
          .includes(needle)
    )
    .sort(
      (a, b) =>
        (b.timestamp ?? -Infinity) - (a.timestamp ?? -Infinity) || a.key.localeCompare(b.key)
    );
}
export function activityHref(
  event: { caseId: string; type: string },
  projectId: string,
  role: Role,
  scenario?: string
) {
  const params = new URLSearchParams({ spor: tracks[event.type] ?? 'ansvar', rolle: role });
  if (scenario) params.set('scenario', scenario);
  return `${scenario ? '/mockup' : `/${encodeURIComponent(projectId)}/${encodeURIComponent(event.caseId)}`}?${params}`;
}
export function activityDate(timestamp: number | null) {
  return timestamp == null
    ? 'Dato ikke oppgitt'
    : new Intl.DateTimeFormat('nb-NO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Oslo',
      }).format(timestamp);
}
