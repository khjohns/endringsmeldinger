/**
 * Forlengelsene en sak gir fristene i fristtabellen, som en annen sak i samme kontrakt regner
 * fristen fra (GFK-U19, GFK-U26). Avtalt er dagene TE har godtatt (KA-U77), og godkjent er dagene
 * i første lag i byggherrens gjeldende svar. Fristtabellen i kjøringen er `FRISTTABELLEN`.
 */

import { describe, expect, it } from 'vitest';
import { minnebane } from './bane.ts';
import { kjoer, type Forloep } from './kjoerer.ts';
import type { Handling } from './klient.ts';
import { forlengelseneISaken } from '../spor/frist/utledning.ts';

async function forlengelsene(steg: Handling[]) {
  const forloep: Forloep = { id: 'forlengelser', rader: [], start: null, steg, kontroller: [] };
  const k = await kjoer(forloep, minnebane({ sakstittel: 'Fasaden' }));
  return forlengelseneISaken(await k.utledning());
}

const PAABEROPELSE: Handling = {
  handling: 'krav',
  spor: 'forhold',
  underkategori: 'irregulaer_endring',
  navn: 'K-g1',
};
// KA-U79: Overtakelse (1) er registrert, «Rekkverket» er bare angitt med navnet.
const FRISTKRAVET: Handling = {
  handling: 'krav',
  spor: 'frist',
  frister: [
    { frist_id: 1, dager: 10 },
    { navn: 'Rekkverket', dager: 4 },
    { frist_id: 2, dager: 6 },
  ],
  navn: 'K-f1',
};
const forholdet = (resultat: string) => ({
  spor: 'forhold',
  navn: 'S-g1',
  resultat,
  varslet_i_tide: true,
});
const fristen = (vurdering: Record<string, unknown> = {}) => ({
  spor: 'frist',
  navn: 'S-f1',
  varsel_i_tide: true,
  spesifisering_i_tide: true,
  hindring: true,
  ...vurdering,
});
const brevet = (...svar: Record<string, unknown>[]): Handling => ({
  handling: 'brev',
  navn: 'D3',
  svar,
});
const AKSEPT: Handling = { handling: 'aksept', spor: 'frist', navn: 'A1' };

describe('forlengelsene i saken (GFK-U26)', () => {
  it('godkjent: dagene i første lag i byggherrens gjeldende svar, for de registrerte fristene', async () => {
    expect(
      await forlengelsene([
        PAABEROPELSE,
        FRISTKRAVET,
        brevet(forholdet('godkjent'), fristen({ dager: 3 })),
      ])
    ).toEqual([
      { fristId: 1, dager: 3, grunnlag: 'godkjent' },
      { fristId: 2, dager: 3, grunnlag: 'godkjent' },
    ]);
  });

  it('avtalt: TE har godtatt svaret (KA-U77)', async () => {
    expect(
      await forlengelsene([
        PAABEROPELSE,
        FRISTKRAVET,
        brevet(forholdet('godkjent'), fristen({ dager: 3 })),
        AKSEPT,
      ])
    ).toEqual([
      { fristId: 1, dager: 3, grunnlag: 'avtalt' },
      { fristId: 2, dager: 3, grunnlag: 'avtalt' },
    ]);
  });

  it('godkjent: byggherren har godkjent alle dagene TE krevde, uten at TE har godtatt noe', async () => {
    expect(
      await forlengelsene([PAABEROPELSE, FRISTKRAVET, brevet(forholdet('godkjent'), fristen())])
    ).toEqual([
      { fristId: 1, dager: 10, grunnlag: 'godkjent' },
      { fristId: 2, dager: 6, grunnlag: 'godkjent' },
    ]);
  });

  it('første lag er null dager når varselet etter § 33.4 kom for sent, så fristen er ikke forlenget', async () => {
    expect(
      await forlengelsene([
        PAABEROPELSE,
        FRISTKRAVET,
        brevet(forholdet('godkjent'), fristen({ varsel_i_tide: false })),
      ])
    ).toEqual([]);
  });

  it('et nytt krav etter svaret avslutter forlengelsen (HF-U5)', async () => {
    expect(
      await forlengelsene([
        PAABEROPELSE,
        FRISTKRAVET,
        brevet(forholdet('godkjent'), fristen()),
        {
          ...FRISTKRAVET,
          frister: [{ frist_id: 1, dager: 12 }],
          trekker: ['Rekkverket', 'Mekanisk ferdigstillelse'],
          navn: 'K-f2',
        },
      ])
    ).toEqual([]);
  });

  it('et krav uten svar gir ingen forlengelse', async () => {
    expect(await forlengelsene([PAABEROPELSE, FRISTKRAVET])).toEqual([]);
  });

  it('et trukket krav gir ingen forlengelse (KA-U6)', async () => {
    expect(
      await forlengelsene([
        PAABEROPELSE,
        FRISTKRAVET,
        brevet(forholdet('godkjent'), fristen({ dager: 3 })),
        AKSEPT,
        { handling: 'trekk', spor: 'frist' },
      ])
    ).toEqual([]);
  });

  it('et fristsvar som er subsidiært til avslaget av forholdet, er ingen godkjent forlengelse (MM-U9)', async () => {
    expect(
      await forlengelsene([PAABEROPELSE, FRISTKRAVET, brevet(forholdet('avslaatt'), fristen())])
    ).toEqual([]);
  });

  it('avtalt: TE har godtatt svaret før forholdet er avklart, og enigheten er betinget (GR-U7)', async () => {
    expect(
      await forlengelsene([PAABEROPELSE, FRISTKRAVET, brevet(fristen({ dager: 3 })), AKSEPT])
    ).toEqual([
      { fristId: 1, dager: 3, grunnlag: 'avtalt' },
      { fristId: 2, dager: 3, grunnlag: 'avtalt' },
    ]);
  });

  it('godkjent: svaret er gitt før forholdet er besvart', async () => {
    expect(await forlengelsene([PAABEROPELSE, FRISTKRAVET, brevet(fristen({ dager: 3 }))])).toEqual(
      [
        { fristId: 1, dager: 3, grunnlag: 'godkjent' },
        { fristId: 2, dager: 3, grunnlag: 'godkjent' },
      ]
    );
  });
});
