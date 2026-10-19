/**
 * Kommandoene `TeFristForm` sender på TS-stien (#909, B-17). Et foreløpig varsel er
 * et eget varsel etter § 33.4 uten dager og uten fritekst (VS-U15). Et spesifisert
 * krav har dagene og begrunnelsen, som er utdypningen og må ha tekst (KA-U33).
 * Begrunnelse utsatt etter § 33.6.2 har ingen kommando, og vedlegg har ingen form i
 * kjernen ennå (#828), så de avvises her og sendes ikke.
 */

import { letterText } from '$lib/approval/letter';
import type { FristSubmissionEventData } from '$lib/domain/fristSubmissionDomain';

export type Fristkommando =
  | { type: 'send_varsel'; spor: 'frist'; hjemmel: '33.4' }
  | { type: 'krav'; spor: 'frist'; innhold: { dager: number }; utdypning: string };

export function fristkommandoFraSkjema(
  data: FristSubmissionEventData & { vedlegg_ids?: string[] }
): Fristkommando {
  if (data.vedlegg_ids?.length) throw new Error('Vedlegg kan ikke sendes i TS-stien ennå.');
  const utdypning = letterText(data.begrunnelse ?? '').trim();
  if (data.varsel_type === 'varsel') {
    if (utdypning) throw new Error('Varselet etter § 33.4 har ingen fritekst fra appen (VS-U15).');
    return { type: 'send_varsel', spor: 'frist', hjemmel: '33.4' };
  }
  if (data.varsel_type !== 'spesifisert')
    throw new Error('Begrunnelse utsatt etter § 33.6.2 kan ikke sendes i TS-stien ennå.');
  if (!utdypning)
    throw new Error('Kravet om fristforlengelse må begrunne antallet dager (KA-U33).');
  return {
    type: 'krav',
    spor: 'frist',
    innhold: { dager: data.antall_dager ?? 0 },
    utdypning,
  };
}
