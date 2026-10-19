/**
 * Forløp A–E fra kjernen mot testbasen i SQL Server (#304, #308, #273, #932): hver
 * kommando lagres i `koe.hendelse` med testskriveren i `bane.ts`, og journalen
 * leses med serverens `lesJournal` før hver utledning. Prøvene 7.1–7.3 i
 * designnotatet for #273 mot basen. Krever `KOE_SQLSERVER_TILKOBLING`.
 */

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { utledJournal } from '../../kjerne/kommandoer/skriving.ts';
import type { Journalrad } from '../../kjerne/typer.ts';
import { KJERNE } from '../../kjerne/versjon.ts';
import { bygg } from '../../kjerne/tester/baner.ts';
import { avvikFraFormatet, utenAvsnitt } from '../../kjerne/tester/formatprove.ts';
import { Kjoering, kjoer, MAALMODELL } from '../../kjerne/tester/kjoerer.ts';
import { Versjonskonflikt } from '../../server/lager.ts';
import type { Foresp } from '../../server/tester/sqlserver_migrert.ts';
import { lagOppsett, rydd, type Oppsett } from '../../server/tester/testbase.ts';
import { basebane, GRENSER, journalen, skrivRader, somEier, TESTBASE_URL } from './bane.ts';

vi.setConfig(GRENSER);

describe.skipIf(!TESTBASE_URL)('forløp A–E gjennom testbasen', () => {
  let o: Oppsett;
  beforeAll(async () => {
    o = await lagOppsett();
  });
  afterAll(async () => {
    if (o) await rydd(o);
  });

  it.each(MAALMODELL.forlop.map((f) => [f.id, f] as const))('%s', async (_id, forloep) => {
    const bane = await basebane(o);
    const k = await kjoer(forloep, bane, {
      paastand: (holder, melding) => expect(holder, melding).toBe(true),
    });
    // 7.1.2: hver rad kjernen skrev, har formen i format 1 slik basen gir den tilbake.
    const skrevet = (await bane.journal()).filter((r) => k.skrevet.includes(r.event_id));
    expect(skrevet.flatMap(avvikFraFormatet)).toEqual([]);
    // LV-U3: hvert utsagn i et brev appen sendte, står i brevteksten.
    expect(skrevet.flatMap(utenAvsnitt)).toEqual([]);
  });

  /**
   * 7.3: brevet i forløp A, steg 2, med tre svar, avbrutt etter at raden er skrevet
   * og før COMMIT (invariant 3 i hovedplanen). Leveringsintensjonen og det frosne
   * dokumentgrunnlaget finnes ikke i TS-stien ennå; de hører til #310, og prøven
   * viser bare journalen og saksversjonen.
   */
  it.each([
    ['en krok som kaster', async () => Promise.reject(new Error('avbrutt før COMMIT'))],
    [
      'en avbrutt forbindelse',
      // En sesjon kan ikke avslutte seg selv, så eieren gjør det fra en annen forbindelse.
      async (r: Foresp) => {
        const { spid } = (await r().query<{ spid: number }>('SELECT @@SPID AS spid')).recordset[0];
        await o.datalag.base.pool.request().batch(`KILL ${Number(spid)}`);
      },
    ],
  ] as const)(
    'et brev med tre svar lagres samlet eller ikke: %s (7.3)',
    async (_hva, foerCommit) => {
      const [brev, ...foer] = [...MAALMODELL.prefikser.forlop_a_brev].reverse();
      const bane = await basebane(o);
      const k = await bygg(bane, foer.reverse());
      const journal = await bane.journal();
      const utfall = await k.prov(brev);
      if (!utfall.godtatt)
        throw new Error(`Forutsetning: brevet ble avvist: ${utfall.avvisning.regel}`);
      const [rad] = utfall.hendelser;
      if ((rad.data.svar as unknown[]).length !== 3)
        throw new Error('Forutsetning: brevet har tre svar');

      await expect(
        skrivRader(o, utfall.hendelser, journal.at(-1)!.versjon, { foerCommit })
      ).rejects.toThrow();
      expect(await bane.journal()).toEqual(journal);
      const lagret = await somEier(o, (r) =>
        r()
          .input('event_id', rad.event_id)
          .query('SELECT 1 FROM koe.hendelse WHERE event_id = @event_id')
      );
      expect(lagret.recordset).toHaveLength(0);

      // Samme kommando igjen gir ett dokument med tre svar, hvert med sitt beslutningsgrunnlag.
      expect((await k.send(brev))?.godtatt).toBe(true);
      const etter = await bane.journal();
      expect(etter).toHaveLength(journal.length + 1);
      const ny = etter.at(-1)!;
      expect(ny.versjon).toBe(journal.at(-1)!.versjon + 1);
      const svar = ny.data.svar as { spor: string; beslutningsgrunnlag?: unknown }[];
      expect(svar.map((s) => s.spor)).toEqual(['grunnlag', 'vederlag', 'frist']);
      expect(svar.every((s) => typeof s.beslutningsgrunnlag === 'object')).toBe(true);
      expect(utledJournal(etter, KJERNE).forstaatt).toBe(true);
    }
  );

  it('en referanse til et svar i en annen sak gir en sak som ikke er forstått (7.1.4)', async () => {
    const a = await bygg(await basebane(o), ['forlop_a']);
    const baneB = await basebane(o);
    await bygg(baneB, ['krav_eo']);
    const journalB = await baneB.journal();
    const siste = journalB.at(-1)!;
    const aksept: Journalrad = {
      ...siste,
      event_id: randomUUID(),
      aktor_id: o.te.id,
      aktor_rolle: 'TE',
      data: {
        utsagn: [
          {
            id: randomUUID(),
            art: 'aksept',
            gjelder: a.navn.id('S-v2'),
            regelversjon: KJERNE.regler.versjon,
          },
        ],
      },
    };
    if (!utledJournal(journalB, KJERNE).forstaatt)
      throw new Error('Forutsetning: sak B er forstått');
    await skrivRader(o, [aksept], siste.versjon);
    const lest = await journalen(o, baneB.sakId);
    expect(lest.map((r) => r.event_id)).toContain(aksept.event_id);
    expect(lest.every((r) => r.sak_id === baneB.sakId)).toBe(true);
    expect(utledJournal(lest, KJERNE).forstaatt).toBe(false);
  });

  it('avviser en aksept forhåndsvist før en senere hendelse, og journalen er uendret (expected_version, 2.5)', async () => {
    const forloep = MAALMODELL.forlop.find((f) => f.id === 'F-MM-A1')!;
    const bane = await basebane(o);
    const k = new Kjoering(bane);
    for (const h of MAALMODELL.prefikser[forloep.start!])
      expect((await k.send(h))?.godtatt).toBe(true);
    const foran = (await bane.journal()).at(-1)!.versjon;
    const aksept = await k.prov({ handling: 'aksept', spor: 'vederlag' });
    if (!aksept.godtatt)
      throw new Error(`Forutsetning: aksepten ble avvist: ${aksept.avvisning.regel}`);

    // Byggherren reviderer svaret mens TE ser på forhåndsvisningen.
    expect(
      (
        await k.send({
          handling: 'revisjon',
          spor: 'vederlag',
          vurdering: 'delvis',
          godkjent_belop: 65000,
        })
      )?.godtatt
    ).toBe(true);
    const etterRevisjon = await bane.journal();
    await expect(bane.skriv(aksept.hendelser, foran)).rejects.toBeInstanceOf(Versjonskonflikt);
    expect(await bane.journal()).toEqual(etterRevisjon);

    // Kontrollsak: samme aksept på versjonen den ble regnet fra, lagres.
    const ny = await k.prov({ handling: 'aksept', spor: 'vederlag' });
    if (!ny.godtatt) throw new Error(`Forutsetning: aksepten ble avvist: ${ny.avvisning.regel}`);
    await bane.skriv(ny.hendelser, etterRevisjon.at(-1)!.versjon);
    expect((await k.utledning()).spor.vederlag.enighet?.grunnlag.utfall.beloep).toBe(65000);
  });
});
