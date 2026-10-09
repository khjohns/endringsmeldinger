/**
 * To veier journalen kan gå: i minnet, og gjennom `hendelse` i testbasen med
 * lageret fra språkprøven. Testbasebanen leser journalen fra basen før hver
 * utledning, så hvert steg prøver lagring og gjenlesing.
 */

import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import type { Hendelse } from '../../kjerne/typer.ts';
import { leggTil, lesJournal, Versjonskonflikt } from '../../server/lager.ts';
import { opprettSak, type Oppsett } from '../../tester/testbase.ts';
import type { Part } from '../kjerne/typer.ts';

export interface Bane {
  sakId: string;
  aktor(part: Part): string;
  journal(): Promise<Hendelse[]>;
  /** Legg hendelsene til etter `forventet`; versjonskonflikt ellers (`expected_version`). */
  skriv(hendelser: Hendelse[], forventet: number): Promise<void>;
}

export function minnebane(): Bane {
  const sakId = randomUUID();
  const rader: Hendelse[] = [
    {
      event_id: randomUUID(),
      sak_id: sakId,
      event_type: 'sak_opprettet',
      versjon: 1,
      tidsstempel: '2026-10-09T08:00:00.000Z',
      aktor_id: 'te',
      aktor_rolle: 'TE',
      aktor_team_id: null,
      refererer_til_event_id: null,
      data: { sakstittel: 'Målmodellen', sakstype: 'standard' },
    },
  ];
  return {
    sakId,
    aktor: (part) => part.toLowerCase(),
    journal: async () => structuredClone(rader),
    async skriv(hendelser, forventet) {
      const naa = rader.at(-1)!.versjon;
      if (naa !== forventet) throw new Versjonskonflikt(forventet, naa);
      hendelser.forEach((h, i) =>
        rader.push(structuredClone({ ...h, versjon: forventet + i + 1 }))
      );
    },
  };
}

export async function basebane(o: Oppsett): Promise<Bane> {
  const sakId = await opprettSak(o.pool, o.prosjekt.id, o.te);
  return {
    sakId,
    aktor: (part) => (part === 'TE' ? o.te.id : o.bh.id),
    journal: async () => (await lesJournal(o.pool as pg.Pool, sakId, o.prosjekt.id)).hendelser,
    async skriv(hendelser, forventet) {
      await leggTil(o.pool, o.prosjekt.id, hendelser, forventet);
    },
  };
}
