/**
 * Banen gjennom TS-serveren og testbasen (#274, port 2). Klienten bygger
 * kommandoene av journalen den leser fra serveren, med samme kjerne som
 * serveren; det er den delte modulen prøven skal vise. Etter hver sending,
 * også en avvist, leses journalen og tilstanden på nytt, så målene og kontrollen
 * av uendret journal gjelder det som er lagret.
 *
 * Kontrollsakene (`prov`) prøves i kjernen på den gjenleste saken, som i
 * Python-banene: en prøve gjennom ruta ville skrevet hendelsen.
 */

import { vurderKommando, type Utfall } from '../kjerne/kommando.ts';
import { offentligTilstand, type OffentligTilstand } from '../kjerne/offentlig.ts';
import { projiser, type Sak } from '../kjerne/sak.ts';
import type { Hendelse, Rolle } from '../kjerne/typer.ts';
import { Forutsetning, kommando, type Bane, type Handling } from './korpus.ts';
import { kall, opprettSak, type KjorendeServer, type Oppsett } from './testbase.ts';

const AVVISNINGER = new Set(['VALIDATION_ERROR', 'BUSINESS_RULE_VIOLATION']);

export interface Serverbane extends Bane {
  oppdater(): Promise<void>;
}

/** `batch`: hver handling sendes som eneste hendelse i `/api/events/batch`, som `Batchbane` i Python. */
export async function serverbane(
  server: KjorendeServer,
  o: Oppsett,
  { batch = false, sakId }: { batch?: boolean; sakId?: string } = {}
): Promise<Serverbane> {
  const id = sakId ?? (await opprettSak(o.pool, o.prosjekt.id, o.te));
  let journal: Hendelse[] = [];
  let sak: Sak = projiser(id, []);
  let tilstand: OffentligTilstand = offentligTilstand(sak);
  const bruker = (rolle: Rolle) => (rolle === 'TE' ? o.te : o.bh);
  const les = (sti: string) => kall(server.url, sti, { bruker: o.te, prosjektId: o.prosjekt.id });

  const bane: Serverbane = {
    sakId: id,
    get journal() {
      return journal;
    },
    sak: () => sak,
    tilstand: () => tilstand,
    async oppdater() {
      const [j, t] = await Promise.all([
        les(`/api/cases/${id}/journal`),
        les(`/api/cases/${id}/state`),
      ]);
      if (j.status !== 200 || t.status !== 200)
        throw new Forutsetning(`gjenlesingen feilet: ${j.status} ${t.status}`);
      journal = j.kropp.events as Hendelse[];
      sak = projiser(id, journal);
      tilstand = t.kropp.state as OffentligTilstand;
    },
    prov(h: Handling): Utfall {
      const [rolle, k] = kommando(h, sak);
      return vurderKommando(sak, k, {
        sakId: id,
        aktorId: bruker(rolle).id,
        rolle,
        teamId: null,
        tidspunkt: () => new Date(),
        nyId: () => crypto.randomUUID(),
      });
    },
    async send(h: Handling): Promise<Utfall> {
      const [rolle, k] = kommando(h, sak);
      const sti = batch ? '/api/events/batch' : '/api/events';
      const konvolutt = batch
        ? { sak_id: id, expected_version: journal.length, events: [k] }
        : { sak_id: id, expected_version: journal.length, event: k };
      const svar = await kall(server.url, sti, {
        bruker: bruker(rolle),
        prosjektId: o.prosjekt.id,
        kropp: konvolutt,
      });
      await bane.oppdater();
      if (svar.status === 201) {
        if (JSON.stringify(svar.kropp.state) !== JSON.stringify(tilstand))
          throw new Forutsetning(`${h.handling}: tilstanden fra ruta er ikke lik den gjenleste`);
        return { godtatt: true, hendelse: journal.at(-1)! };
      }
      if (svar.status !== 400 || !AVVISNINGER.has(svar.kropp.error))
        throw new Forutsetning(`${h.handling}: ${svar.status} ${JSON.stringify(svar.kropp)}`);
      return {
        godtatt: false,
        feil: svar.kropp.error,
        avvisning: { regel: svar.kropp.rule ?? svar.kropp.error, melding: svar.kropp.message },
      };
    },
  };
  await bane.oppdater();
  return bane;
}
