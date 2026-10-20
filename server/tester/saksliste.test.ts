/**
 * Sakslisten i prosjektet (#1022), mot testbasen. Krever `KOE_SQLSERVER_TILKOBLING`.
 *
 * Kildene for forventningene: arbeidsvalget 20.10 i #375 («Som i dag, ny form»:
 * samme informasjon som dagens liste, status som etikett regnet ved lesing),
 * prosjektgrensen i sikkerhetsinvariantene i AGENTS.md, og dagens liste i
 * `list_cases` (`backend/routes/event_routes.py`) for hvilke opplysninger linja har.
 * At statusen er den samme som i visningen av saken, er kravet at den er kjernens
 * etikett og ikke en egen oppsummering.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { transaksjon } from '../datalag.ts';
import type { Sakslinje } from '../saksliste.ts';
import { iTransaksjon } from './sqlserver_migrert.ts';
import {
  GRUNNLAGSKRAV,
  kall,
  lagOppsett,
  opprettKjernesak,
  rydd,
  sendKommando,
  startServer,
  TESTBASE_URL,
  type KjorendeServer,
  type Oppsett,
  type Testbruker,
} from './testbase.ts';

const UTDYPNING = 'Kravet gjelder den endrede fundamenteringen.';
const KRAV_VEDERLAG = {
  type: 'krav',
  spor: 'vederlag',
  innhold: { metode: 'tilbud', beloep: 100000 },
  utdypning: UTDYPNING,
};
const KRAV_FRIST = { type: 'krav', spor: 'frist', innhold: { dager: 20 }, utdypning: UTDYPNING };

describe.skipIf(!TESTBASE_URL)('sakslisten i prosjektet (#1022)', () => {
  let o: Oppsett;
  let server: KjorendeServer;
  let medKrav: string;
  let tom: string;
  let ikkeKjernen: string;
  let iAnnet: string;

  const lista = async (leser: Testbruker = o.bh) => {
    const svar = await kall(server.url, `/api/projects/${o.prosjekt.id}/saker`, {
      bruker: leser,
      prosjektId: o.prosjekt.id,
    });
    expect(svar.status, JSON.stringify(svar.kropp)).toBe(200);
    return svar.kropp.saker as Sakslinje[];
  };

  beforeAll(async () => {
    o = await lagOppsett();
    server = await startServer(o);
    medKrav = await opprettKjernesak(o);
    for (const [versjon, kommando] of [GRUNNLAGSKRAV, KRAV_VEDERLAG, KRAV_FRIST].entries()) {
      const svar = await sendKommando(server.url, o, medKrav, { versjon: versjon + 1, kommando });
      expect(svar.status, JSON.stringify(svar.kropp)).toBe(201);
    }
    tom = await opprettKjernesak(o);
    ikkeKjernen = await opprettKjernesak(o, o.prosjekt, null);
    iAnnet = await opprettKjernesak(o, o.annetProsjekt);
  });
  afterAll(async () => {
    await server?.stopp();
    if (o) await rydd(o);
  });

  it('lista har sakene kjernen har skrevet i prosjektet, og ingen andre', async () => {
    const saker = (await lista()).map((s) => s.sak_id);
    expect(saker.sort()).toEqual([medKrav, tom].sort());
    expect(saker).not.toContain(ikkeKjernen);
    expect(saker).not.toContain(iAnnet);
  });

  it('linja har tittelen, kravene og kategorien fra journalen', async () => {
    const linje = (await lista()).find((s) => s.sak_id === medKrav)!;
    expect(linje).toMatchObject({
      sakstype: 'standard',
      sakstittel: 'Skiva',
      hovedkategori: 'endring',
      krevd_beloep: 100000,
      krevd_dager: 20,
      godkjent_beloep: null,
      godkjent_dager: null,
    });
    expect(Date.parse(linje.siste_hendelse)).toBeGreaterThanOrEqual(Date.parse(linje.opprettet));
  });

  it('en sak uten krav har ingen tall og ingen kategori', async () => {
    expect((await lista()).find((s) => s.sak_id === tom)).toMatchObject({
      hovedkategori: null,
      krevd_beloep: null,
      krevd_dager: null,
    });
  });

  it.each([
    ['BH', () => o.bh],
    ['TE', () => o.te],
    ['et medlem uten kontraktsside', () => o.utenTeam],
  ])('statusen er etiketten i visningen av saken, for %s', async (_, leser) => {
    for (const sakId of [medKrav, tom]) {
      const vist = await kall(server.url, `/api/kjerne/saker/${sakId}`, {
        bruker: leser(),
        prosjektId: o.prosjekt.id,
      });
      const linje = (await lista(leser())).find((s) => s.sak_id === sakId)!;
      const visning = vist.kropp.visning as { status: unknown; spor: unknown };
      expect(linje.status).toEqual(visning.status);
      expect(linje.spor).toEqual(visning.spor);
    }
  });

  it('prosedyren gir bare hendelsene i prosjektet i konteksten', async () => {
    const sakene = (prosjekt: string, aktor: string) =>
      transaksjon(o.datalag.kjoeretid.pool, { aktor, prosjekt }, async (f) => [
        ...new Set(
          (await f().execute<{ sak_id: string }>('koe_api.saksliste')).recordset.map(
            (r) => r.sak_id
          )
        ),
      ]);
    expect(await sakene(o.annetProsjekt.id, o.utenfor.id)).toEqual([iAnnet]);
    // Et medlem i prosjektet som ber om et annet prosjekt, ser ingenting.
    expect(await sakene(o.annetProsjekt.id, o.bh.id)).toEqual([]);
  });

  it('prosedyren avvises uten konteksten i en transaksjon', async () => {
    await expect(
      iTransaksjon(o.datalag.kjoeretid.pool, null, (r) => r().execute('koe_api.saksliste'))
    ).rejects.toThrow(/konteksten satt/);
    await expect(o.datalag.kjoeretid.pool.request().execute('koe_api.saksliste')).rejects.toThrow(
      /konteksten satt/
    );
  });
});
