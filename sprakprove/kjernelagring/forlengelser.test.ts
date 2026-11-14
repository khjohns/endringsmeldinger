/**
 * Fristgrunnlaget for fullmakten mot testbasen i SQL Server (GFK-U19, GFK-U26): fristtabellen
 * og forlengelsene i de andre sakene i prosjektet, lest i saksbehandlerens transaksjon. Sakene
 * skrives med testskriveren i `bane.ts`. Hvilke dager som er en forlengelse, prøves i
 * `kjerne/tester/forlengelser.test.ts`. Inngangen for fristtabellen gir datoen kravskjemaet viser,
 * med bare dagene partene er enige om, og nevner resten med grunnen (KA-U77, GR-U38). Krever
 * `KOE_SQLSERVER_TILKOBLING`.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { kjoer, type Forloep } from '../../kjerne/tester/kjoerer.ts';
import type { Handling } from '../../kjerne/tester/klient.ts';
import { KJERNE } from '../../kjerne/versjon.ts';
import { catendaId } from '../../server/autorisasjon.ts';
import { transaksjon, type Kontekst } from '../../server/datalag.ts';
import { lesFristgrunnlaget } from '../../server/fullmakt.ts';
import { iTransaksjon, settInn } from '../../server/tester/sqlserver_migrert.ts';
import {
  kall,
  lagOppsett,
  opprettKjernesak,
  rydd,
  startServer,
  type KjorendeServer,
  type Oppsett,
  type Testbruker,
} from '../../server/tester/testbase.ts';
import { basebane, GRENSER, TESTBASE_URL } from './bane.ts';

vi.setConfig(GRENSER);

const PAABEROPELSE: Handling = {
  handling: 'krav',
  spor: 'forhold',
  underkategori: 'irregulaer_endring',
  navn: 'K-g1',
};
const fristsaken = (dager: number, aksept: boolean): Handling[] => [
  PAABEROPELSE,
  { handling: 'krav', spor: 'frist', frister: [{ frist_id: 1, dager: 10 }], navn: 'K-f1' },
  {
    handling: 'brev',
    navn: 'D3',
    svar: [
      { spor: 'forhold', navn: 'S-g1', resultat: 'godkjent', varslet_i_tide: true },
      {
        spor: 'frist',
        navn: 'S-f1',
        varsel_i_tide: true,
        spesifisering_i_tide: true,
        hindring: true,
        dager,
      },
    ],
  },
  ...(aksept ? [{ handling: 'aksept', spor: 'frist', navn: 'A1' }] : []),
];

describe.skipIf(!TESTBASE_URL)('fristgrunnlaget for fullmakten i SQL Server', () => {
  let o: Oppsett;
  let avtalt: string;
  let godkjent: string;

  const les = (k: Kontekst, sakId: string) =>
    transaksjon(o.datalag.kjoeretid.pool, k, (f) => lesFristgrunnlaget(f, sakId, KJERNE));
  /** Datoen, satsen og sakene i forlengelsene for Overtakelsen. */
  const overtakelsen = async (k: Kontekst, sakId: string) => {
    const g = await les(k, sakId);
    expect(g.ikkeForstaatt).toEqual([]);
    const f = g.frister.get(1)!;
    return { dato: f.dato, sats: f.sats, saker: f.forlengelser.map((x) => [x.sakId, x.grunnlag]) };
  };
  const bh = (): Kontekst => ({
    aktor: o.bh.id,
    prosjekt: o.prosjekt.id,
    side: 'BH',
    team: catendaId(o.prosjekt.bhTeam)!,
  });
  const sak = async (steg: Handling[]) => {
    const forloep: Forloep = { id: 'forlengelser', rader: [], start: null, steg, kontroller: [] };
    const bane = await basebane(o);
    await kjoer(forloep, bane);
    return bane.sakId;
  };

  beforeAll(async () => {
    o = await lagOppsett();
    await iTransaksjon(o.datalag.base.pool, null, async (r) => {
      // `FRISTTABELLEN` i `kjerne/tester/kjoerer.ts` har fristen 1, som sakene viser til.
      await settInn(r, 'kontraktsfrist', {
        prosjekt_id: o.prosjekt.id,
        frist_id: 1,
        nummer: '2',
        navn: 'Overtakelse',
        dato: '2026-12-16',
        dagmulktbelagt: true,
        satsgrunnlag: 'fast_beloep',
        beloep_per_dag: 1000,
      });
    });
    avtalt = await sak(fristsaken(3, true));
    godkjent = await sak(fristsaken(4, false));
  });
  let server: KjorendeServer;
  afterAll(async () => {
    await server?.stopp();
    if (o) await rydd(o);
  });
  const fristtabellen = async (bruker: Testbruker) => {
    server ??= await startServer(o);
    const svar = await kall(server.url, `/api/projects/${o.prosjekt.id}/kontraktsfrister`, {
      bruker,
      prosjektId: o.prosjekt.id,
    });
    expect(svar.status, JSON.stringify(svar.kropp)).toBe(200);
    return svar.kropp as {
      frister: Record<string, unknown>[];
      saker_ikke_forstaatt: { sak_id: string }[];
    };
  };
  // Testskriveren i `bane.ts` tildeler ingen kode; det gjør inngangen for brevet (LV-U46).
  const KODE = null;

  it('GFK-U19, GFK-U26: datoen er fristen etter forlengelsene i de andre sakene, ikke i saken selv', async () => {
    expect(await overtakelsen(bh(), godkjent)).toEqual({
      dato: '2026-12-19',
      sats: 1000,
      saker: [[avtalt, 'avtalt']],
    });
    expect(await overtakelsen(bh(), avtalt)).toEqual({
      dato: '2026-12-20',
      sats: 1000,
      saker: [[godkjent, 'godkjent']],
    });
  });

  it('i en ny sak telles begge forlengelsene', async () => {
    const ny = (await basebane(o)).sakId;
    expect((await overtakelsen(bh(), ny)).dato).toBe('2026-12-23');
  });

  it('uten siden og et av prosjektets team i konteksten er fristtabellen tom, så fristdagene kan ikke verdsettes', async () => {
    const tomt = { frister: new Map(), ikkeForstaatt: [] };
    expect(await les({ aktor: o.bh.id, prosjekt: o.prosjekt.id }, avtalt)).toEqual(tomt);
    expect(await les({ ...bh(), prosjekt: o.annetProsjekt.id }, avtalt)).toEqual(tomt);
  });

  it('KA-U77, GR-U38: fristtabellen gir datoen etter dagene partene er enige om, og nevner dagene byggherren har godkjent uten enighet', async () => {
    for (const bruker of [o.te, o.bh, o.leser]) {
      const { frister, saker_ikke_forstaatt } = await fristtabellen(bruker);
      expect(saker_ikke_forstaatt).toEqual([]);
      expect(frister).toEqual([
        {
          frist_id: 1,
          nummer: '2',
          navn: 'Overtakelse',
          dato: '2026-12-16',
          dagmulktbelagt: true,
          dato_etter_forlengelsene: '2026-12-19',
          forlengelser: [{ sak_id: avtalt, sakskode: KODE, dager: 3 }],
          ikke_tatt_med: [{ sak_id: godkjent, sakskode: KODE, dager: 4, grunnlag: 'godkjent' }],
        },
      ]);
    }
  });

  // Til slutt, fordi saken gjør datoen ukjent for testene over.
  it('MM-U2: en sak kjernen ikke har skrevet, gjør datoen ukjent og nevnes', async () => {
    const ukjent = await opprettKjernesak(o, o.prosjekt, null);
    const g = await les(bh(), avtalt);
    expect(g.ikkeForstaatt).toEqual([ukjent]);
    expect(g.frister.get(1)!.dato).toBeNull();
    const { frister, saker_ikke_forstaatt } = await fristtabellen(o.te);
    expect(saker_ikke_forstaatt).toEqual([{ sak_id: ukjent, sakskode: null }]);
    expect(frister[0]).toMatchObject({ dato: '2026-12-16', dato_etter_forlengelsene: null });
  });
});
