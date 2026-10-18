/**
 * Radsikkerheten og rettighetene for kjøretiden (#53, del 2), i en base bygget
 * fra `database/migrasjoner/`, etter mønsteret i prøvens `tilgang.test.ts`.
 * Kildene er sikkerhetsinvariantene i AGENTS.md (prosjektgrensen ved hvert
 * lesepunkt, notater fail-closed på team, aktørfeltene fra serveren), DL-U4
 * (teamet i journalen når det er entydig, siden alltid), DL-U5 (radsikkerheten
 * og rettighetene for kjøretiden nå), MS-05 og `NotatRepository.slett`
 * (forfatteren sletter sitt eget notat) og arbeidsvalg 5 i #53 (rettigheter per
 * objekt). Krever `KOE_SQLSERVER_TILKOBLING`.
 */

import { randomBytes, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  avvisning,
  catendaBruker,
  type Foresp,
  iTransaksjon,
  opprettMigrertTestbase,
  type Rad,
  settInn,
} from './sqlserver_migrert.ts';
import {
  opprettKjoeretid,
  type Pool,
  sql,
  SQLSERVER_TILKOBLING,
  type Testbase,
} from './sqlserver.ts';

const IKKE_NULL = 515;
const INGEN_RETT = 229;
const BLOKKERT = 33504;

const P1 = 'tilgang-p1';
const P2 = 'tilgang-p2';
const INAKTIVT = 'tilgang-p3';
const team = () => randomBytes(16).toString('hex');
const TE1 = team();
const TE2 = team();
const BH1 = team();
const TE_P2 = team();
const TE_P3 = team();
const KJOERETID = 'koe_runtime_prove';
const SAKSTABELLER = ['sak_metadata', 'hendelse', 'notat', 'leveringsoppdrag', 'kjernebuffer'];

/** Konteksten med valgfrie felt; `iKontekst` fyller inn P1, TE og TE1 for det som mangler. */
type Kontekstvalg = { aktor: string; prosjekt?: string; side?: string; team?: string | null };

describe.skipIf(!SQLSERVER_TILKOBLING)('tilgangen i SQL Server', () => {
  let base: Testbase;
  let kjoeretid: { pool: Pool; slett(): Promise<void> };
  /** Brukerne: TE i to team, en kollega i samme team, BH, en leser, en med inaktivt medlemskap og en i P2. */
  const b: Record<'te' | 'kollega' | 'bh' | 'leser' | 'inaktiv' | 'p2', string> = {
    te: '',
    kollega: '',
    bh: '',
    leser: '',
    inaktiv: '',
    p2: '',
  };

  beforeAll(async () => {
    base = await opprettMigrertTestbase('tilgang', { maks: 12 });
    for (const navn of Object.keys(b) as (keyof typeof b)[])
      b[navn] = await catendaBruker(base.pool);
    const medlem = (p: string, u: string, leser = 0, aktiv = 1) =>
      `(N'${p}', '${u}', N'${team()}', N'', N'', N'member', ${leser}, ${aktiv})`;
    await base.pool.request().batch(`
      CREATE USER ${KJOERETID} WITHOUT LOGIN;
      ALTER ROLE koe_runtime ADD MEMBER ${KJOERETID};
      INSERT koe.projects (id, name, organisasjon_id, is_active)
      VALUES (N'${P1}', N'P1', N'org', 1), (N'${P2}', N'P2', N'org', 1), (N'${INAKTIVT}', N'P3', N'org', 0);
      INSERT koe.app_project_memberships
        (project_id, user_id, catenda_subject, user_email, display_name, role, viewer_override, active)
      VALUES ${[
        medlem(P1, b.te),
        medlem(P1, b.kollega),
        medlem(P1, b.bh),
        medlem(P1, b.leser, 1),
        medlem(P1, b.inaktiv, 0, 0),
        medlem(P2, b.p2),
        medlem(INAKTIVT, b.te),
      ].join(', ')};
      INSERT koe.catenda_contract_teams (internal_project_id, team_id, contract_role)
      VALUES (N'${P1}', N'${TE1}', N'TE'), (N'${P1}', N'${TE2}', N'TE'), (N'${P1}', N'${BH1}', N'BH'),
             (N'${P2}', N'${TE_P2}', N'TE'), (N'${INAKTIVT}', N'${TE_P3}', N'TE');`);
    kjoeretid = await opprettKjoeretid(base);
  }, 240_000);
  afterAll(async () => {
    await kjoeretid?.slett();
    await base?.slett();
  }, 60_000);

  /**
   * Én transaksjon med konteksten satt først, som eieren eller som kjøretiden
   * (med kjøretidens egen innlogging). Feiler arbeidet, rulles transaksjonen tilbake.
   */
  function iKontekst<T>(
    k: Kontekstvalg | null,
    arbeid: (r: Foresp) => Promise<T>,
    som: 'eier' | 'kjoeretid' = 'eier'
  ): Promise<T> {
    const kontekst = k && {
      aktor: k.aktor,
      prosjekt: k.prosjekt ?? P1,
      side: k.side ?? 'TE',
      team: k.team === undefined ? TE1 : k.team,
    };
    return iTransaksjon(som === 'kjoeretid' ? kjoeretid.pool : base.pool, kontekst, arbeid);
  }

  const sak = (prosjekt = P1, aktor = b.te): Rad => ({
    sak_id: randomUUID(),
    prosjekt_id: prosjekt,
    sakstype: 'endringsforespoersel',
    created_by: aktor,
  });

  const brev = (s: Rad, overstyr: Rad = {}): Rad => ({
    event_id: randomUUID(),
    sak_id: s.sak_id,
    prosjekt_id: s.prosjekt_id,
    event_type: 'sak_opprettet',
    versjon: 1,
    tidsstempel: new Date(),
    aktor_id: s.created_by,
    aktor_rolle: 'TE',
    aktor_team_id: TE1,
    format: 1,
    data: '{}',
    transaksjon: { sql: 'CURRENT_TRANSACTION_ID()' },
    skriving: { sql: "TRY_CAST(SESSION_CONTEXT(N'koe_skriving') AS uniqueidentifier)" },
    ...overstyr,
  });

  const notat = (s: Rad, overstyr: Rad = {}): Rad => ({
    notat_id: randomUUID(),
    sak_id: s.sak_id,
    prosjekt_id: s.prosjekt_id,
    aktor_id: b.te,
    aktor_rolle: 'TE',
    aktor_team_id: TE1,
    tekst: 'Internt notat',
    ...overstyr,
  });

  /** En sak i P1 med det første brevet, oppdraget, bufferen og et notat fra TE1. */
  async function lagretSak(prosjekt = P1) {
    const aktor = prosjekt === P1 ? b.te : b.p2;
    const teamet = prosjekt === P1 ? TE1 : TE_P2;
    const s = sak(prosjekt, aktor);
    const n = notat(s, { aktor_id: aktor, aktor_team_id: teamet });
    await iKontekst({ aktor, prosjekt, team: teamet }, async (r) => {
      const e = brev(s, { aktor_team_id: teamet });
      await settInn(r, 'sak_metadata', s);
      await settInn(r, 'hendelse', e);
      await settInn(r, 'leveringsoppdrag', {
        id: randomUUID(),
        prosjekt_id: prosjekt,
        sak_id: s.sak_id,
        event_id: e.event_id,
        dokumentnoekkel: e.event_id,
        innhold: '{}',
        innhold_sha256: 'a'.repeat(64),
      });
      await settInn(r, 'kjernebuffer', {
        sak_id: s.sak_id,
        prosjekt_id: prosjekt,
        visning: '{}',
        projeksjonsversjon: 1,
        regelversjon: 1,
        leserformat: 1,
        saksversjon: 1,
      });
      await settInn(r, 'notat', n);
    });
    return { s, n };
  }

  /** Antall rader for saken i hver av sakstabellene, slik konteksten ser dem. */
  async function synlig(
    k: Kontekstvalg | null,
    sakId: unknown,
    som: 'eier' | 'kjoeretid' = 'kjoeretid'
  ) {
    return iKontekst(
      k,
      async (r) => {
        const svar: Record<string, number> = {};
        for (const tabell of SAKSTABELLER) {
          const rad = await r()
            .input('sak', sql.NVarChar(36), sakId)
            .query<{ n: number }>(`SELECT COUNT(*) AS n FROM koe.${tabell} WHERE sak_id = @sak`);
          svar[tabell] = rad.recordset[0].n;
        }
        return svar;
      },
      som
    );
  }

  const ALLE = Object.fromEntries(SAKSTABELLER.map((t) => [t, 1]));
  const INGEN = Object.fromEntries(SAKSTABELLER.map((t) => [t, 0]));
  const UTEN_NOTAT = { ...ALLE, notat: 0 };

  describe('lesing over prosjektgrensen', () => {
    it('kontrollsak: kjøretiden ser saken, brevet, oppdraget, bufferen og notatet i teamets kontekst', async () => {
      const { s } = await lagretSak();
      expect(await synlig({ aktor: b.te }, s.sak_id)).toEqual(ALLE);
    });

    it('uten kontekst ser verken kjøretiden eller eieren noe (radsikkerheten gjelder eieren)', async () => {
      const { s } = await lagretSak();
      expect(await synlig(null, s.sak_id)).toEqual(INGEN);
      expect(await synlig(null, s.sak_id, 'eier')).toEqual(INGEN);
    });

    it.each<[string, () => Kontekstvalg]>([
      ['medlemmet i P2, med P2 i konteksten', () => ({ aktor: b.p2, prosjekt: P2, team: TE_P2 })],
      ['medlemmet i P2, med P1 i konteksten', () => ({ aktor: b.p2, prosjekt: P1 })],
      ['TE i P1, med P2 i konteksten', () => ({ aktor: b.te, prosjekt: P2, team: TE_P2 })],
      ['et inaktivt medlemskap', () => ({ aktor: b.inaktiv })],
      ['en ukjent aktør', () => ({ aktor: randomUUID() })],
      ['et prosjekt med en hale i konteksten', () => ({ aktor: b.te, prosjekt: `${P1}x` })],
      [
        'et prosjekt med mellomrom til slutt i konteksten (#581)',
        () => ({ aktor: b.te, prosjekt: `${P1} ` }),
      ],
    ])('%s ser ingenting fra saken i P1', async (_, k) => {
      const { s } = await lagretSak();
      expect(await synlig(k(), s.sak_id)).toEqual(INGEN);
    });

    it('et prosjekt som ikke er aktivt, gir ingenting, også for et aktivt medlem', async () => {
      const s = sak(INAKTIVT);
      const feil = await avvisning(
        iKontekst({ aktor: b.te, prosjekt: INAKTIVT, team: TE_P3 }, (r) =>
          settInn(r, 'sak_metadata', s)
        )
      );
      expect(feil).toBe(BLOKKERT);
    });

    it('konteksten gjelder ikke i en senere transaksjon på samme forbindelse', async () => {
      const { s } = await lagretSak();
      // Én batch, så begge transaksjonene går på samme forbindelse og sesjon.
      const svar = await base.pool
        .request()
        .input('aktor', sql.NVarChar(36), b.te)
        .input('team', sql.NVarChar(32), TE1)
        .input('sak', sql.NVarChar(36), s.sak_id).query<{ i_samme: number; i_neste: number }>(`
          DECLARE @tx bigint, @i_samme int, @i_neste int;
          BEGIN TRANSACTION;
          SET @tx = CURRENT_TRANSACTION_ID();
          EXEC sp_set_session_context N'koe_aktor', @aktor;
          EXEC sp_set_session_context N'koe_prosjekt', N'${P1}';
          EXEC sp_set_session_context N'koe_side', N'TE';
          EXEC sp_set_session_context N'koe_team', @team;
          EXEC sp_set_session_context N'koe_tx', @tx;
          SET @i_samme = (SELECT COUNT(*) FROM koe.hendelse WHERE sak_id = @sak);
          COMMIT;
          BEGIN TRANSACTION;
          SET @i_neste = (SELECT COUNT(*) FROM koe.hendelse WHERE sak_id = @sak);
          COMMIT;
          EXEC sp_set_session_context N'koe_tx', NULL;
          SELECT @i_samme AS i_samme, @i_neste AS i_neste;`);
      expect(svar.recordset).toEqual([{ i_samme: 1, i_neste: 0 }]);
    });
  });

  describe('interne notater: skjerming på team, fail-closed', () => {
    it.each<[string, () => Kontekstvalg, Rad]>([
      ['teamet som skrev, også en kollega', () => ({ aktor: b.kollega }), ALLE],
      ['et annet team på samme side', () => ({ aktor: b.te, team: TE2 }), UTEN_NOTAT],
      ['motparten', () => ({ aktor: b.bh, side: 'BH', team: BH1 }), UTEN_NOTAT],
      ['leserollen i teamet', () => ({ aktor: b.leser }), UTEN_NOTAT],
      ['forfatteren uten team', () => ({ aktor: b.te, team: null }), UTEN_NOTAT],
      ['forfatteren på feil side', () => ({ aktor: b.te, side: 'BH' }), UTEN_NOTAT],
      ['forfatteren med en hale på teamet', () => ({ aktor: b.te, team: `${TE1}0` }), UTEN_NOTAT],
      [
        'forfatteren med mellomrom etter teamet (#581)',
        () => ({ aktor: b.te, team: `${TE1} ` }),
        UTEN_NOTAT,
      ],
      [
        'forfatteren med mellomrom etter siden (#581)',
        () => ({ aktor: b.te, side: 'TE ' }),
        UTEN_NOTAT,
      ],
    ])('%s ser notatet bare når teamet er forfatterens', async (_, k, forventet) => {
      const { s } = await lagretSak();
      expect(await synlig(k(), s.sak_id)).toEqual(forventet);
    });

    it.each<[string, () => Kontekstvalg, () => Rad]>([
      ['et annet team enn konteksten', () => ({ aktor: b.te }), () => ({ aktor_team_id: TE2 })],
      ['et team fra motparten', () => ({ aktor: b.te }), () => ({ aktor_team_id: BH1 })],
      ['en annen aktør enn konteksten', () => ({ aktor: b.te }), () => ({ aktor_id: b.kollega })],
      ['en annen side enn konteksten', () => ({ aktor: b.te }), () => ({ aktor_rolle: 'BH' })],
      ['et team, når konteksten er uten team', () => ({ aktor: b.te, team: null }), () => ({})],
      ['leserollen', () => ({ aktor: b.leser }), () => ({ aktor_id: b.leser })],
    ])('eieren kan ikke skrive et notat med %s (blokkpredikatet)', async (_, k, overstyr) => {
      const { s } = await lagretSak();
      const feil = await avvisning(
        iKontekst(k(), (r) => settInn(r, 'notat', notat(s, overstyr())))
      );
      expect(feil).toBe(BLOKKERT);
    });

    it('et notat uten team avvises av kolonnen (515), og predikatet krever team for notatet', async () => {
      const { s } = await lagretSak();
      const feil = await avvisning(
        iKontekst({ aktor: b.te, team: null }, (r) =>
          settInn(r, 'notat', notat(s, { aktor_team_id: null }))
        )
      );
      expect(feil).toBe(IKKE_NULL);
      const svar = await iKontekst({ aktor: b.te, team: null }, (r) =>
        r()
          .input('p', sql.NVarChar(100), P1)
          .input('a', sql.UniqueIdentifier, b.te)
          .query<{ notat: number; brev: number }>(
            `SELECT SIGN((SELECT COUNT(*) FROM koe_sikkerhet.skriver(@p, @a, N'TE', NULL, 1))) AS notat,
                    SIGN((SELECT COUNT(*) FROM koe_sikkerhet.skriver(@p, @a, N'TE', NULL, 0))) AS brev`
          )
      );
      expect(svar.recordset).toEqual([{ notat: 0, brev: 1 }]);
    });

    it('en kollega i teamet kan ikke endre, flytte eller slette forfatterens notat', async () => {
      const { s, n } = await lagretSak();
      for (const setning of [
        "UPDATE koe.notat SET tekst = N'Endret' WHERE notat_id = @id",
        'UPDATE koe.notat SET aktor_id = @kollega WHERE notat_id = @id',
        'DELETE koe.notat WHERE notat_id = @id',
      ]) {
        const feil = await avvisning(
          iKontekst({ aktor: b.kollega }, (r) =>
            r()
              .input('id', sql.UniqueIdentifier, n.notat_id)
              .input('kollega', sql.UniqueIdentifier, b.kollega)
              .query(setning)
          )
        );
        expect({ setning, feil }).toEqual({ setning, feil: BLOKKERT });
      }
      expect((await synlig({ aktor: b.te }, s.sak_id)).notat).toBe(1);
    });

    it('forfatteren kan ikke flytte notatet til et annet team eller en annen aktør', async () => {
      const { n } = await lagretSak();
      for (const sett of ['aktor_team_id = @team2', 'aktor_id = @kollega']) {
        const feil = await avvisning(
          iKontekst({ aktor: b.te }, (r) =>
            r()
              .input('id', sql.UniqueIdentifier, n.notat_id)
              .input('team2', sql.NVarChar(32), TE2)
              .input('kollega', sql.UniqueIdentifier, b.kollega)
              .query(`UPDATE koe.notat SET ${sett} WHERE notat_id = @id`)
          )
        );
        expect({ sett, feil }).toEqual({ sett, feil: BLOKKERT });
      }
    });

    it('motparten sletter ikke notatet (det er filtrert bort); forfatteren sletter det', async () => {
      const { s, n } = await lagretSak();
      const slett = (k: Kontekstvalg) =>
        iKontekst(k, (r) =>
          r()
            .input('id', sql.UniqueIdentifier, n.notat_id)
            .query('DELETE koe.notat WHERE notat_id = @id')
        );
      expect((await slett({ aktor: b.bh, side: 'BH', team: BH1 })).rowsAffected).toEqual([0]);
      expect((await slett({ aktor: b.te })).rowsAffected).toEqual([1]);
      expect((await synlig({ aktor: b.te }, s.sak_id)).notat).toBe(0);
    });
  });

  describe('skriving i journalen (DL-U4)', () => {
    async function skrivBrev(k: Kontekstvalg, overstyr: Rad) {
      const { s } = await lagretSak();
      return iKontekst(k, (r) => settInn(r, 'hendelse', brev(s, { versjon: 2, ...overstyr })));
    }

    it('kontrollsak: et brev uten team lagres når siden er entydig og konteksten er uten team', async () => {
      await skrivBrev({ aktor: b.te, team: null }, { aktor_team_id: null });
    });

    it('kontrollsak: motparten skriver med sitt team', async () => {
      await skrivBrev(
        { aktor: b.bh, side: 'BH', team: BH1 },
        { aktor_id: b.bh, aktor_rolle: 'BH', aktor_team_id: BH1 }
      );
    });

    it.each<[string, () => Kontekstvalg, () => Rad]>([
      ['uten team når teamet er entydig', () => ({ aktor: b.te }), () => ({ aktor_team_id: null })],
      ['med team når konteksten er uten', () => ({ aktor: b.te, team: null }), () => ({})],
      ['med et annet team enn konteksten', () => ({ aktor: b.te }), () => ({ aktor_team_id: TE2 })],
      ['med motpartens team', () => ({ aktor: b.te }), () => ({ aktor_team_id: BH1 })],
      [
        'på en annen side enn konteksten',
        () => ({ aktor: b.te, team: null }),
        () => ({ aktor_rolle: 'BH', aktor_team_id: null }),
      ],
      ['i en annen aktørs navn', () => ({ aktor: b.te }), () => ({ aktor_id: b.kollega })],
      ['fra leserollen', () => ({ aktor: b.leser }), () => ({ aktor_id: b.leser })],
      ['fra et inaktivt medlemskap', () => ({ aktor: b.inaktiv }), () => ({ aktor_id: b.inaktiv })],
      [
        'med en hale på siden i konteksten',
        () => ({ aktor: b.te, side: 'TEX', team: null }),
        () => ({ aktor_team_id: null }),
      ],
      ['med en hale på teamet i konteksten', () => ({ aktor: b.te, team: `${TE1}0` }), () => ({})],
      [
        'med mellomrom etter prosjektet i konteksten (#581)',
        () => ({ aktor: b.te, prosjekt: `${P1} ` }),
        () => ({}),
      ],
      [
        'med mellomrom etter siden i konteksten (#581)',
        () => ({ aktor: b.te, side: 'TE ', team: null }),
        () => ({ aktor_team_id: null }),
      ],
      [
        'med mellomrom etter teamet i konteksten (#581)',
        () => ({ aktor: b.te, team: `${TE1} ` }),
        () => ({}),
      ],
    ])('et brev %s avvises (blokkpredikatet)', async (_, k, overstyr) => {
      expect(await avvisning(skrivBrev(k(), overstyr()))).toBe(BLOKKERT);
    });

    it('et brev uten team avvises på en side prosjektet ikke har et kontraktsteam på', async () => {
      const { s } = await lagretSak(P2);
      const feil = await avvisning(
        iKontekst({ aktor: b.p2, prosjekt: P2, side: 'BH', team: null }, (r) =>
          settInn(r, 'hendelse', brev(s, { versjon: 2, aktor_rolle: 'BH', aktor_team_id: null }))
        )
      );
      expect(feil).toBe(BLOKKERT);
    });

    it('et brev i en sak i P2 avvises med P1 i konteksten', async () => {
      const { s } = await lagretSak(P2);
      const feil = await avvisning(
        iKontekst({ aktor: b.te }, (r) =>
          settInn(r, 'hendelse', brev(s, { versjon: 2, aktor_id: b.te }))
        )
      );
      expect(feil).toBe(BLOKKERT);
    });
  });

  describe('opprettelse av en sak, bufferen og oppdraget', () => {
    it.each<[string, () => Kontekstvalg, () => Rad]>([
      ['i en annen aktørs navn', () => ({ aktor: b.te }), () => sak(P1, b.kollega)],
      [
        'i et prosjekt aktøren ikke er medlem av',
        () => ({ aktor: b.te, prosjekt: P2, team: TE_P2 }),
        () => sak(P2),
      ],
      ['i P2 med P1 i konteksten', () => ({ aktor: b.te }), () => sak(P2)],
      ['fra leserollen', () => ({ aktor: b.leser }), () => sak(P1, b.leser)],
      [
        'med et team fra en annen side enn konteksten',
        () => ({ aktor: b.te, team: BH1 }),
        () => sak(),
      ],
      [
        'med mellomrom etter prosjektet i konteksten (#581)',
        () => ({ aktor: b.te, prosjekt: `${P1} ` }),
        () => sak(),
      ],
      [
        'med mellomrom etter siden i konteksten (#581)',
        () => ({ aktor: b.te, side: 'TE ' }),
        () => sak(),
      ],
      [
        'med mellomrom etter teamet i konteksten (#581)',
        () => ({ aktor: b.te, team: `${TE1} ` }),
        () => sak(),
      ],
    ])('en sak %s avvises (blokkpredikatet)', async (_, k, s) => {
      const feil = await avvisning(iKontekst(k(), (r) => settInn(r, 'sak_metadata', s())));
      expect(feil).toBe(BLOKKERT);
    });

    it('kontrollsak: en sak opprettes uten team når siden er entydig', async () => {
      await iKontekst({ aktor: b.te, team: null }, (r) => settInn(r, 'sak_metadata', sak()));
    });

    it('bufferen for en sak i P2 skrives ikke med P1 i konteksten', async () => {
      const s = sak(P2, b.p2);
      await iKontekst({ aktor: b.p2, prosjekt: P2, team: TE_P2 }, (r) =>
        settInn(r, 'sak_metadata', s)
      );
      const feil = await avvisning(
        iKontekst({ aktor: b.te }, (r) =>
          settInn(r, 'kjernebuffer', {
            sak_id: s.sak_id,
            prosjekt_id: P2,
            visning: '{}',
            projeksjonsversjon: 1,
            regelversjon: 1,
            leserformat: 1,
            saksversjon: 2,
          })
        )
      );
      expect(feil).toBe(BLOKKERT);
    });
  });

  describe('rettighetene til kjøretiden (arbeidsvalg 5)', () => {
    // 1088 og 33268 er «finnes ikke, eller du har ikke rettighetene».
    it.each<[string, string, number]>([
      ...SAKSTABELLER.flatMap((t): [string, string, number][] => [
        [`INSERT i ${t}`, `INSERT koe.${t} DEFAULT VALUES;`, INGEN_RETT],
        [`UPDATE i ${t}`, `UPDATE koe.${t} SET prosjekt_id = prosjekt_id WHERE 1 = 0;`, INGEN_RETT],
        [`DELETE i ${t}`, `DELETE koe.${t} WHERE 1 = 0;`, INGEN_RETT],
      ]),
      ['TRUNCATE av bufferen', 'TRUNCATE TABLE koe.kjernebuffer;', 1088],
      [
        'å slå av policyen',
        'ALTER SECURITY POLICY koe_sikkerhet.tilgang WITH (STATE = OFF);',
        33268,
      ],
      ['å lese et predikat direkte', "SELECT * FROM koe_sikkerhet.medlem(N'x');", INGEN_RETT],
      ['å slå av en trigger', 'DISABLE TRIGGER koe.hendelse_uforanderlig ON koe.hendelse;', 1088],
      // 230 er «ingen rett på kolonnen»; «levert» leser bare tidspunktet (#805).
      [
        'å lese Catenda-ID-en i kvitteringen',
        'SELECT catenda_id FROM koe.leveringskvittering WHERE 1 = 0;',
        230,
      ],
      ['å lese hele kvitteringen', 'SELECT * FROM koe.leveringskvittering WHERE 1 = 0;', 230],
    ])('kjøretiden avvises ved %s (%i)', async (_, setning, nummer) => {
      const feil = await avvisning(
        base.pool.request().batch(
          `EXECUTE AS USER = '${KJOERETID}';
           BEGIN TRY ${setning} END TRY BEGIN CATCH REVERT; THROW; END CATCH;
           REVERT;`
        )
      );
      expect(feil).toBe(nummer);
    });

    it('policyen er på og bundet etter forsøkene', async () => {
      const svar = await base.pool
        .request()
        .query(`SELECT name, is_enabled, is_schema_bound FROM sys.security_policies`);
      expect(svar.recordset).toEqual([
        { name: 'tilgang', is_enabled: true, is_schema_bound: true },
      ]);
    });

    it('kjøretiden har nøyaktig disse rettighetene', async () => {
      const svar = await base.pool.request().query<{ rett: string }>(
        `SELECT CONCAT(p.state_desc, N' ', p.permission_name, N' ',
                       CASE p.class WHEN 1 THEN CONCAT(OBJECT_SCHEMA_NAME(p.major_id), N'.', OBJECT_NAME(p.major_id))
                                    WHEN 3 THEN CONCAT(N'SCHEMA::', SCHEMA_NAME(p.major_id))
                                    ELSE p.class_desc END,
                       CASE WHEN p.minor_id > 0 THEN CONCAT(N' (', COL_NAME(p.major_id, p.minor_id), N')') END) AS rett
           FROM sys.database_permissions p
          WHERE p.grantee_principal_id = DATABASE_PRINCIPAL_ID(N'koe_runtime')`
      );
      expect(svar.recordset.map((r) => r.rett).sort()).toEqual([
        'GRANT EXECUTE koe_api.aktornavn',
        'GRANT EXECUTE koe_api.bruk_innloggingsforsoek',
        'GRANT EXECUTE koe_api.brukerens_prosjekter',
        'GRANT EXECUTE koe_api.catenda_identitet',
        'GRANT EXECUTE koe_api.deaktiver_ved_innlogging',
        'GRANT EXECUTE koe_api.fullmakter',
        'GRANT EXECUTE koe_api.hent_jobb',
        'GRANT EXECUTE koe_api.koblede_prosjekter',
        'GRANT EXECUTE koe_api.kontraktsteam',
        'GRANT EXECUTE koe_api.kvitter_dokument',
        'GRANT EXECUTE koe_api.kvitter_levering',
        'GRANT EXECUTE koe_api.kvitter_topic',
        'GRANT EXECUTE koe_api.kvittering',
        'GRANT EXECUTE koe_api.lag_godkjenningspakke',
        'GRANT EXECUTE koe_api.lagre_brevdokument',
        'GRANT EXECUTE koe_api.lagre_vedlegg',
        'GRANT EXECUTE koe_api.lagret_brevdokument',
        'GRANT EXECUTE koe_api.les_sesjon',
        'GRANT EXECUTE koe_api.leveringsmaal',
        'GRANT EXECUTE koe_api.medlemmer',
        'GRANT EXECUTE koe_api.medlemsliste_alder',
        'GRANT EXECUTE koe_api.migrasjonshistorikk',
        'GRANT EXECUTE koe_api.opprett_innloggingsforsoek',
        'GRANT EXECUTE koe_api.opprett_sak',
        'GRANT EXECUTE koe_api.opprett_sesjon',
        'GRANT EXECUTE koe_api.prosjekt',
        'GRANT EXECUTE koe_api.prosjektkobling',
        'GRANT EXECUTE koe_api.prosjektmedlemskap',
        'GRANT EXECUTE koe_api.registrer_godkjenningshandling',
        'GRANT EXECUTE koe_api.registrer_jobbfeil',
        'GRANT EXECUTE koe_api.rydd_utloepte',
        'GRANT EXECUTE koe_api.sett_leserolle',
        'GRANT EXECUTE koe_api.skriv_hendelse',
        'GRANT EXECUTE koe_api.skrivetidspunkt',
        'GRANT EXECUTE koe_api.slett_sesjon',
        'GRANT EXECUTE koe_api.slett_vedlegg',
        'GRANT EXECUTE koe_api.synkroniser_medlemskap',
        'GRANT SELECT koe.godkjenningshandling',
        'GRANT SELECT koe.godkjenningspakke',
        'GRANT SELECT koe.godkjenningssteg',
        'GRANT SELECT koe.hendelse',
        'GRANT SELECT koe.kjernebuffer',
        // Bare kolonnene «levert» trenger (#805).
        'GRANT SELECT koe.leveringskvittering (kvittert)',
        'GRANT SELECT koe.leveringskvittering (leveringsoppdrag_id)',
        'GRANT SELECT koe.leveringskvittering (operasjon)',
        'GRANT SELECT koe.leveringsoppdrag',
        'GRANT SELECT koe.notat',
        'GRANT SELECT koe.sak_metadata',
        'GRANT SELECT koe.vedlegg',
      ]);
    });

    it('kjøreveien har ingen rettigheter, bare eierskapskjeden i prosedyrene som kjører som den (#741)', async () => {
      const svar = await base.pool.request().query<{ rett: string; innlogging: number }>(
        `SELECT CONCAT(p.state_desc, N' ', p.permission_name, N' ', p.class_desc) AS rett,
                (SELECT COUNT(*) FROM sys.database_principals d
                  WHERE d.name = N'koe_jobbkjoerer' AND d.authentication_type_desc = N'NONE') AS innlogging
           FROM sys.database_permissions p
          WHERE p.grantee_principal_id = DATABASE_PRINCIPAL_ID(N'koe_jobbkjoerer')`
      );
      expect(svar.recordset).toEqual([{ rett: 'GRANT CONNECT DATABASE', innlogging: 1 }]);
      const somDen = await base.pool.request().query<{ prosedyre: string }>(
        `SELECT CONCAT(OBJECT_SCHEMA_NAME(m.object_id), N'.', OBJECT_NAME(m.object_id)) AS prosedyre
           FROM sys.sql_modules m
          WHERE m.execute_as_principal_id = DATABASE_PRINCIPAL_ID(N'koe_jobbkjoerer')`
      );
      expect(somDen.recordset.map((r) => r.prosedyre).sort()).toEqual([
        'koe_api.hent_jobb',
        'koe_api.kvitter_dokument',
        'koe_api.kvitter_levering',
        'koe_api.kvitter_topic',
        'koe_api.lagre_brevdokument',
        'koe_api.lagret_brevdokument',
        'koe_api.registrer_jobbfeil',
        'koe_api.start_jobb_paa_nytt',
      ]);
    });

    it('hver tabell kjøretiden kan lese, har et filterpredikat i policyen', async () => {
      const kjoeretid = await base.pool.request().query<{ tabell: string; filter: number }>(
        `SELECT DISTINCT CONCAT(OBJECT_SCHEMA_NAME(p.major_id), N'.', OBJECT_NAME(p.major_id)) AS tabell,
                (SELECT COUNT(*) FROM sys.security_predicates sp
                  WHERE sp.target_object_id = p.major_id AND sp.predicate_type = 0) AS filter
           FROM sys.database_permissions p JOIN sys.tables t ON t.object_id = p.major_id
          WHERE p.grantee_principal_id = DATABASE_PRINCIPAL_ID(N'koe_runtime') AND p.permission_name = N'SELECT'`
      );
      expect(kjoeretid.recordset.filter((r) => r.filter !== 1)).toEqual([]);
      expect(kjoeretid.recordset.map((r) => r.tabell).sort()).toEqual(
        // Kvitteringen har ingen `sak_id`; den leses for «levert» (#764), og L7 i
        // `levering.test.ts` viser at kjøretiden ikke kan skrive den. Vedleggene prøves
        // i `vedlegg.test.ts`, og godkjenningspakkene i `godkjenning.test.ts`.
        [
          ...SAKSTABELLER,
          'leveringskvittering',
          'vedlegg',
          'godkjenningspakke',
          'godkjenningssteg',
          'godkjenningshandling',
        ]
          .map((t) => `koe.${t}`)
          .sort()
      );
    });
  });

  describe('kjøretiden i testene (#583)', () => {
    it('en transaksjon som kjøretiden som avbrytes av XACT_ABORT, gir ikke neste transaksjon som eieren kjøretidens identitet', async () => {
      const feil = await avvisning(
        iKontekst({ aktor: b.te }, (r) => r().query('SELECT 1 / 0'), 'kjoeretid')
      );
      expect(feil).toBe(8134);
      for (let i = 0; i < 12; i++) {
        const svar = await iKontekst(null, (r) =>
          r().query<{ bruker: string }>('SELECT USER_NAME() AS bruker')
        );
        expect(svar.recordset[0].bruker).toBe('dbo');
      }
    });
  });
});
