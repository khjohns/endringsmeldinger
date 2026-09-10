import type { CaseListItem } from '$lib/types/api';
import type { Role, SporKey } from '$lib/components/kontraktsbord/types';

export interface FollowUpTrack {
  status: string;
  antall_versjoner: number;
  bh_resultat?: string | null;
  bh_respondert_versjon?: number | null;
  te_akseptert?: boolean;
  metode?: string | null;
  varsel_type?: string | null;
  krevd_dager?: number | null;
  har_bh_foresporsel?: boolean | null;
}
export interface FollowUpContext {
  sakstype?: string;
  overordnet_status: string;
  grunnlag: FollowUpTrack;
  vederlag: FollowUpTrack;
  frist: FollowUpTrack;
}
export interface FollowUpTask {
  id: string;
  caseId: string;
  caseTitle: string;
  track: SporKey;
  role: Role;
  title: string;
  detail: string;
  mode: 'read' | 'form';
}

export function caseFollowUp(item: CaseListItem): FollowUpTask[] {
  const state = item.oppfolging;
  if (
    !state ||
    (state.sakstype && state.sakstype !== 'standard') ||
    ['OMFORENT', 'LUKKET', 'LUKKET_TRUKKET'].includes(state.overordnet_status)
  )
    return [];
  const tasks: FollowUpTask[] = [];
  for (const [key, track, label] of [
    ['ansvar', state.grunnlag, 'grunnlag'],
    ['vederlag', state.vederlag, 'vederlag'],
    ['frist', state.frist, 'frist'],
  ] as const) {
    if (['ikke_relevant', 'trukket'].includes(track.status) || track.te_akseptert) continue;
    const add = (role: Role, title: string, detail: string, mode: 'read' | 'form' = 'form') =>
      tasks.push({
        id: `${item.sak_id}:${key}:${role}`,
        caseId: item.sak_id,
        caseTitle: item.cached_title ?? 'Uten tittel',
        track: key,
        role,
        title,
        detail,
        mode,
      });
    const revision = Math.max(0, track.antall_versjoner - 1);
    if (track.status === 'utkast') {
      add('TE', `Fullfør ${label}`, 'Kladden er ikke sendt.');
      continue;
    }
    if (key === 'vederlag' && !track.metode) {
      if (track.antall_versjoner > 0)
        add(
          'TE',
          'Spesifiser vederlagskravet',
          'Varsel er sendt. Omfanget er ennå ikke spesifisert.'
        );
      continue;
    }
    if (key === 'frist' && track.varsel_type !== 'spesifisert' && track.krevd_dager == null) {
      if (track.antall_versjoner > 0)
        add(
          'TE',
          track.har_bh_foresporsel ? 'Besvar forespørsel om fristkravet' : 'Spesifiser fristkravet',
          track.har_bh_foresporsel
            ? 'BH har bedt om et spesifisert krav.'
            : 'Varsel er sendt. Omfanget er ennå ikke spesifisert.'
        );
      continue;
    }
    if (track.antall_versjoner === 0) continue;
    const newRevision =
      track.bh_respondert_versjon != null && revision > track.bh_respondert_versjon;
    if (!track.bh_resultat || newRevision) {
      add(
        'BH',
        `Vurder ${label}`,
        `Versjon ${track.antall_versjoner} avventer svar.${newRevision ? ' TE har revidert kravet.' : ''}`
      );
    } else if (['avslatt', 'delvis_godkjent', 'hold_tilbake'].includes(track.bh_resultat)) {
      add(
        'TE',
        `Ta stilling til BHs svar på ${label}`,
        'Les svaret og vurder videre oppfølging.',
        'read'
      );
    }
  }
  return tasks;
}

export function taskHref(task: FollowUpTask, projectId: string, scenario?: string): string {
  const params = new URLSearchParams({ spor: task.track, rolle: task.role });
  if (task.mode === 'form') params.set('mode', 'form');
  if (scenario) params.set('scenario', scenario);
  return `${scenario ? '/mockup' : `/${encodeURIComponent(projectId)}/${encodeURIComponent(task.caseId)}`}?${params}`;
}
