/**
 * Kontrollene før TS-serveren tar i bruk basen (`server/oppstart.ts`). Kildene er
 * #707 punkt 3 (forbindelsen skal være kjøretidens, ikke eierens eller `sa`) og
 * #726 punkt 5 (en fil som ikke er anvendt, meldes én gang). Databasedelen krever
 * `KOE_SQLSERVER_TILKOBLING`.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { lesMigrasjoner, type Anvendt, type Migrasjon } from '../migrering.ts';
import { hindringer, migrasjonsavvik } from '../oppstart.ts';
import { opprettMigrertTestbase } from './sqlserver_migrert.ts';
import { opprettKjoeretid, SQLSERVER_TILKOBLING, type Pool, type Testbase } from './sqlserver.ts';

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
  it('en fil som ikke er anvendt og kommer foran den høyeste anvendte, meldes én gang (#726 punkt 5)', () => {
    const [a, b, c] = ['20260101000000', '20260102000000', '20260103000000'].map(fil);
    const funn = migrasjonsavvik([anvendt(a), anvendt(c)], [a, b, c]);
    expect(funn).toEqual([
      `${b.filnavn} er ikke anvendt og kommer foran ${c.versjon}, som er anvendt.`,
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
  afterAll(async () => {
    await kjoeretid?.slett();
    await base?.slett();
  }, 60_000);

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
      expect(funn[0]).toMatch(/ikke kjøretidens/);
    } finally {
      await eier.slett();
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
