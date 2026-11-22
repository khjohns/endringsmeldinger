import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { catendaId, sesjonsnavn } from '../autorisasjon.ts';
import { entraIssuer } from '../entra.ts';
import { synkroniserHr } from '../hrdata.ts';
import { medLoggkontekst } from '../logg.ts';
import { avvisning, settInn } from './sqlserver_migrert.ts';
import { opprettKjoeretid, sql } from './sqlserver.ts';
import { lagOppsett, rydd, startServer, TESTBASE_URL, type Oppsett } from './testbase.ts';

describe.skipIf(!TESTBASE_URL)('tilgangsloggen i SQL Server (OBS-01, OBS-02)', () => {
  let o: Oppsett;
  let drift: Awaited<ReturnType<typeof opprettKjoeretid>>;
  const tenant = randomUUID();
  const oid = randomUUID();
  const fremmedKorrelasjon = randomUUID();
  const catendaSubjekt = randomUUID();
  const eier = () => o.datalag.base.pool;
  const kjoeretid = () => o.datalag.kjoeretid.pool;

  beforeAll(async () => {
    o = await lagOppsett();
    drift = await opprettKjoeretid(o.datalag.base, { rolle: 'koe_driftsrolle' });
    await settInn(() => eier().request(), 'entra_tenant', { tenant_id: tenant });
    await eier()
      .request()
      .input('tenant', sql.UniqueIdentifier, tenant)
      .input('oid', sql.UniqueIdentifier, oid)
      .input('epost', '')
      .input('navn', '')
      .output('bruker', sql.UniqueIdentifier, o.te.id)
      .execute('koe_drift.registrer_entra_identitet');
    for (const bruker of [o.te, o.leser]) {
      await settInn(() => eier().request(), 'app_identities', {
        id: randomUUID(),
        provider: 'catenda',
        issuer: 'https://api.catenda.com',
        subject: catendaId(bruker.subjekt),
        user_id: bruker.id,
      });
    }
    await eier()
      .request()
      .input('bruker', sql.UniqueIdentifier, o.te.id)
      .query("UPDATE koe.app_project_memberships SET role = 'admin' WHERE user_id = @bruker");
  }, 240_000);

  afterAll(async () => {
    await drift?.slett();
    if (o) await rydd(o);
  });

  async function raderFor(korrelasjon: string) {
    return (
      await eier().request().input('korrelasjon', sql.UniqueIdentifier, korrelasjon)
        .query(`SELECT hendelse, utfall, grunn, prosjekt_id, LOWER(CONVERT(char(36), aktor_id)) AS aktor_id,
                    LOWER(CONVERT(char(36), beroert_bruker_id)) AS beroert_bruker_id,
                    LOWER(CONVERT(char(36), forsoekt_subjekt)) AS forsoekt_subjekt,
                    LOWER(CONVERT(char(36), forsoekt_tenant)) AS forsoekt_tenant, tidspunkt
               FROM koe.tilgangslogg WHERE korrelasjons_id = @korrelasjon ORDER BY id`)
    ).recordset;
  }

  const hendelser = async (svar: Response) => {
    const korrelasjon = svar.headers.get('X-Correlation-ID')!;
    expect(korrelasjon).toMatch(/^[0-9a-f-]{36}$/);
    expect(korrelasjon).not.toBe(fremmedKorrelasjon);
    return raderFor(korrelasjon);
  };

  const verdi = (svar: Response, navn: string) =>
    svar.headers
      .getSetCookie()
      .find((kapsel) => kapsel.startsWith(`${navn}=`))
      ?.split(';', 1)[0]
      .slice(navn.length + 1);

  it.each(['catenda', 'entra'] as const)(
    '%s-innlogging logger gjennomført og avvist forsøk med serverens korrelasjon',
    async (leverandoer) => {
      const ukjentOid = randomUUID();
      let entraOid = oid;
      const server = await startServer(o, {
        innlogging: {
          frontend: 'https://app.example.no',
          oauth: {
            autorisasjonsadresse: (state) => `https://catenda.test/?state=${state}`,
            byttKode: async () => 'token-som-ikke-skal-lagres',
            bruker: async () => ({ subjekt: catendaId(catendaSubjekt)!, epost: '', navn: '' }),
            prosjekter: async () => new Set(),
            medlemmer: async () => [],
          },
          entra: {
            autorisasjonsadresse: (state) => `https://entra.test/?state=${state}`,
            byttKode: async () => 'id-token-som-ikke-skal-lagres',
            valider: async () => ({
              issuer: entraIssuer(tenant),
              subjekt: entraOid,
              epost: '',
              navn: '',
            }),
          },
        },
      });
      try {
        const sti = `${server.url}/api/auth/${leverandoer}`;
        const forsoek = await fetch(`${sti}/login`, { redirect: 'manual' });
        const state = new URL(forsoek.headers.get('Location')!).searchParams.get('state');
        const kapselnavn = sesjonsnavn() + (leverandoer === 'entra' ? '_entra_login' : '_login');
        const hoder = { 'X-Correlation-ID': fremmedKorrelasjon };
        const avvist = await fetch(`${sti}/callback?state=${state}&code=hemmelig-kode`, {
          redirect: 'manual',
          headers: hoder,
        });
        expect(avvist.headers.get('Location')).toContain('login_failed');
        expect(await hendelser(avvist)).toMatchObject([
          {
            hendelse: `innlogging_${leverandoer}`,
            utfall: 'avvist',
            grunn: 'ugyldig_forsoek',
            aktor_id: null,
            prosjekt_id: null,
          },
        ]);
        const godtatt = await fetch(`${sti}/callback?state=${state}&code=hemmelig-kode`, {
          redirect: 'manual',
          headers: { ...hoder, Cookie: `${kapselnavn}=${verdi(forsoek, kapselnavn)}` },
        });
        expect(godtatt.headers.get('Location')).toBe('https://app.example.no/');
        const bruker = await fetch(`${server.url}/api/auth/session`, {
          headers: { Cookie: `${sesjonsnavn()}=${verdi(godtatt, sesjonsnavn())}` },
        });
        const { user } = await bruker.json();
        const rader = await hendelser(godtatt);
        expect(rader.filter((rad) => rad.hendelse.startsWith('innlogging_'))).toMatchObject([
          {
            hendelse: `innlogging_${leverandoer}`,
            utfall: 'gjennomfoert',
            grunn: null,
            aktor_id: user.id,
            prosjekt_id: null,
            tidspunkt: expect.any(Date),
          },
        ]);
        if (leverandoer === 'catenda') {
          expect(
            rader
              .filter((rad) => rad.hendelse === 'medlem_fravaer')
              .map((rad) => rad.prosjekt_id)
              .sort()
          ).toEqual([o.prosjekt.id, o.annetProsjekt.id].sort());
        } else {
          entraOid = ukjentOid;
          const nytt = await fetch(`${sti}/login`, { redirect: 'manual' });
          const nyState = new URL(nytt.headers.get('Location')!).searchParams.get('state');
          const avvistIdentitet = await fetch(
            `${sti}/callback?state=${nyState}&code=hemmelig-kode`,
            {
              redirect: 'manual',
              headers: { Cookie: `${kapselnavn}=${verdi(nytt, kapselnavn)}` },
            }
          );
          expect(avvistIdentitet.headers.get('Location')).toContain('login_failed');
          expect(await hendelser(avvistIdentitet)).toMatchObject([
            {
              hendelse: 'innlogging_entra',
              grunn: 'identitet_eller_medlemskap',
              aktor_id: null,
              forsoekt_subjekt: ukjentOid,
              forsoekt_tenant: tenant,
            },
          ]);
        }
      } finally {
        await server.stopp();
      }
    }
  );

  it('403 logger bekreftet aktør og prosjekt, og utlogging logger slettet sesjon', async () => {
    const server = await startServer(o);
    try {
      const hoder = {
        Cookie: `${sesjonsnavn()}=${o.utenfor.token}`,
        'X-Project-ID': o.prosjekt.id,
      };
      const avvist = await fetch(`${server.url}/api/projects/${o.prosjekt.id}`, { headers: hoder });
      expect(avvist.status).toBe(403);
      expect(await hendelser(avvist)).toMatchObject([
        {
          hendelse: 'autorisasjon',
          utfall: 'avvist',
          grunn: 'tilgang_nektet',
          aktor_id: o.utenfor.id,
          prosjekt_id: o.prosjekt.id,
        },
      ]);
      const ut = await fetch(`${server.url}/api/auth/logout`, {
        method: 'POST',
        headers: { ...hoder, 'X-CSRF-Token': o.utenfor.csrf },
      });
      expect(ut.status).toBe(200);
      expect(await hendelser(ut)).toMatchObject([
        {
          hendelse: 'utlogging',
          utfall: 'gjennomfoert',
          aktor_id: o.utenfor.id,
          prosjekt_id: null,
        },
      ]);
    } finally {
      await server.stopp();
    }
  });

  it('leserolle og medlemssynk logger endring med samme aktør, prosjekt og HTTP-korrelasjon', async () => {
    const { prosjekt, te, bh } = o;
    const server = await startServer(o, {
      catenda: {
        teammedlemmer: async () => new Set(),
        medlemmer: async () => [
          { subjekt: catendaId(te.subjekt)!, epost: '', navn: '', rolle: 'admin' },
          { subjekt: catendaId(o.leser.subjekt)!, epost: '', navn: '', rolle: 'member' },
        ],
      },
    });
    const headers = {
      Cookie: `${sesjonsnavn()}=${te.token}`,
      'X-Project-ID': prosjekt.id,
      'X-CSRF-Token': te.csrf,
      'Content-Type': 'application/json',
    };
    try {
      for (const leserolle of [true, false]) {
        const svar = await fetch(`${server.url}/api/projects/${prosjekt.id}/members/${bh.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ viewer_override: leserolle }),
        });
        expect(svar.status).toBe(200);
        expect(await hendelser(svar)).toMatchObject([
          {
            hendelse: leserolle ? 'leserolle_satt' : 'leserolle_fjernet',
            aktor_id: te.id,
            prosjekt_id: prosjekt.id,
            beroert_bruker_id: bh.id,
          },
        ]);
      }
      const synk = await fetch(`${server.url}/api/projects/${prosjekt.id}/members/sync`, {
        method: 'POST',
        headers,
        body: '{}',
      });
      expect(synk.status).toBe(200);
      expect(await hendelser(synk)).toMatchObject([
        {
          hendelse: 'medlemssynk',
          aktor_id: te.id,
          prosjekt_id: prosjekt.id,
        },
      ]);
    } finally {
      await server.stopp();
    }
  });

  it('deaktivering ved innlogging logger det berørte prosjektet', async () => {
    const korrelasjon = randomUUID();
    const p = o.annetProsjekt;
    const bruker = o.utenfor;
    await settInn(() => eier().request(), 'app_identities', {
      id: randomUUID(),
      provider: 'catenda',
      issuer: 'https://api.catenda.com',
      subject: catendaId(bruker.subjekt),
      user_id: bruker.id,
    });
    const svar = await kjoeretid()
      .request()
      .input('subjekt', catendaId(bruker.subjekt))
      .input('catenda_prosjekter', '[]')
      .input('korrelasjon', sql.UniqueIdentifier, korrelasjon)
      .query(`DECLARE @naa datetime2(3) = DATETRUNC(millisecond, SYSUTCDATETIME());
              EXEC koe_api.deaktiver_ved_innlogging @subjekt, @catenda_prosjekter, @naa, @korrelasjon;`);
    expect(svar.recordset).toContainEqual({ prosjekt: p.id });
    expect(
      (await raderFor(korrelasjon)).filter((rad) => rad.hendelse === 'medlem_deaktivert')
    ).toMatchObject([
      {
        hendelse: 'medlem_deaktivert',
        aktor_id: bruker.id,
        prosjekt_id: p.id,
      },
    ]);
  });

  it('HR-synkronisering logger korrelasjon uten person eller prosjekt for systemkallet', async () => {
    const korrelasjon = randomUUID();
    await eier().request().query(`EXEC koe_drift.sett_rolle N'hr_rolle', 5000;
      EXEC koe_drift.sett_stillingstittel N'HR-tittel', N'hr_rolle';`);
    await medLoggkontekst(
      () =>
        synkroniserHr(kjoeretid(), {
          tenant,
          personerMedTittel: async () => [
            { oid, stillingstittel: 'HR-tittel', leder: null, aktiv: true, epost: '', navn: '' },
          ],
        }),
      { korrelasjons_id: korrelasjon }
    );
    const kopi = await eier()
      .request()
      .input('bruker', sql.UniqueIdentifier, o.te.id)
      .query('SELECT rolle FROM koe.hr_kopi WHERE bruker_id = @bruker');
    expect(kopi.recordset).toEqual([{ rolle: 'hr_rolle' }]);
    expect(await raderFor(korrelasjon)).toMatchObject([
      {
        hendelse: 'hr_synk',
        utfall: 'gjennomfoert',
        aktor_id: null,
        prosjekt_id: null,
      },
    ]);
  });

  it('tilbakeføring av leserollen fjerner både endringen og den synlige loggraden', async () => {
    const { prosjekt, te, leser } = o;
    const korrelasjon = randomUUID();
    const r = await eier()
      .request()
      .input('aktor', sql.UniqueIdentifier, te.id)
      .input('medlem', sql.UniqueIdentifier, leser.id)
      .input('prosjekt', prosjekt.id)
      .input('korrelasjon', sql.UniqueIdentifier, korrelasjon).query(`DECLARE @endret bit;
        BEGIN TRANSACTION;
        EXEC koe_api.sett_leserolle @aktor, @prosjekt, @medlem, 0, @endret OUTPUT, @korrelasjon;
        SELECT @endret AS endret, viewer_override FROM koe.app_project_memberships
          WHERE project_id = @prosjekt AND user_id = @medlem;
        SELECT hendelse FROM koe.tilgangslogg WHERE korrelasjons_id = @korrelasjon;
        ROLLBACK;
        SELECT viewer_override FROM koe.app_project_memberships
          WHERE project_id = @prosjekt AND user_id = @medlem;`);
    expect(r.recordsets).toEqual([
      [{ endret: true, viewer_override: false }],
      [{ hendelse: 'leserolle_fjernet' }],
      [{ viewer_override: true }],
    ]);
    expect(await raderFor(korrelasjon)).toEqual([]);
  });

  it('driftsrollen logger rolle, team og prosjektkobling, og ytre tilbakeføring fjerner både endring og loggrad', async () => {
    const p = `logg-${randomUUID()}`;
    const role = 'tilgangstest_rolle';
    const team = JSON.stringify([
      { team_id: 'a'.repeat(32), contract_role: 'BH' },
      { team_id: 'b'.repeat(32), contract_role: 'TE' },
    ]);
    const catenda = randomUUID();
    const bibliotek = randomUUID();
    const registrer = `EXEC koe_drift.registrer_prosjekt @p, N'Test', NULL, N'org',
      @catenda, @bibliotek, NULL, NULL, @team;`;
    const kommando = (tekst: string) =>
      drift.pool
        .request()
        .input('p', p)
        .input('rolle', role)
        .input('team', team)
        .input('catenda', sql.UniqueIdentifier, catenda)
        .input('bibliotek', sql.UniqueIdentifier, bibliotek)
        .query(tekst);
    const driftsnavn = (await drift.pool.request().query('SELECT ORIGINAL_LOGIN() AS navn'))
      .recordset[0].navn;
    const logg = () =>
      eier()
        .request()
        .input('navn', driftsnavn)
        .query(
          'SELECT hendelse, prosjekt_id FROM koe.tilgangslogg WHERE driftsidentitet = @navn ORDER BY id'
        );

    await kommando(
      `BEGIN TRANSACTION; EXEC koe_drift.sett_rolle @rolle, 5000; ${registrer} ROLLBACK;`
    );
    expect((await logg()).recordset).toEqual([]);
    expect(
      (
        await eier()
          .request()
          .input('p', p)
          .input('rolle', role)
          .query(
            'SELECT id FROM koe.projects WHERE id = @p; SELECT rolle FROM koe.rolle WHERE rolle = @rolle;'
          )
      ).recordsets
    ).toEqual([[], []]);

    await kommando(`EXEC koe_drift.sett_rolle @rolle, 5000;
      EXEC koe_drift.sett_stillingstittel N'Testtittel', @rolle;
      ${registrer}
      EXEC koe_drift.fjern_stillingstittel N'Testtittel';
      EXEC koe_drift.fjern_rolle @rolle;`);
    expect((await logg()).recordset).toEqual([
      { hendelse: 'rolle_satt', prosjekt_id: null },
      { hendelse: 'stillingstittel_satt', prosjekt_id: null },
      { hendelse: 'prosjektkobling', prosjekt_id: p },
      { hendelse: 'kontraktsteam', prosjekt_id: p },
      { hendelse: 'stillingstittel_fjernet', prosjekt_id: null },
      { hendelse: 'rolle_fjernet', prosjekt_id: null },
    ]);
  });

  it('endringer i identitetskobling logger driftsaktør og berørt bruker, og gjentakelse gir ingen rad', async () => {
    const nyOid = randomUUID();
    const subjekt = catendaId(randomUUID())!;
    const kall = () =>
      drift.pool
        .request()
        .input('tenant', sql.UniqueIdentifier, tenant)
        .input('oid', sql.UniqueIdentifier, nyOid)
        .input('subjekt', subjekt).query(`DECLARE @bruker uniqueidentifier;
        EXEC koe_drift.registrer_entra_identitet @tenant, @oid, NULL, NULL, @bruker OUTPUT;
        EXEC koe_drift.koble_catenda_identitet @subjekt, @bruker;
        SELECT @bruker AS bruker;`);
    const { bruker } = (await kall()).recordset[0];
    await kall();
    const rader = await eier().request().input('bruker', sql.UniqueIdentifier, bruker)
      .query(`SELECT hendelse, driftsidentitet FROM koe.tilgangslogg
               WHERE beroert_bruker_id = @bruker ORDER BY id`);
    expect(rader.recordset).toEqual([
      { hendelse: 'entra_identitet_koblet', driftsidentitet: expect.any(String) },
      { hendelse: 'catenda_identitet_koblet', driftsidentitet: expect.any(String) },
    ]);
  });

  it.each([
    ['UPDATE koe.tilgangslogg SET tidspunkt = SYSUTCDATETIME()', 229, 51001],
    ['DELETE FROM koe.tilgangslogg', 229, 51001],
    ['TRUNCATE TABLE koe.tilgangslogg', 1088, 4712],
  ] as const)('avviser %s for kjøretiden og eieren', async (kommando, runtime, dbo) => {
    expect(await avvisning(kjoeretid().request().query(kommando))).toBe(runtime);
    expect(await avvisning(eier().request().query(kommando))).toBe(dbo);
  });

  it('kjøretiden har verken direkte skrivetilgang eller tilgang til den interne prosedyren', async () => {
    expect(
      await avvisning(
        kjoeretid()
          .request()
          .query("INSERT koe.tilgangslogg (hendelse, utfall) VALUES ('hr_synk', 'gjennomfoert')")
      )
    ).toBe(229);
    expect(
      await avvisning(kjoeretid().request().query("EXEC koe.skriv_tilgangslogg 'hr_synk'"))
    ).toBe(229);
    expect(
      await avvisning(
        kjoeretid()
          .request()
          .query(
            "EXEC koe_api.logg_tilgang 'autorisasjon', '481e9f77-83d4-4a83-9fa5-cbef936af591', 'raa-feilmelding'"
          )
      )
    ).toBe(547);
  });
});
