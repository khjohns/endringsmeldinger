/**
 * Kommandoene `TeFristForm` sender på TS-stien (#909, B-17). Et foreløpig varsel er
 * et eget varsel etter § 33.4 uten dager og uten fritekst (VS-U15). Et varsel sendt
 * utenfor appen registreres med datoen og brevet som vedlegg, uten tekst fra appen
 * (MM-U1, OV-U4, MM-U17). Et spesifisert krav har dagene og begrunnelsen, som er
 * utdypningen og må ha tekst (KA-U33). Begrunnelse utsatt etter § 33.6.2 har ingen
 * kommando, så den avvises her og sendes ikke.
 */

import { letterText } from '$lib/approval/letter';
import type { FristSubmissionEventData } from '$lib/domain/fristSubmissionDomain';
import type { Vedlegg } from '$kjerne/typer';
import { utenVedlegg } from './skjemadata';

export type Fristkommando =
  | { type: 'send_varsel'; spor: 'frist'; hjemmel: '33.4' }
  | { type: 'varsel'; spor: 'frist'; hjemmel: '33.4'; sendt: string; dokumentasjon: string[] }
  | { type: 'krav'; spor: 'frist'; innhold: { dager: number }; utdypning: string };

/** Varselet TE sendte utenfor appen: datoen det ble sendt, og brevet som vedlegg. */
export interface RegistrertVarsel {
  sendt: string;
  vedlegg: Vedlegg[];
}

export type Fristskjemadata = FristSubmissionEventData & {
  vedlegg_ids?: string[];
  registrert?: RegistrertVarsel;
};

const ISO_DATO = /^\d{4}-\d{2}-\d{2}$/;

function registrering(
  { sendt, vedlegg }: RegistrertVarsel,
  utdypning: string,
  idag: string
): Fristkommando {
  if (utdypning)
    throw new Error('Et registrert varsel har ingen tekst fra appen. Fjern teksten i skjemaet.');
  if (!ISO_DATO.test(sendt)) throw new Error('Oppgi datoen varselet ble sendt.');
  if (sendt > idag) throw new Error('Datoen varselet ble sendt, er etter dagens dato.');
  if (!vedlegg.length) throw new Error('Legg ved brevet med varselet.');
  return {
    type: 'varsel',
    spor: 'frist',
    hjemmel: '33.4',
    sendt,
    dokumentasjon: vedlegg.map((v) => v.vedlegg_id),
  };
}

export function fristkommandoFraSkjema(
  data: Fristskjemadata,
  idag = new Date().toLocaleDateString('sv-SE')
): Fristkommando {
  utenVedlegg(data);
  const utdypning = letterText(data.begrunnelse ?? '').trim();
  if (data.registrert) return registrering(data.registrert, utdypning, idag);
  if (data.varsel_type === 'varsel') {
    if (utdypning)
      throw new Error('Varselet fra appen har ingen fritekst. Fjern teksten i skjemaet.');
    return { type: 'send_varsel', spor: 'frist', hjemmel: '33.4' };
  }
  if (data.varsel_type !== 'spesifisert')
    throw new Error('Begrunnelse utsatt etter § 33.6.2 kan ikke sendes for denne saken ennå.');
  if (!utdypning) throw new Error('Begrunnelsen for antallet dager mangler.');
  return {
    type: 'krav',
    spor: 'frist',
    innhold: { dager: data.antall_dager ?? 0 },
    utdypning,
  };
}
