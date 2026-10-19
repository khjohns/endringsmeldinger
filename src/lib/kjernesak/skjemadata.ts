/**
 * Kontrollene av skjemadataene som er felles for TE-skjemaene på TS-stien (#909).
 * Et brev fra appen har ingen form for vedlegg i kjernen ennå (#828), så vedlegg
 * avvises her og sendes ikke. Et registrert brev har vedleggene i kommandoen.
 */

import type { Vedlegg } from '$kjerne/typer';
import type { Vedleggsoppslag } from '$kjerne/kommandoer/skriving';

export function utenVedlegg(data: { vedlegg_ids?: string[] }): void {
  if (data.vedlegg_ids?.length)
    throw new Error('Brevet kan ikke ha vedlegg ennå. Fjern vedleggene før du sender.');
}

/**
 * Oppslaget kjernen leser vedleggene i et registrert brev fra (LV-U14), med bare feltene
 * brevet lagrer. Serveren svarer med flere, som størrelsen, og dem forstår ikke formatet.
 */
export const vedleggsoppslag = (vedlegg: readonly Vedlegg[]): Vedleggsoppslag =>
  new Map(
    vedlegg.map(({ vedlegg_id, filnavn, innhold_sha256 }) => [
      vedlegg_id.toLowerCase(),
      { vedlegg_id, filnavn, innhold_sha256 },
    ])
  );
