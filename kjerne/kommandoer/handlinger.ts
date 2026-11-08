/**
 * `handlinger(u, part)`: det brukeren får tilbud om (`pending_actions`). En
 * handling tilbys når forutsetningene for kommandoen holder, så tilbudet og
 * avvisningen leser de samme predikatene (INV-MM-1). Serveren snevrer inn til
 * det parten også er autorisert for (`capabilities`).
 */

import {
  forutsetninger,
  noekkel,
  VARSEL_I_SPORET,
  type Handlingsnoekkel,
} from './forutsetninger.ts';
import { KAN_FAA_INNSIGELSE, type Utledning } from '../utledning/utled.ts';
import { KRAVSPOR, SPOR, type Part, type Spor, type Varselhjemmel } from '../typer.ts';

/**
 * En tilbudt handling med nøkkelen og det den gjelder, så visningen ikke deler nøkkelen
 * (#1703). `spor` er `null` for en handling som gjelder saken som helhet (OV-U16, bindende i
 * OV-U80 og OV-U85), og for en handling som viser til et element uten spor.
 */
export interface TilbudtHandling {
  noekkel: string;
  type: Handlingsnoekkel['type'];
  spor: Spor | null;
  /** Varselet handlingen gjelder: hjemmelen i nøkkelen, ellers varselet i sporet (OV-U5). */
  hjemmel: Varselhjemmel | null;
  /** Elementet handlingen viser til. */
  gjelder: string | null;
}

/**
 * Handlingene som kan gjelde saken: hver handling i hvert spor og en innsigelse per
 * varsel, krav og svar. Bestridelse, merking, avklaring, protest, påberopt passivitet
 * og senere begrunnelse tilbys ikke (OV-U7).
 */
export function kandidater(u: Utledning): Handlingsnoekkel[] {
  const ut: Handlingsnoekkel[] = [];
  for (const spor of SPOR)
    for (const type of ['krav', 'trekke', 'godta', 'svare', 'revidere'] as const)
      ut.push({ type, spor });
  ut.push({ type: 'sende_foresporsel', spor: 'frist' }, { type: 'registrere_brev' });
  for (const spor of KRAVSPOR) {
    for (const type of ['varsle', 'sende_varsel'] as const) ut.push({ type, spor });
    ut.push({ type: 'ingen_krav', spor });
  }
  for (const type of ['varsle', 'sende_varsel'] as const)
    for (const hjemmel of ['34.1.3', '34.3.3', '34.4'] as const)
      ut.push({ type, spor: 'vederlag', hjemmel });
  for (const [id, e] of Object.entries(u.elementer)) {
    if (KAN_FAA_INNSIGELSE.has(e.art)) ut.push({ type: 'innsigelse', gjelder: id });
    if (e.art === 'foresporsel') ut.push({ type: 'svare_paa_foresporsel', gjelder: id });
  }
  // Punkt 10 i samlevedtaket for retting av sendt brev (MM-U41 (opphevet av MM-U52)): korrigeringen viser til TEs
  // siste opplysning om datoen.
  for (const o of u.datoopplysninger) ut.push({ type: 'korrigere', gjelder: o.id });
  return ut;
}

/** Sporet hvert krav, svar, varsel, hver forespørsel og hver opplysning om datoen hører til. */
function elementenesSpor(u: Utledning): Map<string, Spor> {
  const sporet = new Map<string, Spor>();
  for (const spor of SPOR) {
    const s = u.spor[spor];
    for (const e of [...s.krav, ...s.svar, ...Object.values(s.varsler), ...s.kravpostvarsler])
      if (e) sporet.set(e.id, spor);
    for (const f of s.foresporsler) {
      sporet.set(f.foresporsel, spor);
      if (f.svar) sporet.set(f.svar, spor);
    }
  }
  // Korrigeringen gjelder datoen i et krav i forholdet (MM-U52, `utled.ts`).
  for (const o of u.datoopplysninger) sporet.set(o.id, 'forhold');
  return sporet;
}

function handling(h: Handlingsnoekkel, sporTil: Map<string, Spor>): TilbudtHandling {
  const n = noekkel(h);
  if ('gjelder' in h)
    return {
      noekkel: n,
      type: h.type,
      spor: sporTil.get(h.gjelder) ?? null,
      hjemmel: null,
      gjelder: h.gjelder,
    };
  if (!('spor' in h)) return { noekkel: n, type: h.type, spor: null, hjemmel: null, gjelder: null };
  const hjemmel =
    'hjemmel' in h
      ? h.hjemmel
      : h.type === 'varsle' || h.type === 'sende_varsel'
        ? VARSEL_I_SPORET[h.spor]
        : null;
  return { noekkel: n, type: h.type, spor: h.spor, hjemmel, gjelder: null };
}

/** Handlingene parten får tilbud om, med sporet og det hver gjelder. */
export function tilbudte(u: Utledning, part: Part): TilbudtHandling[] {
  const sporTil = elementenesSpor(u);
  return kandidater(u)
    .filter((h) => forutsetninger(h, part, u) === null)
    .map((h) => handling(h, sporTil));
}

export function handlinger(u: Utledning, part: Part): string[] {
  return tilbudte(u, part).map((h) => h.noekkel);
}
