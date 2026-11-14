/**
 * Forlengelsene av fristene i fristtabellen i sakene i prosjektet (GFK-U19, GFK-U26, KA-U77).
 * Fullmakten (`server/fullmakt.ts`) og fristtabellen (`server/kontraktsfrister.ts`) leser dem
 * herfra. Hver sak leses med kjernen (`forlengelseneISaken`).
 */
import { utledJournal } from '../kjerne/kommandoer/skriving.ts';
import { forlengelseneISaken, type Forlengelse } from '../kjerne/spor/frist/utledning.ts';
import type { Kjerne } from '../kjerne/versjon.ts';
import type { Foresp } from './datalag.ts';
import { skrevetAvKjernen } from './lager.ts';
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
  const l: Forlengelsene = {
    tattMed: [],
    ikkeTattMed: [],
    ikkeForstaatt: [],
    sakskoder: new Map(),
  };
  for (const sak of await lesAlleSakene(foresp)) {
    if (sak.sakId === utenom) continue;
    l.sakskoder.set(sak.sakId, sak.sakskode);
    const u = skrevetAvKjernen(sak.journal) ? utledJournal(sak.journal, kjerne) : null;
    if (!u?.forstaatt) {
      l.ikkeForstaatt.push(sak.sakId);
      continue;
    }
    const { tattMed, ikkeTattMed } = forlengelseneISaken(u);
    for (const f of tattMed) l.tattMed.push({ ...f, sakId: sak.sakId });
    for (const f of ikkeTattMed) l.ikkeTattMed.push({ ...f, sakId: sak.sakId });
  }
  return l;
}
