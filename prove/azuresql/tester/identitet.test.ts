/**
 * Identitetsoppslaget i T-SQL (B-19, «Følge»; RB2-05 i design v2 for B-02):
 * samme issuer og samme normaliserte subjekt gir samme bruker, og runtime
 * når bare den smale inngangen for Catenda. Forventningen er
 * `koe_resolve_identity` i PL/pgSQL, slik katalogen i testbasen har den, og
 * `catenda_id()` i `backend/lib/auth/domain.py` (`UUID(value).hex`).
 *
 * Medlemssynkroniseringen (`koe_reconcile_memberships`) er ikke skrevet i
 * T-SQL i prøven.
 */

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AKTIV, feilnummer, koble, sql, type Pool } from '../lib/forbindelse.ts';
import { byggBase, nyttTeam, rydd, type Oppsett } from '../lib/oppsett.ts';

describe.skipIf(!AKTIV)('identitetsoppslaget i T-SQL', () => {
  let o: Oppsett;
  beforeAll(async () => {
    o = await byggBase('identitet');
  });
  afterAll(async () => {
    if (o) await rydd(o);
  });

  const slaaOpp = async (subjekt: string | null, epost = '', navn = '', pool: Pool = o.runtime) => {
    const r = await pool
      .request()
      .input('subjekt', sql.NVarChar(400), subjekt)
      .input('epost', sql.NVarChar(320), epost)
      .input('navn', sql.NVarChar(400), navn)
      .output('bruker', sql.UniqueIdentifier)
      .execute('koe_api.catenda_identitet');
    return String(r.output.bruker).toLowerCase();
  };

  const identiteter = async (subjekt: string) =>
    (
      await o.admin.request().input('s', sql.NVarChar(400), subjekt).query<{
        n: number;
        u: number;
      }>('SELECT COUNT(*) AS n, COUNT(DISTINCT user_id) AS u FROM koe.app_identities WHERE subject = @s')
    ).recordset[0];

  it('samme subjekt gir samme bruker, og et tomt navn eller en tom e-post skriver ikke over', async () => {
    const subjekt = nyttTeam();
    const forste = await slaaOpp(subjekt, 'a@prove.invalid', 'A');
    expect(await slaaOpp(subjekt, '', 'B')).toBe(forste);
    const bruker = await o.admin.request().input('id', sql.UniqueIdentifier, forste).query<{
      email: string;
      name: string;
    }>('SELECT email, name FROM koe.app_users WHERE id = @id');
    expect(bruker.recordset[0]).toEqual({ email: 'a@prove.invalid', name: 'B' });
    expect(await identiteter(subjekt)).toEqual({ n: 1, u: 1 });
  });

  it('issuer og provider er låst i inngangen', async () => {
    const subjekt = nyttTeam();
    await slaaOpp(subjekt);
    const r = await o.admin.request().input('s', sql.NVarChar(400), subjekt).query<{
      provider: string;
      issuer: string;
    }>('SELECT provider, issuer FROM koe.app_identities WHERE subject = @s');
    expect(r.recordset).toEqual([{ provider: 'catenda', issuer: 'https://api.catenda.com' }]);
  });

  const ikkeNormalisert: [string, () => string | null][] = [
    ['store bokstaver', () => nyttTeam().toUpperCase()],
    ['UUID med bindestreker', () => randomUUID()],
    ['31 tegn', () => nyttTeam().slice(1)],
    ['33 tegn', () => `${nyttTeam()}0`],
    ['mellomrom til slutt', () => `${nyttTeam().slice(1)} `],
    ['et tegn som ikke er heksadesimalt', () => `${nyttTeam().slice(1)}g`],
    ['tomt', () => ''],
    ['NULL', () => null],
  ];

  it.each(ikkeNormalisert)('et subjekt som ikke er normalisert, avvises: %s', async (_hva, lag) => {
    const feil = await slaaOpp(lag()).catch((e: unknown) => e);
    expect(feilnummer(feil)).toBe(52022);
  });

  it('tjue samtidige oppslag av et nytt subjekt gir én bruker og én identitet', async () => {
    const pool = await koble('runtime', o.database, 20);
    try {
      const subjekt = nyttTeam();
      const brukere = await Promise.all(
        Array.from({ length: 20 }, () => slaaOpp(subjekt, '', '', pool))
      );
      expect(new Set(brukere).size).toBe(1);
      expect(await identiteter(subjekt)).toEqual({ n: 1, u: 1 });
    } finally {
      await pool.close();
    }
  });

  it('runtime kan ikke velge provider eller issuer gjennom den generelle funksjonen', async () => {
    const feil = await o.runtime
      .request()
      .input('provider', sql.NVarChar(16), 'entra')
      .input('issuer', sql.NVarChar(400), 'https://annen.invalid')
      .input('subject', sql.NVarChar(400), nyttTeam())
      .input('email', sql.NVarChar(320), '')
      .input('name', sql.NVarChar(400), '')
      .output('user_id', sql.UniqueIdentifier)
      .execute('koe.resolve_identity')
      .catch((e: unknown) => e);
    expect(feilnummer(feil)).toBe(229);
  });
});
