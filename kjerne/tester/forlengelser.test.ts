/**
 * Forlengelsene en sak gir fristene i fristtabellen, som en annen sak i samme kontrakt regner
 * fristen fra (GFK-U19, GFK-U26). Avtalt er dagene i en enighet, også en betinget enighet og en
 * enighet ved sammenfall (GR-U7, KA-U77, og svarene på spørsmål 1 og 2 i
 * `docs/vedlegg/fristen-del2-pr3-2026-11-14/sporsmal.md`). Godkjent er dagene i første lag i
 * byggherrens gjeldende svar uten enighet. Dagene byggherren bare har godkjent subsidiært, nevnes
 * som ikke tatt med (svarene på spørsmål 1, 2 og C i `sporsmal-2.md`). Fristtabellen i kjøringen er `FRISTTABELLEN`.
 */

import { describe, expect, it } from 'vitest';
import { minnebane } from './bane.ts';
import { kjoer, type Forloep } from './kjoerer.ts';
import type { Handling } from './klient.ts';
import { forlengelseneISaken, fristenEtterForlengelsene } from '../spor/frist/utledning.ts';

async function lesingen(steg: Handling[]) {
  const forloep: Forloep = { id: 'forlengelser', rader: [], start: null, steg, kontroller: [] };
  const k = await kjoer(forloep, minnebane({ sakstittel: 'Fasaden' }));
  return forlengelseneISaken(await k.utledning());
}

/** Dagene som forlenger fristen; de som ikke tas med, må være ingen. */
async function forlengelsene(steg: Handling[]) {
  const { tattMed, ikkeTattMed } = await lesingen(steg);
  expect(ikkeTattMed).toEqual([]);
  return tattMed;
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

  it('avtalt: byggherren har godkjent alle dagene TE krevde, og partene er enige uten aksept (GR-U7)', async () => {
    expect(
      await forlengelsene([PAABEROPELSE, FRISTKRAVET, brevet(forholdet('godkjent'), fristen())])
    ).toEqual([
      { fristId: 1, dager: 10, grunnlag: 'avtalt' },
      { fristId: 2, dager: 6, grunnlag: 'avtalt' },
    ]);
  });

  it('første lag er null dager når varselet etter § 33.4 kom for sent, så fristen er ikke forlenget, og de subsidiært godkjente dagene nevnes som ikke tatt med (spørsmål 1 i sporsmal-2.md)', async () => {
    expect(
      await lesingen([
        PAABEROPELSE,
        FRISTKRAVET,
        brevet(forholdet('godkjent'), fristen({ varsel_i_tide: false })),
      ])
    ).toEqual({
      tattMed: [],
      ikkeTattMed: [
        { fristId: 1, dager: 10, grunnlag: 'subsidiaert_i_fristen' },
        { fristId: 2, dager: 6, grunnlag: 'subsidiaert_i_fristen' },
      ],
    });
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

  it('subsidiært: et svar uten enighet som er subsidiært til avslaget av forholdet, merkes og forlenger ikke fristen (spørsmål 2)', async () => {
    expect(
      await lesingen([
        PAABEROPELSE,
        FRISTKRAVET,
        brevet(forholdet('avslaatt'), fristen({ dager: 3 })),
      ])
    ).toEqual({
      tattMed: [],
      ikkeTattMed: [
        { fristId: 1, dager: 3, grunnlag: 'subsidiaert_til_forholdet' },
        { fristId: 2, dager: 3, grunnlag: 'subsidiaert_til_forholdet' },
      ],
    });
  });

  it('subsidiært: avslår byggherren forholdet etter fristsvaret, tas dagene ut, og fristsvaret er uendret (spørsmål 2 i sporsmal-2.md, GR-U26)', async () => {
    expect(
      await lesingen([
        PAABEROPELSE,
        FRISTKRAVET,
        brevet(fristen({ dager: 3 })),
        { handling: 'brev', navn: 'D4', svar: [forholdet('avslaatt')] },
      ])
    ).toEqual({
      tattMed: [],
      ikkeTattMed: [
        { fristId: 1, dager: 3, grunnlag: 'subsidiaert_til_forholdet' },
        { fristId: 2, dager: 3, grunnlag: 'subsidiaert_til_forholdet' },
      ],
    });
  });

  it('avtalt: alle dagene er godkjent subsidiært, og enigheten er betinget (spørsmål 2)', async () => {
    expect(
      await forlengelsene([PAABEROPELSE, FRISTKRAVET, brevet(forholdet('avslaatt'), fristen())])
    ).toEqual([
      { fristId: 1, dager: 10, grunnlag: 'avtalt' },
      { fristId: 2, dager: 6, grunnlag: 'avtalt' },
    ]);
  });

  it('en enighet uten virkning gir ingen forlengelse: avslaget av forholdet er godtatt (GR-U7, KA-U6)', async () => {
    expect(
      await forlengelsene([
        PAABEROPELSE,
        FRISTKRAVET,
        brevet(forholdet('avslaatt'), fristen()),
        { handling: 'aksept', spor: 'forhold', navn: 'A0' },
      ])
    ).toEqual([]);
  });

  it('avslaget av forholdet er godtatt, men ikke fristsvaret: dagene har ingen virkning og er ikke et åpent spørsmål (GR-U7, KA-U6)', async () => {
    expect(
      await lesingen([
        PAABEROPELSE,
        FRISTKRAVET,
        brevet(forholdet('avslaatt'), fristen({ dager: 3 })),
        { handling: 'aksept', spor: 'forhold', navn: 'A0' },
      ])
    ).toEqual({ tattMed: [], ikkeTattMed: [] });
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

describe('fristen etter forlengelsene (GFK-U19)', () => {
  it('summerer dagene som forlenger fristen, for den fristen', () => {
    expect(
      fristenEtterForlengelsene('2026-12-16', 2, [
        { fristId: 2, dager: 3, grunnlag: 'avtalt' },
        { fristId: 2, dager: 4, grunnlag: 'godkjent' },
        { fristId: 1, dager: 30, grunnlag: 'godkjent' },
      ])
    ).toBe('2026-12-23');
  });
});
