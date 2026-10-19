/**
 * Grensen for tiden mellom tidspunktet og skrivingen i `koe_api.skriv_hendelse`
 * (`20261020030000_skrivetidspunkt_grense.sql`). Kildene er DL-U3 med svaret 16.10
 * i #53 (basen godtar bare tidspunktet den ga for transaksjonen), avgjørelsen 17.10
 * i #599 (skrivingen avvises når det har gått mer enn 30 sekunder siden basen ga
 * tidspunktet) og punktet i #597 om at kontrollen av tidspunktet ikke avhenger av
 * låsen på journalen. Prosedyren kalles som kjøretiden, gjennom `transaksjon()`.
 * Krever `KOE_SQLSERVER_TILKOBLING`.
 */

import { randomBytes, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Journalrad } from '../../kjerne/typer.ts';
import { sql, transaksjon, type Kontekst, type Pool } from '../datalag.ts';
import { opprettSak, skrivHendelse, type Kommando } from '../kommandoer.ts';
import { avvisning, catendaBruker, opprettMigrertTestbase } from './sqlserver_migrert.ts';
import {
  feilnummer,
  opprettKjoeretid,
  slettAlle,
  SQLSERVER_TILKOBLING,
  type Testbase,
} from './sqlserver.ts';

const UGYLDIG = 51422;
const FOR_GAMMELT = 51419;

const P1 = 'skrivetidspunkt-p1';
const heks = () => randomBytes(16).toString('hex');
const TE1 = heks();
const ny = (): Kommando => ({ id: randomUUID(), sha256: heks() + heks() });

describe.skipIf(!SQLSERVER_TILKOBLING)('skrivetidspunktet i SQL Server', () => {
  let base: Testbase;
  let kjoeretid: { pool: Pool; slett(): Promise<void> };
  let te: Kontekst;

  beforeAll(async () => {
    base = await opprettMigrertTestbase('skrivetidspunkt');
    const bruker = await catendaBruker(base.pool);
    await base.pool.request().batch(`
      INSERT koe.projects (id, name, organisasjon_id, is_active) VALUES (N'${P1}', N'P1', N'org', 1);
      INSERT koe.app_project_memberships
        (project_id, user_id, catenda_subject, user_email, display_name, role, viewer_override, active)
      VALUES (N'${P1}', '${bruker}', N'${heks()}', N'', N'', N'member', 0, 1);
      INSERT koe.catenda_contract_teams (internal_project_id, team_id, contract_role)
      VALUES (N'${P1}', N'${TE1}', N'TE');
      INSERT koe.catenda_project_configs (internal_project_id, catenda_project_id, library_id, topic_board_id, is_active)
      VALUES (N'${P1}', NEWID(), NEWID(), NEWID(), 1);`);
    kjoeretid = await opprettKjoeretid(base);
    te = { aktor: bruker, prosjekt: P1, side: 'TE', team: TE1 };
  }, 240_000);
  afterAll(() => slettAlle(kjoeretid, base), 60_000);

  const nySak = () =>
    opprettSak(kjoeretid.pool, te, ny(), {
      format: 1,
      data: { sakstittel: 'Skrivetidspunktet', sakstype: 'standard' },
    });

  /** Antall brev i saken, lest av eieren i konteksten. */
  const antallBrev = (sakId: string) =>
    transaksjon(base.pool, te, async (f) => {
      const svar = await f()
        .input('sak_id', sql.NVarChar(36), sakId)
        .query<{ n: number }>('SELECT COUNT(*) AS n FROM koe.hendelse WHERE sak_id = @sak_id');
      return svar.recordset[0].n;
    });

  /** `koe_api.skriv_hendelse` med et brev uten oppdrag, som kjøretiden. */
  const skriv = (f: () => sql.Request, sakId: string, tidspunkt: Date, forventet = 1) =>
    f()
      .input('sak_id', sql.NVarChar(4000), sakId)
      .input('forventet_versjon', sql.Int, forventet)
      .input('event_id', sql.NVarChar(4000), randomUUID())
      .input('event_type', sql.NVarChar(4000), 'prove_brev')
      .input('tidsstempel', sql.DateTime2(3), tidspunkt)
      .input('format', sql.Int, 1)
      .input('data', sql.NVarChar(sql.MAX), '{}')
      .input('kommando_id', sql.NVarChar(4000), randomUUID())
      .input('kommando_sha256', sql.NVarChar(4000), heks() + heks())
      .execute('koe_api.skriv_hendelse');

  /**
   * Fører et tidspunkt `alder` ms før basens klokke for transaksjonen, som
   * `koe_api.skrivetidspunkt` ville ført det så mye tidligere: samme økt,
   * transaksjon og innlogging. Eieren skriver raden, siden kjøretiden ikke kan.
   */
  async function foerTidspunkt(f: () => sql.Request, alder: number): Promise<Date> {
    const denne = await f().query<{ tx: string; spid: number; inn: Date; naa: Date }>(
      `SELECT CAST(CURRENT_TRANSACTION_ID() AS nvarchar(20)) AS tx, @@SPID AS spid,
              (SELECT CAST(login_time AS datetime2(3)) FROM sys.dm_exec_sessions WHERE session_id = @@SPID) AS inn,
              DATETRUNC(millisecond, SYSUTCDATETIME()) AS naa`
    );
    const { tx, spid, inn, naa } = denne.recordset[0];
    const tidspunkt = new Date(naa.getTime() - alder);
    await base.pool
      .request()
      .input('oekt', sql.SmallInt, spid)
      .input('tx', sql.BigInt, tx)
      .input('inn', sql.DateTime2(3), inn)
      .input('t', sql.DateTime2(3), tidspunkt).query(`
        DELETE koe.skrivetidspunkt WHERE oekt = @oekt;
        INSERT koe.skrivetidspunkt (oekt, transaksjon, innlogget, tidspunkt) VALUES (@oekt, @tx, @inn, @t);`);
    return tidspunkt;
  }

  it('kontrollsak: et tidspunkt basen ga for 28 sekunder siden godtas, og brevet skrives', async () => {
    const sak = await nySak();
    await transaksjon(kjoeretid.pool, te, async (f) =>
      skriv(f, sak.sak_id, await foerTidspunkt(f, 28_000))
    );
    expect(await antallBrev(sak.sak_id)).toBe(2);
  });

  it('et tidspunkt basen ga for 31 sekunder siden avvises med 51419, og ingenting skrives (#599)', async () => {
    const sak = await nySak();
    const feil = await avvisning(
      transaksjon(kjoeretid.pool, te, async (f) =>
        skriv(f, sak.sak_id, await foerTidspunkt(f, 31_000))
      )
    );
    expect(feil).toBe(FOR_GAMMELT);
    expect(await antallBrev(sak.sak_id)).toBe(1);
  });

  it.each([
    ['et tidspunkt basen ikke ga', 'uten', UGYLDIG],
    ['et tidspunkt eldre enn 30 sekunder', 'gammelt', FOR_GAMMELT],
  ] as const)(
    '%s avvises uten å vente på en annen skriving som holder låsen på journalen (#597)',
    async (_, tid, forventet) => {
      const sak = await nySak();
      // En annen transaksjon har skrevet versjon 2 og holder låsen til den er ferdig.
      let slipp!: () => void;
      const holdt = new Promise<void>((ok) => (slipp = ok));
      let laast!: () => void;
      const laasen = new Promise<void>((ok) => (laast = ok));
      const holder = transaksjon(kjoeretid.pool, te, async (f) => {
        const svar = await f()
          .output('tidspunkt', sql.DateTime2(3))
          .execute('koe_api.skrivetidspunkt');
        await skriv(f, sak.sak_id, svar.output.tidspunkt as Date);
        laast();
        await holdt;
      });
      await laasen;
      try {
        const forsoek = avvisning(
          transaksjon(kjoeretid.pool, te, async (f) =>
            skriv(f, sak.sak_id, tid === 'uten' ? new Date() : await foerTidspunkt(f, 31_000), 2)
          )
        );
        const utfall = await Promise.race([
          forsoek,
          new Promise((ok) => setTimeout(() => ok('ventet'), 5_000)),
        ]);
        expect(utfall).toBe(forventet);
      } finally {
        slipp();
        await holder;
      }
    },
    30_000
  );

  it('et tidspunkt som var under 30 sekunder før låsen, avvises når ventingen på låsen tar det over (#599)', async () => {
    const sak = await nySak();
    let slipp!: () => void;
    const holdt = new Promise<void>((ok) => (slipp = ok));
    let laast!: () => void;
    const laasen = new Promise<void>((ok) => (laast = ok));
    const holder = transaksjon(kjoeretid.pool, te, async (f) => {
      const svar = await f()
        .output('tidspunkt', sql.DateTime2(3))
        .execute('koe_api.skrivetidspunkt');
      await skriv(f, sak.sak_id, svar.output.tidspunkt as Date);
      laast();
      await holdt;
    });
    await laasen;
    try {
      // 27 s gammelt ved kontrollen før låsen, og minst 31 s når låsen slippes.
      let foert!: () => void;
      const tidspunktet = new Promise<void>((ok) => (foert = ok));
      const forsoek = avvisning(
        transaksjon(kjoeretid.pool, te, async (f) => {
          const tidspunkt = await foerTidspunkt(f, 27_000);
          foert();
          return skriv(f, sak.sak_id, tidspunkt, 2);
        })
      );
      await Promise.race([tidspunktet, forsoek]);
      await new Promise((ok) => setTimeout(ok, 4_000));
      expect(await Promise.race([forsoek, Promise.resolve('venter på låsen')])).toBe(
        'venter på låsen'
      );
      slipp();
      expect(await forsoek).toBe(FOR_GAMMELT);
    } finally {
      slipp();
      await holder;
    }
    expect(await antallBrev(sak.sak_id)).toBe(2);
  }, 30_000);

  /**
   * `skrivHendelse` der de `gamle` første kallene til `koe_api.skrivetidspunkt` gir
   * et tidspunkt basen førte for 31 sekunder siden, for samme økt og transaksjon.
   * Resten går til basen. Svaret er utfallet, tidspunktene `lag` fikk, og antallet
   * kall til `koe_api.skrivetidspunkt`.
   */
  async function skrivMedGamle(sakId: string, gamle: number) {
    const ekte = sql.Request.prototype.execute as unknown as (
      this: sql.Request,
      prosedyre: string
    ) => Promise<unknown>;
    let kall = 0;
    const tidspunkter: Date[] = [];
    async function execute(this: sql.Request, prosedyre: string): Promise<unknown> {
      if (prosedyre !== 'koe_api.skrivetidspunkt' || kall++ >= gamle)
        return ekte.call(this, prosedyre);
      const { parent } = this as unknown as { parent: sql.Transaction };
      const tidspunkt = await foerTidspunkt(() => new sql.Request(parent), 31_000);
      return { output: { tidspunkt } };
    }
    const spion = vi
      .spyOn(sql.Request.prototype, 'execute')
      .mockImplementation(execute as unknown as typeof sql.Request.prototype.execute);
    try {
      const utfall = await skrivHendelse(kjoeretid.pool, te, sakId, 1, ny(), (g) => {
        tidspunkter.push(g.tidspunkt);
        const forrige = g.journal.at(-1)!;
        const rad: Journalrad = {
          event_id: randomUUID(),
          sak_id: sakId,
          event_type: 'prove_brev',
          versjon: forrige.versjon + 1,
          tidsstempel: g.tidspunkt.toISOString(),
          aktor_id: te.aktor,
          aktor_rolle: 'TE',
          aktor_team_id: te.team ?? null,
          refererer_til_event_id: null,
          format: 1,
          data: {},
        };
        return { skriv: true, rad, oppdrag: null };
      }).catch((feil: unknown) => ({ feil }));
      return { utfall, tidspunkter, kall };
    } finally {
      spion.mockRestore();
    }
  }

  // Kilde: avgjørelsen 17.10 i #599: serveren prøver én gang til.
  it('når basen avviser det første tidspunktet med 51419, prøver serveren én gang til med et nytt tidspunkt, og brevet skrives én gang (#599)', async () => {
    const sak = await nySak();
    const { utfall, tidspunkter, kall } = await skrivMedGamle(sak.sak_id, 1);
    expect(utfall).toMatchObject({ skriv: true, rad: { versjon: 2 } });
    expect(kall).toBe(2);
    expect(tidspunkter).toHaveLength(2);
    expect(tidspunkter[1].getTime() - tidspunkter[0].getTime()).toBeGreaterThanOrEqual(31_000);
    expect(await antallBrev(sak.sak_id)).toBe(2);
  });

  // Kilde: #599 og bestillingen i #764: avvises også det andre forsøket, får klienten
  // det samme som 51419 ga før, basens feil, og det blir ikke flere forsøk.
  it('avviser basen også det andre forsøket med 51419, kastes basens feil, og ingenting skrives (#599)', async () => {
    const sak = await nySak();
    const { utfall, kall } = await skrivMedGamle(sak.sak_id, 2);
    expect(feilnummer((utfall as { feil: unknown }).feil)).toBe(FOR_GAMMELT);
    expect(kall).toBe(2);
    expect(await antallBrev(sak.sak_id)).toBe(1);
  });
});
