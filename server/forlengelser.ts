/**
 * Forlengelsene av fristene i fristtabellen i sakene i prosjektet (GFK-U19, GFK-U26, KA-U77).
 * Fullmakten (`server/fullmakt.ts`) og fristtabellen (`server/kontraktsfrister.ts`) leser dem
 * herfra. Hver sak leses med kjernen (`forlengelseneISaken`), og grupperingen og datoen står i
 * kjernen (`fristtabellsvaret` og `datoenEtterForlengelsene` i `kjerne/spor/frist/visning.ts`).
 */
import { utledJournal } from '../kjerne/kommandoer/skriving.ts';
import { forlengelseneISaken } from '../kjerne/spor/frist/utledning.ts';
import type { Forlengelsene } from '../kjerne/spor/frist/visning.ts';
import type { Sakskode } from '../kjerne/typer.ts';
import type { Kjerne } from '../kjerne/versjon.ts';
import type { Foresp } from './datalag.ts';
import { lesAlleSakene } from './saksliste.ts';

/** Forlengelsene i sakene i prosjektet i konteksten, utenom saken `utenom`. */
export async function lesForlengelsene(
  foresp: Foresp,
  kjerne: Kjerne,
  utenom?: string
): Promise<Forlengelsene> {
  const sakskoder = new Map<string, Sakskode | null>();
  const lest: Forlengelsene = { tattMed: [], ikkeTattMed: [], ikkeForstaatt: [], sakskoder };
  for (const sak of await lesAlleSakene(foresp)) {
    if (sak.sakId === utenom) continue;
    sakskoder.set(sak.sakId, sak.sakskode);
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
