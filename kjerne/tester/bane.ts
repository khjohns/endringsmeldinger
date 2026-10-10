/**
 * Veien journalen går i testene. Kjernen har bare banen i minnet; banen
 * gjennom `hendelse` i testbasen står i `sprakprove/kjernelagring/`, fordi den
 * trenger lageret og `pg`.
 */

import { randomUUID } from 'node:crypto';
import type { Journalrad, Part } from '../typer.ts';

export interface Bane {
  sakId: string;
  aktor(part: Part): string;
  journal(): Promise<Journalrad[]>;
  /** Legg hendelsene til etter `forventet`; versjonskonflikt ellers (`expected_version`). */
  skriv(hendelser: Journalrad[], forventet: number): Promise<void>;
}

export class Versjonskonflikt extends Error {
  constructor(forventet: number, faktisk: number) {
    super(`Saken har versjon ${faktisk}, ikke ${forventet}`);
  }
}

export function minnebane(): Bane {
  const sakId = randomUUID();
  const rader: Journalrad[] = [
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
