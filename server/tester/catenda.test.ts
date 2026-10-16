/**
 * Catenda-klienten mot en falsk Catenda på en lokal HTTP-server (#657).
 * Forventningene fastholder atferden i `backend/lib/auth/catenda_oauth.py`,
 * `normalize_members` i `backend/lib/auth/domain.py` og token-håndteringen i
 * `backend/integrations/catenda/base.py`, som flyttes til TS etter B-19.
 * Akseptkriteriene står i #657 (kommentaren 16.10).
 */

import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  CatendaOAuth,
  CatendaUtilgjengelig,
  Integrasjonsnokkel,
  catendaFraMiljoe,
  type CatendaOppsett,
} from '../catenda.ts';

interface Mottatt {
  metode: string;
  sti: string;
  parametre: URLSearchParams;
  autorisasjon: string | undefined;
  kropp: URLSearchParams;
}

type Svar = {
  status?: number;
  json?: unknown;
  tekst?: string;
  hoder?: Record<string, string>;
  vent?: number;
};

let server: Server;
let grunnadresse: string;
let mottatt: Mottatt[];
let svar: (m: Mottatt) => Svar;

async function les(req: IncomingMessage): Promise<string> {
  let tekst = '';
  for await (const del of req) tekst += del;
  return tekst;
}

beforeAll(async () => {
  server = createServer(async (req, res) => {
    const adresse = new URL(req.url ?? '/', 'http://x');
    const m: Mottatt = {
      metode: req.method ?? '',
      sti: adresse.pathname,
      parametre: adresse.searchParams,
      autorisasjon: req.headers.authorization,
      kropp: new URLSearchParams(await les(req)),
    };
    mottatt.push(m);
    const s = svar(m);
    if (s.vent) await new Promise((r) => setTimeout(r, s.vent));
    res.writeHead(s.status ?? 200, { 'Content-Type': 'application/json', ...s.hoder });
    res.end(s.tekst ?? JSON.stringify(s.json ?? null));
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  grunnadresse = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((r) => server.close(() => r())));

beforeEach(() => {
  mottatt = [];
  svar = () => ({ json: null });
});

const PROSJEKT = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const TEAM = '11111111-2222-4333-8444-555555555555';
const BRUKER = 'AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE';
const hex = (uuid: string) => uuid.replaceAll('-', '').toLowerCase();

function oppsett(ekstra: Partial<CatendaOppsett> = {}): CatendaOppsett {
  return {
    klientId: 'klient',
    klienthemmelighet: 'hemmelig',
    tilbakekallsadresse: 'https://app.example.no/api/auth/catenda/callback',
    grunnadresse,
    tidsavbruddMs: 2000,
    ...ekstra,
  };
}

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const medlem = (n: number, rolle = 'member') => ({
  user: { id: uuid(n), type: 'user', email: ` Bruker${n}@Example.NO `, name: `B ${n}` },
  role: rolle,
});

describe('OAuth med brukerens token', () => {
  it('autorisasjonsadressen har klienten, tilbakekallet, kodeflyten og tilstanden, URL-kodet', () => {
    const adresse = new URL(new CatendaOAuth(oppsett()).autorisasjonsadresse('a b&c'));
    expect(adresse.pathname).toBe('/oauth2/authorize');
    expect(Object.fromEntries(adresse.searchParams)).toEqual({
      client_id: 'klient',
      redirect_uri: 'https://app.example.no/api/auth/catenda/callback',
      response_type: 'code',
      response_mode: 'query',
      state: 'a b&c',
    });
  });

  it('kodebyttet poster authorization_code skjemakodet og returnerer tokenet', async () => {
    svar = () => ({ json: { access_token: 'brukertoken', token_type: 'bearer' } });
    expect(await new CatendaOAuth(oppsett()).byttKode('koden')).toBe('brukertoken');
    expect(mottatt).toHaveLength(1);
    expect(mottatt[0].metode).toBe('POST');
    expect(mottatt[0].sti).toBe('/oauth2/token');
    expect(mottatt[0].autorisasjon).toBeUndefined();
    expect(Object.fromEntries(mottatt[0].kropp)).toEqual({
      client_id: 'klient',
      client_secret: 'hemmelig',
      redirect_uri: 'https://app.example.no/api/auth/catenda/callback',
      grant_type: 'authorization_code',
      code: 'koden',
    });
  });

  it.each([
    ['uten access_token', { token_type: 'bearer' }],
    ['med tomt token', { access_token: '' }],
    ['med token som ikke er tekst', { access_token: 42 }],
    ['som liste', ['brukertoken']],
  ])('kodebyttet avvises når svaret er %s', async (_navn, json) => {
    svar = () => ({ json });
    await expect(new CatendaOAuth(oppsett()).byttKode('k')).rejects.toBeInstanceOf(
      CatendaUtilgjengelig
    );
  });

  it.each<[string, Svar]>([
    [
      '400 med tokenet i svarkroppen',
      { status: 400, json: { error: 'invalid_grant', access_token: 'LEKKET' } },
    ],
    ['500', { status: 500 }],
    ['201', { status: 201, json: { access_token: 'LEKKET' } }],
    ['302 som ikke følges', { status: 302, hoder: { Location: '/annet' } }],
    ['ugyldig JSON', { tekst: '<html>LEKKET</html>' }],
    ['tidsavbrudd', { vent: 500, json: { access_token: 'LEKKET' } }],
  ])(
    'svar med %s gir CatendaUtilgjengelig uten svarkropp eller kode i meldingen',
    async (_navn, s) => {
      svar = () => s;
      const oauth = new CatendaOAuth(oppsett({ tidsavbruddMs: 200 }));
      const feil = await oauth.byttKode('KODEN').catch((e: unknown) => e);
      expect(feil).toBeInstanceOf(CatendaUtilgjengelig);
      expect(String((feil as Error).message)).not.toMatch(/LEKKET|KODEN|hemmelig/);
      expect(mottatt.filter((m) => m.sti === '/annet')).toHaveLength(0);
    }
  );

  it('nettverksfeil gir CatendaUtilgjengelig', async () => {
    const oauth = new CatendaOAuth(oppsett({ grunnadresse: 'http://127.0.0.1:1' }));
    await expect(oauth.bruker('t')).rejects.toBeInstanceOf(CatendaUtilgjengelig);
  });

  it('brukeroppslaget sender tokenet som Bearer og normaliserer subjektet', async () => {
    svar = () => ({ json: { id: BRUKER, type: 'user', email: 'Kari@Example.no', name: 'K' } });
    expect(await new CatendaOAuth(oppsett()).bruker('brukertoken')).toEqual({
      subjekt: hex(BRUKER),
      epost: 'Kari@Example.no',
      navn: 'K',
    });
    expect(mottatt[0]).toMatchObject({
      metode: 'GET',
      sti: '/v2/user',
      autorisasjon: 'Bearer brukertoken',
    });
  });

  it('brukeroppslaget gir tom e-post og tomt navn når Catenda ikke har dem', async () => {
    svar = () => ({ json: { id: BRUKER, type: 'user', email: null } });
    expect(await new CatendaOAuth(oppsett()).bruker('t')).toEqual({
      subjekt: hex(BRUKER),
      epost: '',
      navn: '',
    });
  });

  it.each([
    ['en tjenestekonto', { id: BRUKER, type: 'service' }],
    ['uten type', { id: BRUKER }],
    ['med ugyldig ID', { id: 'ikke-en-uuid', type: 'user' }],
    ['uten ID', { type: 'user' }],
  ])('brukeroppslaget avvises for %s', async (_navn, json) => {
    svar = () => ({ json });
    await expect(new CatendaOAuth(oppsett()).bruker('t')).rejects.toBeInstanceOf(
      CatendaUtilgjengelig
    );
  });

  it('klienten holder ikke på brukertokenet mellom kall', async () => {
    svar = (m) => ({ json: m.sti === '/v2/user' ? { id: BRUKER, type: 'user' } : [] });
    const oauth = new CatendaOAuth(oppsett());
    await oauth.bruker('token-en');
    await oauth.prosjekter('token-to');
    expect(mottatt.map((m) => m.autorisasjon)).toEqual(['Bearer token-en', 'Bearer token-to']);
    expect(JSON.stringify(oauth)).not.toMatch(/token-/);
  });
});

describe('samlingene sidevis', () => {
  it('henter side for side med pageSize 100 til en side er kortere', async () => {
    svar = (m) => {
      const side = Number(m.parametre.get('page'));
      const antall = side < 3 ? 100 : 7;
      return { json: Array.from({ length: antall }, (_, i) => ({ id: uuid(side * 1000 + i) })) };
    };
    const prosjekter = await new CatendaOAuth(oppsett()).prosjekter('t');
    expect(prosjekter.size).toBe(207);
    expect(mottatt.map((m) => [m.parametre.get('page'), m.parametre.get('pageSize')])).toEqual([
      ['1', '100'],
      ['2', '100'],
      ['3', '100'],
    ]);
    expect(prosjekter.has(hex(uuid(3006)))).toBe(true);
  });

  it('en full side etterfulgt av en tom side gir hele listen', async () => {
    svar = (m) => ({
      json:
        m.parametre.get('page') === '1'
          ? Array.from({ length: 100 }, (_, i) => ({ id: uuid(i) }))
          : [],
    });
    expect((await new CatendaOAuth(oppsett()).prosjekter('t')).size).toBe(100);
    expect(mottatt).toHaveLength(2);
  });

  it('en ignorert sideparameter gir feil, ikke en avkortet liste', async () => {
    svar = () => ({ json: Array.from({ length: 100 }, (_, i) => ({ id: uuid(i) })) });
    await expect(new CatendaOAuth(oppsett()).prosjekter('t')).rejects.toBeInstanceOf(
      CatendaUtilgjengelig
    );
    expect(mottatt).toHaveLength(2);
  });

  it('flere enn 1000 fulle sider gir feil, ikke en avkortet liste', async () => {
    svar = (m) => {
      const side = Number(m.parametre.get('page'));
      return { json: Array.from({ length: 100 }, (_, i) => ({ id: `p${side}-${i}` })) };
    };
    await expect(new CatendaOAuth(oppsett()).samling('/v2/projects', 't')).rejects.toBeInstanceOf(
      CatendaUtilgjengelig
    );
    expect(mottatt).toHaveLength(1000);
  }, 60_000);

  it.each([
    ['et objekt', { items: [] }],
    ['en rad uten ID', [{ name: 'x' }]],
    ['en rad med tom ID', [{ id: '' }]],
    ['en rad som ikke er et objekt', ['x']],
    ['samme ID to ganger', [{ id: uuid(1) }, { id: uuid(1) }]],
  ])('svaret avvises når samlingen er %s', async (_navn, json) => {
    svar = () => ({ json });
    await expect(new CatendaOAuth(oppsett()).prosjekter('t')).rejects.toBeInstanceOf(
      CatendaUtilgjengelig
    );
  });

  it('et prosjekt med ugyldig ID avvises', async () => {
    svar = () => ({ json: [{ id: 'ikke-en-uuid' }] });
    await expect(new CatendaOAuth(oppsett()).prosjekter('t')).rejects.toBeInstanceOf(
      CatendaUtilgjengelig
    );
  });
});

describe('medlemmene i prosjektet', () => {
  it('normaliseres som normalize_members: e-post trimmet med små bokstaver, rollene avbildet', async () => {
    svar = () => ({ json: [medlem(1, 'owner'), medlem(2, 'administrator'), medlem(3, 'member')] });
    const medlemmer = await new CatendaOAuth(oppsett()).medlemmer(PROSJEKT.toUpperCase(), 't');
    expect(medlemmer).toEqual([
      { subjekt: hex(uuid(1)), epost: 'bruker1@example.no', navn: 'B 1', rolle: 'admin' },
      { subjekt: hex(uuid(2)), epost: 'bruker2@example.no', navn: 'B 2', rolle: 'admin' },
      { subjekt: hex(uuid(3)), epost: 'bruker3@example.no', navn: 'B 3', rolle: 'member' },
    ]);
    expect(mottatt[0].sti).toBe(`/v2/projects/${hex(PROSJEKT)}/members`);
    expect(mottatt[0].parametre.get('userType')).toBe('user');
  });

  it.each([
    ['en ukjent rolle', [medlem(1, 'viewer')]],
    ['en rolle fra prototypen', [medlem(1, 'toString')]],
    ['et team som medlem', [{ user: { id: uuid(1), type: 'team' }, role: 'member' }]],
    ['et medlem uten bruker', [{ id: uuid(1), role: 'member' }]],
    [
      'samme bruker i to former',
      [medlem(1), { ...medlem(1), user: { ...medlem(1).user, id: hex(uuid(1)) } }],
    ],
  ])('hele listen avvises ved %s', async (_navn, json) => {
    svar = () => ({ json });
    await expect(new CatendaOAuth(oppsett()).medlemmer(PROSJEKT, 't')).rejects.toBeInstanceOf(
      CatendaUtilgjengelig
    );
  });

  it('en ugyldig prosjekt-ID kaller ikke Catenda', async () => {
    await expect(new CatendaOAuth(oppsett()).medlemmer('../admin', 't')).rejects.toBeInstanceOf(
      RangeError
    );
    expect(mottatt).toHaveLength(0);
  });
});

describe('teammedlemmene', () => {
  it('gir subjektene normalisert, med prosjekt og team normalisert i stien', async () => {
    svar = () => ({
      json: [{ user: { id: BRUKER, type: 'user' } }, { user: { id: uuid(2), type: 'user' } }],
    });
    const subjekter = await new CatendaOAuth(oppsett()).teammedlemmer(PROSJEKT, `{${TEAM}}`, 't');
    expect(subjekter).toEqual(new Set([hex(BRUKER), hex(uuid(2))]));
    expect(mottatt[0].sti).toBe(`/v2/projects/${hex(PROSJEKT)}/teams/${hex(TEAM)}/members`);
  });

  it('et medlem som ikke er en person, avviser hele teamet', async () => {
    svar = () => ({
      json: [{ user: { id: BRUKER, type: 'user' } }, { user: { id: uuid(2), type: 'team' } }],
    });
    await expect(
      new CatendaOAuth(oppsett()).teammedlemmer(PROSJEKT, TEAM, 't')
    ).rejects.toBeInstanceOf(CatendaUtilgjengelig);
  });

  it('en ugyldig team-ID kaller ikke Catenda', async () => {
    await expect(
      new CatendaOAuth(oppsett()).teammedlemmer(PROSJEKT, 'x/../y', 't')
    ).rejects.toBeInstanceOf(RangeError);
    expect(mottatt).toHaveLength(0);
  });
});

function jwt(exp: number): string {
  const del = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${del({ alg: 'none' })}.${del({ exp })}.signatur`;
}

describe('integrasjonsnøkkelen', () => {
  it('henter med client_credentials og gjenbruker tokenet til expires_in minus 300 s', async () => {
    let naa = 1_000_000;
    let n = 0;
    svar = () => ({ json: { access_token: `integrasjon-${++n}`, expires_in: 600 } });
    const nokkel = new Integrasjonsnokkel(oppsett(), undefined, () => naa);
    expect(await nokkel.token()).toBe('integrasjon-1');
    expect(Object.fromEntries(mottatt[0].kropp)).toEqual({
      grant_type: 'client_credentials',
      client_id: 'klient',
      client_secret: 'hemmelig',
    });
    naa += 299_999;
    expect(await nokkel.token()).toBe('integrasjon-1');
    naa += 1;
    expect(await nokkel.token()).toBe('integrasjon-2');
    expect(mottatt).toHaveLength(2);
  });

  it('uten expires_in varer tokenet 3600 s minus 300 s', async () => {
    let naa = 0;
    svar = () => ({ json: { access_token: 'i' } });
    const nokkel = new Integrasjonsnokkel(oppsett(), undefined, () => naa);
    await nokkel.token();
    naa = 3_299_999;
    await nokkel.token();
    expect(mottatt).toHaveLength(1);
    naa = 3_300_000;
    await nokkel.token();
    expect(mottatt).toHaveLength(2);
  });

  it('samtidige kall deler én henting', async () => {
    svar = () => ({ vent: 50, json: { access_token: 'delt', expires_in: 3600 } });
    const nokkel = new Integrasjonsnokkel(oppsett());
    expect(await Promise.all([nokkel.token(), nokkel.token(), nokkel.token()])).toEqual([
      'delt',
      'delt',
      'delt',
    ]);
    expect(mottatt).toHaveLength(1);
  });

  it('et statisk token brukes til exp minus 300 s og erstattes så med client_credentials', async () => {
    let naa = 10_000_000;
    const statisk = jwt(naa / 1000 + 400);
    svar = () => ({ json: { access_token: 'fornyet', expires_in: 3600 } });
    const nokkel = new Integrasjonsnokkel(oppsett(), statisk, () => naa);
    expect(await nokkel.token()).toBe(statisk);
    naa += 99_999;
    expect(await nokkel.token()).toBe(statisk);
    expect(mottatt).toHaveLength(0);
    naa += 1;
    expect(await nokkel.token()).toBe('fornyet');
  });

  it('et statisk token uten lesbar exp antas å vare 3600 s minus 300 s', async () => {
    let naa = 0;
    svar = () => ({ json: { access_token: 'fornyet' } });
    const nokkel = new Integrasjonsnokkel(oppsett(), 'ugjennomsiktig', () => naa);
    naa = 3_299_999;
    expect(await nokkel.token()).toBe('ugjennomsiktig');
    naa = 3_300_000;
    expect(await nokkel.token()).toBe('fornyet');
  });

  it.each<[string, Svar]>([
    ['avvist (unauthorized_client)', { status: 400, json: { error: 'unauthorized_client' } }],
    ['uten token', { json: { expires_in: 3600 } }],
  ])(
    'en henting som blir %s, gir CatendaUtilgjengelig, og neste kall prøver igjen',
    async (_navn, s) => {
      svar = () => s;
      const nokkel = new Integrasjonsnokkel(oppsett());
      await expect(nokkel.token()).rejects.toBeInstanceOf(CatendaUtilgjengelig);
      svar = () => ({ json: { access_token: 'ny' } });
      expect(await nokkel.token()).toBe('ny');
    }
  );
});

describe('oppsettet fra miljøet', () => {
  const miljoe = {
    CATENDA_CLIENT_ID: 'klient',
    CATENDA_CLIENT_SECRET: 'hemmelig',
    CATENDA_LOGIN_REDIRECT_URI: 'https://app.example.no/api/auth/catenda/callback',
  };

  it('gir klienten og integrasjonsnøkkelen', () => {
    const { oauth, integrasjonsnokkel } = catendaFraMiljoe(miljoe);
    expect(new URL(oauth.autorisasjonsadresse('s')).origin).toBe('https://api.catenda.com');
    expect(integrasjonsnokkel).toBeInstanceOf(Integrasjonsnokkel);
  });

  it.each(['CATENDA_CLIENT_ID', 'CATENDA_CLIENT_SECRET', 'CATENDA_LOGIN_REDIRECT_URI'])(
    'avvises uten %s',
    (navn) => {
      expect(() => catendaFraMiljoe({ ...miljoe, [navn]: '' })).toThrow(/mangler/);
    }
  );
});
