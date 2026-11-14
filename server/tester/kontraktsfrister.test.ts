/**
 * Fristtabellen og satsen for dagmulkten (#721). Forventningene har kilde i:
 * - GFK-U16: satsen er promillen av kontraktssummen, men ikke mindre enn minstebeløpet,
 *   eller et avtalt fast beløp per dag; mangler opplysningene, gjelder GFK-U3;
 * - GFK-U18: hver frist har sin sats, og en delfrist regnes av verdien av delen
 *   (§ 40.3 b); en frist som ikke er dagmulktbelagt, har ingen dagmulkt (GFK-U20);
 * - GFK-U23: begge parter leser fristtabellen, og leserollen leser det saken viser
 *   (DL-U15); prosjektgrensen i CLAUDE.md;
 * - GFK-U25: inngangen gir fristtabellen til begge parter og leserollen, så kravskjemaet
 *   kan velge frist (BF-20 G-3). Feltene i svaret er arbeidsvalget 14.11 i #1745, med
 *   datoen for U-4 og U-5 i BF-20;
 * - KA-U77, GR-U38 og GR-U39: datoen i kravskjemaet regnes med dagene partene er enige om i
 *   andre saker, og det som ikke er tatt med, nevnes med grunnen; MM-U2: en sak kjernen ikke
 *   forstår, gjør datoen ukjent. Lesingen av ekte saker mot SQL Server prøves i
 *   `sprakprove/kjernelagring/forlengelser.test.ts`.
 * Avrundingen til nærmeste øre er det tekniske valget i PR-en, ikke et vedtak.
 */
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { catendaId } from '../autorisasjon.ts';
import { transaksjon, type Kontekst } from '../datalag.ts';
import { betegnelsen as betegnelse } from '../../kjerne/spor/frist/format.ts';
import type { Forlengelsene } from '../forlengelser.ts';
import {
  fristlinjer,
  lesKontraktsfrister,
  regnSats,
  STANDARDSATS,
  type Fristtabell,
} from '../kontraktsfrister.ts';
import { iTransaksjon, settInn } from './sqlserver_migrert.ts';
import {
  kall,
  lagOppsett,
  rydd,
  startServer,
  TESTBASE_URL,
  type KjorendeServer,
  type Oppsett,
  type Testbruker,
} from './testbase.ts';

describe('regnSats', () => {
  const a = (promille: number, minstebeloep: number) =>
    ({ grunnlag: 'kontraktssum', promille, minstebeloep }) as const;

  it('GFK-U16: satsen er promillen av kontraktssummen når den er over minstebeløpet', () => {
    expect(regnSats(a(1, 3000), 120_000_000)).toBe(120_000);
  });

  it('GFK-U16: satsen er minstebeløpet når promillen av kontraktssummen er lavere', () => {
    expect(regnSats(a(1, 3000), 2_000_000)).toBe(3000);
    expect(regnSats(a(1, 3000), 3_000_000)).toBe(3000);
  });

  it('GFK-U3: satsen av kontraktssummen kan ikke regnes uten kontraktssummen', () => {
    expect(regnSats(a(1, 3000), null)).toBeNull();
  });

  it('GFK-U18: satsen for en delfrist regnes av verdien av delen, ikke kontraktssummen', () => {
    expect(
      regnSats(
        { grunnlag: 'delens_verdi', promille: 1, minstebeloep: 1000, delensVerdi: 40_000_000 },
        null
      )
    ).toBe(40_000);
    expect(
      regnSats(
        { grunnlag: 'delens_verdi', promille: 1, minstebeloep: 1000, delensVerdi: 400_000 },
        120_000_000
      )
    ).toBe(1000);
  });

  it('GFK-U16: standardsatsen er 1 ‰ av kontraktssummen, men minst 3000 kr', () => {
    expect(regnSats(STANDARDSATS, 120_000_000)).toBe(120_000);
    expect(regnSats(STANDARDSATS, 1_000_000)).toBe(3000);
  });

  it('GFK-U16: et avtalt fast beløp per dag er satsen, uavhengig av kontraktssummen', () => {
    expect(regnSats({ grunnlag: 'fast_beloep', beloepPerDag: 7500 }, 120_000_000)).toBe(7500);
  });

  it('satsen avrundes til nærmeste øre, halve øre opp, uten flyttallsfeil', () => {
    // 0,5 ‰ av 12 345 678,91 kr er 6 172,839455 kr.
    expect(regnSats(a(0.5, 0), 12_345_678.91)).toBe(6172.84);
    // 1,5 ‰ av 0,01 kr er 0,000015 kr; 1 ‰ av 5 kr er nøyaktig et halvt øre.
    expect(regnSats(a(1.5, 0), 0.01)).toBe(0);
    expect(regnSats(a(1, 0), 5)).toBe(0.01);
    // Det største beløpet tabellen tar, 9 999 999 999 999,99 kr, gir 9 999 999 999,99999 kr.
    expect(regnSats(a(1, 0), 9_999_999_999_999.99)).toBe(10_000_000_000);
  });
});

describe('betegnelse', () => {
  it('KA-U79: brevet viser fristen med kontraktens nummer og navnet, ikke ID-en', () => {
    expect(betegnelse({ nummer: 'E.1.2', navn: 'Tett bygg' })).toBe('E.1.2 Tett bygg');
    expect(betegnelse({ nummer: null, navn: 'Tett bygg' })).toBe('Tett bygg');
  });
});

describe('fristlinjer', () => {
  const frist = (fristId: number, dato: string): Fristtabell['frister'][number] => ({
    fristId,
    nummer: null,
    navn: `Frist ${fristId}`,
    dato,
    dagmulktbelagt: false,
    satsopplysninger: null,
    sats: null,
  });
  const TABELL: Fristtabell = {
    kontraktssum: null,
    frister: [frist(1, '2027-06-30'), frist(2, '2026-12-15')],
  };
  const KODE = { kode: 'koe' as const, loepenummer: 4 };
  const lest = (l: Partial<Forlengelsene>): Forlengelsene => ({
    tattMed: [],
    ikkeTattMed: [],
    ikkeForstaatt: [],
    sakskoder: new Map([
      ['a', KODE],
      ['b', null],
      ['c', null],
    ]),
    ...l,
  });

  it('KA-U77: datoen regnes med de avtalte dagene i alle sakene, frist for frist, og sakene nevnes', () => {
    const { frister, saker_ikke_forstaatt } = fristlinjer(
      TABELL,
      lest({
        tattMed: [
          { sakId: 'a', fristId: 1, dager: 3, grunnlag: 'avtalt' },
          { sakId: 'b', fristId: 1, dager: 2, grunnlag: 'avtalt' },
          { sakId: 'b', fristId: 2, dager: 5, grunnlag: 'avtalt' },
        ],
      })
    );
    expect(saker_ikke_forstaatt).toEqual([]);
    expect(frister.map((f) => [f.frist_id, f.dato, f.dato_etter_forlengelsene])).toEqual([
      [1, '2027-06-30', '2027-07-05'],
      [2, '2026-12-15', '2026-12-20'],
    ]);
    expect(frister[0]!.forlengelser).toEqual([
      { sak_id: 'a', sakskode: KODE, dager: 3 },
      { sak_id: 'b', sakskode: null, dager: 2 },
    ]);
    expect(frister[0]!.ikke_tatt_med).toEqual([]);
  });

  it('KA-U77, GR-U38: dager byggherren har godkjent uten enighet, og subsidiære dager, er ikke tatt med og nevnes med grunnen', () => {
    const { frister } = fristlinjer(
      TABELL,
      lest({
        tattMed: [{ sakId: 'a', fristId: 1, dager: 3, grunnlag: 'godkjent' }],
        ikkeTattMed: [
          { sakId: 'b', fristId: 1, dager: 4, grunnlag: 'subsidiaert_til_forholdet' },
          { sakId: 'c', fristId: 2, dager: 6, grunnlag: 'subsidiaert_i_fristen' },
        ],
      })
    );
    expect(frister.map((f) => f.dato_etter_forlengelsene)).toEqual(['2027-06-30', '2026-12-15']);
    expect(frister.map((f) => f.forlengelser)).toEqual([[], []]);
    expect(frister.map((f) => f.ikke_tatt_med)).toEqual([
      [
        { sak_id: 'a', sakskode: KODE, dager: 3, grunnlag: 'godkjent' },
        { sak_id: 'b', sakskode: null, dager: 4, grunnlag: 'subsidiaert_til_forholdet' },
      ],
      [{ sak_id: 'c', sakskode: null, dager: 6, grunnlag: 'subsidiaert_i_fristen' }],
    ]);
  });

  it('MM-U2: en sak kjernen ikke forstår, gjør datoen ukjent for hver frist og nevnes', () => {
    const { frister, saker_ikke_forstaatt } = fristlinjer(
      TABELL,
      lest({
        tattMed: [{ sakId: 'a', fristId: 1, dager: 3, grunnlag: 'avtalt' }],
        ikkeForstaatt: ['c'],
      })
    );
    expect(frister.map((f) => f.dato_etter_forlengelsene)).toEqual([null, null]);
    expect(frister[0]!.forlengelser).toEqual([{ sak_id: 'a', sakskode: KODE, dager: 3 }]);
    expect(saker_ikke_forstaatt).toEqual([{ sak_id: 'c', sakskode: null }]);
  });
});

describe.skipIf(!TESTBASE_URL)('fristtabellen i SQL Server', () => {
  let o: Oppsett;

  const les = (k: Kontekst): Promise<Fristtabell> =>
    transaksjon(o.datalag.kjoeretid.pool, k, lesKontraktsfrister);
  const bh = (): Kontekst => ({
    aktor: o.bh.id,
    prosjekt: o.prosjekt.id,
    side: 'BH',
    team: catendaId(o.prosjekt.bhTeam)!,
  });
  const te = (): Kontekst => ({
    aktor: o.te.id,
    prosjekt: o.prosjekt.id,
    side: 'TE',
    team: catendaId(o.prosjekt.teTeam)!,
  });

  beforeAll(async () => {
    o = await lagOppsett();
    await iTransaksjon(o.datalag.base.pool, null, async (r) => {
      await settInn(r, 'kontraktssum', { prosjekt_id: o.prosjekt.id, kontraktssum: 120_000_000 });
      await settInn(r, 'kontraktsfrist', {
        prosjekt_id: o.prosjekt.id,
        frist_id: 1,
        nummer: 'E.1',
        navn: 'Sluttfrist',
        dato: '2027-06-30',
        dagmulktbelagt: true,
        satsgrunnlag: 'kontraktssum',
        promille: 1,
        minstebeloep: 3000,
      });
      await settInn(r, 'kontraktsfrist', {
        prosjekt_id: o.prosjekt.id,
        frist_id: 2,
        navn: 'Tett bygg',
        dato: '2026-12-15',
        dagmulktbelagt: false,
      });
      await settInn(r, 'kontraktsfrist', {
        prosjekt_id: o.prosjekt.id,
        frist_id: 3,
        navn: 'Overtakelse av utomhus',
        dato: '2027-09-01',
        dagmulktbelagt: true,
      });
      await settInn(r, 'kontraktsfrist', {
        prosjekt_id: o.annetProsjekt.id,
        frist_id: 1,
        navn: 'Sluttfrist i det andre prosjektet',
        dato: '2028-01-31',
        dagmulktbelagt: true,
      });
    });
  }, 240_000);
  afterAll(async () => {
    if (o) await rydd(o);
  }, 60_000);

  const tabellen: Fristtabell = {
    kontraktssum: 120_000_000,
    frister: [
      {
        fristId: 1,
        nummer: 'E.1',
        navn: 'Sluttfrist',
        dato: '2027-06-30',
        dagmulktbelagt: true,
        satsopplysninger: { grunnlag: 'kontraktssum', promille: 1, minstebeloep: 3000 },
        sats: 120_000,
      },
      {
        fristId: 2,
        nummer: null,
        navn: 'Tett bygg',
        dato: '2026-12-15',
        dagmulktbelagt: false,
        satsopplysninger: null,
        sats: null,
      },
      // Dagmulktbelagt, men satsen er ikke registrert (GFK-U3).
      {
        fristId: 3,
        nummer: null,
        navn: 'Overtakelse av utomhus',
        dato: '2027-09-01',
        dagmulktbelagt: true,
        satsopplysninger: null,
        sats: null,
      },
    ],
  };

  it('GFK-U23: byggherren og totalentreprenøren leser den samme fristtabellen med satsen', async () => {
    expect(await les(bh())).toEqual(tabellen);
    expect(await les(te())).toEqual(tabellen);
  });

  it('DL-U15: leserollen leser fristtabellen, som saken', async () => {
    expect(await les({ aktor: o.leser.id, prosjekt: o.prosjekt.id })).toEqual(tabellen);
  });

  const tom: Fristtabell = { kontraktssum: null, frister: [] };

  it('et medlem uten kontraktsteam, et team som ikke er prosjektets, og et medlem av et annet prosjekt leser ingenting', async () => {
    expect(await les({ aktor: o.utenTeam.id, prosjekt: o.prosjekt.id })).toEqual(tom);
    // Om aktøren er i teamet, avgjør serveren mot Catenda; basen krever et av prosjektets team.
    expect(await les({ ...te(), team: catendaId(randomUUID())! })).toEqual(tom);
    expect(await les({ aktor: o.utenfor.id, prosjekt: o.prosjekt.id })).toEqual(tom);
    expect(await les({ ...bh(), aktor: randomUUID() })).toEqual(tom);
  });

  it('fristene leses bare i en transaksjon med konteksten satt', async () => {
    await expect(
      o.datalag.kjoeretid.pool.request().execute('koe_api.kontraktsfrister')
    ).rejects.toThrow(/transaksjon med konteksten/);
  });

  it('kjøretiden kan ikke lese eller endre tabellene direkte', async () => {
    for (const sql of [
      'SELECT * FROM koe.kontraktsfrist',
      'SELECT * FROM koe.kontraktssum',
      "UPDATE koe.kontraktsfrist SET navn = N'x'",
    ])
      await expect(o.datalag.kjoeretid.pool.request().query(sql)).rejects.toThrow(
        /permission was denied/
      );
  });

  describe('inngangen for fristtabellen', () => {
    let server: KjorendeServer;
    beforeAll(async () => {
      server = await startServer(o);
    });
    afterAll(async () => {
      await server?.stopp();
    });
    const svaret = (bruker: Testbruker) =>
      kall(server.url, `/api/projects/${o.prosjekt.id}/kontraktsfrister`, {
        bruker,
        prosjektId: o.prosjekt.id,
      });

    // Prosjektet har ingen saker, så ingen frist er forlenget (KA-U77).
    const utenForlengelser = (dato: string) => ({
      dato_etter_forlengelsene: dato,
      forlengelser: [],
      ikke_tatt_med: [],
    });

    it('GFK-U25: begge parter og leserollen får fristene, med feltene i arbeidsvalget 14.11 i #1745: ID, nummer, navn, dato og dagmulkt', async () => {
      for (const bruker of [o.bh, o.te, o.leser]) {
        const svar = await svaret(bruker);
        expect(svar.status, JSON.stringify(svar.kropp)).toBe(200);
        expect(svar.kropp).toEqual({
          success: true,
          frister: [
            {
              frist_id: 1,
              nummer: 'E.1',
              navn: 'Sluttfrist',
              dato: '2027-06-30',
              dagmulktbelagt: true,
              ...utenForlengelser('2027-06-30'),
            },
            {
              frist_id: 2,
              nummer: null,
              navn: 'Tett bygg',
              dato: '2026-12-15',
              dagmulktbelagt: false,
              ...utenForlengelser('2026-12-15'),
            },
            {
              frist_id: 3,
              nummer: null,
              navn: 'Overtakelse av utomhus',
              dato: '2027-09-01',
              dagmulktbelagt: true,
              ...utenForlengelser('2027-09-01'),
            },
          ],
          saker_ikke_forstaatt: [],
        });
      }
    });

    it('DL-U15: et medlem uten kontraktsteam og uten leserolle får ingen fristtabell', async () => {
      const svar = await svaret(o.utenTeam);
      expect(svar.status).toBe(403);
      expect(svar.kropp.error).toBe('CONTRACT_ROLE_REQUIRED');
    });
  });
});
