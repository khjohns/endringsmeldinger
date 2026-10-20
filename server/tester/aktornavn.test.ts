/**
 * Navnet bak en hendelse i visningen av saken (F-1b, #104, DM-08), mot
 * testbasen. Krever `KOE_SQLSERVER_TILKOBLING`.
 *
 * Forventningene har kilde i sikkerhetsinvariantene i AGENTS.md (journalen
 * bærer `aktor_id`; navnet slås opp ved visning, og et oppslag som feiler,
 * faller tilbake til identiteten og velter aldri visningen) og i svaret fra
 * oppdragsgiver 18.10 i #764: navnet vises for alle som kan lese saken.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { transaksjon, type Kontekst } from '../datalag.ts';
import { lesSaken } from '../lager.ts';
import { iTransaksjon } from './sqlserver_migrert.ts';
import {
  kall,
  lagOppsett,
  opprettKjernesak,
  rydd,
  startServer,
  TESTBASE_URL,
  type KjorendeServer,
  type Oppsett,
  type Testbruker,
} from './testbase.ts';

describe.skipIf(!TESTBASE_URL)('navnet bak hendelsen i visningen av saken (#104)', () => {
  let o: Oppsett;
  let server: KjorendeServer;
  let sakId: string;

  const settNavn = (bruker: Testbruker, navn: string) =>
    o.datalag.base.pool
      .request()
      .input('id', bruker.id)
      .input('navn', navn)
      .query('UPDATE koe.app_users SET name = @navn WHERE id = @id');

  const journalen = async (leser: Testbruker) => {
    const svar = await kall(server.url, `/api/kjerne/saker/${sakId}`, {
      bruker: leser,
      prosjektId: o.prosjekt.id,
    });
    expect(svar.status, JSON.stringify(svar.kropp)).toBe(200);
    return svar.kropp.journal as { versjon: number; aktor_navn: string }[];
  };

  beforeAll(async () => {
    o = await lagOppsett();
    server = await startServer(o);
    sakId = await opprettKjernesak(o);
  });
  afterAll(async () => {
    await server?.stopp();
    if (o) await rydd(o);
  });

  it.each([
    ['BH, den andre siden', () => o.bh],
    ['et medlem med leserolle', () => o.leser],
  ])('navnet til TE vises for %s, som kan lese saken', async (_, leser) => {
    await settNavn(o.te, 'Kari Testesen');
    expect((await journalen(leser())).map((r) => [r.versjon, r.aktor_navn])).toEqual([
      [1, 'Kari Testesen'],
    ]);
  });

  it('en aktør uten navn vises med identiteten', async () => {
    await settNavn(o.te, '');
    expect((await journalen(o.bh))[0].aktor_navn).toBe(o.te.id);
  });

  it('et navneoppslag som feiler, gir identiteten og velter ikke visningen', async () => {
    await settNavn(o.te, 'Kari Testesen');
    const advarsel = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const rett = (s: string) => o.datalag.base.pool.request().query(s);
    await rett('REVOKE EXECUTE ON koe_api.aktornavn FROM koe_runtime');
    try {
      expect((await journalen(o.bh))[0].aktor_navn).toBe(o.te.id);
      expect(advarsel).toHaveBeenCalledOnce();
      // Loggen sier hvorfor oppslaget feilet, med feilnummeret, og har ingen navn (#835 punkt 3).
      const [linje] = advarsel.mock.calls[0] as [string];
      expect(linje).toContain('Navneoppslaget');
      expect(linje).toContain('feilnummer 229');
      expect(linje).not.toContain('Kari');
    } finally {
      await rett('GRANT EXECUTE ON koe_api.aktornavn TO koe_runtime');
      advarsel.mockRestore();
    }
  });

  it('prosedyren gir ingen navn for en sak i et annet prosjekt eller uten kontekst', async () => {
    await settNavn(o.te, 'Kari Testesen');
    const prosedyren = (kontekst: Kontekst) =>
      transaksjon(o.datalag.kjoeretid.pool, kontekst, (foresp) =>
        foresp().input('sak_id', sakId).execute('koe_api.aktornavn')
      );
    // Kontrollsak: i sakens prosjekt gir den navnet, som lesingen av saken.
    const kontekst = { aktor: o.bh.id, prosjekt: o.prosjekt.id };
    expect((await prosedyren(kontekst)).recordset).toEqual([
      { aktor_id: o.te.id, navn: 'Kari Testesen' },
    ]);
    const lest = await lesSaken(o.datalag.kjoeretid.pool, kontekst, sakId, { navn: true });
    expect([...lest.navn]).toEqual([[o.te.id, 'Kari Testesen']]);

    const utenfor = await prosedyren({ aktor: o.utenfor.id, prosjekt: o.annetProsjekt.id });
    expect(utenfor.recordset).toEqual([]);

    const utenKontekst = await iTransaksjon(o.datalag.kjoeretid.pool, null, (r) =>
      r().input('sak_id', sakId).execute('koe_api.aktornavn')
    );
    expect(utenKontekst.recordset).toEqual([]);
  });
});
