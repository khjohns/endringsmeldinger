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
import {
  dagensDato,
  oppgittVarsel,
  registrering,
  utenVedlegg,
  varselFraAppen,
  type RegistrertVarsel,
} from './skjemadata';

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

/** Det `TeFristForm` sender på TS-stien. Begrunnelsen er HTML fra editoren. */
export interface Fristskjemadata {
  varsel_type?: string;
  antall_dager?: number;
  begrunnelse?: string;
  vedlegg_ids?: string[];
  /** Varselet registreres for seg. */
  registrert?: RegistrertVarsel;
  /** Varselet TE oppgir i det spesifiserte kravet. */
  tidligereVarsel?: RegistrertVarsel;
}

export function fristkommandoFraSkjema(data: Fristskjemadata, idag = dagensDato()): Fristkommando {
  utenVedlegg(data);
  const utdypning = letterText(data.begrunnelse ?? '').trim();
  if (data.registrert) return registrering('33.4', data.registrert, utdypning, idag);
  if (data.varsel_type === 'varsel') return varselFraAppen('33.4', utdypning);
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

/**
 * Teksten «Klar til sending» i `TeFristForm`. `scenario` er `edit` når sporet har et
 * fristkrav, og `spesifisering` når det har et varsel uten krav.
 */
export function fristoppsummering(
  valg: string | undefined,
  dager: number | undefined,
  scenario: string
): string | null {
  const antall = dager && dager > 0 ? dager : 0;
  if (valg === 'registrert') return 'Registrerer varselet sendt utenfor appen';
  if (valg === 'varsel') return 'Sender foreløpig varsel om fristforlengelse';
  if (valg !== 'spesifisert') return null;
  if (scenario === 'edit')
    return antall ? `Oppdaterer krav om ${antall} dager` : 'Oppdaterer fristkrav';
  if (scenario === 'spesifisering')
    return antall ? `Spesifiserer krav: ${antall} dager` : 'Spesifiserer fristkrav';
  return antall ? `Krav om ${antall} dagers fristforlengelse` : 'Sender krav om fristforlengelse';
}
