/**
 * ID-ene og klokka en kjøring bruker. I testene er de tilfeldige og en fast klokke, som
 * før. Et brukerforløp i demoruta får faste ID-er og en testklokke, så en omstart gir
 * samme journal med samme ID-er og tidsstempler (#1330). Faste ID-er og testklokken
 * gjelder bare test- og demomiljøet; serveren setter fortsatt `event_id` og
 * `tidsstempel` selv (AGENTS.md, «Sikkerhetsinvarianter»).
 */

export type NyId = () => string;

export interface Klokke {
  /** Tidspunktet nå, uten å flytte klokka: brevet forhåndsvises med det. */
  naa(): Date;
  /** Flytter klokka til neste hendelse og gir tidspunktet. */
  neste(): Date;
}

export const tilfeldigeIder: NyId = () => globalThis.crypto.randomUUID();

/** FNV-1a på 32 bit, som åtte heksadesimale sifre. */
function fnv(tekst: string): string {
  let h = 0x811c9dc5;
  for (const tegn of new TextEncoder().encode(tekst)) h = Math.imul(h ^ tegn, 0x01000193) >>> 0;
  return h.toString(16).padStart(8, '0');
}

/**
 * ID-er i formen til en UUID v4, nummerert fra 1 i navnerommet. To navnerom gir ulike
 * ID-er så lenge de har ulik hash, og vakttesten for forløpene krever det for hvert par.
 */
export function fasteIder(navnerom: string): NyId {
  const hode = fnv(navnerom);
  let n = 0;
  return () => `${hode}-0000-4000-8000-${(++n).toString(16).padStart(12, '0')}`;
}

/** Klokka står på `start` og går ett minutt fram per hendelse. */
export function testklokke(start: string): Klokke {
  let t = Date.parse(start);
  return {
    naa: () => new Date(t),
    neste: () => new Date((t += 60_000)),
  };
}

/** Klokka på maskinen, når en server stempler tidspunktet, som i saksruta. */
export const veggklokke: Klokke = { naa: () => new Date(), neste: () => new Date() };
