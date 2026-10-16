/**
 * Kommandoene opprett sak og skriv hendelse (#53, del 3a), som kjøretiden: en
 * innlogging som er medlem av `koe_runtime`, gjennom `transaksjon()` og
 * `server/kommandoer.ts`, i en base bygget fra `database/migrasjoner/`. Kildene er
 * sikkerhetsinvariantene i AGENTS.md (aktørfeltene fra serveren, prosjektgrensen),
 * DL-U3 med svaret 16.10 i #53 (brevet regnes med basens klokke, og basen avviser
 * et annet tidspunkt), DL-U4 (teamet når det er entydig), DL-U6 (saksnummeret er
 * en tilfeldig ID appen lager), LV-U1 (oppdraget med brevet) og arbeidsvalgene for
 * 3a i #53. `data` i brevene er ikke kjernens; basen leser bare formen.
 * Krever `KOE_SQLSERVER_TILKOBLING`.
 */

import { randomBytes, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Journalrad } from '../../kjerne/typer.ts';
import { sql, transaksjon, type Kontekst, type Pool } from '../datalag.ts';
import {
  opprettSak,
  SakFinnesIkke,
  SkrivingAvvist,
  skrivHendelse,
  UgyldigKommando,
  Versjonskonflikt,
  type Skriveutfall,
} from '../kommandoer.ts';
import type { Oppdragsrad } from '../lager.ts';
import { sjekksum } from '../levering.ts';
import { opprettMigrertTestbase } from './sqlserver_migrert.ts';
import { feilnummer, opprettKjoeretid, SQLSERVER_TILKOBLING, type Testbase } from './sqlserver.ts';

const UGYLDIG = 51422;
const UUID_SMAA = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const P1 = 'kommando-p1';
const P2 = 'kommando-p2';
const heks = () => randomBytes(16).toString('hex');
const TE1 = heks();
const BH1 = heks();
const TE_P2 = heks();
const SAK_OPPRETTET = { sakstittel: 'Kommandoene', sakstype: 'standard' };

describe.skipIf(!SQLSERVER_TILKOBLING)('kommandoene i SQL Server', () => {
  let base: Testbase;
  let kjoeretid: { pool: Pool; slett(): Promise<void> };
  const b = { te: '', bh: '', leser: '', p2: '' };
  let te: Kontekst;

  async function catendaBruker(): Promise<string> {
    const svar = await base.pool
      .request()
      .input('subjekt', sql.NVarChar(400), heks())
      .input('epost', sql.NVarChar(320), '')
      .input('navn', sql.NVarChar(400), '')
      .output('bruker', sql.UniqueIdentifier)
      .execute('koe_api.catenda_identitet');
    return String(svar.output.bruker).toLowerCase();
  }

  beforeAll(async () => {
    base = await opprettMigrertTestbase('kommandoer');
    for (const navn of Object.keys(b) as (keyof typeof b)[]) b[navn] = await catendaBruker();
    const medlem = (p: string, u: string, leser = 0) =>
      `(N'${p}', '${u}', N'${heks()}', N'', N'', N'member', ${leser}, 1)`;
    await base.pool.request().batch(`
      INSERT koe.projects (id, name, organisasjon_id, is_active)
      VALUES (N'${P1}', N'P1', N'org', 1), (N'${P2}', N'P2', N'org', 1);
      INSERT koe.app_project_memberships
        (project_id, user_id, catenda_subject, user_email, display_name, role, viewer_override, active)
      VALUES ${[medlem(P1, b.te), medlem(P1, b.bh), medlem(P1, b.leser, 1), medlem(P2, b.p2)].join(', ')};
      INSERT koe.catenda_contract_teams (internal_project_id, team_id, contract_role)
      VALUES (N'${P1}', N'${TE1}', N'TE'), (N'${P1}', N'${BH1}', N'BH'), (N'${P2}', N'${TE_P2}', N'TE');`);
    kjoeretid = await opprettKjoeretid(base);
    te = { aktor: b.te, prosjekt: P1, side: 'TE', team: TE1 };
  }, 240_000);
  afterAll(async () => {
    await kjoeretid?.slett();
    await base?.slett();
  }, 60_000);

  const nySak = (k: Kontekst = te) =>
    opprettSak(kjoeretid.pool, k, { format: 1, data: SAK_OPPRETTET });

  /** Basens klokke, lest av eieren. */
  async function klokka(): Promise<number> {
    const svar = await base.pool
      .request()
      .query<{ naa: Date }>('SELECT CAST(SYSUTCDATETIME() AS datetime2(3)) AS naa');
    return svar.recordset[0].naa.getTime();
  }

  /** Radene i saken, lest av eieren i konteksten. */
  function lagret(sakId: string, k: Kontekst = te) {
    return transaksjon(base.pool, k, async (f) => {
      const r = () => f().input('sak_id', sql.NVarChar(36), sakId);
      const sak = await r().query(
        'SELECT sak_id, prosjekt_id, sakstype, created_by FROM koe.sak_metadata WHERE sak_id = @sak_id'
      );
      const hendelser = await r().query(
        `SELECT event_id, event_type, versjon, tidsstempel, LOWER(CAST(aktor_id AS nvarchar(36))) AS aktor_id,
                aktor_rolle, aktor_team_id, data FROM koe.hendelse WHERE sak_id = @sak_id ORDER BY versjon`
      );
      const oppdrag = await r().query(
        'SELECT event_id, dokumentnoekkel, innhold, innhold_sha256 FROM koe.leveringsoppdrag WHERE sak_id = @sak_id'
      );
      return { sak: sak.recordset, hendelser: hendelser.recordset, oppdrag: oppdrag.recordset };
    });
  }

  /** Et brev som neste versjon, med det basen stempler fra konteksten og klokka. */
  function brev(
    g: { journal: Journalrad[]; tidspunkt: Date },
    k: Kontekst = te,
    endring: Partial<Journalrad> = {}
  ): Journalrad {
    const forrige = g.journal.at(-1)!;
    return {
      event_id: randomUUID(),
      sak_id: forrige.sak_id,
      event_type: 'dokument_registrert',
      versjon: forrige.versjon + 1,
      tidsstempel: g.tidspunkt.toISOString(),
      aktor_id: k.aktor,
      aktor_rolle: k.side!,
      aktor_team_id: k.team ?? null,
      refererer_til_event_id: null,
      format: 1,
      data: { prove: 'brev' },
      ...endring,
    };
  }

  function oppdragFor(rad: Journalrad): Oppdragsrad {
    const innhold = { mottaker: 'BH', event_id: rad.event_id };
    return {
      id: randomUUID(),
      event_id: rad.event_id,
      dokumentnoekkel: `dok-${rad.event_id}`,
      innhold,
      innhold_sha256: sjekksum(innhold),
    };
  }

  const medOppdrag =
    (k: Kontekst = te, endring: Partial<Journalrad> = {}) =>
    (g: { journal: Journalrad[]; tidspunkt: Date }): Skriveutfall<never> => {
      const rad = brev(g, k, endring);
      return { skriv: true, rad, oppdrag: oppdragFor(rad) };
    };

  describe('opprett sak', () => {
    it('kontrollsak: saken og sak_opprettet som versjon 1, med aktøren, siden, teamet og basens klokke', async () => {
      const foer = await klokka();
      const rad = await nySak();
      const etter = await klokka();
      expect(rad.sak_id).toMatch(UUID_SMAA);
      expect(rad.event_id).toMatch(UUID_SMAA);
      const tid = Date.parse(rad.tidsstempel);
      expect(tid).toBeGreaterThanOrEqual(foer);
      expect(tid).toBeLessThanOrEqual(etter);
      const { sak, hendelser } = await lagret(rad.sak_id);
      expect(sak).toEqual([
        {
          sak_id: rad.sak_id,
          prosjekt_id: P1,
          sakstype: 'standard',
          created_by: b.te.toUpperCase(),
        },
      ]);
      expect(hendelser).toHaveLength(1);
      expect(hendelser[0]).toMatchObject({
        event_id: rad.event_id,
        event_type: 'sak_opprettet',
        versjon: 1,
        aktor_id: b.te,
        aktor_rolle: 'TE',
        aktor_team_id: TE1,
      });
      expect(hendelser[0].tidsstempel.toISOString()).toBe(rad.tidsstempel);
      expect(JSON.parse(hendelser[0].data)).toEqual(SAK_OPPRETTET);
    });

    it('saksnummeret er nytt for hver sak (DL-U6)', async () => {
      const [a, c] = [await nySak(), await nySak()];
      expect(a.sak_id).not.toBe(c.sak_id);
    });

    it('uten team i konteksten står saken uten team (DL-U4)', async () => {
      const rad = await nySak({ ...te, team: undefined });
      expect(rad.aktor_team_id).toBeNull();
    });

    it.each<[string, () => Kontekst]>([
      ['en leser', () => ({ aktor: b.leser, prosjekt: P1, side: 'TE', team: TE1 })],
      ['et prosjekt aktøren ikke er medlem av', () => ({ ...te, prosjekt: P2, team: TE_P2 })],
      ['et team på motpartens side', () => ({ ...te, team: BH1 })],
      ['uten side', () => ({ ...te, side: undefined })],
    ])('avvises for %s', async (_, k) => {
      await expect(nySak(k())).rejects.toBeInstanceOf(SkrivingAvvist);
    });

    it('avvises uten sakstype i data', async () => {
      await expect(
        opprettSak(kjoeretid.pool, te, { format: 1, data: { sakstittel: 'x' } })
      ).rejects.toBeInstanceOf(UgyldigKommando);
    });
  });

  describe('skriv hendelse', () => {
    it('kontrollsak: brevet og oppdraget som versjon 2, med basens klokke for skrivingen', async () => {
      const sak = await nySak();
      const foer = await klokka();
      let sett: Date | undefined;
      const utfall = await skrivHendelse(kjoeretid.pool, te, sak.sak_id, 1, (g) => {
        sett = g.tidspunkt;
        expect(g.journal.map((r) => r.event_id)).toEqual([sak.event_id]);
        return medOppdrag()(g);
      });
      const etter = await klokka();
      expect(sett!.getTime()).toBeGreaterThanOrEqual(foer);
      expect(sett!.getTime()).toBeLessThanOrEqual(etter);
      if (!utfall.skriv) throw new Error('Brevet ble ikke skrevet.');
      const { hendelser, oppdrag } = await lagret(sak.sak_id);
      expect(hendelser).toHaveLength(2);
      expect(hendelser[1]).toMatchObject({
        event_id: utfall.rad.event_id,
        event_type: 'dokument_registrert',
        versjon: 2,
        aktor_id: b.te,
        aktor_rolle: 'TE',
        aktor_team_id: TE1,
      });
      expect(hendelser[1].tidsstempel.getTime()).toBe(sett!.getTime());
      expect(oppdrag).toEqual([
        {
          event_id: utfall.rad.event_id,
          dokumentnoekkel: utfall.oppdrag!.dokumentnoekkel,
          innhold: JSON.stringify(utfall.oppdrag!.innhold),
          innhold_sha256: utfall.oppdrag!.innhold_sha256,
        },
      ]);
    });

    it('motparten skriver med sitt team, og uten team når konteksten er uten', async () => {
      const sak = await nySak();
      const bh: Kontekst = { aktor: b.bh, prosjekt: P1, side: 'BH', team: BH1 };
      await skrivHendelse(kjoeretid.pool, bh, sak.sak_id, 1, medOppdrag(bh));
      const utenTeam = { ...te, team: undefined };
      await skrivHendelse(kjoeretid.pool, utenTeam, sak.sak_id, 2, medOppdrag(utenTeam));
      const { hendelser } = await lagret(sak.sak_id);
      expect(hendelser.map((h) => [h.aktor_rolle, h.aktor_team_id])).toEqual([
        ['TE', TE1],
        ['BH', BH1],
        ['TE', null],
      ]);
    });

    it('en annen versjon enn journalens gir Versjonskonflikt, og ingenting skrives', async () => {
      const sak = await nySak();
      let kalt = false;
      const feil = await skrivHendelse(kjoeretid.pool, te, sak.sak_id, 2, (g) => {
        kalt = true;
        return medOppdrag()(g);
      }).catch((e: unknown) => e);
      expect(feil).toBeInstanceOf(Versjonskonflikt);
      expect(feil).toMatchObject({ forventet: 2, faktisk: 1 });
      expect(kalt).toBe(false);
      expect((await lagret(sak.sak_id)).hendelser).toHaveLength(1);
    });

    it('en sak i et annet prosjekt og en ukjent sak gir SakFinnesIkke', async () => {
      const p2 = await nySak({ aktor: b.p2, prosjekt: P2, side: 'TE', team: TE_P2 });
      for (const sakId of [p2.sak_id, randomUUID()])
        await expect(
          skrivHendelse(kjoeretid.pool, te, sakId, 1, medOppdrag())
        ).rejects.toBeInstanceOf(SakFinnesIkke);
      const k2: Kontekst = { aktor: b.p2, prosjekt: P2, side: 'TE', team: TE_P2 };
      expect((await lagret(p2.sak_id, k2)).hendelser).toHaveLength(1);
    });

    it('en leser avvises av radsikkerheten', async () => {
      const sak = await nySak();
      const leser: Kontekst = { aktor: b.leser, prosjekt: P1, side: 'TE', team: TE1 };
      await expect(
        skrivHendelse(kjoeretid.pool, leser, sak.sak_id, 1, medOppdrag(leser))
      ).rejects.toBeInstanceOf(SkrivingAvvist);
    });

    it.each<[string, (tidspunkt: Date) => Partial<Journalrad>]>([
      ['en annen aktør', () => ({ aktor_id: randomUUID() })],
      ['en annen side', () => ({ aktor_rolle: 'BH' })],
      ['et annet team', () => ({ aktor_team_id: BH1 })],
      ['et annet tidspunkt', (t) => ({ tidsstempel: new Date(t.getTime() + 1).toISOString() })],
    ])('lageret skriver ikke en rad med %s enn basen stempler', async (_, endring) => {
      const sak = await nySak();
      const lag = (g: { journal: Journalrad[]; tidspunkt: Date }) =>
        medOppdrag(te, endring(g.tidspunkt))(g);
      await expect(skrivHendelse(kjoeretid.pool, te, sak.sak_id, 1, lag)).rejects.toThrow(
        /skiller seg fra det basen stempler/
      );
      expect((await lagret(sak.sak_id)).hendelser).toHaveLength(1);
    });

    it('en avvisning fra lag skriver ingenting', async () => {
      const sak = await nySak();
      const utfall = await skrivHendelse(kjoeretid.pool, te, sak.sak_id, 1, () => ({
        skriv: false,
        avvisning: 'nei',
      }));
      expect(utfall).toEqual({ skriv: false, avvisning: 'nei' });
      expect((await lagret(sak.sak_id)).hendelser).toHaveLength(1);
    });
  });

  describe('basen avviser det lageret ikke skal kunne sende (koe_api.skriv_hendelse)', () => {
    /** Kaller prosedyren direkte som kjøretiden; `tid` avgjør tidspunktet og nøkkelen. */
    async function direkte(
      sakId: string,
      {
        tid = 'basens' as 'basens' | 'senere' | 'uten' | 'forfalsket',
        eventType = 'dokument_registrert',
        oppdrag = true,
        forventet = 1,
      } = {}
    ): Promise<{ skriving: string | null }> {
      return transaksjon(kjoeretid.pool, te, async (f) => {
        let tidspunkt: Date;
        if (tid === 'uten') tidspunkt = new Date(await klokka());
        else if (tid === 'forfalsket') {
          tidspunkt = new Date((await klokka()) - 3_600_000);
          await f()
            .input('t', sql.DateTime2(3), tidspunkt)
            .batch(`EXEC sp_set_session_context N'koe_tidspunkt', @t, @read_only = 1;`);
        } else {
          const svar = await f()
            .output('tidspunkt', sql.DateTime2(3))
            .execute('koe_api.skrivetidspunkt');
          tidspunkt = svar.output.tidspunkt as Date;
          if (tid === 'senere') tidspunkt = new Date(tidspunkt.getTime() + 1);
        }
        const eventId = randomUUID();
        const innhold = { event_id: eventId };
        await f()
          .input('sak_id', sql.NVarChar(36), sakId)
          .input('forventet_versjon', sql.Int, forventet)
          .input('event_id', sql.NVarChar(36), eventId)
          .input('event_type', sql.NVarChar(100), eventType)
          .input('tidsstempel', sql.DateTime2(3), tidspunkt)
          .input('format', sql.Int, 1)
          .input('data', sql.NVarChar(sql.MAX), '{}')
          .input('oppdrag_id', sql.UniqueIdentifier, oppdrag ? randomUUID() : null)
          .input('dokumentnoekkel', sql.NVarChar(100), oppdrag ? `dok-${eventId}` : null)
          .input('oppdrag', sql.NVarChar(sql.MAX), oppdrag ? JSON.stringify(innhold) : null)
          .input('oppdrag_sha256', sql.NVarChar(64), oppdrag ? sjekksum(innhold) : null)
          .execute('koe_api.skriv_hendelse');
        const k = await f().query<{ skriving: string | null }>(
          "SELECT CAST(SESSION_CONTEXT(N'koe_skriving') AS nvarchar(36)) AS skriving"
        );
        return k.recordset[0];
      });
    }

    const avvisning = (p: Promise<unknown>) => p.then(() => undefined, feilnummer);

    it('kontrollsak: med basens tidspunkt og oppdraget lagres brevet, og koe_skriving er tom etterpå', async () => {
      const sak = await nySak();
      expect(await direkte(sak.sak_id)).toEqual({ skriving: null });
      expect((await lagret(sak.sak_id)).hendelser).toHaveLength(2);
    });

    it('skrivetidspunkt avvises utenfor en transaksjon med konteksten (51000)', async () => {
      const feil = await avvisning(
        kjoeretid.pool
          .request()
          .output('tidspunkt', sql.DateTime2(3))
          .execute('koe_api.skrivetidspunkt')
      );
      expect(feil).toBe(51000);
    });

    it('avviser en annen versjon enn journalens (51409), og ingenting skrives', async () => {
      const sak = await nySak();
      expect(await avvisning(direkte(sak.sak_id, { forventet: 2 }))).toBe(51409);
      expect((await lagret(sak.sak_id)).hendelser).toHaveLength(1);
    });

    it.each<[string, Parameters<typeof direkte>[1]]>([
      ['uten tidspunktet fra skrivetidspunkt', { tid: 'uten' }],
      ['et tidspunkt ett millisekund etter basens', { tid: 'senere' }],
      ['et tidspunkt kjøretiden har satt i nøkkelen selv, en time tilbake', { tid: 'forfalsket' }],
      ['dokument_registrert uten oppdrag', { oppdrag: false }],
      ['en annen hendelsestype med oppdrag', { eventType: 'annen' }],
      ['sak_opprettet', { eventType: 'sak_opprettet', oppdrag: false }],
    ])('avviser %s (51422), og ingenting skrives', async (_, valg) => {
      const sak = await nySak();
      expect(await avvisning(direkte(sak.sak_id, valg))).toBe(UGYLDIG);
      expect((await lagret(sak.sak_id)).hendelser).toHaveLength(1);
    });
  });
});
