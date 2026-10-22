/**
 * Kompatibilitetsmatrisen mellom TS-versjoner (B-10, #316, invariant 9). Tre
 * versjoner av kjernen rundt et nytt format 2:
 *
 * | Versjon | Leser format | Skriver format |
 * | ------- | ------------ | -------------- |
 * | v1      | 1            | 1              |
 * | v2a     | 1–2          | 1              |
 * | v2b     | 1–2          | 2              |
 *
 * Et nytt format leses i én versjon før det skrives i den neste. Forventningen
 * er invariant 9 og MM-U2: en versjon leser det den selv og alle eldre
 * versjoner har skrevet, en tilbakerulling ett trinn stopper ingen sak, og en
 * versjon som møter et nyere format, stopper saken for bindende kommandoer uten
 * å hoppe over raden eller skrive om noe.
 *
 * Format 2 er her bare et høyere nummer på samme skjema; prøven gjelder
 * versjonsgrensen, ikke innholdet i et framtidig format.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { lesSak } from '../utledning/buffer.ts';
import { utledJournal } from '../kommandoer/skriving.ts';
import { visning } from '../utledning/visning.ts';
import { KJERNE, type Kjerne } from '../versjon.ts';
import { bygg, type Baner } from './baner.ts';
import type { Handling } from './klient.ts';

const V1: Kjerne = { ...KJERNE };
const V2A: Kjerne = {
  ...KJERNE,
  projeksjonsversjon: KJERNE.projeksjonsversjon + 1,
  leserformat: KJERNE.leserformat + 1,
};
const V2B: Kjerne = {
  ...V2A,
  projeksjonsversjon: KJERNE.projeksjonsversjon + 2,
  format: KJERNE.format + 1,
};
export const VERSJONER: Record<string, Kjerne> = { v1: V1, v2a: V2A, v2b: V2B };

/** Kravet etter `krav_eo`. Godtas i en sak kjernen forstår. */
const FRIST: Handling = { handling: 'krav', spor: 'frist', dager: 30 };
const VEDERLAG: Handling = { handling: 'krav', spor: 'vederlag', belop: 120000 };

/** Suiten kjøres i minnet her og mot testbasen i `sprakprove/kjernelagring/`. */
export function kompatibiliteten(lagBaner: () => Baner): void {
  describe(`kompatibiliteten ${lagBaner().navn}`, () => {
    const baner = lagBaner();
    beforeAll(() => baner.start());
    afterAll(() => baner.stopp());

    const forstaar = (skriver: Kjerne, leser: Kjerne) => skriver.format <= leser.leserformat;

    it.each(
      Object.keys(VERSJONER).flatMap((s) => Object.keys(VERSJONER).map((l) => [s, l] as const))
    )('skrevet av %s, lest av %s', async (s, l) => {
      const skriver = VERSJONER[s];
      const leser = VERSJONER[l];
      const bane = await baner.bane();
      const k = await bygg(bane, ['krav_eo'], skriver);
      expect((await k.send(VEDERLAG))?.godtatt).toBe(true);
      const journal = await bane.journal();
      expect(journal.at(-1)!.format).toBe(skriver.format);

      const lest = await lesSak(bane.sakId, journal, baner.buffer(), leser);
      k.kjerne = leser;
      const kommando = await k.prov(FRIST);
      if (forstaar(skriver, leser)) {
        expect(lest.kilde).toBe('utledet');
        // Leseren ser det skriveren så.
        expect(lest.visning).toEqual(visning(utledJournal(journal, skriver), skriver.regler));
        expect(kommando.godtatt).toBe(true);
      } else {
        // MM-U2: saken stopper, og ingen rad er skjult.
        expect(lest.kilde).toBe('stoppet');
        expect(lest.visning.status?.kode).toBe('kan_ikke_utledes');
        expect(lest.visning.journal.map((j) => j.hendelse)).toEqual(journal.map((r) => r.event_id));
        expect(lest.visning.journal.filter((j) => !j.tolket).map((j) => j.hendelse)).toEqual(
          journal.filter((r) => r.format! > leser.leserformat).map((r) => r.event_id)
        );
        expect(lest.visning.merknader).toContain('varsel_med_frist_utenfor_appen');
        expect(kommando.godtatt ? 'godtatt' : kommando.avvisning.regel).toBe('SAK_IKKE_FORSTAATT');
      }
      expect(await bane.journal()).toEqual(journal);
    });

    it('utrulling v1 → v2a → v2b og tilbakerulling til v2a lar saken gå, med formatene blandet', async () => {
      const bane = await baner.bane();
      const k = await bygg(bane, ['krav_eo'], V1);
      k.kjerne = V2A;
      expect((await k.send(VEDERLAG))?.godtatt).toBe(true);
      k.kjerne = V2B;
      expect((await k.send(FRIST))?.godtatt).toBe(true);
      k.kjerne = V2A;
      const brev: Handling = {
        handling: 'brev',
        svar: [{ spor: 'grunnlag', resultat: 'godkjent' }],
      };
      expect((await k.send(brev))?.godtatt).toBe(true);
      const journal = await bane.journal();
      expect(journal.slice(0, -3).every((r) => r.format === 1)).toBe(true);
      expect(journal.slice(-3).map((r) => r.format)).toEqual([1, 2, 1]);
      for (const leser of [V2A, V2B])
        expect((await lesSak(bane.sakId, journal, baner.buffer(), leser)).kilde).toBe('utledet');
    });

    it('tilbakerulling to trinn stopper bare sakene med format 2, og ingen rad skrives om', async () => {
      const ny = await baner.bane();
      const a = await bygg(ny, ['krav_eo'], V2B);
      expect((await a.send(VEDERLAG))?.godtatt).toBe(true);
      const gammel = await baner.bane();
      // Kontrollsak: skrevet av v2a, i format 1.
      const b = await bygg(gammel, ['krav_eo'], V2A);
      expect((await b.send(VEDERLAG))?.godtatt).toBe(true);

      const journalA = await ny.journal();
      const journalB = await gammel.journal();
      a.kjerne = V1;
      b.kjerne = V1;
      expect((await lesSak(ny.sakId, journalA, baner.buffer(), V1)).kilde).toBe('stoppet');
      expect((await lesSak(gammel.sakId, journalB, baner.buffer(), V1)).kilde).toBe('utledet');
      const avvist = await a.prov(FRIST);
      expect(avvist.godtatt ? 'godtatt' : avvist.avvisning.regel).toBe('SAK_IKKE_FORSTAATT');
      expect((await b.prov(FRIST)).godtatt).toBe(true);
      expect(await ny.journal()).toEqual(journalA);
      expect(await gammel.journal()).toEqual(journalB);
    });
  });
}
