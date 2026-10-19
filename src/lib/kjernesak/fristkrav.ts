/**
 * Kommandoene `TeFristForm` sender på TS-stien (#909, B-17). Et foreløpig varsel er
 * et eget varsel etter § 33.4 uten dager og uten fritekst (VS-U15). Et varsel sendt
 * utenfor appen registreres med datoen og brevet som vedlegg, uten tekst fra appen
 * (MM-U1, OV-U4, MM-U17). Et spesifisert krav har dagene og begrunnelsen, som er
 * utdypningen og må ha tekst (KA-U33). Har sporet ikke noe varsel, kan kravet oppgi
 * datoen for et varsel TE sendte utenfor appen, med brevet som vedlegg (OV-U5).
 * Begrunnelse utsatt etter § 33.6.2 har ingen kommando, så den avvises her og sendes ikke.
 */

import { letterText } from '$lib/approval/letter';
import type { FristSubmissionEventData } from '$lib/domain/fristSubmissionDomain';
import type { Vedlegg } from '$kjerne/typer';
import { utenVedlegg } from './skjemadata';

export type Fristkommando =
  | { type: 'send_varsel'; spor: 'frist'; hjemmel: '33.4' }
  | { type: 'varsel'; spor: 'frist'; hjemmel: '33.4'; sendt: string; dokumentasjon: string[] }
  | {
      type: 'krav';
      spor: 'frist';
      innhold: { dager: number };
      utdypning: string;
      varsel?: { sendt: string; dokumentasjon: string[] };
    };

/** Varselet TE sendte utenfor appen: datoen det ble sendt, og brevet som vedlegg. */
export interface RegistrertVarsel {
  sendt: string;
  vedlegg: Vedlegg[];
}

export type Fristskjemadata = FristSubmissionEventData & {
  vedlegg_ids?: string[];
  /** Varselet registreres for seg. */
  registrert?: RegistrertVarsel;
  /** Varselet TE oppgir i det spesifiserte kravet. */
  tidligereVarsel?: RegistrertVarsel;
};

const ISO_DATO = /^\d{4}-\d{2}-\d{2}$/;

/** Dagens dato i norsk tid, som brevets dato kjernen kontrollerer mot (VS-U8). */
export const dagensDato = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' });

/**
 * Det som hindrer at varselet kan oppgis, eller `null`: datoen må finnes og ikke være
 * etter dagens dato, og brevet må ligge ved (OV-U5). Kjernen avviser det samme
 * (`DATO_ETTER_BREVET`, `VEDLEGG_MANGLER`).
 */
export function varselhindring({ sendt, vedlegg }: RegistrertVarsel, idag: string): string | null {
  if (!ISO_DATO.test(sendt)) return 'Oppgi datoen varselet ble sendt.';
  if (sendt > idag) return 'Datoen varselet ble sendt, er etter dagens dato.';
  if (!vedlegg.length) return 'Legg ved brevet med varselet.';
  return null;
}

function oppgittVarsel(varsel: RegistrertVarsel, idag: string) {
  const hindring = varselhindring(varsel, idag);
  if (hindring) throw new Error(hindring);
  return { sendt: varsel.sendt, dokumentasjon: varsel.vedlegg.map((v) => v.vedlegg_id) };
}

function registrering(varsel: RegistrertVarsel, utdypning: string, idag: string): Fristkommando {
  if (utdypning)
    throw new Error('Et registrert varsel har ingen tekst fra appen. Fjern teksten i skjemaet.');
  return {
    type: 'varsel',
    spor: 'frist',
    hjemmel: '33.4',
    ...oppgittVarsel(varsel, idag),
  };
}

export function fristkommandoFraSkjema(data: Fristskjemadata, idag = dagensDato()): Fristkommando {
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
    ...(data.tidligereVarsel ? { varsel: oppgittVarsel(data.tidligereVarsel, idag) } : {}),
  };
}
