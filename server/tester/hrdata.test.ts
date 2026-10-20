/**
 * Rollene og HR-kopien (S-1c del 2, #831) mot testbasen, med en falsk Graph:
 * tokenendepunktet krever client credentials, og brukerlista svarer side for side
 * og sammenlikner `jobTitle` uten hensyn til store og små bokstaver, som Graph.
 * Ekte Graph prøves ikke (S9 i #831: levende prøve når miljøet finnes). Krever
 * `KOE_SQLSERVER_TILKOBLING`.
 *
 * Kildene er GFK-U6 og GFK-U11 (driften registrerer grensen per rolle, globalt),
 * S3 (a) (driften registrerer hvilken stillingstittel som gir hvilken rolle),
 * svaret 20.10 i #831 (HR-synkroniseringen registrerer identiteten for alle med en
 * stilling som gir rolle; innloggingen oppretter aldri en bruker), S5 (a) (én
 * `aktor_id`) og GFK-U10 (fail-closed: en mistet rolle må synes, og et halvt
 * bilde lagres ikke).
 */

import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { entraIdentitet, entraIssuer } from '../entra.ts';
import { Graph, GraphUtilgjengelig, synkroniserHr, type HrKilde } from '../hrdata.ts';
import { startJobbkjoerer } from '../jobber.ts';
import { feilnummer, opprettKjoeretid, sql, SQLSERVER_TILKOBLING, type Pool } from './sqlserver.ts';
import { settInn } from './sqlserver_migrert.ts';
import { lagOppsett, rydd, type Oppsett } from './testbase.ts';

const KLIENT = 'hr-klient';
const HEMMELIGHET = 'hr-hemmelighet';
const INGEN_RETT = 229;
const CHECK_BRUDD = 547;
const UNIK_BRUDD = 2627;

interface Graphperson {
  id: string;
  jobTitle: string | null;
  accountEnabled: boolean;
  manager?: { id: string } | null;
  mail?: string;
  displayName?: string;
}

interface FalskGraph {
  url: string;
  personer: Graphperson[];
  /** Svarer 500 på denne siden av brukerlista (0 er den første), eller aldri når `null`. */
  feilPaaSide: number | null;
  /** En neste side som peker hit, i stedet for til Graph. */
  nesteSideTil: string | null;
  sider: number;
  stopp(): Promise<void>;
}

async function startGraph(tenant: string): Promise<FalskGraph> {
  const graph: FalskGraph = {
    url: '',
    personer: [],
    feilPaaSide: null,
    nesteSideTil: null,
    sider: 0,
    stopp: async () => {},
  };
  const server: Server = createServer((foresp, svar) => {
    let kropp = '';
    foresp.on('data', (d) => (kropp += d));
    foresp.on('end', () => {
      const adresse = new URL(foresp.url ?? '/', graph.url);
      const json = (status: number, data: unknown) => {
        svar.writeHead(status, { 'Content-Type': 'application/json' });
        svar.end(JSON.stringify(data));
      };
      if (adresse.pathname === `/${tenant}/oauth2/v2.0/token`) {
        const skjema = new URLSearchParams(kropp);
        const gyldig =
          foresp.method === 'POST' &&
          skjema.get('grant_type') === 'client_credentials' &&
          skjema.get('client_id') === KLIENT &&
          skjema.get('client_secret') === HEMMELIGHET &&
          skjema.get('scope') === `${graph.url}/.default`;
        return gyldig ? json(200, { access_token: 'graph-token' }) : json(400, {});
      }
      if (
        adresse.pathname !== '/v1.0/users' ||
        foresp.headers.authorization !== 'Bearer graph-token'
      )
        return json(401, {});
      const side = graph.sider++;
      if (side === graph.feilPaaSide) return json(500, {});
      const filter = /^jobTitle eq '((?:[^']|'')*)'$/.exec(
        adresse.searchParams.get('$filter') ?? ''
      );
      if (!filter) return json(400, {});
      const tittel = filter[1].replaceAll("''", "'").toLowerCase();
      const treff = graph.personer.filter((p) => p.jobTitle?.toLowerCase() === tittel);
      const fra = Number(adresse.searchParams.get('$skiptoken') ?? 0);
      const neste = new URL(adresse);
      neste.searchParams.set('$skiptoken', String(fra + 1));
      json(200, {
        value: treff.slice(fra, fra + 1),
        ...(fra + 1 < treff.length
          ? { '@odata.nextLink': graph.nesteSideTil ?? neste.toString() }
          : {}),
      });
    });
  });
  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
  graph.url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  graph.stopp = () => new Promise<void>((ok) => server.close(() => ok()));
  return graph;
}

interface Kopirad {
  rolle: string | null;
  leder_oid: string | null;
  hentet: Date;
}

describe.skipIf(!SQLSERVER_TILKOBLING)('rollene og HR-kopien fra Graph (S-1c del 2, #831)', () => {
  let o: Oppsett;
  let drift: Awaited<ReturnType<typeof opprettKjoeretid>>;
  let graph: FalskGraph;
  let kilde: Graph;
  let tenant: string;
  const eier = () => o.datalag.base.pool;
  const kjoeretid = (): Pool => o.datalag.kjoeretid.pool;

  beforeAll(async () => {
    o = await lagOppsett();
    tenant = randomUUID();
    await settInn(() => eier().request(), 'entra_tenant', { tenant_id: tenant });
    drift = await opprettKjoeretid(o.datalag.base, { maks: 2, rolle: 'koe_driftsrolle' });
    graph = await startGraph(tenant);
    kilde = new Graph({
      tenant,
      klientId: KLIENT,
      klienthemmelighet: HEMMELIGHET,
      innlogging: graph.url,
      graph: graph.url,
    });
    await settRolle('prosjektleder', 500_000);
    await settRolle('direktoer', null);
    await settTittel('Prosjektleder', 'prosjektleder');
    await settTittel('Direktør', 'direktoer');
  }, 240_000);
  afterAll(async () => {
    await graph?.stopp();
    await drift?.slett();
    if (o) await rydd(o);
  }, 60_000);
  beforeEach(() => {
    graph.personer = [];
    graph.feilPaaSide = null;
    graph.nesteSideTil = null;
    graph.sider = 0;
  });

  async function settRolle(rolle: string, grense: number | null) {
    await drift.pool
      .request()
      .input('rolle', sql.NVarChar(100), rolle)
      .input('grense', sql.Decimal(15, 2), grense)
      .execute('koe_drift.sett_rolle');
  }
  async function settTittel(tittel: string, rolle: string) {
    await drift.pool
      .request()
      .input('stillingstittel', sql.NVarChar(200), tittel)
      .input('rolle', sql.NVarChar(100), rolle)
      .execute('koe_drift.sett_stillingstittel');
  }
  async function avvisning(p: Promise<unknown>): Promise<number | undefined> {
    try {
      await p;
    } catch (feil) {
      return feilnummer(feil);
    }
    return undefined;
  }
  /** `app_users.id` for Entra-identiteten, eller `null` når den ikke er registrert. */
  async function brukerFor(oid: string): Promise<string | null> {
    const svar = await eier()
      .request()
      .input('issuer', sql.NVarChar(400), entraIssuer(tenant))
      .input('subjekt', sql.NVarChar(400), oid)
      .query<{ user_id: string }>(
        `SELECT user_id FROM koe.app_identities
          WHERE provider = N'entra' AND issuer = @issuer AND subject = @subjekt`
      );
    const id = svar.recordset[0]?.user_id;
    return id ? id.toLowerCase() : null;
  }
  async function kopi(bruker: string): Promise<Kopirad | undefined> {
    const svar = await eier()
      .request()
      .input('bruker', sql.UniqueIdentifier, bruker)
      .query<Kopirad>('SELECT rolle, leder_oid, hentet FROM koe.hr_kopi WHERE bruker_id = @bruker');
    const rad = svar.recordset[0];
    return rad && { ...rad, leder_oid: rad.leder_oid?.toLowerCase() ?? null };
  }
  const person = (tittel: string | null, ekstra: Partial<Graphperson> = {}): Graphperson => ({
    id: randomUUID(),
    jobTitle: tittel,
    accountEnabled: true,
    mail: 'person@test.example',
    displayName: 'Person',
    ...ekstra,
  });

  it('en aktiv person med en registrert tittel blir registrert med rolle og leder, og innloggingen finner samme bruker (svaret 20.10)', async () => {
    const leder = person('Direktør');
    const pl = person('Prosjektleder', { manager: { id: leder.id } });
    graph.personer = [pl, leder];
    expect(await synkroniserHr(kjoeretid(), kilde)).toBe(2);

    const bruker = await brukerFor(pl.id);
    expect(bruker).not.toBeNull();
    expect(await kopi(bruker!)).toMatchObject({ rolle: 'prosjektleder', leder_oid: leder.id });
    expect(await kopi((await brukerFor(leder.id))!)).toMatchObject({
      rolle: 'direktoer',
      leder_oid: null,
    });
    const innlogget = await entraIdentitet(kjoeretid(), {
      issuer: entraIssuer(tenant),
      subjekt: pl.id,
      epost: '',
      navn: '',
    });
    expect(innlogget).toBe(bruker);

    // En ny synkronisering gir ingen ny bruker.
    await synkroniserHr(kjoeretid(), kilde);
    expect(await brukerFor(pl.id)).toBe(bruker);
    const antall = await eier().request().input('subjekt', sql.NVarChar(400), pl.id).query<{
      n: number;
    }>(`SELECT COUNT(*) AS n FROM koe.app_identities WHERE provider = N'entra' AND subject = @subjekt`);
    expect(antall.recordset[0].n).toBe(1);
  });

  it('en identitet driften har koblet til en eksisterende bruker, får HR-kopien på den brukeren (S5 (a), én aktor_id)', async () => {
    const pl = person('Prosjektleder');
    await drift.pool
      .request()
      .input('tenant', sql.UniqueIdentifier, tenant)
      .input('oid', sql.UniqueIdentifier, pl.id)
      .input('epost', sql.NVarChar(320), '')
      .input('navn', sql.NVarChar(400), '')
      .output('bruker', sql.UniqueIdentifier, o.bh.id)
      .execute('koe_drift.registrer_entra_identitet');
    graph.personer = [pl];
    await synkroniserHr(kjoeretid(), kilde);
    expect(await brukerFor(pl.id)).toBe(o.bh.id);
    expect(await kopi(o.bh.id)).toMatchObject({ rolle: 'prosjektleder' });
  });

  it('en tittel som bare er lik uten hensyn til store bokstaver eller mellomrom, en annen tittel og en deaktivert konto gir ingen rolle og ingen registrering', async () => {
    const smaa = person('prosjektleder');
    const mellomrom = person('Prosjektleder ');
    const annen = person('Konsulent');
    const deaktivert = person('Prosjektleder', { accountEnabled: false });
    graph.personer = [smaa, mellomrom, annen, deaktivert];
    await synkroniserHr(kjoeretid(), kilde);
    for (const p of [smaa, mellomrom, annen, deaktivert]) expect(await brukerFor(p.id)).toBeNull();
  });

  it('en person som ikke lenger har tittelen, beholder raden uten rolle og leder og med nytt tidspunkt (GFK-U10)', async () => {
    const leder = person('Direktør');
    const pl = person('Prosjektleder', { manager: { id: leder.id } });
    graph.personer = [pl, leder];
    await synkroniserHr(kjoeretid(), kilde);
    const bruker = (await brukerFor(pl.id))!;
    const foer = (await kopi(bruker))!;

    graph.personer = [{ ...pl, jobTitle: 'Konsulent' }, leder];
    await synkroniserHr(kjoeretid(), kilde);
    const etter = (await kopi(bruker))!;
    expect(etter).toMatchObject({ rolle: null, leder_oid: null });
    expect(etter.hentet.getTime()).toBeGreaterThanOrEqual(foer.hentet.getTime());
    expect(await kopi((await brukerFor(leder.id))!)).toMatchObject({ rolle: 'direktoer' });

    // Kontrollsak: med tittelen igjen får den samme brukeren rollen tilbake.
    graph.personer = [pl, leder];
    await synkroniserHr(kjoeretid(), kilde);
    expect(await kopi(bruker)).toMatchObject({ rolle: 'prosjektleder', leder_oid: leder.id });
  });

  it('lista leses side for side; feiler en side, lagres ingenting (fail-closed)', async () => {
    const a = person('Prosjektleder');
    const b = person('Prosjektleder');
    graph.personer = [a, b];
    graph.feilPaaSide = 1;
    await expect(synkroniserHr(kjoeretid(), kilde)).rejects.toBeInstanceOf(GraphUtilgjengelig);
    expect(await brukerFor(a.id)).toBeNull();

    graph.feilPaaSide = null;
    graph.sider = 0;
    await synkroniserHr(kjoeretid(), kilde);
    expect(await brukerFor(a.id)).not.toBeNull();
    expect(await brukerFor(b.id)).not.toBeNull();
  });

  it('en neste side utenfor Graph følges ikke, og ingenting lagres', async () => {
    const a = person('Prosjektleder');
    graph.personer = [a, person('Prosjektleder')];
    graph.nesteSideTil = 'https://annen.example/v1.0/users';
    await expect(synkroniserHr(kjoeretid(), kilde)).rejects.toThrow('Neste side er utenfor Graph');
    expect(await brukerFor(a.id)).toBeNull();
  });

  it('en tenant som ikke er godkjent, avvises uten at noe skrives', async () => {
    const annenTenant = randomUUID();
    const p = {
      oid: randomUUID(),
      stillingstittel: 'Prosjektleder',
      leder: null,
      aktiv: true,
      epost: '',
      navn: '',
    };
    const ukjent: HrKilde = { tenant: annenTenant, personerMedTittel: async () => [p] };
    expect(await avvisning(synkroniserHr(kjoeretid(), ukjent))).toBe(52024);
    const n = await eier().request().input('subjekt', sql.NVarChar(400), p.oid).query<{
      n: number;
    }>(`SELECT COUNT(*) AS n FROM koe.app_identities WHERE subject = @subjekt`);
    expect(n.recordset[0].n).toBe(0);
  });

  it('samme oid to ganger i bildet avvises', async () => {
    const oid = randomUUID();
    const p = {
      oid,
      stillingstittel: 'Prosjektleder',
      leder: null,
      aktiv: true,
      epost: '',
      navn: '',
    };
    const dobbel: HrKilde = { tenant, personerMedTittel: async () => [p, p] };
    expect(await avvisning(synkroniserHr(kjoeretid(), dobbel))).toBe(52068);
    const deaktivertOgAktiv: HrKilde = {
      tenant,
      personerMedTittel: async () => [{ ...p, aktiv: false }, p],
    };
    expect(await avvisning(synkroniserHr(kjoeretid(), deaktivertOgAktiv))).toBe(52068);
    expect(await brukerFor(oid)).toBeNull();
  });

  it('to identiteter med rolle som driften har koblet til samme bruker, gir brukeren ingen rolle, og resten av tenanten synkroniseres (S5 (a), GFK-U10)', async () => {
    const vanlig = person('Prosjektleder');
    const admin = person('Direktør');
    const annen = person('Prosjektleder');
    const registrer = async (oid: string, bruker: string | null) => {
      const svar = await drift.pool
        .request()
        .input('tenant', sql.UniqueIdentifier, tenant)
        .input('oid', sql.UniqueIdentifier, oid)
        .input('epost', sql.NVarChar(320), '')
        .input('navn', sql.NVarChar(400), '')
        .output('bruker', sql.UniqueIdentifier, bruker)
        .execute('koe_drift.registrer_entra_identitet');
      return String(svar.output.bruker).toLowerCase();
    };
    const bruker = await registrer(vanlig.id, null);

    // Kontrollsak: med én identitet får brukeren rollen.
    graph.personer = [vanlig, annen];
    await synkroniserHr(kjoeretid(), kilde);
    expect(await kopi(bruker)).toMatchObject({ rolle: 'prosjektleder' });
    const foer = (await kopi(bruker))!.hentet;

    await registrer(admin.id, bruker);
    graph.personer = [vanlig, admin, annen];
    await synkroniserHr(kjoeretid(), kilde);
    const etter = await kopi(bruker);
    expect(etter).toMatchObject({ rolle: null, leder_oid: null });
    expect(etter!.hentet.getTime()).toBeGreaterThanOrEqual(foer.getTime());
    expect(await kopi((await brukerFor(annen.id))!)).toMatchObject({ rolle: 'prosjektleder' });
    expect(await brukerFor(admin.id)).toBe(bruker);
  });

  it('kjøretiden har ingen rett på rollene, titlene eller HR-kopien, og ingen på driftsprosedyrene', async () => {
    for (const setning of [
      'SELECT * FROM koe.rolle',
      'SELECT * FROM koe.stillingstittel',
      'SELECT * FROM koe.hr_kopi',
      "INSERT koe.rolle (rolle, grense) VALUES (N'snik', NULL)",
      "EXEC koe_drift.sett_rolle N'snik', NULL",
      "EXEC koe_drift.sett_stillingstittel N'Snik', N'prosjektleder'",
    ])
      expect(await avvisning(kjoeretid().request().batch(setning)), setning).toBe(INGEN_RETT);
  });

  describe('driftsprosedyrene (GFK-U6, GFK-U11, S3 (a))', () => {
    const grense = async (rolle: string) =>
      (
        await eier()
          .request()
          .input('rolle', sql.NVarChar(100), rolle)
          .query<{ grense: number | null }>('SELECT grense FROM koe.rolle WHERE rolle = @rolle')
      ).recordset[0]?.grense;

    it('sett_rolle registrerer og endrer grensen; NULL er ubegrenset (GFK-U4)', async () => {
      await settRolle('seksjonsleder', 100_000);
      expect(await grense('seksjonsleder')).toBe(100_000);
      await settRolle('seksjonsleder', null);
      expect(await grense('seksjonsleder')).toBeNull();
    });

    it('en negativ grense, en rolle med andre tegn enn a–z og _, og en tittel med mellomrom til slutt avvises', async () => {
      expect(await avvisning(settRolle('negativ', -1))).toBe(CHECK_BRUDD);
      expect(await avvisning(settRolle('Prosjektleder', 1))).toBe(CHECK_BRUDD);
      // Rollen med mellomrom til slutt treffer den registrerte i nøkkelen før kontrollen.
      expect([CHECK_BRUDD, UNIK_BRUDD]).toContain(await avvisning(settRolle('prosjektleder ', 1)));
      expect(await grense('prosjektleder')).toBe(500_000);
      expect(await avvisning(settTittel('Prosjektleder ', 'prosjektleder'))).toBe(CHECK_BRUDD);
      expect(await avvisning(settTittel('Ny tittel', 'finnes_ikke'))).toBe(CHECK_BRUDD);
    });

    it('fjern_rolle avviser en rolle som en tittel viser til, og fjern_stillingstittel fjerner bare den eksakte tittelen', async () => {
      await settRolle('midlertidig', 1);
      await settTittel('Midlertidig', 'midlertidig');
      const fjernRolle = () =>
        drift.pool
          .request()
          .input('rolle', sql.NVarChar(100), 'midlertidig')
          .execute('koe_drift.fjern_rolle');
      const fjernTittel = (t: string) =>
        drift.pool
          .request()
          .input('stillingstittel', sql.NVarChar(200), t)
          .execute('koe_drift.fjern_stillingstittel');
      expect(await avvisning(fjernRolle())).toBe(52061);
      await fjernTittel('midlertidig');
      expect(await avvisning(fjernRolle())).toBe(52061);
      await fjernTittel('Midlertidig');
      await fjernRolle();
      expect(await grense('midlertidig')).toBeUndefined();
    });
  });

  it('jobbkjøreren synkroniserer HR-kopien når den har en kilde, og ikke igjen før intervallet er gått', async () => {
    const pl = person('Prosjektleder');
    graph.personer = [pl];
    let kall = 0;
    let ferdig!: () => void;
    const synket = new Promise<void>((ok) => (ferdig = ok));
    const telt: HrKilde = {
      tenant,
      personerMedTittel: (titler) => (kall++, kilde.personerMedTittel(titler)),
    };
    const ikkeBrukt = () => Promise.reject(new Error('Catenda brukes ikke her.'));
    const kjoerer = startJobbkjoerer(
      {
        datalag: kjoeretid(),
        catenda: { opprettTopic: ikkeBrukt },
        dokumenter: {
          finnDokument: ikkeBrukt,
          lastOppDokument: ikkeBrukt,
          dokumentreferanser: ikkeBrukt,
          opprettDokumentreferanse: ikkeBrukt,
        },
        saksadresse: () => '',
        hr: telt,
        logg: {
          info: (melding: string) => melding.startsWith('HR-kopien er synkronisert') && ferdig(),
          warn: () => {},
          error: () => {},
        },
      },
      20
    );
    try {
      await synket;
      // Flere runder etter den første gir ingen ny synkronisering innenfor intervallet.
      for (let i = 0; i < 3; i++) {
        kjoerer.vekk();
        await new Promise((ok) => setTimeout(ok, 50));
      }
    } finally {
      await kjoerer.stopp();
    }
    expect(kall).toBe(1);
    expect(await kopi((await brukerFor(pl.id))!)).toMatchObject({ rolle: 'prosjektleder' });
  });
});
