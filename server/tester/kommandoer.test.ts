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
import { sql, transaksjon, UgyldigKontekst, type Kontekst, type Pool } from '../datalag.ts';
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
import {
  avvisning,
  avvisningMedMelding,
  catendaBruker,
  opprettMigrertTestbase,
} from './sqlserver_migrert.ts';
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
  /** Kjøretiden med én forbindelse, så to transaksjoner etter hverandre har samme økt. */
  let enForbindelse: { pool: Pool; slett(): Promise<void> };
  const b = { te: '', bh: '', leser: '', p2: '' };
  let te: Kontekst;

  beforeAll(async () => {
    base = await opprettMigrertTestbase('kommandoer');
    for (const navn of Object.keys(b) as (keyof typeof b)[])
      b[navn] = await catendaBruker(base.pool);
    const medlem = (p: string, u: string, leser = 0) =>
      `(N'${p}', '${u}', N'${heks()}', N'', N'', N'member', ${leser}, 1)`;
    await base.pool.request().batch(`
      INSERT koe.projects (id, name, organisasjon_id, is_active)
      VALUES (N'${P1}', N'P1', N'org', 1), (N'${P2}', N'P2', N'org', 1);
      INSERT koe.app_project_memberships
        (project_id, user_id, catenda_subject, user_email, display_name, role, viewer_override, active)
      VALUES ${[medlem(P1, b.te), medlem(P1, b.bh), medlem(P1, b.leser, 1), medlem(P2, b.p2)].join(', ')};
      INSERT koe.catenda_contract_teams (internal_project_id, team_id, contract_role)
      VALUES (N'${P1}', N'${TE1}', N'TE'), (N'${P1}', N'${BH1}', N'BH'), (N'${P2}', N'${TE_P2}', N'TE');
      INSERT koe.catenda_project_configs (internal_project_id, catenda_project_id, library_id, is_active)
      VALUES (N'${P1}', NEWID(), NEWID(), 1), (N'${P2}', NEWID(), NEWID(), 1);`);
    kjoeretid = await opprettKjoeretid(base);
    enForbindelse = await opprettKjoeretid(base, { maks: 1 });
    te = { aktor: b.te, prosjekt: P1, side: 'TE', team: TE1 };
  }, 240_000);
  afterAll(async () => {
    await kjoeretid?.slett();
    await enForbindelse?.slett();
    await base?.slett();
  }, 60_000);

  const nySak = (k: Kontekst = te) =>
    opprettSak(kjoeretid.pool, k, { format: 1, data: SAK_OPPRETTET });

  /** Basens klokke, lest av eieren. */
  async function klokka(): Promise<number> {
    const svar = await base.pool
      .request()
      .query<{ naa: Date }>('SELECT DATETRUNC(millisecond, SYSUTCDATETIME()) AS naa');
    return svar.recordset[0].naa.getTime();
  }

  /** Om `koe.skrivetidspunkt` har en rad med tidspunktet, lest av eieren. */
  async function tidspunktStaar(t: Date): Promise<boolean> {
    const svar = await base.pool
      .request()
      .input('t', sql.DateTime2(3), t)
      .query<{ n: number }>('SELECT COUNT(*) AS n FROM koe.skrivetidspunkt WHERE tidspunkt = @t');
    return svar.recordset[0].n > 0;
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
      // Bare TE oppretter, også i skrivelaget (OV-U1, #696); basen godtar BH.
      ['BH med eget team', () => ({ aktor: b.bh, prosjekt: P1, side: 'BH', team: BH1 })],
    ])('avvises for %s', async (_, k) => {
      await expect(nySak(k())).rejects.toBeInstanceOf(SkrivingAvvist);
    });

    it.each<[string, Record<string, unknown>, RegExp]>([
      ['uten sakstype i data', { sakstittel: 'x' }, /Sakstypen mangler/],
      [
        'med en sakstype med mellomrom til slutt',
        { sakstype: 'standard ' },
        /andre tegn enn a–z og _/,
      ],
      [
        'med en sakstype med tabulator til slutt',
        { sakstype: 'standard\t' },
        /andre tegn enn a–z og _/,
      ],
      ['med en sakstype med NBSP', { sakstype: 'stan\u00a0dard' }, /andre tegn enn a–z og _/],
      ['med en sakstype med store bokstaver', { sakstype: 'Standard' }, /andre tegn enn a–z og _/],
      ['med en tom sakstype', { sakstype: '' }, /Sakstypen er tom/],
      ['med en sakstype av bare mellomrom', { sakstype: '   ' }, /andre tegn enn a–z og _/],
      ['med en sakstype over 40 tegn', { sakstype: 'x'.repeat(41) }, /over 40 tegn/],
      ['med en sakstype over 4000 tegn', { sakstype: 'x'.repeat(4001) }, /over 40 tegn/],
      ['med en sakstype som er et tall (#631)', { sakstype: 123 }, /ikke en tekst/],
      ['med en sakstype som er et objekt (#631)', { sakstype: { a: 'standard' } }, /ikke en tekst/],
      ['med en sakstype som er en liste (#631)', { sakstype: ['standard'] }, /ikke en tekst/],
      ['med en sakstype som er null (#631)', { sakstype: null }, /ikke en tekst/],
    ])(
      'avvises %s med UgyldigKommando og en melding som sier hva (#596, #607)',
      async (_, data, melding) => {
        const feil = await opprettSak(kjoeretid.pool, te, { format: 1, data }).catch(
          (e: unknown) => e
        );
        expect(feil).toBeInstanceOf(UgyldigKommando);
        expect((feil as Error).message).toMatch(melding);
        expect(feilnummer((feil as Error).cause)).toBe(UGYLDIG);
      }
    );

    it('avviser en sakstype som står to ganger i data (51422) (#631)', async () => {
      const svar = await avvisningMedMelding(
        transaksjon(kjoeretid.pool, te, (f) =>
          f()
            .input('format', sql.Int, 1)
            .input('data', sql.NVarChar(sql.MAX), '{"sakstype":"standard","sakstype":"forsering"}')
            .output('sak_id', sql.NVarChar(36))
            .output('event_id', sql.NVarChar(36))
            .output('tidsstempel', sql.DateTime2(3))
            .execute('koe_api.opprett_sak')
        )
      );
      expect(svar).toEqual({ nummer: UGYLDIG, melding: 'Sakstypen står flere ganger i data' });
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

    it.each<[string, (sakId: string) => string]>([
      ['med mellomrom til slutt', (id) => `${id} `],
      ['med ett tegn for mye', (id) => `${id}0`],
      ['med store bokstaver', (id) => id.toUpperCase()],
    ])('en saks-ID %s gir SakFinnesIkke, og ingenting skrives (#566)', async (_, form) => {
      const sak = await nySak();
      await expect(
        skrivHendelse(kjoeretid.pool, te, form(sak.sak_id), 1, medOppdrag())
      ).rejects.toBeInstanceOf(SakFinnesIkke);
      expect((await lagret(sak.sak_id)).hendelser).toHaveLength(1);
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

    it('verken en skriving eller en avvisning fra lag etterlater tidspunktet', async () => {
      const sak = await nySak();
      const gitt: Date[] = [];
      await skrivHendelse(kjoeretid.pool, te, sak.sak_id, 1, (g) => {
        gitt.push(g.tidspunkt);
        return medOppdrag(te)(g);
      });
      await skrivHendelse(kjoeretid.pool, te, sak.sak_id, 2, (g) => {
        gitt.push(g.tidspunkt);
        return { skriv: false, avvisning: 0 };
      });
      expect(gitt).toHaveLength(2);
      for (const t of gitt) expect(await tidspunktStaar(t), t.toISOString()).toBe(false);
    });

    it('en skriving venter ikke på en annen åpen transaksjon som har ført sitt tidspunkt', async () => {
      const sak = await nySak();
      const utfall = await transaksjon(enForbindelse.pool, te, async (f) => {
        await f().output('tidspunkt', sql.DateTime2(3)).execute('koe_api.skrivetidspunkt');
        return Promise.race([
          skrivHendelse(kjoeretid.pool, te, sak.sak_id, 1, medOppdrag(te)).then(() => 'skrevet'),
          new Promise((ok) => setTimeout(() => ok('ventet'), 10_000)),
        ]);
      });
      expect(utfall).toBe('skrevet');
    }, 30_000);

    it.each<[string, (rad: Journalrad, o: Oppdragsrad) => [Journalrad, Oppdragsrad], RegExp]>([
      [
        'en event_id på 37 tegn',
        (rad, o) => [{ ...rad, event_id: `${rad.event_id}0` }, o],
        /event_id/,
      ],
      [
        'en event_id med store bokstaver',
        (rad, o) => [{ ...rad, event_id: rad.event_id.toUpperCase() }, o],
        /event_id/,
      ],
      [
        'en hendelsestype over 100 tegn',
        (rad, o) => [{ ...rad, event_type: 'x'.repeat(101) }, o],
        /over 100 tegn/,
      ],
      [
        'en hendelsestype med mellomrom til slutt',
        (rad, o) => [{ ...rad, event_type: 'dokument_registrert ' }, o],
        /andre tegn enn a–z og _/,
      ],
      [
        'en hendelsestype med tabulator til slutt (#629)',
        (rad, o) => [{ ...rad, event_type: 'dokument_registrert\t' }, o],
        /andre tegn enn a–z og _/,
      ],
      [
        'en dokumentnøkkel over 100 tegn',
        (rad, o) => [rad, { ...o, dokumentnoekkel: 'd'.repeat(101) }],
        /over 100 tegn/,
      ],
      [
        'en sum med store bokstaver',
        (rad, o) => [rad, { ...o, innhold_sha256: o.innhold_sha256.toUpperCase() }],
        /Summen/,
      ],
      [
        'en oppdrags-ID som ikke er en UUID (#629)',
        (rad, o) => [rad, { ...o, id: 'oppdrag-1' }],
        /Oppdragets ID er ikke en UUID/,
      ],
      ['format 0 (#629)', (rad, o) => [{ ...rad, format: 0 }, o], /Formatet/],
    ])(
      '%s gir UgyldigKommando med basens 51422 i cause, og ingenting skrives (#629)',
      async (_, endre, melding) => {
        const sak = await nySak();
        const lag = (g: { journal: Journalrad[]; tidspunkt: Date }): Skriveutfall<never> => {
          const rad = brev(g);
          const [r, o] = endre(rad, oppdragFor(rad));
          return { skriv: true, rad: r, oppdrag: { ...o, event_id: r.event_id } };
        };
        const feil = await skrivHendelse(kjoeretid.pool, te, sak.sak_id, 1, lag).catch(
          (e: unknown) => e
        );
        expect(feil).toBeInstanceOf(UgyldigKommando);
        expect((feil as Error).message).toMatch(melding);
        expect(feilnummer((feil as Error).cause)).toBe(UGYLDIG);
        expect((await lagret(sak.sak_id)).hendelser).toHaveLength(1);
      }
    );

    it('null som kontekst gir UgyldigKontekst, ikke TypeError (#596)', async () => {
      const sak = await nySak();
      await expect(
        skrivHendelse(kjoeretid.pool, null as unknown as Kontekst, sak.sak_id, 1, medOppdrag())
      ).rejects.toBeInstanceOf(UgyldigKontekst);
    });

    it('en kontekst uten kontraktsside gir SkrivingAvvist', async () => {
      const sak = await nySak();
      const utenSide: Kontekst = { aktor: b.te, prosjekt: P1, team: TE1 };
      await expect(
        skrivHendelse(kjoeretid.pool, utenSide, sak.sak_id, 1, medOppdrag(te))
      ).rejects.toBeInstanceOf(SkrivingAvvist);
    });
  });

  describe('basen avviser det lageret ikke skal kunne sende (koe_api.skriv_hendelse)', () => {
    /** Kaller prosedyren direkte som kjøretiden; `tid` avgjør tidspunktet og nøkkelen. */
    async function direkte(
      sakId: string,
      {
        tid = 'basens' as
          | 'basens'
          | 'senere'
          | 'uten'
          | 'egen_noekkel'
          | 'annen_transaksjon'
          | 'etter_omstart',
        eventType = 'dokument_registrert',
        oppdrag = true,
        forventet = 1,
        felt = {} as Partial<
          Record<
            'event_id' | 'dokumentnoekkel' | 'oppdrag_sha256' | 'oppdrag' | 'data' | 'oppdrag_id',
            string
          >
        > & { format?: number },
      } = {}
    ): Promise<{ skriving: string | null }> {
      const oekt = async (f: () => sql.Request) =>
        (await f().query<{ spid: number }>('SELECT @@SPID AS spid')).recordset[0].spid;
      const pool = tid === 'annen_transaksjon' ? enForbindelse.pool : kjoeretid.pool;
      const annen =
        tid === 'annen_transaksjon'
          ? await transaksjon(pool, te, async (f) => {
              const svar = await f()
                .output('tidspunkt', sql.DateTime2(3))
                .execute('koe_api.skrivetidspunkt');
              return { tidspunkt: svar.output.tidspunkt as Date, spid: await oekt(f) };
            })
          : undefined;
      return transaksjon(pool, te, async (f) => {
        let tidspunkt: Date;
        if (annen) {
          // Samme økt, så bare transaksjons-ID-en skiller dem.
          expect(await oekt(f)).toBe(annen.spid);
          tidspunkt = annen.tidspunkt;
        } else if (tid === 'uten') tidspunkt = new Date(await klokka());
        else if (tid === 'etter_omstart') {
          // Som en rad en tidligere økt etterlot før en omstart: samme transaksjons-ID
          // og økt-ID, men innlogget før denne økta.
          const denne = await f().query<{ tx: string; spid: number; inn: Date }>(
            `SELECT CAST(CURRENT_TRANSACTION_ID() AS nvarchar(20)) AS tx, @@SPID AS spid,
                    (SELECT CAST(login_time AS datetime2(3)) FROM sys.dm_exec_sessions WHERE session_id = @@SPID) AS inn`
          );
          const { tx, spid, inn } = denne.recordset[0];
          tidspunkt = new Date((await klokka()) - 3_600_000);
          await base.pool
            .request()
            .input('tx', sql.BigInt, tx)
            .input('spid', sql.SmallInt, spid)
            .input('inn', sql.DateTime2(3), new Date(inn.getTime() - 60_000))
            .input('t', sql.DateTime2(3), tidspunkt)
            .query(
              'INSERT koe.skrivetidspunkt (oekt, transaksjon, innlogget, tidspunkt) VALUES (@spid, @tx, @inn, @t)'
            );
        } else if (tid === 'egen_noekkel') {
          tidspunkt = new Date(await klokka());
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
        const eventId = felt.event_id ?? randomUUID();
        const innhold = { event_id: eventId };
        await f()
          .input('sak_id', sql.NVarChar(4000), sakId)
          .input('forventet_versjon', sql.Int, forventet)
          .input('event_id', sql.NVarChar(4000), eventId)
          .input('event_type', sql.NVarChar(4000), eventType)
          .input('tidsstempel', sql.DateTime2(3), tidspunkt)
          .input('format', sql.Int, felt.format ?? 1)
          .input('data', sql.NVarChar(sql.MAX), felt.data ?? '{}')
          .input(
            'oppdrag_id',
            sql.NVarChar(4000),
            oppdrag ? (felt.oppdrag_id ?? randomUUID()) : null
          )
          .input(
            'dokumentnoekkel',
            sql.NVarChar(4000),
            oppdrag ? (felt.dokumentnoekkel ?? `dok-${eventId}`) : null
          )
          .input(
            'oppdrag',
            sql.NVarChar(sql.MAX),
            oppdrag ? (felt.oppdrag ?? JSON.stringify(innhold)) : null
          )
          .input(
            'oppdrag_sha256',
            sql.NVarChar(4000),
            oppdrag ? (felt.oppdrag_sha256 ?? sjekksum(innhold)) : null
          )
          .execute('koe_api.skriv_hendelse');
        const k = await f().query<{ skriving: string | null }>(
          "SELECT CAST(SESSION_CONTEXT(N'koe_skriving') AS nvarchar(36)) AS skriving"
        );
        return k.recordset[0];
      });
    }

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

    it('en rad som ble liggende, slettes når samme økt fører et nytt tidspunkt', async () => {
      const foerOgCommit = () =>
        transaksjon(enForbindelse.pool, te, async (f) => {
          await f().output('tidspunkt', sql.DateTime2(3)).execute('koe_api.skrivetidspunkt');
          const tx = await f().query<{ tx: string }>(
            'SELECT CAST(CURRENT_TRANSACTION_ID() AS nvarchar(20)) AS tx'
          );
          return tx.recordset[0].tx;
        });
      // Raden finnes på transaksjonen, ikke tidspunktet: to føringer kan få samme millisekund (#676).
      const raden = async (tx: string) =>
        (
          await base.pool.request().input('tx', sql.NVarChar(20), tx).query<{
            n: number;
          }>('SELECT COUNT(*) AS n FROM koe.skrivetidspunkt WHERE transaksjon = CAST(@tx AS bigint)')
        ).recordset[0].n > 0;
      const foerste = await foerOgCommit();
      expect(await raden(foerste)).toBe(true);
      const andre = await foerOgCommit();
      expect(await raden(foerste)).toBe(false);
      expect(await raden(andre)).toBe(true);
    });

    it('kjøretiden kan ikke føre eller endre tidspunktet selv', async () => {
      for (const setning of [
        'INSERT koe.skrivetidspunkt (transaksjon, oekt, innlogget, tidspunkt) VALUES (CURRENT_TRANSACTION_ID(), @@SPID, SYSUTCDATETIME(), SYSUTCDATETIME())',
        'UPDATE koe.skrivetidspunkt SET tidspunkt = SYSUTCDATETIME()',
        'DELETE koe.skrivetidspunkt',
      ]) {
        const feil = await avvisning(transaksjon(kjoeretid.pool, te, (f) => f().batch(setning)));
        expect(feil, setning).toBe(229);
      }
    });

    it('avviser en annen versjon enn journalens (51409) med journalens versjon i meldingen, og ingenting skrives', async () => {
      const sak = await nySak();
      // Formen er kontrakten `oversett` i server/kommandoer.ts leser (20261016230000_skranker.sql).
      expect(await avvisningMedMelding(direkte(sak.sak_id, { forventet: 2 }))).toEqual({
        nummer: 51409,
        melding: 'Versjonskonflikt: journalen har versjon 1',
      });
      expect((await lagret(sak.sak_id)).hendelser).toHaveLength(1);
    });

    it.each<[string, (id: string) => string]>([
      ['med mellomrom til slutt', (id) => `${id} `],
      ['med ett tegn for mye', (id) => `${id}0`],
      ['med store bokstaver', (id) => id.toUpperCase()],
    ])(
      'avviser en saks-ID %s som en ukjent sak (51403), og ingenting skrives (#605)',
      async (_, form) => {
        const sak = await nySak();
        expect(await avvisning(direkte(form(sak.sak_id)))).toBe(51403);
        expect((await lagret(sak.sak_id)).hendelser).toHaveLength(1);
      }
    );

    it.each<[string, Parameters<typeof direkte>[1], RegExp]>([
      ['en event_id på 37 tegn', { felt: { event_id: `${randomUUID()}0` } }, /event_id/],
      [
        'en event_id med store bokstaver',
        { felt: { event_id: randomUUID().toUpperCase() } },
        /event_id/,
      ],
      ['en event_id som ikke er en UUID', { felt: { event_id: 'x'.repeat(36) } }, /event_id/],
      [
        'en hendelsestype over 100 tegn',
        { eventType: 'x'.repeat(101), oppdrag: false },
        /over 100 tegn/,
      ],
      [
        'en hendelsestype med mellomrom til slutt',
        { eventType: 'annen ', oppdrag: false },
        /andre tegn enn a–z og _/,
      ],
      [
        'en hendelsestype med tabulator til slutt (#609)',
        { eventType: 'sak_opprettet\t', oppdrag: false },
        /andre tegn enn a–z og _/,
      ],
      [
        'en hendelsestype med U+3000 (#609)',
        { eventType: 'annen\u3000', oppdrag: false },
        /andre tegn enn a–z og _/,
      ],
      ['en tom hendelsestype', { eventType: '', oppdrag: false }, /Hendelsestypen mangler/],
      [
        'en hendelsestype av bare mellomrom',
        { eventType: '  ', oppdrag: false },
        /andre tegn enn a–z og _/,
      ],
      ['format 0', { felt: { format: 0 } }, /Formatet/],
      ['en tom dokumentnøkkel', { felt: { dokumentnoekkel: '' } }, /Dokumentnøkkelen er tom/],
      [
        'en dokumentnøkkel av bare mellomrom',
        { felt: { dokumentnoekkel: ' ' } },
        /andre tegn enn a–z, 0–9, _ og -/,
      ],
      ['data som ikke er et JSON-objekt', { felt: { data: '[]' } }, /data/],
      [
        'en dokumentnøkkel over 100 tegn',
        { felt: { dokumentnoekkel: 'd'.repeat(101) } },
        /Dokumentnøkkelen er over 100 tegn/,
      ],
      [
        'en dokumentnøkkel med mellomrom til slutt',
        { felt: { dokumentnoekkel: 'dok ' } },
        /andre tegn enn a–z, 0–9, _ og -/,
      ],
      [
        'en dokumentnøkkel med NBSP (#609)',
        { felt: { dokumentnoekkel: 'dok\u00a0' } },
        /andre tegn enn a–z, 0–9, _ og -/,
      ],
      [
        'en oppdrags-ID som ikke er en UUID (#629)',
        { felt: { oppdrag_id: 'oppdrag-1' } },
        /Oppdragets ID er ikke en UUID/,
      ],
      [
        'en oppdrags-ID med tegn etter UUID-en (#629)',
        { felt: { oppdrag_id: `${randomUUID()}0` } },
        /Oppdragets ID er ikke en UUID/,
      ],
      ['et oppdrag som ikke er et JSON-objekt', { felt: { oppdrag: '"x"' } }, /Oppdraget/],
      ['en sum på 65 tegn', { felt: { oppdrag_sha256: 'a'.repeat(65) } }, /Summen/],
      ['en sum med store bokstaver', { felt: { oppdrag_sha256: 'A'.repeat(64) } }, /Summen/],
    ])(
      'avviser %s (51422) med en melding som sier hva, ikke 547 (#605, #607, #596)',
      async (_, valg, tekst) => {
        const sak = await nySak();
        const svar = await avvisningMedMelding(direkte(sak.sak_id, valg));
        expect(svar?.nummer).toBe(UGYLDIG);
        expect(svar?.melding).toMatch(tekst);
        expect((await lagret(sak.sak_id)).hendelser).toHaveLength(1);
      }
    );

    it.each<[string, Parameters<typeof direkte>[1]]>([
      ['uten tidspunktet fra skrivetidspunkt', { tid: 'uten' }],
      ['et tidspunkt ett millisekund etter basens', { tid: 'senere' }],
      ['et tidspunkt kjøretiden har satt selv i en kontekstnøkkel', { tid: 'egen_noekkel' }],
      [
        'et tidspunkt skrivetidspunkt ga en annen transaksjon i samme økt',
        { tid: 'annen_transaksjon' },
      ],
      [
        'et tidspunkt en tidligere økt etterlot med samme transaksjons-ID, som etter en omstart',
        { tid: 'etter_omstart' },
      ],
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
