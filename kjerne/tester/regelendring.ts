/**
 * Regelendringen (#304, steg 4; forløp C og E2-3): samme historiske journal
 * lest med regelversjon n og n+1, uten nye hendelser. I n+1 gjelder § 32.2
 * ikke SAMORD; endringen er en kontrollert endring i prøven, ikke et vedtak.
 *
 * - Frosset innhold står: beslutningsgrunnlaget, enighetsgrunnlaget og de
 *   lagrede radene (MM-U3, V-B13-REGELVERSJON, 2.7 regel 4).
 * - Et svar som ikke er godtatt, utledes på nytt og merkes som avvikende
 *   (B-13, merknaden 05.10; MM-U4).
 * - En aksept av et avvikende svar avvises, og journalen er uendret (MM-U4).
 *   Kontrollsak: et svar der brevet stemmer, godtas med regelversjon n+1.
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
import { medRegler, type Kjoring } from './kjorer.ts';

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
    const saker: Record<string, { bane: Bane; k: Kjoring; journal: Journalrad[] }> = {};

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
        svar: [{ spor: 'grunnlag', navn: 'S-g1', resultat: 'avslatt', varslet_i_tide: false }],
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
        if (!n.forstatt || !n1.forstatt) throw new Error(`Forutsetning: ${navn} er ikke forstått`);
        expect(frosset(n1), navn).toEqual(frosset(n));
        expect(await s.bane.journal(), navn).toEqual(s.journal);
      }
      const godtatt = utledJournal(saker['godtatt'].journal, N1);
      expect(godtatt.spor.grunnlag.enighet?.grunnlag.regelversjon).toBe(KJERNE.regler.versjon);
      expect(godtatt.grunnlagAvvist).toBe(true);
      expect(godtatt.avsluttet).toBe(true);
    });

    it('utleder et svar som ikke er godtatt, på nytt og merker det som avvikende', () => {
      const svarId = saker['ikke godtatt'].k.navn.id('S-g1');
      const n = utledJournal(saker['ikke godtatt'].journal, KJERNE);
      const n1 = utledJournal(saker['ikke godtatt'].journal, N1);
      expect(n.svar[svarId].avvik).toBe(false);
      expect(n1.svar[svarId].avvik).toBe(true);
      expect(n1.svar[svarId].standpunkter.map((p) => p.virkning)).toEqual([
        'uten_virkning',
        'hovedgrunn',
      ]);
      expect(n1.svar[svarId].svar.beslutningsgrunnlag?.linje).toBe(
        'Prinsipalt prekludert (§ 32.2), subsidiært avslått.'
      );
      expect(visning(n1).spor.grunnlag.etiketter).toContain('avviker_fra_brevet');
      // Kontrollsak: svaret i en kategori endringen ikke rører, avviker ikke.
      const kontroll = utledJournal(saker['utenfor endringen'].journal, N1);
      expect(kontroll.svar[saker['utenfor endringen'].k.navn.id('S-g1')].avvik).toBe(false);
    });

    it('avviser en aksept av det avvikende svaret, og godtar kontrollsaken', async () => {
      const s = saker['ikke godtatt'];
      s.k.kjerne = N1;
      const avvist = await s.k.send({ handling: 'aksept', spor: 'grunnlag', klientregler: 'n+1' });
      expect(avvist?.godtatt ? 'godtatt' : avvist?.avvisning.regel).toBe('RESPONSE_DEVIATES');
      expect(await s.bane.journal()).toEqual(s.journal);

      const k = saker['utenfor endringen'];
      k.k.kjerne = N1;
      const godtatt = await k.k.send({ handling: 'aksept', spor: 'grunnlag', klientregler: 'n+1' });
      expect(godtatt?.godtatt).toBe(true);
      expect((await k.k.utledning()).spor.grunnlag.enighet?.grunnlag.regelversjon).toBe(
        NESTE_REGLER.versjon
      );
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
