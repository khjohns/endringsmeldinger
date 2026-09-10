import { SCENARIOS } from '$lib/mockup/scenarios';
import type { CaseListItem, CaseListHendelse } from '$lib/types/api';

export const demoScenarioIds = Object.fromEntries(
  SCENARIOS.map((scenario) => [scenario.sak.sak_id, scenario.id])
);

/** The register and follow-up links use the same cases as the editable demo. */
export const demoOverviewCases: CaseListItem[] = SCENARIOS.map(({ sak, timeline }) => ({
  sak_id: sak.sak_id,
  sakstype: 'standard',
  cached_title: sak.sakstittel,
  cached_status: sak.overordnet_status,
  created_at: sak.opprettet ?? null,
  created_by: sak.entreprenor ?? 'TE',
  last_event_at: sak.siste_aktivitet ?? null,
  cached_sum_krevd: sak.vederlag.krevd_belop ?? null,
  cached_sum_godkjent: sak.vederlag.bh_resultat ? (sak.vederlag.godkjent_belop ?? null) : null,
  cached_dager_krevd: sak.frist.krevd_dager ?? null,
  cached_dager_godkjent: sak.frist.bh_resultat ? (sak.frist.godkjent_dager ?? null) : null,
  cached_hovedkategori: sak.grunnlag.hovedkategori ?? null,
  cached_underkategori: Array.isArray(sak.grunnlag.underkategori)
    ? (sak.grunnlag.underkategori[0] ?? null)
    : (sak.grunnlag.underkategori ?? null),
  cached_forsering_paalopt: null,
  cached_forsering_maks: null,
  oppfolging: sak,
  hendelser: timeline
    .filter((event) => event.spor && event.time)
    .map(
      (event): CaseListHendelse => ({
        type: event.spor === 'grunnlag' ? 'K' : event.spor === 'vederlag' ? 'V' : 'F',
        dato: event.time!,
        id: event.id,
        rolle: event.actorrole,
        label: event.summary ?? event.type,
      })
    ),
}));
