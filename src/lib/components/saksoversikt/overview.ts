/**
 * Utvalgene i prosjektoversikten (#1023). De er grupper i visningen med en skrevet
 * betydning, ikke en status: de leser det som foreligger per spor (MM-U29) og
 * saksbetegnelsen (MM-U22) i linja fra serveren.
 */
import type { Sakslinje } from '$lib/types/api';
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

/**
 * Kravet står slik nøkkeltallene teller det (`noekkeltall` i `server/saksliste.ts`,
 * feltene i #1029): saken er forstått og ikke avsluttet, og kravet er ikke trukket.
 */
export function kravetStaar(linje: Sakslinje, spor: 'vederlag' | 'frist'): boolean {
  return (
    linje.forstaatt &&
    linje[spor].krav !== null &&
    linje.saksbetegnelse !== 'avslaget_paa_grunnlaget_godtatt' &&
    linje.saksbetegnelse !== 'grunnlaget_trukket' &&
    !linje[spor].etiketter.includes('trukket')
  );
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
      (!bareFristkrav || kravetStaar(linje, 'frist')) &&
      `${linje.sak_id} ${linje.sakstittel ?? ''}`.toLocaleLowerCase('nb-NO').includes(needle)
  );
}
