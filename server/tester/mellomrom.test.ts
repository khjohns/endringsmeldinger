/**
 * Mellomrom til slutt i nøkler og ID-er (#566, #581), i en base bygget fra
 * `database/migrasjoner/`. `=`, `IN`, `UNIQUE` og fremmednøkler i SQL Server ser
 * bort fra mellomrom til slutt, så `p1 ` ville truffet `p1` og blitt lagret som
 * en andre verdiform. Kilden er sikkerhetsinvariantene i AGENTS.md (én verdiform
 * i journalen, ingen andre form for prosjektet) og DL-U6 (saksnummeret er en
 * tilfeldig ID appen lager). Predikatene prøves i `tilgang.test.ts`. Krever
 * `KOE_SQLSERVER_TILKOBLING`.
 */

import { randomBytes, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { opprettMigrertTestbase } from './sqlserver_migrert.ts';
import { feilnummer, sql, SQLSERVER_TILKOBLING, type Testbase } from './sqlserver.ts';

const CHECK_BRUDD = 547;
const IKKE_NORMALISERT = 52022;

const P1 = 'mellomrom-p1';
const team = () => randomBytes(16).toString('hex');
const TE1 = team();

type Rad = Record<string, unknown>;
type Foresp = () => sql.Request;
type Uttrykk = { sql: string };

/** Feilen fra basen med nummeret og meldingen, eller `undefined` når setningen gikk gjennom. */
async function avvisning(p: Promise<unknown>) {
  try {
    await p;
    return undefined;
  } catch (feil) {
    return { nummer: feilnummer(feil), melding: (feil as Error).message };
  }
}

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

describe.skipIf(!SQLSERVER_TILKOBLING)('mellomrom til slutt i SQL Server', () => {
  let base: Testbase;
  let bruker: string;

  async function catendaBruker(): Promise<string> {
    const svar = await base.pool
      .request()
      .input('subjekt', sql.NVarChar(400), team())
      .input('epost', sql.NVarChar(320), '')
      .input('navn', sql.NVarChar(400), '')
      .output('bruker', sql.UniqueIdentifier)
      .execute('koe_api.catenda_identitet');
    return String(svar.output.bruker).toLowerCase();
  }

  beforeAll(async () => {
    base = await opprettMigrertTestbase('mellomrom', { maks: 8 });
    bruker = await catendaBruker();
    await base.pool
      .request()
      .input('p', sql.NVarChar(100), P1)
      .input('u', sql.UniqueIdentifier, bruker)
      .input('s', sql.NVarChar(32), team())
      .input('t', sql.NVarChar(32), TE1).batch(`
        INSERT koe.projects (id, name, organisasjon_id, is_active) VALUES (@p, N'P1', N'org', 1);
        INSERT koe.app_project_memberships
          (project_id, user_id, catenda_subject, user_email, display_name, role, viewer_override, active)
        VALUES (@p, @u, @s, N'', N'', N'member', 0, 1);
        INSERT koe.catenda_contract_teams (internal_project_id, team_id, contract_role) VALUES (@p, @t, N'TE');`);
  }, 240_000);
  afterAll(async () => {
    await base?.slett();
  }, 60_000);

  /** Én transaksjon som eieren, med konteksten til TE1 i P1 satt først. */
  async function iKontekst<T>(arbeid: (r: Foresp) => Promise<T>): Promise<T> {
    const tx = new sql.Transaction(base.pool);
    await tx.begin();
    const r = () => new sql.Request(tx);
    try {
      await r()
        .input('aktor', sql.NVarChar(4000), bruker)
        .input('prosjekt', sql.NVarChar(4000), P1)
        .input('team', sql.NVarChar(4000), TE1).batch(`
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

  type Overstyring = { tabell: string; rad: Rad };

  /**
   * Saken, det første brevet, oppdraget, bufferen og et notat i én transaksjon,
   * med én kolonne i én tabell overstyrt.
   */
  function lagreSak(o?: Overstyring) {
    const med = (tabell: string, rad: Rad) => (o?.tabell === tabell ? { ...rad, ...o.rad } : rad);
    const sakId = randomUUID();
    const eventId = randomUUID();
    return iKontekst(async (r) => {
      const s = med('sak_metadata', {
        sak_id: sakId,
        prosjekt_id: P1,
        sakstype: 'endringsforespoersel',
        created_by: bruker,
      });
      await settInn(r, 'sak_metadata', s);
      await settInn(
        r,
        'hendelse',
        med('hendelse', {
          event_id: eventId,
          sak_id: s.sak_id,
          prosjekt_id: P1,
          event_type: 'sak_opprettet',
          versjon: 1,
          tidsstempel: new Date(),
          aktor_id: bruker,
          aktor_rolle: 'TE',
          aktor_team_id: TE1,
          refererer_til_event_id: null,
          format: 1,
          data: '{}',
          transaksjon: { sql: 'CURRENT_TRANSACTION_ID()' },
          skriving: { sql: "TRY_CAST(SESSION_CONTEXT(N'koe_skriving') AS uniqueidentifier)" },
        })
      );
      await settInn(
        r,
        'leveringsoppdrag',
        med('leveringsoppdrag', {
          id: randomUUID(),
          prosjekt_id: P1,
          sak_id: s.sak_id,
          event_id: eventId,
          dokumentnoekkel: eventId,
          innhold: '{}',
          innhold_sha256: 'a'.repeat(64),
        })
      );
      await settInn(
        r,
        'kjernebuffer',
        med('kjernebuffer', {
          sak_id: s.sak_id,
          prosjekt_id: P1,
          visning: '{}',
          projeksjonsversjon: 1,
          regelversjon: 1,
          leserformat: 1,
          saksversjon: 1,
        })
      );
      await settInn(
        r,
        'notat',
        med('notat', {
          notat_id: randomUUID(),
          sak_id: s.sak_id,
          prosjekt_id: P1,
          aktor_id: bruker,
          aktor_rolle: 'TE',
          aktor_team_id: TE1,
          tekst: 'Internt notat',
          spor: 'frist',
          refererer_til_event_id: eventId,
        })
      );
    });
  }

  describe('sakstabellene', () => {
    it('kontrollsak: saken, brevet, oppdraget, bufferen og notatet lagres i den eksakte formen', async () => {
      await lagreSak();
    });

    it.each<[string, string, Rad, string]>([
      [
        'sak_metadata',
        'prosjekt_id',
        { prosjekt_id: `${P1} ` },
        'sak_metadata_prosjekt_id_uten_mellomrom',
      ],
      [
        'sak_metadata',
        'sakstype',
        { sakstype: 'endringsforespoersel ' },
        'sak_metadata_sakstype_uten_mellomrom',
      ],
      ['hendelse', 'prosjekt_id', { prosjekt_id: `${P1} ` }, 'hendelse_prosjekt_id_uten_mellomrom'],
      [
        'hendelse',
        'event_type',
        { event_type: 'sak_opprettet ' },
        'hendelse_event_type_uten_mellomrom',
      ],
      ['notat', 'prosjekt_id', { prosjekt_id: `${P1} ` }, 'notat_prosjekt_id_uten_mellomrom'],
      ['notat', 'spor', { spor: 'frist ' }, 'notat_spor_uten_mellomrom'],
      [
        'leveringsoppdrag',
        'prosjekt_id',
        { prosjekt_id: `${P1} ` },
        'leveringsoppdrag_prosjekt_id_uten_mellomrom',
      ],
      [
        'leveringsoppdrag',
        'dokumentnoekkel',
        { dokumentnoekkel: 'nokkel ' },
        'leveringsoppdrag_dokumentnoekkel_uten_mellomrom',
      ],
      [
        'kjernebuffer',
        'prosjekt_id',
        { prosjekt_id: `${P1} ` },
        'kjernebuffer_prosjekt_id_uten_mellomrom',
      ],
    ])('%s.%s avviser mellomrom til slutt (547)', async (tabell, _, rad, begrensning) => {
      const feil = await avvisning(lagreSak({ tabell, rad }));
      expect(feil?.nummer).toBe(CHECK_BRUDD);
      expect(feil?.melding).toContain(begrensning);
    });

    it.each<[string, () => string]>([
      ['med store bokstaver', () => randomUUID().toUpperCase()],
      ['med mellomrom til slutt', () => `${randomUUID().slice(0, 35)} `],
      ['uten bindestreker', () => randomUUID().replaceAll('-', '')],
      ['som ikke er en UUID', () => 'sak-1'],
    ])('sak_metadata.sak_id avviser en ID %s (DL-U6)', async (_, sakId) => {
      const feil = await avvisning(lagreSak({ tabell: 'sak_metadata', rad: { sak_id: sakId() } }));
      expect(feil?.nummer).toBe(CHECK_BRUDD);
      expect(feil?.melding).toContain('sak_metadata_sak_id_form');
    });

    it.each<[string, string, string]>([
      ['hendelse', 'med store bokstaver', randomUUID().toUpperCase()],
      ['hendelse', 'med mellomrom til slutt', `${randomUUID().slice(0, 35)} `],
      ['notat', 'med store bokstaver', randomUUID().toUpperCase()],
      ['notat', 'med mellomrom til slutt', `${randomUUID().slice(0, 35)} `],
    ])('%s.refererer_til_event_id avviser en ID %s', async (tabell, _, verdi) => {
      const feil = await avvisning(lagreSak({ tabell, rad: { refererer_til_event_id: verdi } }));
      expect(feil?.nummer).toBe(CHECK_BRUDD);
      expect(feil?.melding).toContain(`${tabell}_refererer_til_event_id_form`);
    });
  });

  describe('identiteten og prosjektene', () => {
    async function nyttProsjekt(id: string, organisasjon = 'org') {
      return base.pool
        .request()
        .input('id', sql.NVarChar(100), id)
        .input('org', sql.NVarChar(100), organisasjon)
        .query(
          `INSERT koe.projects (id, name, organisasjon_id, is_active) VALUES (@id, N'P', @org, 1)`
        );
    }

    it('kontrollsak: et prosjekt, et medlemskap og et kontraktsteam lagres i den eksakte formen', async () => {
      const p = `mp-${randomUUID()}`;
      await nyttProsjekt(p);
      await base.pool
        .request()
        .input('p', sql.NVarChar(100), p)
        .input('u', sql.UniqueIdentifier, await catendaBruker())
        .input('s', sql.NVarChar(32), team())
        .input('t', sql.NVarChar(32), team()).query(`
          INSERT koe.app_project_memberships
            (project_id, user_id, catenda_subject, user_email, display_name, role, viewer_override, active)
          VALUES (@p, @u, @s, N'', N'', N'member', 0, 1);
          INSERT koe.catenda_contract_teams (internal_project_id, team_id, contract_role) VALUES (@p, @t, N'TE');`);
    });

    it('projects.id avviser mellomrom til slutt (547)', async () => {
      const feil = await avvisning(nyttProsjekt(`mp-${randomUUID()} `));
      expect(feil?.nummer).toBe(CHECK_BRUDD);
      expect(feil?.melding).toContain('projects_id_uten_mellomrom');
    });

    it('projects.organisasjon_id avviser mellomrom til slutt (547)', async () => {
      const feil = await avvisning(nyttProsjekt(`mp-${randomUUID()}`, 'org '));
      expect(feil?.nummer).toBe(CHECK_BRUDD);
      expect(feil?.melding).toContain('projects_organisasjon_id_uten_mellomrom');
    });

    it.each<[string, string, string]>([
      ['project_id', `${P1} `, 'member'],
      ['role', P1, 'member '],
    ])(
      'app_project_memberships.%s avviser mellomrom til slutt (547)',
      async (kolonne, p, rolle) => {
        const feil = await avvisning(
          base.pool
            .request()
            .input('p', sql.NVarChar(100), p)
            .input('u', sql.UniqueIdentifier, await catendaBruker())
            .input('s', sql.NVarChar(32), team())
            .input('r', sql.NVarChar(10), rolle).query(`
            INSERT koe.app_project_memberships
              (project_id, user_id, catenda_subject, user_email, display_name, role, viewer_override, active)
            VALUES (@p, @u, @s, N'', N'', @r, 0, 1);`)
        );
        expect(feil?.nummer).toBe(CHECK_BRUDD);
        expect(feil?.melding).toContain(`memberships_${kolonne}_uten_mellomrom`);
      }
    );

    it('catenda_contract_teams.internal_project_id avviser mellomrom til slutt (547)', async () => {
      const feil = await avvisning(
        base.pool
          .request()
          .input('p', sql.NVarChar(100), `${P1} `)
          .input('t', sql.NVarChar(32), team())
          .query(
            `INSERT koe.catenda_contract_teams (internal_project_id, team_id, contract_role) VALUES (@p, @t, N'TE')`
          )
      );
      expect(feil?.nummer).toBe(CHECK_BRUDD);
      expect(feil?.melding).toContain('contract_teams_internal_project_id_uten_mellomrom');
    });

    function identitet(provider: string, issuer: string, subject: string) {
      return base.pool
        .request()
        .input('u', sql.UniqueIdentifier, bruker)
        .input('provider', sql.NVarChar(16), provider)
        .input('issuer', sql.NVarChar(400), issuer)
        .input('subject', sql.NVarChar(400), subject)
        .query(
          `INSERT koe.app_identities (id, user_id, provider, issuer, subject)
           VALUES (NEWID(), @u, @provider, @issuer, @subject)`
        );
    }

    it('kontrollsak: tabellen godtar en Entra-identitet i den eksakte formen', async () => {
      await identitet('entra', 'https://login.example/tenant', randomUUID());
    });

    it.each<[string, string, string, string]>([
      ['provider', 'entra ', 'https://login.example/tenant', randomUUID()],
      ['issuer', 'entra', 'https://login.example/tenant ', randomUUID()],
      ['subject', 'entra', 'https://login.example/tenant', `${randomUUID()} `],
    ])(
      'app_identities.%s avviser mellomrom til slutt, også fra eieren (547)',
      async (kolonne, p, i, s) => {
        const feil = await avvisning(identitet(p, i, s));
        expect(feil?.nummer).toBe(CHECK_BRUDD);
        expect(feil?.melding).toContain(`app_identities_${kolonne}_uten_mellomrom`);
      }
    );

    function resolve(provider: string, issuer: string, subject: string) {
      return base.pool
        .request()
        .input('provider', sql.NVarChar(16), provider)
        .input('issuer', sql.NVarChar(400), issuer)
        .input('subject', sql.NVarChar(400), subject)
        .input('email', sql.NVarChar(320), '')
        .input('name', sql.NVarChar(400), '')
        .output('user_id', sql.UniqueIdentifier)
        .execute('koe.resolve_identity');
    }

    it.each<[string, (s: string) => [string, string, string]]>([
      ['provideren', (s) => ['entra ', 'https://login.example/tenant', s]],
      ['issueren', (s) => ['entra', 'https://login.example/tenant ', s]],
      ['subjektet', (s) => ['entra', 'https://login.example/tenant', `${s} `]],
    ])(
      'koe.resolve_identity avviser mellomrom etter %s og gir ikke brukeren til den eksakte formen',
      async (_, med) => {
        const s = randomUUID();
        const eksakt = await resolve('entra', 'https://login.example/tenant', s);
        expect(eksakt.output.user_id).toBeTruthy();
        const feil = await avvisning(resolve(...med(s)));
        expect(feil?.nummer).toBe(IKKE_NORMALISERT);
      }
    );
  });

  describe('kolonnene med kontrollen', () => {
    // Kolonnene #566 og #581 nevner, og de andre med samme hull: nøkler, ID-er og
    // verdier som en regel eller et predikat sammenlikner med `=` eller `IN`.
    const MED_KONTROLL = [
      'app_identities_issuer_uten_mellomrom',
      'app_membership_sync_project_id_uten_mellomrom',
      'app_identities_provider_uten_mellomrom',
      'app_identities_subject_uten_mellomrom',
      'catenda_project_configs_internal_project_id_uten_mellomrom',
      'contract_teams_internal_project_id_uten_mellomrom',
      'hendelse_event_type_uten_mellomrom',
      'hendelse_prosjekt_id_uten_mellomrom',
      'hendelse_refererer_til_event_id_form',
      'kjernebuffer_prosjekt_id_uten_mellomrom',
      'leveringsoppdrag_dokumentnoekkel_uten_mellomrom',
      'leveringsoppdrag_prosjekt_id_uten_mellomrom',
      'memberships_project_id_uten_mellomrom',
      'memberships_role_uten_mellomrom',
      'notat_prosjekt_id_uten_mellomrom',
      'notat_refererer_til_event_id_form',
      'notat_spor_uten_mellomrom',
      'projects_id_uten_mellomrom',
      'projects_organisasjon_id_uten_mellomrom',
      'sak_metadata_prosjekt_id_uten_mellomrom',
      'sak_metadata_sak_id_form',
      'sak_metadata_sakstype_uten_mellomrom',
    ];

    it('katalogen har nøyaktig disse kontrollene, og de er påslått og betrodd', async () => {
      const svar = await base.pool.request().query<{ name: string; ok: boolean }>(
        `SELECT name, CAST(IIF(is_disabled = 0 AND is_not_trusted = 0, 1, 0) AS bit) AS ok
           FROM sys.check_constraints
          WHERE name LIKE N'%[_]uten[_]mellomrom' OR name IN (N'sak_metadata_sak_id_form',
                N'hendelse_refererer_til_event_id_form', N'notat_refererer_til_event_id_form')`
      );
      expect(svar.recordset.map((r) => r.name).sort()).toEqual(MED_KONTROLL);
      expect(svar.recordset.filter((r) => !r.ok)).toEqual([]);
    });
  });
});
