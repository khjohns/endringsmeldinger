/**
 * Deres ref. i hodet på brevet løsningen sender (LV-U27, LV-U49, LV-U50, LV-U51), frosset i
 * `dokument_registrert` som `deres_ref` (A-3 A i #1497). Tilfellene er T-1 til T-7 og T-11 i
 * bestillingen for BF-07 (`docs/domenetabell/brukerforlop/BF-07.md`), med brevnumrene slik
 * skrivingen setter dem (G-5), i sak KOE-17 i prosjektet K201.
 */

import { describe, expect, it } from 'vitest';
import { lesJournal } from '../format/leser.ts';
import { lagDeresRef } from '../frosset/brevtekst.ts';
import { utledJournal } from '../kommandoer/skriving.ts';
import { KJERNE } from '../versjon.ts';
import { minnebane } from './bane.ts';
import { Kjoering } from './kjoerer.ts';
import type { Handling } from './klient.ts';
import type { Journalrad } from '../typer.ts';

const KRAV_FORHOLD: Handling = {
  handling: 'krav',
  spor: 'forhold',
  underkategori: 'irregulaer_endring',
  navn: 'K-g1',
};
const KRAV_VEDERLAG: Handling = { handling: 'krav', spor: 'vederlag', belop: 100000, navn: 'K-v1' };
const SVAR_VEDERLAG: Handling = {
  handling: 'brev',
  navn: 'D3',
  svar: [{ spor: 'vederlag', navn: 'S-v1', vurdering: 'delvis', godkjent_belop: 60000 }],
};
const SVAR_FORHOLD: Handling = {
  handling: 'brev',
  navn: 'D2',
  svar: [{ spor: 'forhold', navn: 'S-g1', resultat: 'godkjent', varslet_i_tide: true }],
};

const m = (n: number) => `K201-KOE-017-${String(n).padStart(2, '0')}`;

async function kjoering(steg: Handling[]) {
  const k = new Kjoering(minnebane());
  for (const h of steg) {
    const u = await k.send(h);
    if (!u?.godtatt)
      throw new Error(`Forutsetning: ${h.handling} ble avvist: ${JSON.stringify(u)}`);
  }
  return k;
}

const sist = async (k: Kjoering): Promise<Journalrad> => (await k.bane.journal()).at(-1)!;

describe('Deres ref. i brevet løsningen sender (LV-U27, LV-U49, BF-07)', () => {
  it('T-1: påberopelsen er sakens første brev og har ingen Deres ref.; merkingen er Vår ref.', async () => {
    const k = await kjoering([KRAV_FORHOLD]);
    const rad = await sist(k);
    expect(rad.data.merking).toBe(m(1));
    expect(rad.data).not.toHaveProperty('deres_ref');
  });

  it('T-2: svaret på forholdet viser til TEs krav (LV-U49)', async () => {
    const k = await kjoering([KRAV_FORHOLD, SVAR_FORHOLD]);
    expect((await sist(k)).data.deres_ref).toEqual([m(1)]);
  });

  it('T-6: ett svar på krav i flere brev viser til hvert av dem, i rekkefølgen etter brevnummeret (U-2)', async () => {
    const k = await kjoering([
      KRAV_FORHOLD,
      KRAV_VEDERLAG,
      {
        handling: 'brev',
        navn: 'D3',
        svar: [
          { spor: 'vederlag', navn: 'S-v1', vurdering: 'delvis', godkjent_belop: 60000 },
          { spor: 'forhold', navn: 'S-g1', resultat: 'godkjent', varslet_i_tide: true },
        ],
      },
    ]);
    expect((await sist(k)).data.deres_ref).toEqual([m(1), m(2)]);
  });

  it('T-5: TEs aksept viser til BHs svar den godtar, ikke til eget krav (LV-U49)', async () => {
    const k = await kjoering([
      KRAV_FORHOLD,
      SVAR_FORHOLD,
      KRAV_VEDERLAG,
      SVAR_VEDERLAG,
      { handling: 'aksept', spor: 'vederlag', navn: 'D5' },
    ]);
    expect((await sist(k)).data.deres_ref).toEqual([m(4)]);
  });

  it('T-7: et revidert svar viser til kravet, ikke til eget svar det erstatter', async () => {
    const k = await kjoering([
      KRAV_FORHOLD,
      SVAR_FORHOLD,
      KRAV_VEDERLAG,
      SVAR_VEDERLAG,
      {
        handling: 'revisjon',
        spor: 'vederlag',
        navn: 'S-v2',
        dokument: 'D5',
        vurdering: 'delvis',
        godkjent_belop: 70000,
      },
    ]);
    expect((await sist(k)).data.deres_ref).toEqual([m(3)]);
  });

  it('T-11: en ny kravversjon viser til BHs siste svar på kravversjonen den erstatter (LV-U50, LV-U51)', async () => {
    const k = await kjoering([
      KRAV_FORHOLD,
      SVAR_FORHOLD,
      KRAV_VEDERLAG,
      SVAR_VEDERLAG,
      {
        handling: 'revisjon',
        spor: 'vederlag',
        navn: 'S-v2',
        dokument: 'D5',
        vurdering: 'delvis',
        godkjent_belop: 70000,
      },
      { handling: 'krav', spor: 'vederlag', belop: 90000, navn: 'K-v2' },
    ]);
    // Brev 5 er revisjonen, og svaret i brev 4 er erstattet av den.
    expect((await sist(k)).data.deres_ref).toEqual([m(5)]);
  });

  it('T-11: har BH ikke svart på kravversjonen som erstattes, står ingen kode (LV-U50)', async () => {
    const k = await kjoering([
      KRAV_FORHOLD,
      SVAR_FORHOLD,
      KRAV_VEDERLAG,
      { handling: 'krav', spor: 'vederlag', belop: 90000, navn: 'K-v2' },
    ]);
    const rad = await sist(k);
    expect(rad.data.merking).toBe(m(4));
    expect(rad.data).not.toHaveProperty('deres_ref');
  });

  it('T-14: motpartens brev uten merking står ikke, med samme brev med merking som kontrollsak (D-4, LV-U27)', async () => {
    const k = await kjoering([KRAV_FORHOLD, SVAR_FORHOLD]);
    const journal = await k.bane.journal();
    const deresRef = (rader: Journalrad[]) => {
      const lest = lesJournal(rader, KJERNE.leserformat);
      const svaret = lest.at(-1)!;
      if (svaret.art !== 'dokument') throw new Error('Forutsetning: svaret er et dokument');
      return lagDeresRef(svaret.dokument, lest.slice(0, -1));
    };
    expect(deresRef(journal)).toEqual([m(1)]);
    // Som registrert korrespondanse har kravet ingen merking (G-3).
    const utenMerking = structuredClone(journal);
    delete utenMerking[1].data.merking;
    expect(deresRef(utenMerking)).toEqual([]);
  });

  it('Deres ref. leses tilbake som den ble frosset, og et sendt brev beholder den (D-2, MM-U9)', async () => {
    const k = await kjoering([KRAV_FORHOLD, SVAR_FORHOLD]);
    const journal = await k.bane.journal();
    const u = utledJournal(journal, KJERNE);
    expect(u.forstaatt).toBe(true);
    const lest = lesJournal(journal, KJERNE.leserformat).at(-1)!;
    expect(lest.art === 'dokument' && lest.dokument.deresRef).toEqual([m(1)]);
  });
});

describe('leseren av Deres ref. (MM-U2)', () => {
  const svarrad = async () => {
    const k = await kjoering([KRAV_FORHOLD, SVAR_FORHOLD]);
    return k.bane.journal();
  };
  const forstaatt = (journal: Journalrad[]) => utledJournal(journal, KJERNE).forstaatt;

  it('en Deres ref. uten merkingen er ikke forstått, med samme rad med merkingen som kontrollsak', async () => {
    const journal = await svarrad();
    expect(forstaatt(journal)).toBe(true);
    const utenMerking = structuredClone(journal);
    delete utenMerking.at(-1)!.data.merking;
    expect(forstaatt(utenMerking)).toBe(false);
  });

  it.each<[string, unknown]>([
    ['en tom liste', []],
    ['en tom kode', ['']],
    ['en kode som ikke er tekst', [17]],
  ])('Deres ref. som %s er ikke forstått', async (_, verdi) => {
    const journal = await svarrad();
    journal.at(-1)!.data.deres_ref = verdi;
    expect(forstaatt(journal)).toBe(false);
  });
});
