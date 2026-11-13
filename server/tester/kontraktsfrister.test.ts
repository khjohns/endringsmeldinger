/**
 * Fristtabellen og satsen for dagmulkten (#721). Forventningene har kilde i:
 * - GFK-U16: satsen er promillen av kontraktssummen, men ikke mindre enn minstebeløpet,
 *   eller et avtalt fast beløp per dag; mangler opplysningene, gjelder GFK-U3;
 * - GFK-U18: hver frist har sin sats, og en delfrist regnes av verdien av delen
 *   (§ 40.3 b); en frist som ikke er dagmulktbelagt, har ingen dagmulkt (GFK-U20);
 * - GFK-U23: begge parter leser fristtabellen, og leserollen leser det saken viser
 *   (DL-U15); prosjektgrensen i CLAUDE.md.
 * Avrundingen til nærmeste øre er det tekniske valget i PR-en, ikke et vedtak.
 */
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { catendaId } from '../autorisasjon.ts';
import { transaksjon, type Kontekst } from '../datalag.ts';
import { lesKontraktsfrister, regnSats, type Fristtabell } from '../kontraktsfrister.ts';
import { iTransaksjon, settInn } from './sqlserver_migrert.ts';
import { lagOppsett, rydd, TESTBASE_URL, type Oppsett } from './testbase.ts';

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
        nummer: 1,
        navn: 'Sluttfrist',
        dato: '2027-06-30',
        dagmulktbelagt: true,
        satsgrunnlag: 'kontraktssum',
        promille: 1,
        minstebeloep: 3000,
      });
      await settInn(r, 'kontraktsfrist', {
        prosjekt_id: o.prosjekt.id,
        nummer: 2,
        navn: 'Tett bygg',
        dato: '2026-12-15',
        dagmulktbelagt: false,
      });
      await settInn(r, 'kontraktsfrist', {
        prosjekt_id: o.prosjekt.id,
        nummer: 3,
        navn: 'Overtakelse av utomhus',
        dato: '2027-09-01',
        dagmulktbelagt: true,
      });
      await settInn(r, 'kontraktsfrist', {
        prosjekt_id: o.annetProsjekt.id,
        nummer: 1,
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
        nummer: 1,
        navn: 'Sluttfrist',
        dato: '2027-06-30',
        dagmulktbelagt: true,
        satsopplysninger: { grunnlag: 'kontraktssum', promille: 1, minstebeloep: 3000 },
        sats: 120_000,
      },
      {
        nummer: 2,
        navn: 'Tett bygg',
        dato: '2026-12-15',
        dagmulktbelagt: false,
        satsopplysninger: null,
        sats: null,
      },
      // Dagmulktbelagt, men satsen er ikke registrert (GFK-U3).
      {
        nummer: 3,
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
});
