/**
 * Kontrollen av en lagret rad mot format 1 (7.1.2 i designnotatet for #273),
 * brukt både i minnet og mot testbasen: `format` er satt, `referstoid` er ikke
 * brukt, og `data` har ingen `null`, ingen tom liste og ingen tom streng (4.4).
 * At leseren forstår raden, prøves for seg.
 */

import type { Journalrad } from '../typer.ts';

type Data = Record<string, unknown>;

/** Feltene i verdien som er `null`, en tom liste eller en tom streng. */
export function tommeVerdier(v: unknown, sti = '$'): string[] {
  if (v === null || v === '' || (Array.isArray(v) && !v.length)) return [sti];
  if (Array.isArray(v)) return v.flatMap((x, i) => tommeVerdier(x, `${sti}[${i}]`));
  if (typeof v === 'object')
    return Object.entries(v as Record<string, unknown>).flatMap(([n, x]) =>
      tommeVerdier(x, `${sti}.${n}`)
    );
  return [];
}

/** Avvikene fra format 1 i raden, tomme når raden har formen. */
export function avvikFraFormatet(rad: Journalrad): string[] {
  const avvik = tommeVerdier(rad.data).map((sti) => `${rad.event_type} ${sti}: tom eller null`);
  if (rad.format !== 1) avvik.push(`${rad.event_type}: format ${String(rad.format)}`);
  if (rad.refererer_til_event_id !== null) avvik.push(`${rad.event_type}: referstoid er satt`);
  return avvik;
}

/**
 * LV-U3: elementene i et brev appen sendte som ikke står i brevteksten. Hvert krav,
 * svar og utsagn og hver opplysning skal ha ett avsnitt med en låst del; datoen for et
 * varsel står i avsnittet for varselet, og vedleggene i et avsnitt for dokumentet
 * (A4). Et registrert brev har ingen brevtekst (MM-U17). Leses av raden alene, ikke
 * av kjernen som skrev den.
 */
export function utenAvsnitt(rad: Journalrad): string[] {
  if (rad.event_type !== 'dokument_registrert') return [];
  const d = rad.data;
  const liste = (n: string) => (d[n] ?? []) as Data[];
  const opplysninger = liste('opplysninger');
  const registrert = opplysninger.some(
    (o) => (o.hva === 'sendt' || o.hva === 'mottatt') && o.gjelder === undefined
  );
  const tekst = (d.brevtekst ?? []) as Data[];
  if (registrert) return tekst.length ? ['et registrert brev har brevtekst'] : [];
  const elementer = [
    ...liste('krav'),
    ...liste('svar'),
    ...liste('utsagn'),
    ...opplysninger.filter(
      (o) => !((o.hva === 'sendt' || o.hva === 'mottatt') && o.gjelder !== undefined)
    ),
  ].map((e) => e.id as string);
  if (liste('dokumentasjon').length) elementer.push(rad.event_id);
  const avsnitt = (id: string) =>
    tekst.filter((a) => a.gjelder === id && typeof a.laast === 'string' && a.laast.length);
  return elementer
    .filter((id) => avsnitt(id).length !== 1)
    .map((id) => `${rad.event_id}: ${id} har ikke ett avsnitt i brevteksten`);
}
