/**
 * Saksregisteret, journalen, notatet, leveringsoppdraget og kjernebufferen
 * (#53, del 2), i en base bygget fra `database/migrasjoner/`. Kildene er
 * sikkerhetsinvariantene i AGENTS.md (avsenderen er `app_users.id`, et notat
 * uten team finnes ikke, ingen default for prosjekt), DL-U4 (teamet i journalen
 * når det er entydig), MS-05 (notatet kan endres og slettes), LV-U1 (oppdraget
 * fryses med brevet) og arbeidsvalgene 1–4 i #53 (bufferen i egen tabell,
 * fremmednøkkel til brukeren, én trigger mot endring per tabell, ingen
 * kaskade). Krever `KOE_SQLSERVER_TILKOBLING`.
 *
 * Hver skriving skjer i en transaksjon med konteksten satt først, med nøklene
 * fra `server/datalag.ts` og `koe_skriving` fra prøven, så testene holder også
 * når radsikkerheten gjelder eieren.
 */

import { randomBytes, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { opprettMigrertTestbase } from './sqlserver_migrert.ts';
import { feilnummer, sql, SQLSERVER_TILKOBLING, type Testbase } from './sqlserver.ts';

const IKKE_NULL = 515;
const CHECK_BRUDD = 547;
const UNIK = 2627;
const TOEMMING_AVVIST = 4712;
const UFORANDERLIG = 51001;
const LAGRET_BREV = 51002;

/**
 * Tabellene i `koe` uten trigger mot endring, med begrunnelsen. Listen er lukket:
 * en ny tabell i `koe` får triggeren eller en linje her.
 */
const UTEN_TRIGGER: Record<string, string> = {
  app_users: 'E-post og navn oppdateres av koe.resolve_identity.',
  projects: 'Prosjektet kan bli inaktivt (is_active).',
  app_project_memberships:
    'Medlemssynkroniseringen endrer rollen, leserollen og om medlemskapet er aktivt.',
  catenda_contract_teams: 'Kontraktsteamene synkroniseres fra Catenda.',
  notat: 'Notatet er ikke et kontraktsvarsel og kan endres og slettes (MS-05).',
  kjernebuffer:
    'Bufferen er avledet og kan slettes og bygges på nytt fra journalen (arbeidsvalg 1 i #53).',
  skrivetidspunkt:
    'Raden slettes av koe_api.skriv_hendelse, eller av koe_api.skrivetidspunkt når transaksjons-ID-en brukes igjen (DL-U3, svaret 16.10 i #53).',
};

const PROSJEKT = 'journal-p1';
const ANNET_PROSJEKT = 'journal-p2';
const TEAM = randomBytes(16).toString('hex');

/** Et SQL-uttrykk som settes inn som det står, ikke som parameter. */
type Uttrykk = { sql: string };
type Rad = Record<string, unknown>;
type Foresp = () => sql.Request;

const SAMME_TRANSAKSJON: Uttrykk = { sql: 'CURRENT_TRANSACTION_ID()' };
const SKRIVINGEN: Uttrykk = {
  sql: "TRY_CAST(SESSION_CONTEXT(N'koe_skriving') AS uniqueidentifier)",
};

function settInn(r: Foresp, tabell: string, rad: Rad) {
  const foresp = r();
  const verdier = Object.entries(rad).map(([kolonne, verdi]) => {
    if (verdi && typeof verdi === 'object' && 'sql' in verdi) return (verdi as Uttrykk).sql;
    foresp.input(kolonne, verdi);
    return `@${kolonne}`;
  });
  return foresp.query(
    `INSERT koe.${tabell} (${Object.keys(rad).join(', ')}) VALUES (${verdier.join(', ')})`
  );
}

describe.skipIf(!SQLSERVER_TILKOBLING)('journalen i SQL Server', () => {
  let base: Testbase;
  let bruker: string;

  async function catendaBruker(): Promise<string> {
    const svar = await base.pool
      .request()
      .input('subjekt', sql.NVarChar(400), randomBytes(16).toString('hex'))
      .input('epost', sql.NVarChar(320), '')
      .input('navn', sql.NVarChar(400), '')
      .output('bruker', sql.UniqueIdentifier)
      .execute('koe_api.catenda_identitet');
    return String(svar.output.bruker).toLowerCase();
  }

  beforeAll(async () => {
    base = await opprettMigrertTestbase('journal', { maks: 12 });
    bruker = await catendaBruker();
    await base.pool
      .request()
      .input('bruker', sql.UniqueIdentifier, bruker)
      .input('p1', sql.NVarChar(100), PROSJEKT)
      .input('p2', sql.NVarChar(100), ANNET_PROSJEKT)
      .input('team', sql.NVarChar(32), TEAM).batch(`
        INSERT koe.projects (id, name, organisasjon_id, is_active)
        VALUES (@p1, N'P1', N'org', 1), (@p2, N'P2', N'org', 1);
        INSERT koe.app_project_memberships
          (project_id, user_id, catenda_subject, user_email, display_name, role, viewer_override, active)
        VALUES (@p1, @bruker, REPLICATE(N'b', 32), N'', N'', N'member', 0, 1);
        INSERT koe.catenda_contract_teams (internal_project_id, team_id, contract_role)
        VALUES (@p1, @team, N'TE');`);
  }, 240_000);
  afterAll(async () => {
    await base?.slett();
  }, 60_000);

  /**
   * Én transaksjon med konteksten for brukeren i prosjektet, på TE-siden i
   * teamet (eller uten team), og en ny skriving. Feiler arbeidet, rulles
   * transaksjonen tilbake. Radsikkerheten gjelder også eieren, så lesingen i
   * testene går også her.
   */
  async function iKontekst<T>(
    arbeid: (r: Foresp) => Promise<T>,
    team: string | null = TEAM
  ): Promise<T> {
    const tx = new sql.Transaction(base.pool);
    await tx.begin();
    const r = () => new sql.Request(tx);
    try {
      await r()
        .input('aktor', sql.NVarChar(36), bruker)
        .input('prosjekt', sql.NVarChar(100), PROSJEKT)
        .input('team', sql.NVarChar(32), team).batch(`
          DECLARE @tx bigint = CURRENT_TRANSACTION_ID(), @skriving uniqueidentifier = NEWID();
          EXEC sp_set_session_context N'koe_aktor', @aktor;
          EXEC sp_set_session_context N'koe_prosjekt', @prosjekt;
          EXEC sp_set_session_context N'koe_side', N'TE';
          EXEC sp_set_session_context N'koe_team', @team;
          EXEC sp_set_session_context N'koe_tx', @tx;
          EXEC sp_set_session_context N'koe_skriving', @skriving;`);
      const svar = await arbeid(r);
      await tx.commit();
      return svar;
    } catch (feil) {
      await tx.rollback().catch(() => {});
      throw feil;
    }
  }

  const avvisning = (p: Promise<unknown>) => p.then(() => undefined, feilnummer);

  const sak = (overstyr: Rad = {}): Rad => ({
    sak_id: randomUUID(),
    prosjekt_id: PROSJEKT,
    sakstype: 'koe',
    created_by: bruker,
    ...overstyr,
  });

  const brev = (s: Rad, overstyr: Rad = {}): Rad => ({
    event_id: randomUUID(),
    sak_id: s.sak_id,
    prosjekt_id: s.prosjekt_id,
    event_type: 'sak_opprettet',
    versjon: 1,
    tidsstempel: new Date(),
    aktor_id: bruker,
    aktor_rolle: 'TE',
    aktor_team_id: TEAM,
    refererer_til_event_id: null,
    format: 1,
    data: '{"sakstittel":"Prøve"}',
    transaksjon: SAMME_TRANSAKSJON,
    skriving: SKRIVINGEN,
    ...overstyr,
  });

  const oppdrag = (b: Rad, overstyr: Rad = {}): Rad => ({
    id: randomUUID(),
    prosjekt_id: b.prosjekt_id,
    sak_id: b.sak_id,
    event_id: b.event_id,
    dokumentnoekkel: b.event_id,
    innhold: '{"brev":{}}',
    innhold_sha256: 'a'.repeat(64),
    ...overstyr,
  });

  const notat = (s: Rad, overstyr: Rad = {}): Rad => ({
    notat_id: randomUUID(),
    sak_id: s.sak_id,
    prosjekt_id: s.prosjekt_id,
    aktor_id: bruker,
    aktor_rolle: 'TE',
    aktor_team_id: TEAM,
    tekst: 'Internt notat',
    ...overstyr,
  });

  const buffer = (s: Rad, overstyr: Rad = {}): Rad => ({
    sak_id: s.sak_id,
    prosjekt_id: s.prosjekt_id,
    visning: '{"status":"sendt"}',
    projeksjonsversjon: 1,
    regelversjon: 1,
    leserformat: 1,
    saksversjon: 1,
    ...overstyr,
  });

  /** En lagret sak med det første brevet og oppdraget, skrevet i én transaksjon. */
  async function lagretSak() {
    const s = sak();
    const b = brev(s);
    await iKontekst(async (r) => {
      await settInn(r, 'sak_metadata', s);
      await settInn(r, 'hendelse', b);
      await settInn(r, 'leveringsoppdrag', oppdrag(b));
    });
    return { s, b };
  }

  async function antall(tabell: string, sakId: unknown): Promise<number> {
    const svar = await iKontekst((r) =>
      r()
        .input('sak', sql.NVarChar(36), sakId)
        .query<{ n: number }>(`SELECT COUNT(*) AS n FROM koe.${tabell} WHERE sak_id = @sak`)
    );
    return svar.recordset[0].n;
  }

  const rader = (tabell: string, sakId: unknown) =>
    iKontekst((r) =>
      r()
        .input('sak', sql.NVarChar(36), sakId)
        .query(`SELECT * FROM koe.${tabell} WHERE sak_id = @sak`)
    );

  describe('saken, brevet og oppdraget', () => {
    it('kontrollsaken: saken, det første brevet og oppdraget lagres i én transaksjon', async () => {
      const { s, b } = await lagretSak();
      const svar = await iKontekst((r) =>
        r()
          .input('event', sql.NVarChar(36), b.event_id)
          .query<{ sak_id: string; aktor_team_id: string; data: string; har_oppdrag: number }>(
            `SELECT h.sak_id, h.aktor_team_id, h.data,
                    (SELECT COUNT(*) FROM koe.leveringsoppdrag o WHERE o.event_id = h.event_id) AS har_oppdrag
               FROM koe.hendelse h WHERE h.event_id = @event`
          )
      );
      expect(svar.recordset).toEqual([
        { sak_id: s.sak_id, aktor_team_id: TEAM, data: b.data, har_oppdrag: 1 },
      ]);
    });

    it('et brev uten team lagres (DL-U4)', async () => {
      const { s } = await lagretSak();
      await iKontekst(
        (r) => settInn(r, 'hendelse', brev(s, { versjon: 2, aktor_team_id: null })),
        null
      );
      expect(await antall('hendelse', s.sak_id)).toBe(2);
    });

    it.each<[string, Rad]>([
      ['en avsender som ikke er en bruker', { aktor_id: randomUUID() }],
      ['et team med store bokstaver', { aktor_team_id: TEAM.toUpperCase() }],
      ['et team med 31 tegn', { aktor_team_id: TEAM.slice(1) }],
      ['en rolle som verken er TE eller BH', { aktor_rolle: 'EO' }],
      ['data som er en liste', { data: '[]' }],
      ['data som ikke er JSON', { data: 'tekst' }],
      ['en event_id med store bokstaver', { event_id: randomUUID().toUpperCase() }],
      ['en event_id som ikke er en UUID', { event_id: 'brev-1' }],
      ['versjon 0', { versjon: 0 }],
      ['format 0', { format: 0 }],
      ['et annet prosjekt enn sakens', { prosjekt_id: ANNET_PROSJEKT }],
    ])('journalen avviser et brev med %s (547)', async (_, overstyr) => {
      const { s } = await lagretSak();
      const feil = await avvisning(
        iKontekst((r) => settInn(r, 'hendelse', brev(s, { versjon: 2, ...overstyr })))
      );
      expect(feil).toBe(CHECK_BRUDD);
      expect(await antall('hendelse', s.sak_id)).toBe(1);
    });

    it('journalen avviser et andre brev med samme versjon i saken (2627)', async () => {
      const { s } = await lagretSak();
      const feil = await avvisning(iKontekst((r) => settInn(r, 'hendelse', brev(s))));
      expect(feil).toBe(UNIK);
    });

    it('saksregisteret avviser en oppretter som ikke er en bruker (547)', async () => {
      const feil = await avvisning(
        iKontekst((r) => settInn(r, 'sak_metadata', sak({ created_by: randomUUID() })))
      );
      expect(feil).toBe(CHECK_BRUDD);
    });

    it('et oppdrag i en senere transaksjon enn brevet avvises (51002)', async () => {
      const s = sak();
      const b = brev(s);
      await iKontekst(async (r) => {
        await settInn(r, 'sak_metadata', s);
        await settInn(r, 'hendelse', b);
      });
      const feil = await avvisning(iKontekst((r) => settInn(r, 'leveringsoppdrag', oppdrag(b))));
      expect(feil).toBe(LAGRET_BREV);
      expect(await antall('leveringsoppdrag', s.sak_id)).toBe(0);
    });

    it('et oppdrag i samme transaksjon, men etter at skrivingen er avsluttet, avvises (51002)', async () => {
      const s = sak();
      const b = brev(s);
      const feil = await avvisning(
        iKontekst(async (r) => {
          await settInn(r, 'sak_metadata', s);
          await settInn(r, 'hendelse', b);
          await r().batch("EXEC sp_set_session_context N'koe_skriving', NULL;");
          await settInn(r, 'leveringsoppdrag', oppdrag(b));
        })
      );
      expect(feil).toBe(LAGRET_BREV);
      expect(await antall('sak_metadata', s.sak_id)).toBe(0);
    });

    it('et oppdrag i en annen sak enn brevets avvises av fremmednøkkelen (547)', async () => {
      const s = sak();
      const annen = sak();
      const b = brev(s);
      const feil = await avvisning(
        iKontekst(async (r) => {
          await settInn(r, 'sak_metadata', s);
          await settInn(r, 'sak_metadata', annen);
          await settInn(r, 'hendelse', b);
          await settInn(r, 'leveringsoppdrag', oppdrag(b, { sak_id: annen.sak_id }));
        })
      );
      expect(feil).toBe(CHECK_BRUDD);
    });

    it('et oppdrag i et annet prosjekt enn brevets avvises av fremmednøkkelen (547)', async () => {
      const s = sak();
      const b = brev(s);
      const feil = await avvisning(
        iKontekst(async (r) => {
          await settInn(r, 'sak_metadata', s);
          await settInn(r, 'hendelse', b);
          await settInn(r, 'leveringsoppdrag', oppdrag(b, { prosjekt_id: ANNET_PROSJEKT }));
        })
      );
      expect(feil).toBe(CHECK_BRUDD);
    });
  });

  describe('notatet', () => {
    it('kontrollsaken: et notat med team lagres, endres og slettes (MS-05)', async () => {
      const { s } = await lagretSak();
      const n = notat(s);
      await iKontekst(async (r) => {
        await settInn(r, 'notat', n);
        await r()
          .input('id', sql.UniqueIdentifier, n.notat_id)
          .query(
            "UPDATE koe.notat SET tekst = N'Endret', endret = SYSUTCDATETIME() WHERE notat_id = @id"
          );
      });
      expect(await antall('notat', s.sak_id)).toBe(1);
      await iKontekst((r) =>
        r()
          .input('id', sql.UniqueIdentifier, n.notat_id)
          .query('DELETE koe.notat WHERE notat_id = @id')
      );
      expect(await antall('notat', s.sak_id)).toBe(0);
    });

    it('et notat uten team avvises (515, AGENTS.md)', async () => {
      const { s } = await lagretSak();
      const feil = await avvisning(
        iKontekst((r) => settInn(r, 'notat', notat(s, { aktor_team_id: null })))
      );
      expect(feil).toBe(IKKE_NULL);
    });

    it.each<[string, Rad]>([
      ['en avsender som ikke er en bruker', { aktor_id: randomUUID() }],
      ['et team med store bokstaver', { aktor_team_id: TEAM.toUpperCase() }],
      ['et tomt team', { aktor_team_id: '' }],
      ['en tom tekst', { tekst: '' }],
      ['et ukjent spor', { spor: 'pris' }],
      ['et annet prosjekt enn sakens', { prosjekt_id: ANNET_PROSJEKT }],
    ])('et notat med %s avvises (547)', async (_, overstyr) => {
      const { s } = await lagretSak();
      const feil = await avvisning(iKontekst((r) => settInn(r, 'notat', notat(s, overstyr))));
      expect(feil).toBe(CHECK_BRUDD);
    });
  });

  describe('kjernebufferen', () => {
    it('kontrollsaken: bufferen kan slettes og skrives på nytt (arbeidsvalg 1)', async () => {
      const { s } = await lagretSak();
      await iKontekst((r) => settInn(r, 'kjernebuffer', buffer(s)));
      await iKontekst(async (r) => {
        await r()
          .input('sak', sql.NVarChar(36), s.sak_id)
          .query('DELETE koe.kjernebuffer WHERE sak_id = @sak');
        await settInn(r, 'kjernebuffer', buffer(s, { saksversjon: 2 }));
      });
      const svar = await rader('kjernebuffer', s.sak_id);
      expect(svar.recordset.map((r) => r.saksversjon)).toEqual([2]);
    });

    it.each<[string, Rad, number]>([
      ['et annet prosjekt enn sakens', { prosjekt_id: ANNET_PROSJEKT }, CHECK_BRUDD],
      ['en visning som ikke er et objekt', { visning: '[]' }, CHECK_BRUDD],
      ['uten regelversjon', { regelversjon: null }, IKKE_NULL],
    ])('bufferen avviser en rad med %s', async (_, overstyr, nummer) => {
      const { s } = await lagretSak();
      const feil = await avvisning(
        iKontekst((r) => settInn(r, 'kjernebuffer', buffer(s, overstyr)))
      );
      expect(feil).toBe(nummer);
    });
  });

  describe('mot endring (arbeidsvalg 3)', () => {
    async function tabeller() {
      const svar = await base.pool.request().query<{
        tabell: string;
        foerste_kolonne: string;
        hendelser: string | null;
      }>(
        `SELECT t.name AS tabell,
                (SELECT TOP 1 c.name FROM sys.columns c WHERE c.object_id = t.object_id ORDER BY c.column_id) AS foerste_kolonne,
                (SELECT STRING_AGG(e.type_desc, N',') WITHIN GROUP (ORDER BY e.type_desc)
                   FROM sys.triggers g JOIN sys.trigger_events e ON e.object_id = g.object_id
                  WHERE g.parent_id = t.object_id AND g.is_instead_of_trigger = 1 AND g.is_disabled = 0) AS hendelser
           FROM sys.tables t WHERE t.schema_id = SCHEMA_ID(N'koe')`
      );
      return svar.recordset;
    }

    it('hver tabell i koe har en aktiv INSTEAD OF-trigger for UPDATE og DELETE, utenom den lukkede listen', async () => {
      const alle = await tabeller();
      const uten = alle.filter((t) => t.hendelser !== 'DELETE,UPDATE').map((t) => t.tabell);
      expect(uten.sort()).toEqual(Object.keys(UTEN_TRIGGER).sort());
      expect(alle.map((t) => t.tabell)).toEqual(
        expect.arrayContaining(['sak_metadata', 'hendelse', 'leveringsoppdrag'])
      );
    });

    it('hver tabell med triggeren avviser UPDATE og DELETE fra eieren, også uten rader (51001)', async () => {
      const med = (await tabeller()).filter((t) => !(t.tabell in UTEN_TRIGGER));
      expect(med.length).toBeGreaterThan(0);
      for (const { tabell, foerste_kolonne: k } of med) {
        for (const setning of [
          `UPDATE koe.${tabell} SET ${k} = ${k} WHERE 1 = 0`,
          `DELETE koe.${tabell} WHERE 1 = 0`,
        ]) {
          const feil = await avvisning(base.pool.request().batch(setning));
          expect({ setning, feil }).toEqual({ setning, feil: UFORANDERLIG });
        }
      }
    });

    it.each<[string, string, string]>([
      [
        'saken',
        'sak_metadata',
        "UPDATE koe.sak_metadata SET prosjekt_id = N'journal-p2' WHERE sak_id = @sak",
      ],
      ['saken', 'sak_metadata', 'DELETE koe.sak_metadata WHERE sak_id = @sak'],
      ['brevet', 'hendelse', "UPDATE koe.hendelse SET data = N'{}' WHERE sak_id = @sak"],
      ['brevet', 'hendelse', 'DELETE koe.hendelse WHERE sak_id = @sak'],
      [
        'oppdraget',
        'leveringsoppdrag',
        "UPDATE koe.leveringsoppdrag SET innhold = N'{}' WHERE sak_id = @sak",
      ],
      ['oppdraget', 'leveringsoppdrag', 'DELETE koe.leveringsoppdrag WHERE sak_id = @sak'],
    ])('%s står uendret etter %s i konteksten (51001)', async (_, tabell, setning) => {
      const { s } = await lagretSak();
      const foer = await rader(tabell, s.sak_id);
      const feil = await avvisning(
        iKontekst((r) => r().input('sak', sql.NVarChar(36), s.sak_id).query(setning))
      );
      expect(feil).toBe(UFORANDERLIG);
      const etter = await rader(tabell, s.sak_id);
      expect(etter.recordset).toEqual(foer.recordset);
      expect(etter.recordset.length).toBe(1);
    });

    it.each(['sak_metadata', 'hendelse'])(
      'koe.%s kan ikke tømmes med TRUNCATE, fordi en fremmednøkkel viser til den (4712)',
      async (tabell) => {
        const feil = await avvisning(base.pool.request().batch(`TRUNCATE TABLE koe.${tabell}`));
        expect(feil).toBe(TOEMMING_AVVIST);
      }
    );
  });

  describe('katalogen', () => {
    it('ingen fremmednøkkel kaskaderer (arbeidsvalg 4)', async () => {
      const svar = await base.pool.request().query<{ name: string }>(
        `SELECT name FROM sys.foreign_keys
          WHERE delete_referential_action <> 0 OR update_referential_action <> 0`
      );
      expect(svar.recordset).toEqual([]);
    });

    it('avsenderen og oppretteren har fremmednøkkel til brukeren, teamet ingen (arbeidsvalg 2)', async () => {
      const svar = await base.pool.request().query<{ kolonne: string; til: string }>(
        `SELECT CONCAT(OBJECT_NAME(k.parent_object_id), N'.', COL_NAME(k.parent_object_id, k.parent_column_id)) AS kolonne,
                CONCAT(OBJECT_NAME(k.referenced_object_id), N'.', COL_NAME(k.referenced_object_id, k.referenced_column_id)) AS til
           FROM sys.foreign_key_columns k
          WHERE COL_NAME(k.parent_object_id, k.parent_column_id) IN (N'aktor_id', N'created_by', N'aktor_team_id')`
      );
      expect(svar.recordset.map((r) => `${r.kolonne} -> ${r.til}`).sort()).toEqual([
        'hendelse.aktor_id -> app_users.id',
        'notat.aktor_id -> app_users.id',
        'sak_metadata.created_by -> app_users.id',
      ]);
    });
  });
});
