/**
 * Innloggingen med Entra ID (S-1c del 1, #831) over HTTP mot testbasen, med en
 * falsk OIDC-utsteder: nøklene lages i testen, og tokenendepunktet kontrollerer
 * PKCE som Entra gjør. Ekte Entra prøves ikke (S9 i #831: levende prøve når
 * miljøet finnes).
 *
 * Kildene er akseptkriteriene for del 1 i kartleggingen i #831, sikkerhets-
 * invariantene i AGENTS.md (én `aktor_id`, samme issuer og normaliserte subjekt,
 * fail-closed for identiteten, CSRF i autentiseringen) og GFK-U5 (Entra-sesjonen
 * gir ingen prosjekttilgang). At hver saks- og prosjektinngang gir 403 for en
 * Entra-sesjon, prøves i `register.test.ts`.
 */

import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
  type CryptoKey,
  type JWTPayload,
} from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { sesjonsnavn } from '../autorisasjon.ts';
import { catendaFraMiljoe } from '../catenda.ts';
import { EntraOIDC, entraIdentitet, entraIssuer, UgyldigIdToken } from '../entra.ts';
import { innloggingFraMiljoe, type Innloggingsleverandoer } from '../innlogging.ts';
import { feilnummer, opprettKjoeretid, sql, type Pool } from './sqlserver.ts';
import { settInn } from './sqlserver_migrert.ts';
import {
  kall,
  lagOppsett,
  rydd,
  startServer,
  TESTBASE_URL,
  type KjorendeServer,
  type Oppsett,
} from './testbase.ts';

const KLIENT = 'klient-id';
const HEMMELIGHET = 'svært-hemmelig';
const FRONTEND = 'https://app.example.no';
const MISLYKTES = `${FRONTEND}/login?error=login_failed`;

interface Utsteder {
  url: string;
  noekkel: CryptoKey;
  annenNoekkel: CryptoKey;
  noekler: ReturnType<typeof createLocalJWKSet>;
  /** Koden Entra ville gitt, med PKCE-utfordringen og ID-tokenet den byttes mot. */
  koder: Map<string, { utfordring: string; idToken: string }>;
  stopp(): Promise<void>;
}

/** Tokenendepunktet til en falsk utsteder. Det avviser en verifier som ikke stemmer med utfordringen. */
async function startUtsteder(): Promise<Utsteder> {
  const { privateKey: noekkel, publicKey } = await generateKeyPair('RS256');
  const { privateKey: annenNoekkel } = await generateKeyPair('RS256');
  const noekler = createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), kid: 'k1' }] });
  const koder = new Map<string, { utfordring: string; idToken: string }>();
  const server: Server = createServer((foresporsel, svar) => {
    let kropp = '';
    foresporsel.on('data', (d) => (kropp += d));
    foresporsel.on('end', () => {
      const skjema = new URLSearchParams(kropp);
      const kode = koder.get(skjema.get('code') ?? '');
      koder.delete(skjema.get('code') ?? '');
      const verifier = skjema.get('code_verifier') ?? '';
      const gyldig =
        foresporsel.url === '/oauth2/v2.0/token' &&
        skjema.get('grant_type') === 'authorization_code' &&
        skjema.get('client_id') === KLIENT &&
        skjema.get('client_secret') === HEMMELIGHET &&
        kode !== undefined &&
        createHash('sha256').update(verifier).digest('base64url') === kode.utfordring;
      svar.writeHead(gyldig ? 200 : 400, { 'Content-Type': 'application/json' });
      svar.end(
        JSON.stringify(
          gyldig ? { id_token: kode.idToken, access_token: 'x' } : { error: 'invalid_grant' }
        )
      );
    });
  });
  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    noekkel,
    annenNoekkel,
    noekler,
    koder,
    stopp: () => new Promise((ok) => server.close(() => ok())),
  };
}

async function signer(innhold: JWTPayload, noekkel: CryptoKey, kid = 'k1'): Promise<string> {
  return new SignJWT(innhold).setProtectedHeader({ alg: 'RS256', kid }).sign(noekkel);
}

describe('Entra-innloggingen fra miljøet', () => {
  const miljoe = {
    APP_ENV: 'production',
    AUTH_FRONTEND_URL: FRONTEND,
    CATENDA_CLIENT_ID: 'klient',
    CATENDA_CLIENT_SECRET: HEMMELIGHET,
    CATENDA_LOGIN_REDIRECT_URI: `${FRONTEND}/api/auth/catenda/callback`,
  };
  const entra = {
    ENTRA_CLIENT_ID: KLIENT,
    ENTRA_CLIENT_SECRET: HEMMELIGHET,
    ENTRA_REDIRECT_URI: `${FRONTEND}/api/auth/entra/callback`,
    ENTRA_AUTHORITY: 'https://login.microsoftonline.com/organizations',
  };

  it('uten oppsett er Entra-innloggingen av', () => {
    expect(innloggingFraMiljoe(miljoe).entra).toBeNull();
  });

  it('med oppsett gir den lenken til autoriteten', () => {
    const { entra: e } = innloggingFraMiljoe({ ...miljoe, ...entra }, catendaFraMiljoe(miljoe));
    expect(e?.autorisasjonsadresse('s', 'n')).toMatch(
      /^https:\/\/login\.microsoftonline\.com\/organizations\/oauth2\/v2\.0\/authorize\?/
    );
  });

  it.each([
    { ENTRA_CLIENT_SECRET: '' },
    { ENTRA_AUTHORITY: '' },
    { ENTRA_REDIRECT_URI: 'http://app.example.no/api/auth/entra/callback' },
    { ENTRA_REDIRECT_URI: `${FRONTEND}/api/auth/entra/callback?x=1` },
    { ENTRA_AUTHORITY: 'http://login.microsoftonline.com/organizations' },
  ])('avviser %j uten å gi verdiene i meldingen', (endring) => {
    let feil: unknown;
    try {
      innloggingFraMiljoe({ ...miljoe, ...entra, ...endring });
    } catch (f) {
      feil = f;
    }
    expect(feil).toBeInstanceOf(Error);
    expect((feil as Error).message).not.toMatch(/svært-hemmelig|example|microsoftonline/);
  });
});

describe.skipIf(!TESTBASE_URL)('innloggingen med Entra ID mot testbasen', () => {
  const SESJON = sesjonsnavn();
  const FORSOEK = `${SESJON}_login`;
  let o: Oppsett;
  let utsteder: Utsteder;
  let server: KjorendeServer;
  let tenant: string;
  let ukjentTenant: string;
  let annenTenant: string;
  let drift: { pool: Pool; slett(): Promise<void> };

  const catenda: Innloggingsleverandoer = {
    autorisasjonsadresse: (state) => `https://catenda.test/oauth2/authorize?state=${state}`,
    byttKode: () => Promise.reject(new Error('Catenda brukes ikke her.')),
    bruker: () => Promise.reject(new Error('Catenda brukes ikke her.')),
    prosjekter: () => Promise.reject(new Error('Catenda brukes ikke her.')),
    medlemmer: () => Promise.reject(new Error('Catenda brukes ikke her.')),
  };

  beforeAll(async () => {
    o = await lagOppsett();
    utsteder = await startUtsteder();
    tenant = randomUUID();
    ukjentTenant = randomUUID();
    annenTenant = randomUUID();
    for (const t of [tenant, annenTenant])
      await settInn(() => o.datalag.base.pool.request(), 'entra_tenant', { tenant_id: t });
    drift = await opprettKjoeretid(o.datalag.base, { maks: 2, rolle: 'koe_driftsrolle' });
    const entra = new EntraOIDC({
      klientId: KLIENT,
      klienthemmelighet: HEMMELIGHET,
      tilbakekallsadresse: `${FRONTEND}/api/auth/entra/callback`,
      autoritet: utsteder.url,
      noekler: utsteder.noekler,
    });
    server = await startServer(o, { innlogging: { frontend: FRONTEND, oauth: catenda, entra } });
  }, 240_000);
  afterAll(async () => {
    await server?.stopp();
    await utsteder?.stopp();
    await drift?.slett();
    if (o) await rydd(o);
  }, 60_000);

  const eier = () => o.datalag.base.pool;

  /** `koe_drift.registrer_entra_identitet` som driften: ny bruker når `bruker` er `null`. */
  async function registrer(oid: string, bruker: string | null, t = tenant): Promise<string> {
    const svar = await drift.pool
      .request()
      .input('tenant', sql.UniqueIdentifier, t)
      .input('oid', sql.UniqueIdentifier, oid)
      .input('epost', sql.NVarChar(320), 'leder@test.example')
      .input('navn', sql.NVarChar(400), 'Leder')
      .output('bruker', sql.UniqueIdentifier, bruker)
      .execute('koe_drift.registrer_entra_identitet');
    return String(svar.output.bruker).toLowerCase();
  }

  /** En `oid` driften har registrert som ny bruker. */
  async function registrert(): Promise<string> {
    const oid = randomUUID();
    await registrer(oid, null);
    return oid;
  }
  const kapselverdi = (svar: Response, navn: string) =>
    svar.headers
      .getSetCookie()
      .find((k) => k.startsWith(`${navn}=`))
      ?.split(';', 1)[0]
      .slice(navn.length + 1);

  async function start() {
    const svar = await fetch(`${server.url}/api/auth/entra/login?return_to=/saker/1`, {
      redirect: 'manual',
    });
    const lenke = new URL(svar.headers.get('location') ?? '');
    return {
      svar,
      lenke,
      state: lenke.searchParams.get('state') ?? '',
      nonce: lenke.searchParams.get('nonce') ?? '',
      utfordring: lenke.searchParams.get('code_challenge') ?? '',
      nettleser: kapselverdi(svar, FORSOEK) ?? '',
    };
  }

  const naa = () => Math.floor(Date.now() / 1000);
  const gyldig = (nonce: string, oid: string, t = tenant): JWTPayload => ({
    iss: entraIssuer(t),
    aud: KLIENT,
    iat: naa(),
    nbf: naa(),
    exp: naa() + 3600,
    nonce,
    tid: t,
    oid,
    sub: 'per-app-subjekt',
    ver: '2.0',
    email: 'leder@test.example',
    name: 'Leder',
  });

  /** Hele innloggingen, med ID-tokenet `lagToken` gir for forsøkets nonce. */
  async function loggInn(
    lagToken: (nonce: string) => Promise<string>,
    endre: { kapsel?: string; state?: string; utfordring?: string } = {}
  ) {
    const forsoek = await start();
    const kode = randomBytes(16).toString('hex');
    utsteder.koder.set(kode, {
      utfordring: endre.utfordring ?? forsoek.utfordring,
      idToken: await lagToken(forsoek.nonce),
    });
    const svar = await fetch(
      `${server.url}/api/auth/entra/callback?state=${endre.state ?? forsoek.state}&code=${kode}`,
      {
        redirect: 'manual',
        headers: { Cookie: `${FORSOEK}=${endre.kapsel ?? forsoek.nettleser}` },
      }
    );
    return { svar, forsoek, sesjon: kapselverdi(svar, SESJON) };
  }

  const antall = async () =>
    (
      await eier()
        .request()
        .query<{ brukere: number; identiteter: number }>(
          `SELECT (SELECT COUNT(*) FROM koe.app_users) AS brukere,
                (SELECT COUNT(*) FROM koe.app_identities) AS identiteter`
        )
    ).recordset[0];

  async function sesjonsbruker(token: string) {
    const svar = await fetch(`${server.url}/api/auth/session`, {
      headers: { Cookie: `${SESJON}=${token}` },
    });
    return { status: svar.status, kropp: (await svar.json()) as Record<string, unknown> };
  }

  it('lenken har PKCE med S256, nonce, scope openid og staten, og setter innloggingskapselen', async () => {
    const { svar, lenke, state, nonce, utfordring, nettleser } = await start();
    expect(svar.status).toBe(302);
    expect(`${lenke.origin}${lenke.pathname}`).toBe(`${utsteder.url}/oauth2/v2.0/authorize`);
    expect(lenke.searchParams.get('code_challenge_method')).toBe('S256');
    expect(lenke.searchParams.get('scope')?.split(' ')).toContain('openid');
    expect(lenke.searchParams.get('client_id')).toBe(KLIENT);
    for (const verdi of [state, nonce, utfordring, nettleser]) expect(verdi).toMatch(/^[\w-]{43}$/);
    // Lenken bærer verken nettlesertokenet eller verifieren.
    expect(lenke.toString()).not.toContain(nettleser);
    expect(svar.headers.get('cache-control')).toBe('no-store');
  });

  it('et gyldig ID-token for en registrert identitet gir én sesjon med app_users.id fra koe_api.entra_identitet, og samme oid gir samme id (kriterium 1)', async () => {
    const oid = randomUUID();
    const id = await registrer(oid, null);
    const foer = await antall();
    const foerste = await loggInn((n) => signer(gyldig(n, oid), utsteder.noekkel));
    expect(foerste.svar.status).toBe(302);
    expect(foerste.svar.headers.get('location')).toBe(`${FRONTEND}/saker/1`);
    expect(foerste.sesjon).toMatch(/^[\w-]{43}$/);
    expect((await sesjonsbruker(foerste.sesjon!)).kropp.user).toMatchObject({ id });

    const andre = await loggInn((n) => signer(gyldig(n, oid), utsteder.noekkel));
    expect((await sesjonsbruker(andre.sesjon!)).kropp.user).toMatchObject({ id });
    expect(await antall()).toEqual(foer);

    const lagret = await eier().request().input('s', sql.NVarChar(400), oid).query<{
      user_id: string;
      issuer: string;
      provider: string;
    }>('SELECT user_id, issuer, provider FROM koe.app_identities WHERE subject = @s');
    expect(lagret.recordset).toEqual([
      { user_id: id.toUpperCase(), issuer: entraIssuer(tenant), provider: 'entra' },
    ]);
  });

  it('en identitet driften har koblet til en eksisterende bruker, gir den brukerens id (S5 i #831)', async () => {
    const oid = randomUUID();
    expect(await registrer(oid, o.te.id)).toBe(o.te.id);
    const { sesjon } = await loggInn((n) => signer(gyldig(n, oid), utsteder.noekkel));
    expect((await sesjonsbruker(sesjon!)).kropp.user).toMatchObject({ id: o.te.id });
  });

  it('innloggingen oppretter ingen bruker for en identitet driften ikke har registrert (svaret 20.10 i #831)', async () => {
    const foer = await antall();
    const { svar, sesjon } = await loggInn((n) =>
      signer(gyldig(n, randomUUID()), utsteder.noekkel)
    );
    expect(svar.headers.get('location')).toBe(MISLYKTES);
    expect(sesjon).toBeUndefined();
    expect(await antall()).toEqual(foer);
  });

  it.each<[string, (nonce: string, oid: string) => Promise<string>]>([
    [
      'en tenant som ikke er godkjent',
      (n, oid) => signer(gyldig(n, oid, ukjentTenant), utsteder.noekkel),
    ],
    ['feil aud', (n, oid) => signer({ ...gyldig(n, oid), aud: 'en-annen-app' }, utsteder.noekkel)],
    [
      'flere mottakere',
      (n, oid) => signer({ ...gyldig(n, oid), aud: [KLIENT, 'en-annen-app'] }, utsteder.noekkel),
    ],
    ['feil nonce', (_n, oid) => signer(gyldig('en-annen-nonce', oid), utsteder.noekkel)],
    ['uten nonce', (n, oid) => signer({ ...gyldig(n, oid), nonce: undefined }, utsteder.noekkel)],
    [
      'utløpt',
      (n, oid) =>
        signer(
          { ...gyldig(n, oid), iat: naa() - 7200, nbf: naa() - 7200, exp: naa() - 3600 },
          utsteder.noekkel
        ),
    ],
    [
      'ikke gyldig ennå',
      (n, oid) => signer({ ...gyldig(n, oid), nbf: naa() + 3600 }, utsteder.noekkel),
    ],
    [
      'en signatur som ikke stemmer med JWKS',
      (n, oid) => signer(gyldig(n, oid), utsteder.annenNoekkel),
    ],
    ['en ukjent nøkkel', (n, oid) => signer(gyldig(n, oid), utsteder.annenNoekkel, 'k2')],
    [
      'issueren i v1-formen',
      (n, oid) =>
        signer(
          { ...gyldig(n, oid), iss: `https://sts.windows.net/${tenant}/`, ver: '1.0' },
          utsteder.noekkel
        ),
    ],
    [
      'en issuer for en annen godkjent tenant enn tid',
      (n, oid) => signer({ ...gyldig(n, oid), iss: entraIssuer(annenTenant) }, utsteder.noekkel),
    ],
    ['oid i store bokstaver', (n, oid) => signer(gyldig(n, oid.toUpperCase()), utsteder.noekkel)],
    ['uten oid', (n, oid) => signer({ ...gyldig(n, oid), oid: undefined }, utsteder.noekkel)],
  ])('%s: ingen sesjon, ingen bruker og ingen identitet (kriterium 2)', async (_n, lagToken) => {
    const oid = await registrert();
    const foer = await antall();
    const { svar, sesjon } = await loggInn((n) => lagToken(n, oid));
    expect(svar.status).toBe(302);
    expect(svar.headers.get('location')).toBe(MISLYKTES);
    expect(sesjon).toBeUndefined();
    expect(await antall()).toEqual(foer);
  });

  it('en nonce fra et forsøk som er brukt, godtas ikke i et nytt forsøk (kriterium 2)', async () => {
    const oid = await registrert();
    const foerste = await loggInn((n) => signer(gyldig(n, oid), utsteder.noekkel));
    expect(foerste.sesjon).toBeDefined();
    const foer = await antall();
    const gjenbrukt = await loggInn(() =>
      signer(gyldig(foerste.forsoek.nonce, oid), utsteder.noekkel)
    );
    expect(gjenbrukt.svar.headers.get('location')).toBe(MISLYKTES);
    expect(gjenbrukt.sesjon).toBeUndefined();
    expect(await antall()).toEqual(foer);
  });

  it.each([
    ['ukjent state', { state: 'ukjent' }],
    ['en annen nettleser', { kapsel: randomBytes(32).toString('base64url') }],
    ['en kode utstedt for et annet forsøks PKCE-utfordring', { utfordring: 'annen-utfordring' }],
  ])('%s: ingen sesjon (kriterium 2)', async (_n, endre) => {
    const oid = await registrert();
    const foer = await antall();
    const { svar, sesjon } = await loggInn((n) => signer(gyldig(n, oid), utsteder.noekkel), endre);
    expect(svar.headers.get('location')).toBe(MISLYKTES);
    expect(sesjon).toBeUndefined();
    expect(await antall()).toEqual(foer);
  });

  it('roller og grupper i ID-tokenet gir ingen prosjekttilgang (kriterium 4, GFK-U5)', async () => {
    const oid = await registrert();
    const { sesjon } = await loggInn((n) =>
      signer({ ...gyldig(n, oid), roles: ['admin'], groups: [randomUUID()] }, utsteder.noekkel)
    );
    const { kropp } = await sesjonsbruker(sesjon!);
    const bruker = { id: '', subjekt: '', token: sesjon!, csrf: String(kropp.csrfToken) };
    const prosjekt = await kall(server.url, `/api/projects/${o.prosjekt.id}`, {
      bruker,
      prosjektId: o.prosjekt.id,
    });
    expect(prosjekt.status).toBe(403);
    const prosjekter = await kall(server.url, '/api/projects', { bruker, prosjektId: null });
    expect(prosjekter.status).toBe(200);
    expect(prosjekter.kropp).not.toMatchObject({ projects: [expect.anything()] });
  });

  it('utloggingen krever CSRF-token og sletter Entra-sesjonen, som for Catenda (kriterium 5)', async () => {
    const oid = await registrert();
    const { sesjon } = await loggInn((n) => signer(gyldig(n, oid), utsteder.noekkel));
    const { kropp } = await sesjonsbruker(sesjon!);
    const bruker = { id: '', subjekt: '', token: sesjon!, csrf: String(kropp.csrfToken) };
    for (const csrf of [null, 'feil']) {
      const svar = await kall(server.url, '/api/auth/logout', {
        bruker,
        prosjektId: null,
        kropp: {},
        csrf,
      });
      expect(svar.status).toBe(403);
    }
    expect(
      (await kall(server.url, '/api/auth/logout', { bruker, prosjektId: null, kropp: {} })).status
    ).toBe(200);
    expect((await sesjonsbruker(sesjon!)).status).toBe(401);
  });

  describe('koe_api.entra_identitet (kriterium 3)', () => {
    const IKKE_NORMALISERT = 52022;
    const IKKE_GODKJENT = 52024;
    const IKKE_REGISTRERT = 52025;
    const INGEN_RETT = 229;
    const CHECK_BRUDD = 547;

    const kjoeretid = () => o.datalag.kjoeretid.pool;

    async function feil(arbeid: Promise<unknown>): Promise<number | undefined> {
      try {
        await arbeid;
      } catch (f) {
        return feilnummer(f);
      }
      return undefined;
    }

    const identitet = (issuer: string, subjekt: string) =>
      entraIdentitet(kjoeretid(), { issuer, subjekt, epost: '', navn: '' });

    it('gir brukeren driften har registrert, for v2-formen og en godkjent tenant', async () => {
      const oid = randomUUID();
      const id = await registrer(oid, null);
      expect(await identitet(entraIssuer(tenant), oid)).toBe(id);
    });

    it('avviser en identitet driften ikke har registrert, og skriver ingenting', async () => {
      const foer = await antall();
      expect(await feil(identitet(entraIssuer(tenant), randomUUID()))).toBe(IKKE_REGISTRERT);
      expect(await antall()).toEqual(foer);
    });

    it.each([
      ['en tenant som ikke er godkjent', () => entraIssuer(ukjentTenant)],
      ['v1-formen med /', () => `https://sts.windows.net/${tenant}/`],
      ['v1-formen uten /', () => `https://sts.windows.net/${tenant}`],
      ['v2-formen med / til slutt', () => `${entraIssuer(tenant)}/`],
      ['v2-formen med mellomrom til slutt', () => `${entraIssuer(tenant)} `],
      ['tenanten i store bokstaver', () => entraIssuer(tenant.toUpperCase())],
      ['en annen vert', () => `https://login.microsoftonline.example/${tenant}/v2.0`],
      ['tenanten organizations', () => entraIssuer('organizations')],
    ])('avviser %s, og skriver ingenting', async (_n, issuer) => {
      const foer = await antall();
      expect(await feil(identitet(issuer(), randomUUID()))).toBe(IKKE_GODKJENT);
      expect(await antall()).toEqual(foer);
    });

    it.each([
      ['i store bokstaver', () => randomUUID().toUpperCase()],
      ['uten bindestreker', () => randomUUID().replaceAll('-', '')],
      ['med mellomrom til slutt', () => `${randomUUID()} `],
      ['med klammer', () => `{${randomUUID()}}`],
      ['tomt', () => ''],
    ])('avviser et subjekt %s', async (_n, subjekt) => {
      expect(await feil(identitet(entraIssuer(tenant), subjekt()))).toBe(IKKE_NORMALISERT);
    });

    it('kjøretiden har fortsatt ikke EXECUTE på koe.resolve_identity', async () => {
      const svar = kjoeretid()
        .request()
        .input('issuer', sql.NVarChar(400), entraIssuer(tenant))
        .input('subjekt', sql.NVarChar(400), randomUUID())
        .output('bruker', sql.UniqueIdentifier)
        .query("EXEC koe.resolve_identity N'entra', @issuer, @subjekt, N'', N'', @bruker OUTPUT");
      expect(await feil(svar)).toBe(INGEN_RETT);
    });

    it('tabellen avviser en Entra-identitet med feil form, også fra eieren', async () => {
      const bruker = randomUUID();
      await settInn(() => eier().request(), 'app_users', { id: bruker, email: '', name: '' });
      for (const [issuer, subjekt] of [
        [`${entraIssuer(tenant)}/`, randomUUID()],
        [`https://sts.windows.net/${tenant}/`, randomUUID()],
        [entraIssuer(tenant), randomUUID().toUpperCase()],
        [entraIssuer(tenant), 'per-app-subjekt'],
      ])
        expect(
          await feil(
            settInn(() => eier().request(), 'app_identities', {
              id: randomUUID(),
              user_id: bruker,
              provider: 'entra',
              issuer,
              subject: subjekt,
            })
          ),
          `${issuer} ${subjekt}`
        ).toBe(CHECK_BRUDD);
    });
  });

  describe('koe_drift.registrer_entra_identitet (svaret 20.10 i #831)', () => {
    async function feil(arbeid: Promise<unknown>): Promise<number | undefined> {
      try {
        await arbeid;
      } catch (f) {
        return feilnummer(f);
      }
      return undefined;
    }

    it('lager én ny bruker med identiteten i v2-formen og oid i små bokstaver', async () => {
      const oid = randomUUID();
      const foer = await antall();
      const id = await registrer(oid.toUpperCase(), null);
      expect(await antall()).toEqual({
        brukere: foer.brukere + 1,
        identiteter: foer.identiteter + 1,
      });
      const lagret = await eier()
        .request()
        .input('s', sql.NVarChar(400), oid)
        .query<{ issuer: string }>('SELECT issuer FROM koe.app_identities WHERE subject = @s');
      expect(lagret.recordset).toEqual([{ issuer: entraIssuer(tenant) }]);
      expect(await registrer(oid, null)).toBe(id);
      expect(await antall()).toEqual({
        brukere: foer.brukere + 1,
        identiteter: foer.identiteter + 1,
      });
    });

    it('flytter ikke en registrert identitet til en annen bruker (52026)', async () => {
      const oid = await registrert();
      expect(await feil(registrer(oid, o.bh.id))).toBe(52026);
    });

    it('avviser en tenant som ikke er godkjent (52024) og en bruker som ikke finnes (52051), og skriver ingenting', async () => {
      const foer = await antall();
      expect(await feil(registrer(randomUUID(), null, ukjentTenant))).toBe(52024);
      expect(await feil(registrer(randomUUID(), randomUUID()))).toBe(52051);
      expect(await antall()).toEqual(foer);
    });

    it('kjøretiden har ikke EXECUTE på registreringen', async () => {
      const svar = o.datalag.kjoeretid.pool
        .request()
        .input('tenant', sql.UniqueIdentifier, tenant)
        .input('oid', sql.UniqueIdentifier, randomUUID())
        .output('bruker', sql.UniqueIdentifier, null)
        .query("EXEC koe_drift.registrer_entra_identitet @tenant, @oid, N'', N'', @bruker OUTPUT");
      expect(await feil(svar)).toBe(229);
    });
  });
});

describe('valideringen av ID-tokenet', () => {
  it('kaster UgyldigIdToken, ikke en feil fra biblioteket, for en ugyldig streng', async () => {
    const { publicKey } = await generateKeyPair('RS256');
    const entra = new EntraOIDC({
      klientId: KLIENT,
      klienthemmelighet: HEMMELIGHET,
      tilbakekallsadresse: `${FRONTEND}/api/auth/entra/callback`,
      autoritet: 'https://entra.test',
      noekler: createLocalJWKSet({ keys: [await exportJWK(publicKey)] }),
    });
    await expect(entra.valider('ikke.et.token', 'n', new Date())).rejects.toBeInstanceOf(
      UgyldigIdToken
    );
  });
});
