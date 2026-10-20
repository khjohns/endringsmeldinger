/**
 * Utvalgene i prosjektoversikten (#1023). De er grupper i visningen med en skrevet
 * betydning, ikke en status: de leser det som foreligger per spor (MM-U29) og
 * saksbetegnelsen (MM-U22) i linja fra serveren.
 */
import type { CaseListItem, Sakslinje } from '$lib/types/api';
import { SPOR } from '$kjerne/typer';

export { taskHref } from '$lib/domain/followUp';

export type Saksutvalg =
  | 'alle'
  | 'venter_paa_svar'
  | 'svar_ikke_godtatt'
  | 'med_saksbetegnelse'
  | 'ikke_forstaatt';

export const SAKSUTVALG: { id: Saksutvalg; label: string; betydning: string }[] = [
  { id: 'alle', label: 'Alle saker', betydning: 'Alle sakene i prosjektet.' },
  {
    id: 'venter_paa_svar',
    label: 'Venter på byggherrens svar',
    betydning: 'Minst ett krav i saken venter på byggherrens svar.',
  },
  {
    id: 'svar_ikke_godtatt',
    label: 'Svar ikke godtatt',
    betydning: 'Byggherren har svart på minst ett krav uten at partene er enige.',
  },
  {
    id: 'med_saksbetegnelse',
    label: 'Med saksbetegnelse',
    betydning: 'Kravene er avgjort, avslaget på ansvaret er godtatt, eller kravet er trukket.',
  },
  {
    id: 'ikke_forstaatt',
    label: 'Ikke forstått',
    betydning: 'Appen forstår ikke hele saken og viser ingen krav eller tall for den.',
  },
];

export function iUtvalg(linje: Sakslinje, utvalg: Saksutvalg): boolean {
  switch (utvalg) {
    case 'alle':
      return true;
    case 'venter_paa_svar':
      return SPOR.some((spor) => linje[spor].venter_paa_svar);
    case 'svar_ikke_godtatt':
      return SPOR.some((spor) => linje[spor].svar_ikke_godtatt);
    case 'med_saksbetegnelse':
      return linje.forstaatt && linje.saksbetegnelse !== null;
    case 'ikke_forstaatt':
      return !linje.forstaatt;
  }
}

export function velgSaker(
  saker: readonly Sakslinje[],
  sok: string,
  utvalg: Saksutvalg,
  bareFristkrav = false
): Sakslinje[] {
  const needle = sok.trim().toLocaleLowerCase('nb-NO');
  return saker.filter(
    (linje) =>
      iUtvalg(linje, utvalg) &&
      (!bareFristkrav || linje.frist.krav !== null) &&
      `${linje.sak_id} ${linje.sakstittel ?? ''}`.toLocaleLowerCase('nb-NO').includes(needle)
  );
}

/**
 * Python-statusene. Bare reproduksjonene i
 * `kontraktsbord/__tests__/strukturkartlegging_spor_d.test.ts` leser dem; de fjernes
 * med den testen (#1051).
 */
const closed = new Set(['OMFORENT', 'LUKKET', 'LUKKET_TRUKKET', 'akseptert']);
export type CaseFilter = 'all' | 'active' | 'closed' | 'draft';

export function filterCases(cases: CaseListItem[], query: string, filter: CaseFilter) {
  const needle = query.trim().toLocaleLowerCase('nb-NO');
  return cases.filter((item) => {
    const status = item.cached_status;
    const draft = status === 'UTKAST';
    const matches =
      filter === 'all' ||
      (filter === 'draft' && draft) ||
      (filter === 'closed' && status !== null && closed.has(status)) ||
      (filter === 'active' && status !== null && !draft && !closed.has(status));
    return (
      matches &&
      `${item.sak_id} ${item.cached_title ?? ''}`.toLocaleLowerCase('nb-NO').includes(needle)
    );
  });
}
