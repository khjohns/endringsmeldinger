/**
 * Kontrollene før TS-serveren tar i bruk basen (`server/oppstart.ts`). Kildene er
 * #707 punkt 3 og #858 punkt 2 (forbindelsen skal være kjøretidens, uten en fast
 * rolle eller `CONTROL` i basen og ikke `sa`) og
 * #726 punkt 5 (en fil som ikke er anvendt, meldes én gang) og DL-U16 (forrige
 * utgivelse starter mot en base med nyere migrasjoner som bare legger til). Databasedelen krever
 * `KOE_SQLSERVER_TILKOBLING`.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { lesMigrasjoner, type Anvendt, type Migrasjon } from '../migrering.ts';
import { hindringer, migrasjonsavvik } from '../oppstart.ts';
import { opprettMigrertTestbase } from './sqlserver_migrert.ts';
import {
  opprettKjoeretid,
  slettAlle,
  SQLSERVER_TILKOBLING,
  type Pool,
  type Testbase,
} from './sqlserver.ts';

const fil = (versjon: string): Migrasjon => ({
  versjon,
  filnavn: `${versjon}_x.sql`,
  sha256: 'a'.repeat(64),
  satser: [],
});
const anvendt = ({ versjon, filnavn, sha256 }: Migrasjon): Anvendt => ({
  versjon,
  filnavn,
  sha256,
});

describe('migrasjonsavvik', () => {
  it('hver fil som ikke er anvendt, meldes nøyaktig én gang, foran eller etter den høyeste anvendte', () => {
    const [a, b, c, d] = [
      '20260101000000',
      '20260102000000',
      '20260103000000',
      '20260104000000',
    ].map(fil);
    const funn = migrasjonsavvik([anvendt(a), anvendt(c)], [a, b, c, d]);
    expect(funn).toEqual([
      `${b.filnavn} er ikke anvendt og kommer foran ${c.versjon}, som er anvendt.`,
      `${d.filnavn} er ikke anvendt.`,
    ]);
  });

  it('en fil som ikke er anvendt og kommer foran den høyeste anvendte, meldes én gang (#726 punkt 5)', () => {
    const [a, b, c] = ['20260101000000', '20260102000000', '20260103000000'].map(fil);
    const funn = migrasjonsavvik([anvendt(a), anvendt(c)], [a, b, c]);
    expect(funn).toEqual([
      `${b.filnavn} er ikke anvendt og kommer foran ${c.versjon}, som er anvendt.`,
    ]);
  });

  it('en nyere anvendt migrasjon som bare legger til, er ingen hindring; en som ikke er markert, er det (DL-U16)', () => {
    const [a, b] = ['20260101000000', '20260102000000'].map(fil);
    const tillegg = {
      versjon: '20260103000000',
      filnavn: '20260103000000_ny_tillegg.sql',
      sha256: 'b'.repeat(64),
    };
    const fjerning = { ...tillegg, filnavn: '20260103000000_ny_fjerning.sql' };
    expect(migrasjonsavvik([anvendt(a), anvendt(b), tillegg], [a, b])).toEqual([]);
    expect(migrasjonsavvik([anvendt(a), anvendt(b), fjerning], [a, b])).toEqual([
      `${fjerning.filnavn} er anvendt, men finnes ikke i mappa.`,
    ]);
  });

  it('en anvendt migrasjon med bare tillegg som mappa ikke har, stopper når den kommer foran en fil i mappa (DL-U16)', () => {
    const [a, c] = ['20260101000000', '20260103000000'].map(fil);
    const tillegg = {
      versjon: '20260102000000',
      filnavn: '20260102000000_ny_tillegg.sql',
      sha256: 'b'.repeat(64),
    };
    expect(migrasjonsavvik([anvendt(a), tillegg, anvendt(c)], [a, c])).toEqual([
      `${tillegg.filnavn} er anvendt og bare legger til, men finnes ikke i mappa og kommer foran ${c.versjon}.`,
    ]);
  });

  it('en fil som ikke er anvendt og kommer foran en anvendt migrasjon med bare tillegg, stopper (DL-U16)', () => {
    const [a, b] = ['20260101000000', '20260102000000'].map(fil);
    const tillegg = {
      versjon: '20260103000000',
      filnavn: '20260103000000_ny_tillegg.sql',
      sha256: 'b'.repeat(64),
    };
    expect(migrasjonsavvik([anvendt(a), tillegg], [a, b])).toEqual([
      `${b.filnavn} er ikke anvendt og kommer foran ${tillegg.versjon}, som er anvendt.`,
    ]);
  });

  it('en fil etter den høyeste anvendte meldes som ikke anvendt', () => {
    const [a, b] = ['20260101000000', '20260102000000'].map(fil);
    expect(migrasjonsavvik([anvendt(a)], [a, b])).toEqual([`${b.filnavn} er ikke anvendt.`]);
    expect(migrasjonsavvik([anvendt(a), anvendt(b)], [a, b])).toEqual([]);
  });
});

describe.skipIf(!SQLSERVER_TILKOBLING)('hindringene mot en migrert base', () => {
  let base: Testbase;
  let kjoeretid: { pool: Pool; slett(): Promise<void> };

  beforeAll(async () => {
    base = await opprettMigrertTestbase('oppstart');
    kjoeretid = await opprettKjoeretid(base, { maks: 1 });
  }, 240_000);
  afterAll(() => slettAlle(kjoeretid, base), 60_000);

  it('kjøretiden mot en base migrert som repoet har ingen hindringer (kontroll)', async () => {
    expect(await hindringer(kjoeretid.pool, lesMigrasjoner())).toEqual([]);
  });

  it('sa, som er eier av basen, nektes (#707 punkt 3)', async () => {
    const funn = await hindringer(base.pool, lesMigrasjoner());
    expect(funn).toHaveLength(1);
    expect(funn[0]).toMatch(/ikke kjøretidens/);
  });

  it('kjøretiden nektes når den også er eier av basen (#707 punkt 3)', async () => {
    const eier = await opprettKjoeretid(base, { maks: 1 });
    try {
      const navn = (await eier.pool.request().query<{ navn: string }>('SELECT USER_NAME() AS navn'))
        .recordset[0].navn;
      expect(await hindringer(eier.pool, lesMigrasjoner())).toEqual([]);
      await base.pool.request().batch(`ALTER ROLE db_owner ADD MEMBER [${navn}];`);
      const funn = await hindringer(eier.pool, lesMigrasjoner());
      expect(funn).toHaveLength(1);
      expect(funn[0]).toMatch(/ikke kjøretidens: .*den er medlem av db_owner/);
    } finally {
      await eier.slett();
    }
  });

  it.each([
    [
      'er medlem av db_datareader',
      'ALTER ROLE db_datareader ADD MEMBER',
      /den er medlem av db_datareader\./,
    ],
    [
      'er medlem av db_ddladmin',
      'ALTER ROLE db_ddladmin ADD MEMBER',
      /den er medlem av db_ddladmin\./,
    ],
    ['har CONTROL på basen', 'GRANT CONTROL TO', /den har CONTROL på basen\./],
  ])(
    'kjøretiden nektes når den også %s, og meldingen sier hvilket vilkår (#858 punkt 2)',
    async (_, tildeling, vilkaar) => {
      const kjoeretid2 = await opprettKjoeretid(base, { maks: 1 });
      try {
        const navn = (
          await kjoeretid2.pool.request().query<{ navn: string }>('SELECT USER_NAME() AS navn')
        ).recordset[0].navn;
        expect(await hindringer(kjoeretid2.pool, lesMigrasjoner())).toEqual([]);
        await base.pool.request().batch(`${tildeling} [${navn}];`);
        const funn = await hindringer(kjoeretid2.pool, lesMigrasjoner());
        expect(funn).toHaveLength(1);
        expect(funn[0]).toMatch(/^Forbindelsen er ikke kjøretidens: /);
        expect(funn[0]).toMatch(vilkaar);
      } finally {
        await kjoeretid2.slett();
      }
    }
  );

  it.each([
    ['bare legger til, kan forrige utgivelse starte', '29991231235958_ny_tillegg.sql', []],
    [
      'ikke er markert som tillegg, stopper oppstarten',
      '29991231235958_ny.sql',
      ['29991231235958_ny.sql er anvendt, men finnes ikke i mappa.'],
    ],
  ])('når basen har en nyere migrasjon som %s (DL-U16)', async (_, filnavn, forventet) => {
    const rad = `INSERT koe_migrering.historikk (versjon, filnavn, sha256)
        VALUES (N'29991231235958', N'${filnavn}', REPLICATE(N'a', 64));`;
    await base.pool.request().batch(rad);
    try {
      expect(await hindringer(kjoeretid.pool, lesMigrasjoner())).toEqual(forventet);
    } finally {
      await base.pool
        .request()
        .batch(`DELETE koe_migrering.historikk WHERE versjon = N'29991231235958';`);
    }
  });

  it('en fil som ikke er anvendt, er en hindring for kjøretiden', async () => {
    const filer = lesMigrasjoner();
    const ny = fil('29991231235959');
    expect(await hindringer(kjoeretid.pool, [...filer, ny])).toEqual([
      `${ny.filnavn} er ikke anvendt.`,
    ]);
  });
});
