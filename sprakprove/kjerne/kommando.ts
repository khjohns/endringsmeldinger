/**
 * Én kommando fra klienten blir én hendelse, eller en avvisning. Samme rekkefølge
 * som `/api/events`: serverfeltene, kontrakten, serverstemplingen,
 * forretningsreglene med serverens utregning, og versjonen.
 */

import { datafelt, definisjon, valider } from './kontrakt.ts';
import { forstebrudd, type Avvisning } from './forretningsregler.ts';
import type { Sak } from './sak.ts';
import type { Hendelse, Hendelsestype, Kontekst } from './typer.ts';

export type Utfall =
  | { godtatt: true; hendelse: Hendelse }
  | { godtatt: false; feil: 'VALIDATION_ERROR' | 'BUSINESS_RULE_VIOLATION'; avvisning: Avvisning };

export type Tolkning =
  | { godtatt: true; hendelse: Hendelse }
  | { godtatt: false; feil: 'VALIDATION_ERROR'; avvisning: Avvisning };

/** Felt klienten ikke bestemmer (`serverfelt` i kontrakten): to avvises, resten overskrives. */
const AVVIST_FRA_KLIENT = ['event_id', 'tidsstempel'];
const OVERSKREVET = ['aktor_id', 'aktor_rolle', 'aktor_team_id', 'sak_id'];

function utenNull(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null && v !== undefined));
}

const valideringsfeil = (melding: string): Tolkning => ({
  godtatt: false,
  feil: 'VALIDATION_ERROR',
  avvisning: { regel: 'VALIDATION_ERROR', melding },
});

/**
 * Kontrakten og serverstemplingen, uten saken: det `/api/events` gjør før
 * journalen leses. `versjon` er plassen hendelsen får i journalen.
 */
export function tolkKommando(kommando: unknown, kontekst: Kontekst, versjon: number): Tolkning {
  if (typeof kommando !== 'object' || kommando === null || Array.isArray(kommando)) {
    return valideringsfeil('Kommandoen må være et objekt.');
  }
  const serverfelt = AVVIST_FRA_KLIENT.filter((f) => f in kommando);
  if (serverfelt.length)
    return valideringsfeil(`Feltene settes av serveren: ${serverfelt.join(', ')}`);
  const k = Object.fromEntries(Object.entries(kommando).filter(([f]) => !OVERSKREVET.includes(f)));
  const type = k.event_type as Hendelsestype;
  const skjema = definisjon(`kommando.${type}`);
  if (!skjema) return valideringsfeil(`Ukjent hendelsestype: ${String(k.event_type)}`);

  const streng = skjema['x-ukjente-felt'] === 'avvises';
  const rad = k.data;
  if (typeof rad !== 'object' || rad === null || Array.isArray(rad))
    return valideringsfeil('`data` må være et objekt.');
  // En tolerant kommando forkaster ukjente felt i `data`, og `null` lagres som utelatt.
  const kjente = datafelt(type);
  const data = utenNull(
    streng
      ? (rad as Record<string, unknown>)
      : Object.fromEntries(Object.entries(rad).filter(([f]) => kjente.has(f)))
  );
  const proves = streng
    ? { ...k, data: rad }
    : {
        event_type: type,
        ...(k.refererer_til_event_id !== undefined
          ? { refererer_til_event_id: k.refererer_til_event_id }
          : {}),
        data,
      };
  const feil = valider(proves, `kommando.${type}`);
  if (feil.length) return valideringsfeil(feil.join('; '));

  if (type === 'te_aksepterer_respons') data.spor = k.spor;
  const hendelse: Hendelse = {
    event_id: kontekst.nyId(),
    sak_id: kontekst.sakId,
    event_type: type,
    versjon,
    tidsstempel: kontekst.tidspunkt().toISOString(),
    aktor_id: kontekst.aktorId,
    aktor_rolle: kontekst.rolle,
    aktor_team_id: kontekst.teamId,
    refererer_til_event_id:
      typeof k.refererer_til_event_id === 'string' ? k.refererer_til_event_id : null,
    data,
  };
  return { godtatt: true, hendelse };
}

export function vurderKommando(sak: Sak, kommando: unknown, kontekst: Kontekst): Utfall {
  const tolkning = tolkKommando(kommando, kontekst, sak.antallHendelser + 1);
  if (!tolkning.godtatt) return tolkning;
  const brudd = forstebrudd(tolkning.hendelse, sak);
  if (brudd) return { godtatt: false, feil: 'BUSINESS_RULE_VIOLATION', avvisning: brudd };
  return tolkning;
}
