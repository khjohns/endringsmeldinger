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
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  brukInnloggingsforsoek,
  lesSesjon,
  opprettInnloggingsforsoek,
  opprettSesjon,
  ryddUtloepte,
  sesjonsvarighet,
  slettSesjon,
  UgyldigSesjonsdata,
  UkjentBruker,
} from '../sesjon.ts';
import { avvisning, catendaBruker, opprettMigrertTestbase } from './sqlserver_migrert.ts';
import {
  koble,
  opprettKjoeretid,
  slettAlle,
  sql,
  SQLSERVER_TILKOBLING,
  type Pool,
  type Testbase,
} from './sqlserver.ts';

const hash = (t: string) => createHash('sha256').update(t).digest('hex');
const TIME = 3_600_000;

describe('sesjonsvarigheten fra miljøet (#1806)', () => {
  it('er 8 timer og 60 minutter når variablene mangler eller er tomme', () => {
    const standard = { levetid: 8 * 3600, inaktivitet: 3600 };
    expect(sesjonsvarighet({})).toEqual(standard);
    expect(
      sesjonsvarighet({ KOE_SESJON_LEVETID_MINUTTER: '', KOE_SESJON_INAKTIVITET_MINUTTER: '' })
    ).toEqual(standard);
  });

  it('leser minuttene og gir sekunder', () => {
    expect(
      sesjonsvarighet({ KOE_SESJON_LEVETID_MINUTTER: '1440', KOE_SESJON_INAKTIVITET_MINUTTER: '1' })
    ).toEqual({ levetid: 86_400, inaktivitet: 60 });
  });

  it.each([
    ['levetid over 24 timer', { KOE_SESJON_LEVETID_MINUTTER: '1441' }],
    ['levetid 0', { KOE_SESJON_LEVETID_MINUTTER: '0' }],
    ['tidsavbrudd som ikke er et heltall', { KOE_SESJON_INAKTIVITET_MINUTTER: '1.5' }],
    ['tidsavbrudd som ikke er et tall', { KOE_SESJON_INAKTIVITET_MINUTTER: 'en time' }],
    ['tidsavbrudd over levetiden', { KOE_SESJON_LEVETID_MINUTTER: '30' }],
  ])('avviser %s', (_navn, miljoe) => {
    expect(() => sesjonsvarighet(miljoe)).toThrow();
  });
});

describe.skipIf(!SQLSERVER_TILKOBLING)('sesjonen og innloggingsforsøket i SQL Server', () => {
  let base: Testbase;
  let kjoeretid: { pool: Pool; slett(): Promise<void> };
  let bruker: string;

  beforeAll(async () => {
    base = await opprettMigrertTestbase('sesjon', { maks: 12 });
    kjoeretid = await opprettKjoeretid(base, { maks: 12 });
    bruker = await catendaBruker(kjoeretid.pool);
  }, 240_000);
  afterAll(() => slettAlle(kjoeretid, base), 60_000);

  // Avkortet til millisekundet som utløpet, så grensene holder på millisekundet.
  const klokke = async () =>
    (
      await base.pool
        .request()
        .query<{ naa: Date }>('SELECT DATETRUNC(millisecond, SYSUTCDATETIME()) AS naa')
    ).recordset[0].naa;

  async function utloep(tabell: 'app_sessions' | 'app_oauth_attempts', kolonne: string, h: string) {
    await base.pool
      .request()
      .input('h', sql.Char(64), h)
      .query(
        `UPDATE koe.${tabell} SET expires_at = DATEADD(second, -1, SYSUTCDATETIME()) WHERE ${kolonne} = @h`
      );
  }

  const varighet = (r: sql.Request, levetid = 8 * TIME, inaktivitet = TIME) =>
    r.input('levetid', sql.Int, levetid / 1000).input('inaktivitet', sql.Int, inaktivitet / 1000);

  /** Flytter opprettelsen og utløpet bakover eller fram, regnet fra basens klokke nå. */
  async function settTider(token: string, opprettet: number, utloeper: number) {
    await base.pool
      .request()
      .input('h', sql.Char(64), hash(token))
      .input('opprettet', sql.Int, opprettet / 1000)
      .input('utloeper', sql.Int, utloeper / 1000)
      .query(
        `UPDATE koe.app_sessions SET created_at = DATEADD(second, @opprettet, SYSUTCDATETIME()),
                expires_at = DATEADD(second, @utloeper, SYSUTCDATETIME()) WHERE token_hash = @h`
      );
  }

  const lagretUtloep = async (token: string) =>
    (
      await base.pool.request().input('h', sql.Char(64), hash(token)).query<{
        utloeper: Date;
      }>('SELECT expires_at AS utloeper FROM koe.app_sessions WHERE token_hash = @h')
    ).recordset[0]?.utloeper;

  describe('levetiden og tidsavbruddet (#1806)', () => {
    afterEach(() => vi.unstubAllEnvs());

    it('bruken flytter utløpet til tidsavbruddet fra nå', async () => {
      const ny = await opprettSesjon(kjoeretid.pool, bruker);
      await settTider(ny.token, -50 * 60_000, 10 * 60_000);
      const foer = await klokke();
      const sesjon = await lesSesjon(kjoeretid.pool, ny.token);
      const etter = await klokke();
      expect(sesjon?.utloeper.getTime()).toBeGreaterThanOrEqual(foer.getTime() + TIME);
      expect(sesjon?.utloeper.getTime()).toBeLessThanOrEqual(etter.getTime() + TIME);
      expect(await lagretUtloep(ny.token)).toEqual(sesjon?.utloeper);
    });

    it('en sesjon som ikke er brukt på mer enn tidsavbruddet, avvises, også innenfor levetiden', async () => {
      const ny = await opprettSesjon(kjoeretid.pool, bruker);
      await settTider(ny.token, -61 * 60_000, -1000);
      expect(await lesSesjon(kjoeretid.pool, ny.token)).toBeNull();
    });

    it('bruken flytter aldri utløpet forbi levetiden fra opprettelsen', async () => {
      const ny = await opprettSesjon(kjoeretid.pool, bruker);
      await settTider(ny.token, -(8 * TIME - 10 * 60_000), 60_000);
      const sesjon = await lesSesjon(kjoeretid.pool, ny.token);
      const opprettet = await base.pool
        .request()
        .input('h', sql.Char(64), hash(ny.token))
        .query<{ t: Date }>('SELECT created_at AS t FROM koe.app_sessions WHERE token_hash = @h');
      expect(sesjon?.utloeper).toEqual(new Date(opprettet.recordset[0].t.getTime() + 8 * TIME));
    });

    it('en sesjon over levetiden avvises selv om utløpet er satt senere med en lengre levetid', async () => {
      const ny = await opprettSesjon(kjoeretid.pool, bruker);
      await settTider(ny.token, -(8 * TIME + 1000), 30 * 60_000);
      expect(await lesSesjon(kjoeretid.pool, ny.token)).toBeNull();
      vi.stubEnv('KOE_SESJON_LEVETID_MINUTTER', String(9 * 60));
      expect(await lesSesjon(kjoeretid.pool, ny.token)).not.toBeNull();
    });

    it('et kortere tidsavbrudd i konfigurasjonen gjelder også en sesjon som alt finnes', async () => {
      const ny = await opprettSesjon(kjoeretid.pool, bruker);
      vi.stubEnv('KOE_SESJON_INAKTIVITET_MINUTTER', '15');
      const foer = await klokke();
      const sesjon = await lesSesjon(kjoeretid.pool, ny.token);
      expect(sesjon?.utloeper.getTime()).toBeLessThanOrEqual(foer.getTime() + 15 * 60_000 + 1000);
      await settTider(ny.token, -16 * 60_000, 50 * 60_000);
      expect(await lesSesjon(kjoeretid.pool, ny.token)).not.toBeNull();
      await settTider(ny.token, -16 * 60_000, -1000);
      expect(await lesSesjon(kjoeretid.pool, ny.token)).toBeNull();
    });

    it('lesingen skriver ikke utløpet på nytt når det flytter seg under ett minutt', async () => {
      const ny = await opprettSesjon(kjoeretid.pool, bruker);
      await settTider(ny.token, -30_000, TIME - 30_000);
      const foer = await lagretUtloep(ny.token);
      await lesSesjon(kjoeretid.pool, ny.token);
      expect(await lagretUtloep(ny.token)).toEqual(foer);
    });

    it.each([
      ['uten levetid', null, 3600],
      ['uten tidsavbrudd', 3600, null],
      ['med tidsavbrudd under ett minutt', 3600, 59],
      ['med tidsavbrudd over levetiden', 3600, 3601],
    ])('basen avviser opprettelsen og lesingen %s', async (_navn, levetid, inaktivitet) => {
      const med = (r: sql.Request) =>
        r.input('levetid', sql.Int, levetid).input('inaktivitet', sql.Int, inaktivitet);
      expect(
        await avvisning(
          med(
            kjoeretid.pool
              .request()
              .input('token_hash', sql.NVarChar(4000), hash(`varighet-${_navn}`))
              .input('bruker', sql.UniqueIdentifier, bruker)
              .input('csrf_token', sql.NVarChar(4000), 'a'.repeat(43))
              .output('utloeper', sql.DateTime2(3))
          ).execute('koe_api.opprett_sesjon')
        )
      ).toBe(52084);
      expect(
        await avvisning(
          med(kjoeretid.pool.request().input('token_hash', sql.NVarChar(4000), hash('x'))).execute(
            'koe_api.les_sesjon'
          )
        )
      ).toBe(52084);
    });
  });

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

    it('utløper etter tidsavbruddet på 60 minutter uten bruk, etter basens klokke (#1806)', async () => {
      const foer = await klokke();
      const ny = await opprettSesjon(kjoeretid.pool, bruker);
      const etter = await klokke();
      expect(ny.utloeper.getTime()).toBeGreaterThanOrEqual(foer.getTime() + TIME);
      expect(ny.utloeper.getTime()).toBeLessThanOrEqual(etter.getTime() + TIME);
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
      const p = varighet(kjoeretid.pool.request().input('token_hash', sql.NVarChar(4000), h));
      expect(await avvisning(p.execute('koe_api.les_sesjon'))).toBe(52050);
    });

    it.each([
      ['for kort', 'a'.repeat(31)],
      ['med tegn utenfor base64url', `${'a'.repeat(42)}+`],
    ])('avviser et CSRF-token som er %s', async (_navn, csrf) => {
      const p = varighet(
        kjoeretid.pool
          .request()
          .input('token_hash', sql.NVarChar(4000), hash('csrf'))
          .input('bruker', sql.UniqueIdentifier, bruker)
          .input('csrf_token', sql.NVarChar(4000), csrf)
          .output('utloeper', sql.DateTime2(3))
      );
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
      ['lengre enn 4000 tegn', `/${'a'.repeat(4000)}`],
    ])('avviser en retursti som er %s', async (_navn, sti) => {
      await expect(opprettInnloggingsforsoek(kjoeretid.pool, sti)).rejects.toBeInstanceOf(
        UgyldigSesjonsdata
      );
    });

    it.each([
      ['2048 tegn', `/${'a'.repeat(2047)}`],
      ['2048 UTF-16-enheter med parvise tegn', `/a${'😀'.repeat(1023)}`],
      ['2048 tegn med mellomrom til slutt', `/${'a'.repeat(2046)} `],
    ])('godtar en retursti på %s og gir den uendret tilbake', async (_navn, sti) => {
      const ny = await opprettInnloggingsforsoek(kjoeretid.pool, sti);
      expect(await brukInnloggingsforsoek(kjoeretid.pool, ny.state, ny.nettleser)).toBe(sti);
    });

    it('godtar en lokal sti med spørring og æøå', async () => {
      const ny = await opprettInnloggingsforsoek(kjoeretid.pool, '/sak/æøå?a=1&b=%2F');
      expect(await brukInnloggingsforsoek(kjoeretid.pool, ny.state, ny.nettleser)).toBe(
        '/sak/æøå?a=1&b=%2F'
      );
    });

    // Grensen i prosedyren er kolonnelengden i byte, skrevet en gang til. Endres
    // kolonnen uten prosedyren, avviser kontrollen gyldige stier eller slipper
    // gjennom stier som INSERT avviser med 2628 (#691). Grensetestene over regner
    // med 2048 tegn.
    it('grensen i opprett_innloggingsforsoek er lengden på return_path i sys.columns', async () => {
      const { recordset } = await base.pool.request().query<{ bytes: number; definisjon: string }>(
        `SELECT COL_LENGTH(N'koe.app_oauth_attempts', N'return_path') AS bytes,
                OBJECT_DEFINITION(OBJECT_ID(N'koe_api.opprett_innloggingsforsoek')) AS definisjon`
      );
      const grenser = [...recordset[0].definisjon.matchAll(/DATALENGTH\(@retursti\)\s*>\s*(\d+)/g)];
      expect(grenser.map((g) => Number(g[1]))).toEqual([recordset[0].bytes]);
      expect(recordset[0].bytes).toBe(2 * 2048);
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

  // Planen for prosedyren, uten å kjøre den. Forbindelsen er egen og har
  // datalagets konfigurasjon (`koble`), så SHOWPLAN_XML aldri følger en
  // forbindelse tilbake til poolen testene ellers bruker.
  let planforbindelse: Pool;
  beforeAll(async () => {
    planforbindelse = await koble(base.navn, 1);
  });
  afterAll(async () => {
    await planforbindelse?.close();
  });

  async function plan(kall: string): Promise<string> {
    await planforbindelse.request().batch('SET SHOWPLAN_XML ON');
    try {
      const svar = await planforbindelse.request().batch(kall);
      return (svar.recordsets as unknown as Record<string, string>[][])
        .flatMap((sett) => sett.map((rad) => Object.values(rad).join('')))
        .join('\n');
    } finally {
      await planforbindelse.request().batch('SET SHOWPLAN_XML OFF');
    }
  }

  interface Element {
    navn: string;
    attr: Record<string, string>;
    barn: Element[];
    forelder?: Element;
  }

  // Treet i planen. SHOWPLAN_XML har bare elementer og attributter, så det holder
  // å lese taggene; navnerommet tas bort fra navnet.
  function lesXml(xml: string): Element {
    const rot: Element = { navn: '', attr: {}, barn: [] };
    let her = rot;
    for (const [, slutt, navn, attr, tom] of xml.matchAll(
      /<(\/?)([\w:]+)((?:[^>"]|"[^"]*")*?)(\/?)>/g
    )) {
      if (slutt) {
        her = her.forelder ?? rot;
        continue;
      }
      const element: Element = {
        navn: navn.replace(/^.*:/, ''),
        attr: Object.fromEntries(
          [...attr.matchAll(/([\w:]+)="([^"]*)"/g)].map((a) => [a[1], a[2]])
        ),
        barn: [],
        forelder: her,
      };
      her.barn.push(element);
      if (!tom) her = element;
    }
    return rot;
  }

  const etterkommere = (e: Element): Element[] => e.barn.flatMap((b) => [b, ...etterkommere(b)]);

  // Per setning som leser `tabell`: kolonnene i likhetssøkene i primærnøkkelen.
  // Søket står i en `IndexScan` eller rett i en `Update` eller `SimpleUpdate` (som
  // `Clustered Index Delete`), og indeksen er operatorens eget `Object`. Et
  // nøkkeloppslag (`IndexScan` med `Lookup`) teller ikke: der kommer nøkkelen fra
  // en annen indeks.
  function soekPerSetning(xml: string, tabell: string): string[][] {
    return etterkommere(lesXml(xml))
      .filter((e) => e.navn === 'StmtSimple')
      .flatMap((s) => s.barn.filter((b) => b.navn === 'QueryPlan'))
      .filter((q) =>
        etterkommere(q).some((e) => e.navn === 'Object' && e.attr.Table === `[${tabell}]`)
      )
      .map((q) =>
        etterkommere(q)
          .filter((e) => e.navn === 'SeekPredicateNew')
          .flatMap((p) => {
            let operator = p.forelder;
            while (operator && !['IndexScan', 'Update', 'SimpleUpdate'].includes(operator.navn))
              operator = operator.forelder;
            if (!operator || /^(1|true)$/.test(operator.attr.Lookup ?? '')) return [];
            const objekt = operator.barn.find((b) => b.navn === 'Object');
            if (objekt?.attr.Table !== `[${tabell}]` || objekt.attr.Index !== `[${tabell}_pk]`)
              return [];
            const kolonne = etterkommere(p)
              .filter((e) => e.navn === 'Prefix' && e.attr.ScanType === 'EQ')
              .flatMap(etterkommere)
              .find((e) => e.navn === 'ColumnReference')?.attr.Column;
            return kolonne ? [kolonne] : [];
          })
      );
  }

  const H = '0'.repeat(64);
  // En `nvarchar`-parameter mot en `varchar`-kolonne konverterer kolonnen, og
  // oppslaget leser hele tabellen eller søker i et område med kolonnen konvertert
  // (#691). Søket kan stå i en egen operator eller inne i `Clustered Index
  // Delete`. Testen krever, i hver setning som leser tabellen, et likhetssøk på
  // hashkolonnen i primærnøkkelen som ikke er et nøkkeloppslag, og ingen skanning
  // (#855).
  it.each([
    [
      'les_sesjon',
      `EXEC koe_api.les_sesjon @token_hash = N'${H}', @levetid = 28800, @inaktivitet = 3600`,
      'app_sessions',
      'token_hash',
    ],
    [
      'slett_sesjon',
      `EXEC koe_api.slett_sesjon @token_hash = N'${H}'`,
      'app_sessions',
      'token_hash',
    ],
    [
      'bruk_innloggingsforsoek',
      `EXEC koe_api.bruk_innloggingsforsoek @state_hash = N'${H}', @nettleser_hash = N'${H}'`,
      'app_oauth_attempts',
      'state_hash',
    ],
  ])(
    '%s søker i primærnøkkelen uten å konvertere hashkolonnen',
    async (_, kall, tabell, kolonne) => {
      const xml = await plan(kall);
      const skanninger = [...xml.matchAll(/PhysicalOp="([^"]*Scan[^"]*)"/g)].map((m) => m[1]);
      expect(skanninger.filter((op) => op !== 'Constant Scan')).toEqual([]);
      const setninger = soekPerSetning(xml, tabell);
      expect(setninger.length).toBeGreaterThan(0);
      for (const soek of setninger) expect(soek).toContain(kolonne);
      expect(xml).not.toMatch(/CONVERT_IMPLICIT\([^)]*\)?,[^,]*\[(token|state|browser)_hash\]/);
    }
  );

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
