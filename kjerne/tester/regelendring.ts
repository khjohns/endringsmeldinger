/**
 * Regelendringen (#304, steg 4; forløp C og E2-3): samme historiske journal
 * lest med regelversjon n og n+1, uten nye hendelser. I n+1 gjelder § 32.2
 * ikke SAMORD; endringen er en kontrollert endring i prøven, ikke et vedtak.
 *
 * - Frosset innhold står: beslutningsgrunnlaget, enighetsgrunnlaget og de
 *   lagrede radene (MM-U3, V-B13-REGELVERSJON, 2.7 regel 4).
 * - Et sendt brev beholder virkningen det hadde da det ble sendt. Dagens regler
 *   vises bare som en merknad i visningen (MM-U9).
 * - TE kan godta svaret slik brevet uttrykte det, også etter regelendringen;
 *   enigheten får brevets standpunkter og regelversjon (MM-U9, MM-U3).
 * - Sakene som endres, listes før utrulling, og bufrede resultater fra n
 *   brukes ikke (B-13, 2.7 regel 2).
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Journalrad } from '../typer.ts';
import { KJERNE } from '../versjon.ts';
import { utledJournal } from '../skriving.ts';
import type { Utledning } from '../utled.ts';
import { visning } from '../visning.ts';
import { endredeSaker, lesSak } from '../buffer.ts';
import type { Bane } from './bane.ts';
import { bygg, type Baner } from './baner.ts';
import { NESTE_REGLER } from './klient.ts';
import { medRegler, type Kjoering } from './kjoerer.ts';

const N1 = medRegler(NESTE_REGLER);

const frosset = (u: Utledning) => ({
  beslutningsgrunnlag: Object.values(u.svar).map((s) => s.svar.beslutningsgrunnlag),
  enighetsgrunnlag: Object.values(u.spor).map(
    (s) => s.enighet && { grunnlag: s.enighet.grunnlag, holder: s.enighet.holder }
  ),
});

/** Suiten kjøres i minnet her og mot testbasen i `sprakprove/kjernelagring/`. */
export function regelendringen(lagBaner: () => Baner): void {
  describe(`regelendringen ${lagBaner().navn}`, () => {
    const baner = lagBaner();
    const saker: Record<string, { bane: Bane; k: Kjoering; journal: Journalrad[] }> = {};

    beforeAll(async () => {
      await baner.start();
      // Journalen skrevet med regelversjon n.
      const lag = async (navn: string, steg: Parameters<typeof bygg>[1]) => {
        const bane = await baner.bane();
        const k = await bygg(bane, steg);
        saker[navn] = { bane, k, journal: await bane.journal() };
      };
      const prekludertAvslag = {
        handling: 'brev',
        navn: 'D3',
        svar: [{ spor: 'grunnlag', navn: 'S-g1', resultat: 'avslaatt', varslet_i_tide: false }],
      };
      await lag('ikke godtatt', ['krav_samord', prekludertAvslag]);
      await lag('godtatt', [
        'krav_samord',
        {
          handling: 'brev',
          svar: [{ spor: 'grunnlag', resultat: 'godkjent', varslet_i_tide: false }],
        },
        { handling: 'aksept', spor: 'grunnlag' },
      ]);
      await lag('utenfor endringen', ['krav_irreg', prekludertAvslag]);
      await lag('enighet om beløpet', ['forlop_a']);
      for (const s of Object.values(saker))
        await lesSak(s.bane.sakId, s.journal, baner.buffer(), KJERNE);
    });
    afterAll(() => baner.stopp());

    it('lar beslutningsgrunnlag, enighetsgrunnlag og lagrede rader stå', async () => {
      for (const [navn, s] of Object.entries(saker)) {
        const n = utledJournal(s.journal, KJERNE);
        const n1 = utledJournal(s.journal, N1);
        if (!n.forstaatt || !n1.forstaatt)
          throw new Error(`Forutsetning: ${navn} er ikke forstått`);
        expect(frosset(n1), navn).toEqual(frosset(n));
        expect(await s.bane.journal(), navn).toEqual(s.journal);
      }
      const godtatt = utledJournal(saker['godtatt'].journal, N1);
      expect(godtatt.spor.grunnlag.enighet?.grunnlag.regelversjon).toBe(KJERNE.regler.versjon);
      expect(godtatt.grunnlagAvvist).toBe(true);
    });

    it('lar brevet beholde virkningen og viser regelendringen bare som merknad', () => {
      const svarId = saker['ikke godtatt'].k.navn.id('S-g1');
      const n = utledJournal(saker['ikke godtatt'].journal, KJERNE);
      const n1 = utledJournal(saker['ikke godtatt'].journal, N1);
      expect(n1.svar[svarId]).toEqual(n.svar[svarId]);
      expect(n1.svar[svarId].virkninger.map((p) => p.virkning)).toEqual([
        'prinsipalt',
        'subsidiaert',
      ]);
      expect(n1.spor.vederlag.subsidiaer).toEqual(['prekludert', 'avslaatt']);
      expect(visning(n, KJERNE.regler).spor.grunnlag.etiketter).not.toContain(
        'regel_endret_etter_brevet'
      );
      expect(visning(n1, N1.regler).spor.grunnlag.etiketter).toContain('regel_endret_etter_brevet');
      // Kontrollsak: svaret i en kategori endringen ikke rører, får ingen merknad.
      const kontroll = utledJournal(saker['utenfor endringen'].journal, N1);
      expect(visning(kontroll, N1.regler).spor.grunnlag.etiketter).not.toContain(
        'regel_endret_etter_brevet'
      );
    });

    it('godtar en aksept av svaret slik brevet uttrykte det, etter regelendringen', async () => {
      const s = saker['ikke godtatt'];
      s.k.kjerne = N1;
      const godtatt = await s.k.send({ handling: 'aksept', spor: 'grunnlag', klientregler: 'n+1' });
      expect(godtatt?.godtatt ? 'godtatt' : godtatt?.avvisning.regel).toBe('godtatt');
      const u = await s.k.utledning();
      expect(u.spor.grunnlag.enighet?.grunnlag.regelversjon).toBe(KJERNE.regler.versjon);
      expect(u.grunnlagAvvist).toBe(true);
    });

    it('lister sakene som endres før utrulling, og bygger bufferen på nytt (E2-3)', async () => {
      const journaler = new Map(Object.values(saker).map((s) => [s.bane.sakId, s.journal]));
      const navn = new Map(Object.entries(saker).map(([n, s]) => [s.bane.sakId, n]));
      expect(
        endredeSaker(journaler, KJERNE, N1)
          .map((id) => navn.get(id))
          .sort()
      ).toEqual(['godtatt', 'ikke godtatt']);
      const s = saker['enighet om beløpet'];
      expect((await lesSak(s.bane.sakId, s.journal, baner.buffer(), KJERNE)).kilde).toBe('buffer');
      expect((await lesSak(s.bane.sakId, s.journal, baner.buffer(), N1)).kilde).toBe('utledet');
      expect((await lesSak(s.bane.sakId, s.journal, baner.buffer(), N1)).kilde).toBe('buffer');
    });
  });
}
