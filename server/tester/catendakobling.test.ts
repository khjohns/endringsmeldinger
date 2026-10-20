/**
 * `koe_drift.koble_catenda_identitet` mot testbasen (#1002). Kildene er
 * avgjørelsen 20.10 i #1002 («Driftsprosedyre før #310»: driften kobler
 * Catenda-identiteten til brukeren HR-synkroniseringen laget, før personen
 * skriver noe) og sikkerhetsinvariantene i AGENTS.md (én `aktor_id` per person,
 * en identitet endres ikke, fail-closed). Krever `KOE_SQLSERVER_TILKOBLING`.
 */

import { randomBytes, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { catendaId } from '../autorisasjon.ts';
import { opprettKjoeretid, sql, SQLSERVER_TILKOBLING, type Pool } from './sqlserver.ts';
import { avvisning, catendaBruker, settInn } from './sqlserver_migrert.ts';
import { lagOppsett, opprettKjernesak, rydd, type Oppsett, type Testbruker } from './testbase.ts';

const INGEN_RETT = 229;
const IKKE_NORMALISERT = 52022;
const UTEN_ENTRA = 52027;
const ANNEN_CATENDA = 52028;
const BRUKT = 52029;
const ANNEN_IDENTITET = 52030;
const ENDRES_IKKE = 51001;

const subjekt = () => randomBytes(16).toString('hex');

describe.skipIf(!SQLSERVER_TILKOBLING)('koe_drift.koble_catenda_identitet (#1002)', () => {
  let o: Oppsett;
  let drift: { pool: Pool; slett(): Promise<void> };
  let tenant: string;

  beforeAll(async () => {
    o = await lagOppsett();
    tenant = randomUUID();
    await settInn(eier, 'entra_tenant', { tenant_id: tenant });
    drift = await opprettKjoeretid(o.datalag.base, { maks: 2, rolle: 'koe_driftsrolle' });
  }, 240_000);
  afterAll(async () => {
    await drift?.slett();
    if (o) await rydd(o);
  }, 60_000);

  const eier = () => o.datalag.base.pool.request();

  /** En bruker med en Entra-identitet, slik HR-synkroniseringen lager den. */
  async function hrBruker(): Promise<string> {
    const svar = await drift.pool
      .request()
      .input('tenant', sql.UniqueIdentifier, tenant)
      .input('oid', sql.UniqueIdentifier, randomUUID())
      .input('epost', sql.NVarChar(320), 'hr@test.example')
      .input('navn', sql.NVarChar(400), 'Fra HR')
      .output('bruker', sql.UniqueIdentifier, null)
      .execute('koe_drift.registrer_entra_identitet');
    return String(svar.output.bruker).toLowerCase();
  }

  function koble(s: string, bruker: string, pool = drift.pool) {
    return pool
      .request()
      .input('subjekt', sql.NVarChar(400), s)
      .input('bruker', sql.UniqueIdentifier, bruker)
      .execute('koe_drift.koble_catenda_identitet');
  }

  /** Catenda-identiteten for en bruker fra oppsettet, som medlemssynkroniseringen ville gitt den. */
  async function medCatenda(b: Testbruker): Promise<string> {
    const s = catendaId(b.subjekt)!;
    await settInn(eier, 'app_identities', {
      id: randomUUID(),
      user_id: b.id,
      provider: 'catenda',
      issuer: 'https://api.catenda.com',
      subject: s,
    });
    return s;
  }

  async function identiteter(bruker: string) {
    const svar = await eier().input('b', sql.UniqueIdentifier, bruker).query<{
      provider: string;
      subject: string;
    }>('SELECT provider, subject FROM koe.app_identities WHERE user_id = @b ORDER BY provider');
    return svar.recordset;
  }

  async function antall(tabell: string, bruker: string): Promise<number> {
    const svar = await eier()
      .input('b', sql.UniqueIdentifier, bruker)
      .query<{ n: number }>(
        `SELECT COUNT(*) AS n FROM koe.${tabell} WHERE ${tabell === 'app_users' ? 'id' : 'user_id'} = @b`
      );
    return svar.recordset[0].n;
  }

  it('en Catenda-identitet ingen har, registreres på HR-brukeren, og innloggingen gir den brukeren', async () => {
    const bruker = await hrBruker();
    const s = subjekt();
    await koble(s, bruker);
    await koble(s, bruker);
    expect(await catendaBruker(o.datalag.base.pool, s)).toBe(bruker);
    expect((await identiteter(bruker)).map((i) => i.provider)).toEqual(['catenda', 'entra']);
  });

  it('en identitet på en bruker som bare har medlemskap, fravær og sesjon, flyttes, og den brukeren slettes', async () => {
    const bruker = await hrBruker();
    const s = await medCatenda(o.utenTeam);
    await settInn(eier, 'app_membership_absences', {
      project_id: o.annetProsjekt.id,
      user_id: o.utenTeam.id,
      observed_at: new Date(),
    });
    await koble(s, bruker);
    expect(await catendaBruker(o.datalag.base.pool, s)).toBe(bruker);
    expect(await antall('app_users', o.utenTeam.id)).toBe(0);
    expect(await antall('app_sessions', o.utenTeam.id)).toBe(0);
    expect(await antall('app_membership_absences', bruker)).toBe(1);
    const medlemskap = await eier().input('b', sql.UniqueIdentifier, bruker).query<{
      project_id: string;
      catenda_subject: string;
    }>('SELECT project_id, catenda_subject FROM koe.app_project_memberships WHERE user_id = @b');
    expect(medlemskap.recordset).toEqual([{ project_id: o.prosjekt.id, catenda_subject: s }]);
  });

  it('en identitet på en bruker som har skrevet en hendelse, flyttes ikke, og ingenting endres', async () => {
    const bruker = await hrBruker();
    const s = await medCatenda(o.te);
    await opprettKjernesak(o);
    expect(await avvisning(koble(s, bruker))).toBe(BRUKT);
    expect(await catendaBruker(o.datalag.base.pool, s)).toBe(o.te.id);
    expect((await identiteter(bruker)).map((i) => i.provider)).toEqual(['entra']);
    expect(await antall('app_project_memberships', o.te.id)).toBe(1);
    expect(await antall('app_sessions', o.te.id)).toBe(1);
  });

  it('en identitet på en bruker som også har en Entra-identitet, flyttes ikke', async () => {
    const [bruker, annen] = [await hrBruker(), await hrBruker()];
    const s = subjekt();
    await koble(s, annen);
    expect(await avvisning(koble(s, bruker))).toBe(ANNEN_IDENTITET);
    expect(await catendaBruker(o.datalag.base.pool, s)).toBe(annen);
  });

  it('avviser en bruker uten Entra-identitet og en bruker som har en annen Catenda-identitet', async () => {
    const utenEntra = await catendaBruker(o.datalag.base.pool);
    expect(await avvisning(koble(subjekt(), utenEntra))).toBe(UTEN_ENTRA);
    expect(await avvisning(koble(subjekt(), randomUUID()))).toBe(UTEN_ENTRA);
    const bruker = await hrBruker();
    await koble(subjekt(), bruker);
    expect(await avvisning(koble(subjekt(), bruker))).toBe(ANNEN_CATENDA);
  });

  it.each([
    ['store bokstaver', subjekt().toUpperCase()],
    ['for kort', subjekt().slice(1)],
    ['mellomrom til slutt', `${subjekt().slice(1)} `],
    ['bindestreker', randomUUID()],
  ])('avviser et subjekt som ikke er catenda_id()-formen: %s', async (_, s) => {
    expect(await avvisning(koble(s, await hrBruker()))).toBe(IKKE_NORMALISERT);
  });

  it('kjøretiden kan ikke kalle prosedyren', async () => {
    expect(await avvisning(koble(subjekt(), await hrBruker(), o.datalag.kjoeretid.pool))).toBe(
      INGEN_RETT
    );
  });

  it('eieren kan ikke slette eller endre en identitet, og konteksten slipper bare gjennom slettingen av én Catenda-identitet i transaksjonen', async () => {
    const bruker = await hrBruker();
    await koble(subjekt(), bruker);
    const iKontekst = (
      provider: string,
      setning: string,
      transaksjon = 'CURRENT_TRANSACTION_ID()'
    ) =>
      eier()
        .input('b', sql.UniqueIdentifier, bruker)
        .input('p', sql.NVarChar(16), provider)
        .query(
          `DECLARE @id uniqueidentifier = (SELECT id FROM koe.app_identities WHERE user_id = @b AND provider = @p);
           BEGIN TRANSACTION;
           DECLARE @t bigint = ${transaksjon};
           EXEC sp_set_session_context N'koe_flytt_identitet', @id;
           EXEC sp_set_session_context N'koe_flytt_transaksjon', @t;
           BEGIN TRY ${setning}; END TRY
           BEGIN CATCH
             IF XACT_STATE() <> 0 ROLLBACK;
             EXEC sp_set_session_context N'koe_flytt_identitet', NULL;
             EXEC sp_set_session_context N'koe_flytt_transaksjon', NULL;
             THROW;
           END CATCH;
           COMMIT;
           EXEC sp_set_session_context N'koe_flytt_identitet', NULL;
           EXEC sp_set_session_context N'koe_flytt_transaksjon', NULL;`
        );
    const slettEn = 'DELETE koe.app_identities WHERE id = @id';
    expect(await avvisning(iKontekst('entra', slettEn))).toBe(ENDRES_IKKE);
    expect(
      await avvisning(
        iKontekst('catenda', 'UPDATE koe.app_identities SET subject = subject WHERE id = @id')
      )
    ).toBe(ENDRES_IKKE);
    expect(
      await avvisning(iKontekst('catenda', 'DELETE koe.app_identities WHERE user_id = @b'))
    ).toBe(ENDRES_IKKE);
    expect(await avvisning(iKontekst('catenda', slettEn, '0'))).toBe(ENDRES_IKKE);
    expect(
      await avvisning(
        eier()
          .input('b', sql.UniqueIdentifier, bruker)
          .query('DELETE koe.app_identities WHERE user_id = @b')
      )
    ).toBe(ENDRES_IKKE);
    expect(
      await avvisning(
        eier()
          .input('b', sql.UniqueIdentifier, bruker)
          .query(
            "UPDATE koe.app_identities SET subject = subject WHERE user_id = @b AND provider = N'catenda'"
          )
      )
    ).toBe(ENDRES_IKKE);
    expect((await identiteter(bruker)).map((i) => i.provider)).toEqual(['catenda', 'entra']);
    await iKontekst('catenda', slettEn);
    expect((await identiteter(bruker)).map((i) => i.provider)).toEqual(['entra']);
  });
});
