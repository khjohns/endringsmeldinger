/**
 * Bufferen og tilbakerullingen (#304, forløp E2-2, INV-MM-8). Et bufret
 * resultat brukes bare når projeksjonsversjon, regelversjon, format og
 * saksversjon samsvarer med kjernen og saken, også når resultatet er nyere enn
 * kjernen. En hendelse i et format kjernen ikke leser, stopper saken (MM-U2),
 * og ingen rad skrives om.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KJERNE, type Kjerne } from '../versjon.ts';
import { bufferversjon, lesSak, type Bufferversjon } from '../buffer.ts';
import { bygg, type Baner } from './baner.ts';

const NYERE: Kjerne = {
  ...KJERNE,
  projeksjonsversjon: KJERNE.projeksjonsversjon + 1,
  format: KJERNE.format + 1,
};

/** Suiten kjøres i minnet her og mot testbasen i `sprakprove/kjernelagring/`. */
export function bufferen(lagBaner: () => Baner): void {
  describe(`bufferen ${lagBaner().navn}`, () => {
    const baner = lagBaner();
    beforeAll(() => baner.start());
    afterAll(() => baner.stopp());

    it.each([
      ['nyere projeksjonsversjon', { projeksjonsversjon: 1 }],
      ['eldre projeksjonsversjon', { projeksjonsversjon: -1 }],
      ['nyere regelversjon', { regelversjon: 1 }],
      ['eldre regelversjon', { regelversjon: -1 }],
      ['nyere format', { format: 1 }],
      ['eldre format', { format: -1 }],
      ['annen saksversjon', { saksversjon: -1 }],
    ] as const)('brukes ikke med %s', async (_hva, forskjell: Partial<Bufferversjon>) => {
      const bane = await baner.bane();
      await bygg(bane, ['krav_eo']);
      const journal = await bane.journal();
      const egen = await lesSak(bane.sakId, journal, baner.buffer(), KJERNE);
      if (egen.kilde !== 'utledet' || egen.visning.status.kode !== 'venter_paa_svar')
        throw new Error(`Forutsetning: ${egen.kilde} ${egen.visning.status.kode}`);

      // Kontrollsak: et resultat med kjernens egne versjoner brukes.
      const merket = {
        ...egen.visning,
        status: { kode: 'avsluttet_oppgjort' as const, tekst: 'Fra bufferen' },
      };
      const versjon = bufferversjon(KJERNE, journal.at(-1)!.versjon);
      await baner.buffer().skriv(bane.sakId, { versjon, visning: merket });
      const kontroll = await lesSak(bane.sakId, journal, baner.buffer(), KJERNE);
      if (kontroll.kilde !== 'buffer')
        throw new Error('Forutsetning: bufferen ble ikke brukt med like versjoner');

      // Samme resultat, merket med en annen versjon, for eksempel skrevet av en
      // nyere kjerne før tilbakerullingen.
      const annen = Object.fromEntries(
        Object.entries(versjon).map(([n, v]) => [n, v + (forskjell[n as keyof Bufferversjon] ?? 0)])
      ) as unknown as Bufferversjon;
      await baner.buffer().skriv(bane.sakId, { versjon: annen, visning: merket });
      const lest = await lesSak(bane.sakId, journal, baner.buffer(), KJERNE);
      expect(lest.kilde).toBe('utledet');
      expect(lest.visning.status.kode).toBe('venter_paa_svar');
      expect((await baner.buffer().les(bane.sakId))?.versjon).toEqual(versjon);
    });

    it('stopper en sak med en hendelse i et nyere format etter tilbakerullingen, og lar andre saker gå (E2-2)', async () => {
      // Den nye kjernen skriver format 2 i sak A og leser sak B, som bare har format 1.
      const baneA = await baner.bane();
      const a = await bygg(baneA, ['krav_eo']);
      a.kjerne = NYERE;
      expect((await a.send({ handling: 'krav', spor: 'vederlag', belop: 120000 }))?.godtatt).toBe(
        true
      );
      const baneB = await baner.bane();
      await bygg(baneB, ['krav_eo']);
      const journalA = await baneA.journal();
      const journalB = await baneB.journal();
      expect((await lesSak(baneA.sakId, journalA, baner.buffer(), NYERE)).kilde).toBe('utledet');
      expect((await lesSak(baneB.sakId, journalB, baner.buffer(), NYERE)).kilde).toBe('utledet');

      // Tilbakerullet: den gamle kjernen forstår ikke sak A.
      a.kjerne = KJERNE;
      const lestA = await lesSak(baneA.sakId, journalA, baner.buffer(), KJERNE);
      expect(lestA.kilde).toBe('stoppet');
      expect(lestA.visning.status.kode).toBe('kan_ikke_utledes');
      expect(lestA.visning.journal.filter((j) => !j.tolket)).toHaveLength(1);
      expect((await baner.buffer().les(baneA.sakId))?.versjon.format).toBe(NYERE.format);
      for (const h of [
        { handling: 'krav', spor: 'frist', dager: 30 },
        { handling: 'brev', svar: [{ spor: 'grunnlag', resultat: 'godkjent' }] },
      ]) {
        const u = await a.prov(h);
        expect(u.godtatt ? 'godtatt' : u.avvisning.regel).toBe('SAK_IKKE_FORSTAATT');
      }

      // Sak B bygges om av den gamle kjernen og tar imot kommandoer.
      const lestB = await lesSak(baneB.sakId, journalB, baner.buffer(), KJERNE);
      expect(lestB.kilde).toBe('utledet');
      expect((await baner.buffer().les(baneB.sakId))?.versjon).toEqual(
        bufferversjon(KJERNE, journalB.at(-1)!.versjon)
      );
      const b = await bygg(baneB, []);
      expect((await b.prov({ handling: 'krav', spor: 'frist', dager: 30 })).godtatt).toBe(true);

      // Ingen rad er skrevet om.
      expect(await baneA.journal()).toEqual(journalA);
      expect(await baneB.journal()).toEqual(journalB);
    });
  });
}
