/**
 * Fristgrunnlaget for fullmakten mot testbasen i SQL Server (GFK-U19, GFK-U26): fristtabellen
 * og forlengelsene i de andre sakene i prosjektet, lest i saksbehandlerens transaksjon. Sakene
 * skrives med testskriveren i `bane.ts`. Hvilke dager som er en forlengelse, prøves i
 * `kjerne/tester/forlengelser.test.ts`. Krever `KOE_SQLSERVER_TILKOBLING`.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { kjoer, type Forloep } from '../../kjerne/tester/kjoerer.ts';
import type { Handling } from '../../kjerne/tester/klient.ts';
import { KJERNE } from '../../kjerne/versjon.ts';
import { catendaId } from '../../server/autorisasjon.ts';
import { transaksjon, type Kontekst } from '../../server/datalag.ts';
import { lesFristgrunnlaget } from '../../server/fullmakt.ts';
import { iTransaksjon, settInn } from '../../server/tester/sqlserver_migrert.ts';
import { lagOppsett, rydd, type Oppsett } from '../../server/tester/testbase.ts';
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
  afterAll(async () => {
    if (o) await rydd(o);
  });

  it('GFK-U19, GFK-U26: datoen er fristen etter forlengelsene i de andre sakene, ikke i saken selv', async () => {
    expect(await les(bh(), godkjent)).toEqual(new Map([[1, { dato: '2026-12-19', sats: 1000 }]]));
    expect(await les(bh(), avtalt)).toEqual(new Map([[1, { dato: '2026-12-20', sats: 1000 }]]));
  });

  it('i en ny sak telles begge forlengelsene', async () => {
    const ny = (await basebane(o)).sakId;
    expect(await les(bh(), ny)).toEqual(new Map([[1, { dato: '2026-12-23', sats: 1000 }]]));
  });

  it('uten siden og et av prosjektets team i konteksten er fristtabellen tom, så fristdagene kan ikke verdsettes', async () => {
    expect(await les({ aktor: o.bh.id, prosjekt: o.prosjekt.id }, avtalt)).toEqual(new Map());
    expect(await les({ ...bh(), prosjekt: o.annetProsjekt.id }, avtalt)).toEqual(new Map());
  });
});
