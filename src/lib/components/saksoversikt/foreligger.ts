import type { Sakslinje } from '$lib/types/api';
import type { Role, SporKey } from '$lib/components/kontraktsbord/types';
import type { FollowUpTask } from '$lib/domain/followUp';
import type { Spor } from '$kjerne/typer';

/** Sporenes navn i oversikten, med nøkkelen fra kjernen og fra saksvisningen. */
export const SPORNAVN: Record<Spor | SporKey, string> = {
  grunnlag: 'Ansvar',
  ansvar: 'Ansvar',
  vederlag: 'Vederlag',
  frist: 'Frist',
};

const SPORA = [
  ['ansvar', 'grunnlag'],
  ['vederlag', 'vederlag'],
  ['frist', 'frist'],
] as const;

/**
 * Det som foreligger i saken, per spor (MM-U29): for byggherren krav som venter på
 * byggherrens svar, og for TE svar som TE ikke har godtatt. Teksten sier hva som
 * foreligger, ikke at parten har plikt eller neste trekk. Lenken åpner sporet
 * uten skjema.
 */
export function foreliggerISaken(linje: Sakslinje): FollowUpTask[] {
  const tittel = linje.sakstittel ?? 'Uten tittel';
  return SPORA.flatMap(([track, spor]) => {
    const navn = SPORNAVN[spor];
    const oppgave = (role: Role, title: string, detail: string): FollowUpTask => ({
      id: `${linje.sak_id}:${track}:${role}`,
      caseId: linje.sak_id,
      caseTitle: tittel,
      track,
      role,
      title,
      detail,
      mode: 'read',
    });
    return [
      ...(linje[spor].venter_paa_svar
        ? [oppgave('BH', 'Kravet venter på byggherrens svar', `${navn}: kravet står uten svar.`)]
        : []),
      ...(linje[spor].svar_ikke_godtatt
        ? [
            oppgave(
              'TE',
              'Byggherrens svar er ikke godtatt',
              `${navn}: byggherren har svart, og partene er ikke enige.`
            ),
          ]
        : []),
    ];
  });
}
