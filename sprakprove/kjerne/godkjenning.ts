/**
 * Godkjenningspakken: byggherrens svar på flere spor, sendt samlet. Grensen er
 * den samme som `validate_items` i `services/approval_service.py`:
 * - elementene vurderes i domenerekkefølge (grunnlag, vederlag, frist), hvert
 *   mot saken etter de foregående, så vederlaget ser grunnlagssvaret i pakken;
 * - kravreferansen må være gjeldende krav i sporet;
 * - vederlag og frist bærer grunnlagsbasisen de er vurdert mot, og den må være
 *   grunnlaget slik pakken gjør det;
 * - forretningsreglene, også regelversjonen og serverens utregning, gjelder
 *   hvert element.
 *
 * Godkjennere, brev, publisering og Catenda er utenfor.
 */

import { forstebrudd, SVARSPOR, type Avvisning } from './forretningsregler.ts';
import { tolkKommando } from './kommando.ts';
import { anvend, grunnlagsvurdering, type Sak } from './sak.ts';
import type { Hendelse, Hendelsestype, Kontekst, Spor } from './typer.ts';

const DOMENEREKKEFOLGE: Spor[] = ['grunnlag', 'vederlag', 'frist'];

/** Grunnlaget et svar på vederlag eller frist er vurdert mot (`basis` i Python). */
export interface Grunnlagsbasis {
  kravId: string | null;
  resultat: string | null;
  varsletITide: boolean | null;
  hovedkategori: string | null;
  underkategori: string | null;
}

export interface Pakkeelement {
  /** Svarkommandoen i kontraktens form. `refererer_til_event_id` er kravreferansen. */
  kommando: Record<string, unknown>;
  grunnlagsbasis?: Grunnlagsbasis;
}

export type Pakkeutfall =
  | { godtatt: true; hendelser: Hendelse[]; sak: Sak }
  | { godtatt: false; spor: Spor | null; avvisning: Avvisning };

export function grunnlagsbasis(sak: Sak): Grunnlagsbasis {
  const g = grunnlagsvurdering(sak);
  return {
    kravId: sak.grunnlag.krav?.eventId ?? null,
    resultat: g.resultat,
    varsletITide: g.varsletITide,
    hovedkategori: g.hovedkategori,
    underkategori: g.underkategori,
  };
}

const likBasis = (a: Grunnlagsbasis | null | undefined, b: Grunnlagsbasis) =>
  typeof a === 'object' &&
  a !== null &&
  (Object.keys(b) as (keyof Grunnlagsbasis)[]).every((n) => a[n] === b[n]) &&
  Object.keys(a).length === Object.keys(b).length;

const avvist = (spor: Spor | null, regel: string, melding: string): Pakkeutfall => ({
  godtatt: false,
  spor,
  avvisning: { regel, melding },
});

/** `kontekst` er byggherrens; hendelsene får versjonene etter saken. */
export function vurderPakke(sak: Sak, elementer: Pakkeelement[], kontekst: Kontekst): Pakkeutfall {
  if (kontekst.rolle !== 'BH')
    return avvist(null, 'ROLE_CHECK', 'Bare byggherren sender en godkjenningspakke.');
  const medSpor = elementer.map((e) => ({
    ...e,
    // Bare egne nøkler: `constructor` og `__proto__` er ikke spor.
    spor: Object.hasOwn(SVARSPOR, String(e.kommando.event_type))
      ? SVARSPOR[e.kommando.event_type as Hendelsestype]
      : undefined,
  }));
  const utenSpor = medSpor.find((e) => !e.spor);
  if (utenSpor) {
    return avvist(
      null,
      'VALIDATION_ERROR',
      `Pakken kan bare inneholde svar: ${String(utenSpor.kommando.event_type)}`
    );
  }
  const ordnet = [...medSpor].sort(
    (a, b) => DOMENEREKKEFOLGE.indexOf(a.spor!) - DOMENEREKKEFOLGE.indexOf(b.spor!)
  );
  const hendelser: Hendelse[] = [];
  let naa = sak;
  for (const element of ordnet) {
    const spor = element.spor!;
    if (element.kommando.refererer_til_event_id !== sak[spor].krav?.eventId) {
      return avvist(
        spor,
        'CLAIM_CHANGED',
        'Kravet er endret. Revider vurderingen før du fortsetter.'
      );
    }
    if (spor !== 'grunnlag' && !likBasis(element.grunnlagsbasis, grunnlagsbasis(naa))) {
      return avvist(
        spor,
        'BASIS_CHANGED',
        'Ansvarsgrunnlaget er endret eller utelatt. Revider økonomi- og fristvurderingen mot grunnlaget som skal gjelde for sendingen.'
      );
    }
    const tolkning = tolkKommando(
      structuredClone(element.kommando),
      kontekst,
      naa.antallHendelser + 1
    );
    if (!tolkning.godtatt)
      return avvist(spor, tolkning.avvisning.regel, tolkning.avvisning.melding);
    const brudd = forstebrudd(tolkning.hendelse, naa);
    if (brudd) return avvist(spor, brudd.regel, brudd.melding);
    hendelser.push(tolkning.hendelse);
    naa = anvend(naa, tolkning.hendelse);
  }
  return { godtatt: true, hendelser, sak: naa };
}
