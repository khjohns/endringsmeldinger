/**
 * Veien journalen går i testene. Kjernen har bare banen i minnet; banen
 * gjennom `koe.hendelse` i testbasen står i `sprakprove/kjernelagring/`, fordi den
 * trenger serverens lager og SQL Server.
 */

import type { Journalrad, Part } from '../typer.ts';
import type { Kommando } from '../kommandoer/kommando.ts';
import { tilfeldigeIder, type NyId } from './testmiljoe.ts';

export interface Bane {
  sakId: string;
  aktor(part: Part): string;
  journal(): Promise<Journalrad[]>;
  /** Legg hendelsene til etter `forventet`; versjonskonflikt ellers (`expected_version`). */
  skriv(hendelser: Journalrad[], forventet: number): Promise<void>;
  /**
   * Sender kommandoen til en server som vurderer og skriver den selv, og gir radene den
   * skrev. Uten den vurderer kjøreren kommandoen med kjernen og skriver radene med `skriv`.
   */
  kommando?(kommando: Kommando, part: Part, forventet: number): Promise<Journalrad[]>;
}

export class Versjonskonflikt extends Error {
  constructor(forventet: number, faktisk: number) {
    super(`Saken har versjon ${faktisk}, ikke ${forventet}`);
  }
}

/**
 * En sak i minnet med `sak_opprettet`. Saks-ID-en og ID-en til opprettelsen tas fra
 * `nyId`, i den rekkefølgen, og opprettelsen har tidsstempelet `opprettet`.
 */
export function minnebane({
  nyId = tilfeldigeIder,
  opprettet = '2026-10-09T08:00:00.000Z',
  sakstittel = 'Målmodellen',
}: { nyId?: NyId; opprettet?: string; sakstittel?: string } = {}): Bane {
  const sakId = nyId();
  const rader: Journalrad[] = [
    {
      event_id: nyId(),
      sak_id: sakId,
      event_type: 'sak_opprettet',
      versjon: 1,
      tidsstempel: opprettet,
      aktor_id: 'te',
      aktor_rolle: 'TE',
      aktor_team_id: null,
      refererer_til_event_id: null,
      format: 1,
      data: { sakstittel, sakstype: 'standard' },
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
