import { liste } from '#kjerne/frosset/brevdeler.ts';
import { medHardeMellomrom } from '#kjerne/frosset/tekst.ts';

/**
 * Hardt mellomrom etter «punkt», «pkt.» og «kl.» foran et tall, laget av kjernen (språkfila,
 * «Hardt mellomrom», #2049). En tekst, en liste eller et objekt med tekster gjøres om når fila
 * lastes, og en funksjon, også i et objekt, gir det den lager, gjort om.
 */
export function haerdet<T>(t: T): T {
  if (typeof t === 'string') return medHardeMellomrom(t) as T;
  if (typeof t === 'function') return ((...a: unknown[]) => haerdet(t(...a))) as T;
  if (Array.isArray(t)) return t.map(haerdet) as T;
  if (t !== null && typeof t === 'object' && Object.getPrototypeOf(t) === Object.prototype)
    return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, haerdet(v)])) as T;
  return t;
}

const DATO = new Intl.DateTimeFormat('nb-NO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Oslo',
});

const KORT = new Intl.DateTimeFormat('nb-NO', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Europe/Oslo',
});

const KLOKKE = new Intl.DateTimeFormat('nb-NO', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Oslo',
});

/**
 * Beløpet uten enheten, for en tabell eller en celle der enheten står ved siden av (#1997):
 * `kroner` skriver enheten etter et hardt mellomrom.
 */
export const utenKr = (beloep: string) => beloep.replace(/\u00a0kr$/, '');

/** «15. september 2026» for en dato («2026-09-15») eller et tidspunkt. */
export const dato = (d: string) =>
  DATO.format(new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T12:00:00Z` : d));

export const kortDato = (d: string) => KORT.format(new Date(d));

const KORT_AAR = new Intl.DateTimeFormat('nb-NO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Europe/Oslo',
});

/** «1. okt. 2026», for datoen i en smal rad. */
export const kortDatoMedAar = (d: string) => KORT_AAR.format(new Date(d));

export const klokke = (d: string) => KLOKKE.format(new Date(d)).replace(':', '.');

/** «kl. 10.15». */
export const kl = haerdet((d: string) => `kl. ${klokke(d)}`);

/** «punkt 34.1.2» eller «punktene 34.1.2 og 34.1.3», med hardt mellomrom også etter «punktene», som kjernen ikke dekker. */
export const punkt = (...numre: string[]) =>
  `${numre.length > 1 ? 'punktene' : 'punkt'}\u00a0${liste(numre)}`;

/** «pkt. 33.4» eller «pkt. 33.5 og 33.6.1», for henvisningen som står alene i et merke (OV-U75). */
export const hjemmelsmerke = haerdet((...numre: string[]) => `pkt. ${liste(numre)}`);

/** Dagens dato i Oslo, ÅÅÅÅ-MM-DD, for `max` i et datofelt og dagene til i dag. */
export const dagensDato = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' });

/** Kalenderdagene fra `fra` til `til`, regnet på datoene i Oslo. Ingen vurdering av fristen. */
export function kalenderdager(fra: string, til: string): number {
  const dag = (d: string) => {
    const [aar, mnd, dg] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Oslo' })
      .format(new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T12:00:00Z` : d))
      .split('-')
      .map(Number);
    return Date.UTC(aar, mnd - 1, dg);
  };
  return Math.round((dag(til) - dag(fra)) / 86_400_000);
}

/** Initialene i navnet: første bokstav i første og siste ord, «PO» for «Per Olsen». */
export function initialer(navn: string): string {
  const ord = navn.trim().split(/\s+/).filter(Boolean);
  if (!ord.length) return '';
  const forbokstav = (o: string) => [...o][0].toLocaleUpperCase('nb-NO');
  return ord.length === 1 ? forbokstav(ord[0]) : forbokstav(ord[0]) + forbokstav(ord.at(-1)!);
}
