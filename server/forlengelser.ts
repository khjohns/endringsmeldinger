/**
 * Forlengelsene av fristene i fristtabellen i sakene i prosjektet (GFK-U19, GFK-U26, KA-U77).
 * Fullmakten (`server/fullmakt.ts`) og fristtabellen (`server/kontraktsfrister.ts`) leser dem
 * herfra. Hver sak leses med kjernen (`forlengelseneISaken`).
 */
import { utledJournal } from '../kjerne/kommandoer/skriving.ts';
import {
  forlengelseneISaken,
  fristenEtterForlengelsene,
  type Forlengelse,
} from '../kjerne/spor/frist/utledning.ts';
import type { Kjerne } from '../kjerne/versjon.ts';
import type { Foresp } from './datalag.ts';
import { lesAlleSakene, type LestSak } from './saksliste.ts';

/** Dagene for en frist i en annen sak. */
export interface SakensForlengelse extends Forlengelse {
  sakId: string;
}

export interface Forlengelsene {
  tattMed: SakensForlengelse[];
  ikkeTattMed: SakensForlengelse[];
  /** Sakene kjernen ikke forstår eller ikke har skrevet, som kan ha forlenget en frist (MM-U2). */
  ikkeForstaatt: string[];
  /** Koden til hver sak som er lest, for sakene som nevnes. */
  sakskoder: Map<string, LestSak['sakskode']>;
}

/** Forlengelsene i sakene i prosjektet i konteksten, utenom saken `utenom`. */
export async function lesForlengelsene(
  foresp: Foresp,
  kjerne: Kjerne,
  utenom?: string
): Promise<Forlengelsene> {
  const lest: Forlengelsene = {
    tattMed: [],
    ikkeTattMed: [],
    ikkeForstaatt: [],
    sakskoder: new Map(),
  };
  for (const sak of await lesAlleSakene(foresp)) {
    if (sak.sakId === utenom) continue;
    lest.sakskoder.set(sak.sakId, sak.sakskode);
    // MM-U2: kjernen gjør en rad den ikke har skrevet, ukjent (`lesJournal`).
    const u = utledJournal(sak.journal, kjerne);
    if (!u.forstaatt) {
      lest.ikkeForstaatt.push(sak.sakId);
      continue;
    }
    const { tattMed, ikkeTattMed } = forlengelseneISaken(u);
    for (const f of tattMed) lest.tattMed.push({ ...f, sakId: sak.sakId });
    for (const f of ikkeTattMed) lest.ikkeTattMed.push({ ...f, sakId: sak.sakId });
  }
  return lest;
}

/**
 * Fristen `dato` etter `forlengelser`, eller `null` når en sak kjernen ikke forstår, kan ha
 * forlenget den (MM-U2).
 */
export const datoenEtterForlengelsene = (
  dato: string,
  fristId: number,
  forlengelser: readonly Forlengelse[],
  ikkeForstaatt: readonly string[]
): string | null =>
  ikkeForstaatt.length ? null : fristenEtterForlengelsene(dato, fristId, forlengelser);
