/**
 * Jobbkjøreren og topicen i Catenda mot testbasen i SQL Server (L-1a, #741).
 * Forventningene har kilde i KT-U3, KT-U4, invariant 6 og 7 i hovedplanen (2.3),
 * arbeidsvalgene 18.10 i #741 og svaret «Driften» 18.10 i #371. Akseptkriteriene
 * står i #741 (kommentaren 18.10), med nummeret i testnavnet.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { opprettelse } from '../../kjerne/kommandoer/opprettelse.ts';
import { CatendaUtilgjengelig, UsikkertUtfall, type NyTopic } from '../catenda.ts';
import { transaksjon } from '../datalag.ts';
import { kjoerEnJobb, LEASETID_S, startJobbkjoerer } from '../jobber.ts';
import { lesLeveringsmaal } from '../lager.ts';
import { sql } from './sqlserver.ts';
import { avvisning } from './sqlserver_migrert.ts';
import {
  kall,
  lagOppsett,
  opprettKjernesak,
  rydd,
  somJobbkjoerer,
  startServer,
  TESTBASE_URL,
  type KjorendeServer,
  type Oppsett,
} from './testbase.ts';

const LEASE_UGYLDIG = 54001;
const IKKE_PARKERT = 54002;
const UNIK = 2627;
const BLOKKERT = 33504;
const INGEN_RETT = 229;
const KAN_IKKE_BLI = 15517;

interface Jobb {
  jobb_id: string;
  sak_id: string;
  tilstand: string;
  catenda_project_id: string;
  catenda_board_id: string;
  tittel: string;
  antall_forsoek: number;
  neste_sekunder: number;
}

interface Forsoek {
  utfall: string;
  melding: string | null;
  startet: Date | null;
  avsluttet: Date;
}

describe.skipIf(!TESTBASE_URL)('jobbkjøreren og topicen i Catenda (#741)', () => {
  let o: Oppsett;
  let server: KjorendeServer;
  let board: string;
  let kall_: { boardId: string; topic: NyTopic }[];
  let svar: () => Promise<string>;
  const logg = { info() {}, warn() {}, error() {} };

  const somKjoerer = <T>(setning: string, parametre: Record<string, unknown> = {}) =>
    somJobbkjoerer<T>(o, setning, parametre);
  const jobben = async (sakId: string) =>
    (
      await somKjoerer<Jobb>(
        `SELECT LOWER(CONVERT(nvarchar(36), jobb_id)) AS jobb_id, sak_id, tilstand,
                LOWER(CONVERT(nvarchar(36), catenda_project_id)) AS catenda_project_id,
                LOWER(CONVERT(nvarchar(36), catenda_board_id)) AS catenda_board_id, tittel,
                antall_forsoek, DATEDIFF(second, SYSUTCDATETIME(), neste_forsoek) AS neste_sekunder
           FROM koe.jobb WHERE sak_id = @sak`,
        { sak: sakId }
      )
    ).recordset;
  const forsoekene = async (sakId: string) =>
    (
      await somKjoerer<Forsoek>(
        `SELECT f.utfall, f.melding, f.startet, f.avsluttet
           FROM koe.jobbforsoek f JOIN koe.jobb j ON j.jobb_id = f.jobb_id
          WHERE j.sak_id = @sak ORDER BY f.avsluttet, f.utfall`,
        { sak: sakId }
      )
    ).recordset;
  const topicen = (sakId: string) =>
    transaksjon(o.datalag.kjoeretid.pool, { aktor: o.te.id, prosjekt: o.prosjekt.id }, (foresp) =>
      lesLeveringsmaal(foresp, sakId)
    );
  const kjoer = () =>
    kjoerEnJobb({
      datalag: o.datalag.kjoeretid.pool,
      catenda: {
        async opprettTopic(boardId, topic) {
          kall_.push({ boardId, topic });
          return svar();
        },
      },
      saksadresse: (p, s) => `https://app.example.no/${p}/${s}/kjerne`,
      logg,
    });
  const hent = (leasetid = LEASETID_S) =>
    o.datalag.kjoeretid.pool
      .request()
      .input('leasetid_sekunder', sql.Int, leasetid)
      .execute<{ lease: string; sak_id: string }>('koe_api.hent_jobb');
  const kvitter = (lease: string, topic: string) =>
    o.datalag.kjoeretid.pool
      .request()
      .input('lease', sql.UniqueIdentifier, lease)
      .input('topic_id', sql.NVarChar(100), topic)
      .execute('koe_api.kvitter_topic');
  const sakerMedTittel = async (tittel: string) =>
    (
      await transaksjon(
        o.datalag.kjoeretid.pool,
        { aktor: o.te.id, prosjekt: o.prosjekt.id },
        (foresp) =>
          foresp()
            .input('t', tittel)
            .query<{ n: number }>(
              `SELECT COUNT(*) AS n FROM koe.hendelse
              WHERE event_type = N'sak_opprettet' AND JSON_VALUE(data, '$.sakstittel') = @t`
            )
      )
    ).recordset[0].n;
  const settBoard = (verdi: string | null) =>
    o.datalag.base.pool
      .request()
      .input('p', o.prosjekt.id)
      .input('b', sql.UniqueIdentifier, verdi)
      .query(
        'UPDATE koe.catenda_project_configs SET topic_board_id = @b WHERE internal_project_id = @p'
      );

  beforeAll(async () => {
    o = await lagOppsett();
    server = await startServer(o);
    const rad = await o.datalag.base.pool
      .request()
      .input('p', o.prosjekt.id)
      .query<{ b: string }>(
        `SELECT LOWER(CONVERT(nvarchar(36), topic_board_id)) AS b
           FROM koe.catenda_project_configs WHERE internal_project_id = @p`
      );
    board = rad.recordset[0].b;
  });
  afterAll(async () => {
    await server?.stopp();
    if (o) await rydd(o);
  });
  beforeEach(async () => {
    kall_ = [];
    svar = async () => `topic-${crypto.randomUUID()}`;
    await settBoard(board);
    // Køen er felles for basen; jobbene fra en tidligere test står ikke i veien.
    await somKjoerer(
      `UPDATE koe.jobb SET tilstand = N'parkert', lease = NULL, lease_startet = NULL, lease_utloeper = NULL
        WHERE tilstand = N'venter'`
    );
  });

  it('1: uten topic-board avvises opprettelsen med 409 før saken lagres (KT-U4)', async () => {
    await settBoard(null);
    const foer = (await somKjoerer<{ n: number }>('SELECT COUNT(*) AS n FROM koe.jobb'))
      .recordset[0];
    const svar = await kall(server.url, '/api/kjerne/saker', {
      bruker: o.te,
      prosjektId: o.prosjekt.id,
      kropp: { kommando: { type: 'opprett_sak', sakstittel: 'Uten board' } },
    });
    expect(svar.status).toBe(409);
    expect(svar.kropp.error).toBe('INGEN_TOPIC_BOARD');
    const etter = (await somKjoerer<{ n: number }>('SELECT COUNT(*) AS n FROM koe.jobb'))
      .recordset[0];
    expect(etter.n).toBe(foer.n);
    expect(await sakerMedTittel('Uten board')).toBe(0);
  });

  it('1: med board svarer opprettelsen 201 og legger inn jobben', async () => {
    const svar = await kall(server.url, '/api/kjerne/saker', {
      bruker: o.te,
      prosjektId: o.prosjekt.id,
      kropp: { kommando: { type: 'opprett_sak', sakstittel: 'Med board' } },
    });
    expect(svar.status).toBe(201);
    expect(await jobben(svar.kropp.sak_id as string)).toHaveLength(1);
  });

  it('2: jobben fryser boardet, Catenda-prosjektet og sakstittelen i samme transaksjon (KT-U3, invariant 6)', async () => {
    const sakId = await opprettKjernesak(o);
    expect(await jobben(sakId)).toEqual([
      expect.objectContaining({
        sak_id: sakId,
        tilstand: 'venter',
        catenda_project_id: o.prosjekt.catendaProsjekt,
        catenda_board_id: board,
        tittel: 'Skiva',
        antall_forsoek: 0,
      }),
    ]);
  });

  it('2: rulles saken tilbake, finnes heller ingen jobb', async () => {
    const vurdert = opprettelse({ type: 'opprett_sak', sakstittel: 'Rulles tilbake' }, 'TE');
    if (!vurdert.godtatt) throw new Error(vurdert.avvisning.melding);
    const kontekst = { aktor: o.te.id, prosjekt: o.prosjekt.id, side: 'TE' as const };
    let sakId = '';
    await transaksjon(o.datalag.kjoeretid.pool, kontekst, async (foresp) => {
      const s = await foresp()
        .input('format', sql.Int, vurdert.format)
        .input('data', sql.NVarChar(sql.MAX), JSON.stringify(vurdert.data))
        .output('sak_id', sql.NVarChar(36))
        .output('event_id', sql.NVarChar(36))
        .output('tidsstempel', sql.DateTime2(3))
        .execute('koe_api.opprett_sak');
      sakId = s.output.sak_id as string;
      throw new Error('avbrutt');
    }).catch(() => {});
    expect(sakId).not.toBe('');
    expect(await jobben(sakId)).toEqual([]);
  });

  it('3: kjøreren lager topicen og kvitteringen gir saken topicen (punkt 15 og 16)', async () => {
    const sakId = await opprettKjernesak(o);
    svar = async () => 'topic-skiva';
    expect(await topicen(sakId)).toMatchObject({ topic_id: null, board_id: null });
    expect(await kjoer()).toBe(true);
    expect(kall_).toEqual([
      {
        boardId: board,
        topic: {
          tittel: 'Skiva',
          beskrivelse: `Saken i endringsappen: https://app.example.no/${o.prosjekt.id}/${sakId}/kjerne`,
        },
      },
    ]);
    expect(await topicen(sakId)).toMatchObject({ topic_id: 'topic-skiva', board_id: board });
    expect((await jobben(sakId))[0].tilstand).toBe('utfoert');
    expect(await forsoekene(sakId)).toEqual([
      expect.objectContaining({ utfall: 'utfoert', melding: null }),
    ]);
    expect(await kjoer()).toBe(false);
  });

  it('4: en sikker feil prøves igjen etter 30 s · 2^(n−1), med tak på 1 time', async () => {
    const sakId = await opprettKjernesak(o);
    svar = async () => {
      throw new CatendaUtilgjengelig('Catenda svarte med feil');
    };
    const ventetid: number[] = [];
    for (const antall of [1, 2, 9]) {
      await somKjoerer(
        `UPDATE koe.jobb SET neste_forsoek = DATETRUNC(millisecond, SYSUTCDATETIME()), antall_forsoek = @a - 1 WHERE sak_id = @sak`,
        { sak: sakId, a: String(antall) }
      );
      expect(await kjoer()).toBe(true);
      const [j] = await jobben(sakId);
      expect(j.tilstand).toBe('venter');
      ventetid.push(j.neste_sekunder);
    }
    expect(ventetid.map((s) => Math.round(s / 5) * 5)).toEqual([30, 60, 3600]);
    expect((await forsoekene(sakId)).map((f) => [f.utfall, f.melding])).toEqual(
      Array(3).fill(['feilet', 'Catenda svarte med feil'])
    );
    expect(await kjoer()).toBe(false);
  });

  it('4 og 8: et usikkert utfall parkeres, og driften starter jobben på nytt', async () => {
    const sakId = await opprettKjernesak(o);
    svar = async () => {
      throw new UsikkertUtfall('Catenda svarte ikke');
    };
    expect(await kjoer()).toBe(true);
    expect((await jobben(sakId))[0].tilstand).toBe('parkert');
    expect(await kjoer()).toBe(false);

    const { jobb_id } = (await jobben(sakId))[0];
    await o.datalag.base.pool
      .request()
      .input('jobb_id', sql.UniqueIdentifier, jobb_id)
      .execute('koe_api.start_jobb_paa_nytt');
    expect(
      await avvisning(
        o.datalag.base.pool
          .request()
          .input('jobb_id', sql.UniqueIdentifier, jobb_id)
          .execute('koe_api.start_jobb_paa_nytt')
      )
    ).toBe(IKKE_PARKERT);
    svar = async () => 'topic-paa-nytt';
    expect(await kjoer()).toBe(true);
    expect(await topicen(sakId)).toMatchObject({ topic_id: 'topic-paa-nytt' });
    expect((await forsoekene(sakId)).map((f) => [f.utfall, f.melding])).toEqual([
      ['usikkert', 'Catenda svarte ikke'],
      ['startet_paa_nytt', 'sa'],
      ['utfoert', null],
    ]);
  });

  it('5: en utløpt lease parkeres som usikker, og kvitteringen med den avvises (invariant 7)', async () => {
    const sakId = await opprettKjernesak(o);
    const [{ lease }] = (await hent()).recordset;
    await somKjoerer(
      `UPDATE koe.jobb SET lease_utloeper = DATEADD(second, -1, SYSUTCDATETIME()) WHERE sak_id = @sak`,
      { sak: sakId }
    );
    expect(await avvisning(kvitter(lease, 'for-sent'))).toBe(LEASE_UGYLDIG);
    expect(await avvisning(kvitter(crypto.randomUUID(), 'ukjent'))).toBe(LEASE_UGYLDIG);
    expect((await hent()).recordset).toEqual([]);
    expect((await jobben(sakId))[0].tilstand).toBe('parkert');
    expect(await avvisning(kvitter(lease, 'etter-parkering'))).toBe(LEASE_UGYLDIG);
    expect((await forsoekene(sakId)).map((f) => f.utfall)).toEqual(['usikkert']);
    expect(await topicen(sakId)).toMatchObject({ topic_id: null });
  });

  it('6: en jobb som en annen kjører har låst, hoppes over uten å vente (READPAST, UPDLOCK)', async () => {
    const sakId = await opprettKjernesak(o);
    const annen = o.datalag.base.pool.transaction();
    await annen.begin();
    try {
      await annen
        .request()
        .input('sak', sakId)
        .query(
          `EXECUTE AS USER = 'koe_jobbkjoerer';
           SELECT jobb_id FROM koe.jobb WITH (UPDLOCK, ROWLOCK) WHERE sak_id = @sak;
           REVERT;`
        );
      const start = Date.now();
      expect((await hent()).recordset).toEqual([]);
      expect(Date.now() - start).toBeLessThan(5000);
    } finally {
      await annen.rollback();
    }
    expect((await hent()).recordset).toEqual([expect.objectContaining({ sak_id: sakId })]);
  });

  it.each([
    [
      'boardet er byttet',
      `UPDATE koe.catenda_project_configs SET topic_board_id = NEWID() WHERE internal_project_id = @p`,
    ],
    [
      'koblingen er slått av',
      `UPDATE koe.catenda_project_configs SET is_active = 0 WHERE internal_project_id = @p`,
    ],
  ])(
    '7: %s etter frysingen: jobben parkeres uten kall til Catenda (invariant 6)',
    async (_n, endring) => {
      const sakId = await opprettKjernesak(o);
      await o.datalag.base.pool.request().input('p', o.prosjekt.id).query(endring);
      try {
        expect(await kjoer()).toBe(false);
        expect(kall_).toEqual([]);
        expect((await jobben(sakId))[0].tilstand).toBe('parkert');
        expect((await forsoekene(sakId)).map((f) => f.utfall)).toEqual(['kobling_endret']);
      } finally {
        await o.datalag.base.pool
          .request()
          .input('p', o.prosjekt.id)
          .input('c', sql.UniqueIdentifier, o.prosjekt.catendaProsjekt)
          .query(
            `UPDATE koe.catenda_project_configs SET is_active = 1 WHERE internal_project_id = @p;
           UPDATE koe.app_project_memberships SET active = 1, deactivated_at = NULL WHERE project_id = @p;
           UPDATE koe.app_membership_sync SET catenda_project_id = @c, synced_at = SYSUTCDATETIME() WHERE project_id = @p;`
          );
      }
    }
  );

  it('8 og 9: kjøretiden kan ikke starte en jobb på nytt eller lese eller skrive jobbene direkte', async () => {
    const sakId = await opprettKjernesak(o);
    const [{ jobb_id }] = await jobben(sakId);
    const r = () => o.datalag.kjoeretid.pool.request();
    expect(
      await avvisning(
        r().input('jobb_id', sql.UniqueIdentifier, jobb_id).execute('koe_api.start_jobb_paa_nytt')
      )
    ).toBe(INGEN_RETT);
    for (const [setning, forventet] of [
      ['SELECT * FROM koe.jobb', INGEN_RETT],
      ['SELECT * FROM koe.jobbforsoek', INGEN_RETT],
      ["UPDATE koe.jobb SET tilstand = N'venter'", INGEN_RETT],
      ['SELECT * FROM koe.sak_catenda_topic', INGEN_RETT],
      ["EXECUTE AS USER = 'koe_jobbkjoerer'", KAN_IKKE_BLI],
    ] as const)
      expect({ setning, feil: await avvisning(r().query(setning)) }).toEqual({
        setning,
        feil: forventet,
      });
  });

  it('9: eieren ser ingen jobb uten kjøreveien, og et medlem kan ikke skrive topicen selv', async () => {
    const sakId = await opprettKjernesak(o);
    const uten = await o.datalag.base.pool
      .request()
      .input('sak', sakId)
      .query<{ n: number }>('SELECT COUNT(*) AS n FROM koe.jobb WHERE sak_id = @sak');
    expect(uten.recordset[0].n).toBe(0);
    const feil = await avvisning(
      transaksjon(
        o.datalag.base.pool,
        { aktor: o.te.id, prosjekt: o.prosjekt.id, side: 'TE' },
        (foresp) =>
          foresp()
            .input('sak', sakId)
            .input('p', o.prosjekt.id)
            .query(
              `INSERT koe.sak_catenda_topic (sak_id, prosjekt_id, catenda_board_id, catenda_topic_id)
               VALUES (@sak, @p, N'b', N't')`
            )
      )
    );
    expect(feil).toBe(BLOKKERT);
  });

  it('11: samme topic kan ikke høre til to saker', async () => {
    const [a, b] = [await opprettKjernesak(o), await opprettKjernesak(o)];
    const [l1, l2] = (await Promise.all([hent(), hent()])).map((s) => s.recordset[0].lease);
    await kvitter(l1, 'samme-topic');
    expect(await avvisning(kvitter(l2, 'samme-topic'))).toBe(UNIK);
    const topics = await Promise.all([topicen(a), topicen(b)]);
    expect(topics.map((t) => t.topic_id).sort()).toEqual([null, 'samme-topic']);
  });

  it('12: updated_at på koblingen følger en UPDATE (#618)', async () => {
    const les = async () =>
      (
        await o.datalag.base.pool.request().input('p', o.prosjekt.id).query<{
          t: Date;
        }>('SELECT updated_at AS t FROM koe.catenda_project_configs WHERE internal_project_id = @p')
      ).recordset[0].t;
    await o.datalag.base.pool
      .request()
      .input('p', o.prosjekt.id)
      .query(
        `UPDATE koe.catenda_project_configs SET updated_at = '2000-01-01' WHERE internal_project_id = @p`
      );
    expect((await les()).toISOString()).toBe('2000-01-01T00:00:00.000Z');
    await settBoard(board);
    expect(Date.now() - (await les()).getTime()).toBeLessThan(60_000);
  });

  it('løkka gjør en ny jobb når den vekkes, uten å vente på pollingen', async () => {
    const sakId = await opprettKjernesak(o);
    svar = async () => 'topic-loekka';
    const loekke = startJobbkjoerer(
      {
        datalag: o.datalag.kjoeretid.pool,
        catenda: { opprettTopic: async () => svar() },
        saksadresse: () => 'x',
        logg,
      },
      60_000
    );
    try {
      loekke.vekk();
      for (let i = 0; i < 100 && (await jobben(sakId))[0].tilstand === 'venter'; i++)
        await new Promise((r) => setTimeout(r, 50));
      expect(await topicen(sakId)).toMatchObject({ topic_id: 'topic-loekka' });
    } finally {
      await loekke.stopp();
    }
  });
});
