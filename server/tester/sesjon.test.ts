/**
 * Sesjonen og innloggingsforsøket i SQL Server (B-19, #656), i en base bygget fra
 * `database/migrasjoner/` og kalt som kjøretiden. Forventningene fastholder dagens
 * atferd i Python, som flyttes uendret: `backend/routes/auth_routes.py` (levetidene
 * 8 t og 600 s, utloggingen), `backend/lib/auth/session.py` (bare SHA-256 av
 * tokenet lagres) og `backend/repositories/auth_repository.py` (`consume_attempt`
 * bruker forsøket én gang og bare fra samme nettleser, `cleanup_expired`).
 * Akseptkriteriene står i #656. Krever `KOE_SQLSERVER_TILKOBLING`.
 */

import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  brukInnloggingsforsoek,
  lesSesjon,
  opprettInnloggingsforsoek,
  opprettSesjon,
  ryddUtloepte,
  slettSesjon,
  UgyldigSesjonsdata,
  UkjentBruker,
} from '../sesjon.ts';
import { avvisning, catendaBruker, opprettMigrertTestbase } from './sqlserver_migrert.ts';
import {
  opprettKjoeretid,
  sql,
  SQLSERVER_TILKOBLING,
  type Pool,
  type Testbase,
} from './sqlserver.ts';

const hash = (t: string) => createHash('sha256').update(t).digest('hex');
const TIME = 3_600_000;

describe.skipIf(!SQLSERVER_TILKOBLING)('sesjonen og innloggingsforsøket i SQL Server', () => {
  let base: Testbase;
  let kjoeretid: { pool: Pool; slett(): Promise<void> };
  let bruker: string;

  beforeAll(async () => {
    base = await opprettMigrertTestbase('sesjon', { maks: 12 });
    kjoeretid = await opprettKjoeretid(base, { maks: 12 });
    bruker = await catendaBruker(kjoeretid.pool);
  }, 240_000);
  afterAll(async () => {
    await kjoeretid?.slett();
    await base?.slett();
  }, 60_000);

  // Avrundet til datetime2(3) som utløpet, så grensene holder på millisekundet.
  const klokke = async () =>
    (
      await base.pool
        .request()
        .query<{ naa: Date }>('SELECT CAST(SYSUTCDATETIME() AS datetime2(3)) AS naa')
    ).recordset[0].naa;

  async function utloep(tabell: 'app_sessions' | 'app_oauth_attempts', kolonne: string, h: string) {
    await base.pool
      .request()
      .input('h', sql.Char(64), h)
      .query(
        `UPDATE koe.${tabell} SET expires_at = DATEADD(second, -1, SYSUTCDATETIME()) WHERE ${kolonne} = @h`
      );
  }

  describe('sesjonen', () => {
    it('lagrer bare SHA-256 av tokenet, og lesingen gir brukeren og CSRF-tokenet', async () => {
      const ny = await opprettSesjon(kjoeretid.pool, bruker);
      const rader = await base.pool.request().input('bruker', sql.UniqueIdentifier, bruker).query<{
        token_hash: string;
        csrf_token: string;
      }>('SELECT token_hash, csrf_token FROM koe.app_sessions WHERE user_id = @bruker');
      expect(rader.recordset.map((r) => r.token_hash)).toContain(hash(ny.token));
      expect(rader.recordset.map((r) => r.token_hash)).not.toContain(ny.token);

      const sesjon = await lesSesjon(kjoeretid.pool, ny.token);
      expect(sesjon?.bruker.id).toBe(bruker);
      expect(sesjon?.csrfToken).toBe(ny.csrfToken);
      expect(ny.csrfToken).not.toBe(ny.token);
    });

    it('utløper 8 t etter opprettelsen, etter basens klokke', async () => {
      const foer = await klokke();
      const ny = await opprettSesjon(kjoeretid.pool, bruker);
      const etter = await klokke();
      expect(ny.utloeper.getTime()).toBeGreaterThanOrEqual(foer.getTime() + 8 * TIME);
      expect(ny.utloeper.getTime()).toBeLessThanOrEqual(etter.getTime() + 8 * TIME);
    });

    it('en utløpt sesjon gir ingen bruker, en gyldig ved siden av gjør det', async () => {
      const utloept = await opprettSesjon(kjoeretid.pool, bruker);
      const gyldig = await opprettSesjon(kjoeretid.pool, bruker);
      await utloep('app_sessions', 'token_hash', hash(utloept.token));
      expect(await lesSesjon(kjoeretid.pool, utloept.token)).toBeNull();
      expect(await lesSesjon(kjoeretid.pool, gyldig.token)).not.toBeNull();
    });

    it('en slettet sesjon gir ingen bruker, og et ukjent token heller ikke', async () => {
      const ny = await opprettSesjon(kjoeretid.pool, bruker);
      await slettSesjon(kjoeretid.pool, ny.token);
      expect(await lesSesjon(kjoeretid.pool, ny.token)).toBeNull();
      expect(await lesSesjon(kjoeretid.pool, 'ukjent')).toBeNull();
    });

    it('avviser en sesjon for en bruker som ikke finnes', async () => {
      await expect(
        opprettSesjon(kjoeretid.pool, '00000000-0000-0000-0000-000000000001')
      ).rejects.toBeInstanceOf(UkjentBruker);
    });

    it.each([
      ['for kort', 'a'.repeat(63)],
      ['store bokstaver', 'A'.repeat(64)],
      ['mellomrom til slutt', `${'a'.repeat(63)} `],
      ['tom', ''],
    ])('avviser en tokenhash som er %s', async (_navn, h) => {
      const p = kjoeretid.pool.request().input('token_hash', sql.NVarChar(4000), h);
      expect(await avvisning(p.execute('koe_api.les_sesjon'))).toBe(52050);
    });

    it.each([
      ['for kort', 'a'.repeat(31)],
      ['med tegn utenfor base64url', `${'a'.repeat(42)}+`],
    ])('avviser et CSRF-token som er %s', async (_navn, csrf) => {
      const p = kjoeretid.pool
        .request()
        .input('token_hash', sql.NVarChar(4000), hash('csrf'))
        .input('bruker', sql.UniqueIdentifier, bruker)
        .input('csrf_token', sql.NVarChar(4000), csrf)
        .output('utloeper', sql.DateTime2(3));
      expect(await avvisning(p.execute('koe_api.opprett_sesjon'))).toBe(52053);
    });
  });

  describe('innloggingsforsøket', () => {
    it('gir returstien én gang, til nettleseren som startet det', async () => {
      const ny = await opprettInnloggingsforsoek(kjoeretid.pool, '/saker?side=2');
      expect(await brukInnloggingsforsoek(kjoeretid.pool, ny.state, 'annen')).toBeNull();
      expect(await brukInnloggingsforsoek(kjoeretid.pool, ny.state, ny.nettleser)).toBe(
        '/saker?side=2'
      );
      expect(await brukInnloggingsforsoek(kjoeretid.pool, ny.state, ny.nettleser)).toBeNull();
    });

    it('av to samtidige bruk får nøyaktig ett returstien', async () => {
      const ny = await opprettInnloggingsforsoek(kjoeretid.pool, '/');
      const svar = await Promise.all(
        Array.from({ length: 8 }, () =>
          brukInnloggingsforsoek(kjoeretid.pool, ny.state, ny.nettleser)
        )
      );
      expect(svar.filter((s) => s === '/')).toHaveLength(1);
    });

    it('utløper 600 s etter opprettelsen, og et utløpt forsøk gir ingenting', async () => {
      const foer = await klokke();
      const ny = await opprettInnloggingsforsoek(kjoeretid.pool, '/');
      const etter = await klokke();
      expect(ny.utloeper.getTime()).toBeGreaterThanOrEqual(foer.getTime() + 600_000);
      expect(ny.utloeper.getTime()).toBeLessThanOrEqual(etter.getTime() + 600_000);
      await utloep('app_oauth_attempts', 'state_hash', hash(ny.state));
      expect(await brukInnloggingsforsoek(kjoeretid.pool, ny.state, ny.nettleser)).toBeNull();
    });

    it.each([
      ['en full adresse', 'https://angriper.example/'],
      ['protokollrelativ', '//angriper.example/'],
      ['med omvendt skråstrek', '/\\angriper.example'],
      ['med linjeskift', '/a\nb'],
      ['med nulltegn', '/a\u0000b'],
      ['med DEL', '/a\u007fb'],
      ['tom', ''],
      ['lengre enn 2048 tegn', `/${'a'.repeat(2048)}`],
      [
        'lengre enn 2048 tegn bare med mellomrom til slutt',
        `/${'a'.repeat(2047)}${' '.repeat(50)}`,
      ],
      ['lengre enn 2048 UTF-16-enheter med færre kodepunkter', `/${'😀'.repeat(1500)}`],
    ])('avviser en retursti som er %s', async (_navn, sti) => {
      await expect(opprettInnloggingsforsoek(kjoeretid.pool, sti)).rejects.toBeInstanceOf(
        UgyldigSesjonsdata
      );
    });

    it('godtar en lokal sti med spørring og æøå', async () => {
      const ny = await opprettInnloggingsforsoek(kjoeretid.pool, '/sak/æøå?a=1&b=%2F');
      expect(await brukInnloggingsforsoek(kjoeretid.pool, ny.state, ny.nettleser)).toBe(
        '/sak/æøå?a=1&b=%2F'
      );
    });
  });

  it('ryddingen sletter utløpte sesjoner og forsøk og lar gyldige stå', async () => {
    const utloeptSesjon = await opprettSesjon(kjoeretid.pool, bruker);
    const gyldigSesjon = await opprettSesjon(kjoeretid.pool, bruker);
    const utloeptForsoek = await opprettInnloggingsforsoek(kjoeretid.pool, '/');
    const gyldigForsoek = await opprettInnloggingsforsoek(kjoeretid.pool, '/');
    await utloep('app_sessions', 'token_hash', hash(utloeptSesjon.token));
    await utloep('app_oauth_attempts', 'state_hash', hash(utloeptForsoek.state));

    const ryddet = await ryddUtloepte(kjoeretid.pool);
    expect(ryddet.sesjoner).toBeGreaterThanOrEqual(1);
    expect(ryddet.forsoek).toBeGreaterThanOrEqual(1);

    const igjen = await base.pool
      .request()
      .input('s1', sql.Char(64), hash(utloeptSesjon.token))
      .input('s2', sql.Char(64), hash(gyldigSesjon.token))
      .input('f1', sql.Char(64), hash(utloeptForsoek.state))
      .input('f2', sql.Char(64), hash(gyldigForsoek.state))
      .query<{ h: string }>(
        `SELECT token_hash AS h FROM koe.app_sessions WHERE token_hash IN (@s1, @s2)
         UNION ALL SELECT state_hash FROM koe.app_oauth_attempts WHERE state_hash IN (@f1, @f2)`
      );
    expect(igjen.recordset.map((r) => r.h).sort()).toEqual(
      [hash(gyldigSesjon.token), hash(gyldigForsoek.state)].sort()
    );
  });

  it.each(['app_sessions', 'app_oauth_attempts'])(
    'kjøretiden kan ikke lese eller endre koe.%s direkte',
    async (tabell) => {
      for (const setning of [
        `SELECT TOP 1 * FROM koe.${tabell}`,
        `DELETE koe.${tabell}`,
        `UPDATE koe.${tabell} SET expires_at = SYSUTCDATETIME()`,
      ])
        expect(await avvisning(kjoeretid.pool.request().query(setning))).toBe(229);
    }
  );
});
