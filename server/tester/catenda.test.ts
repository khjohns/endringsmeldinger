/**
 * Catenda-klienten mot en falsk Catenda på en lokal HTTP-server (#657).
 * Forventningene fastholder atferden i `backend/lib/auth/catenda_oauth.py`,
 * `normalize_members` i `backend/lib/auth/domain.py` og token-håndteringen i
 * `backend/integrations/catenda/base.py`, som flyttes til TS etter B-19.
 * Akseptkriteriene står i #657 (kommentaren 16.10).
 */

import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { inspect } from 'node:util';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  CatendaAvvisning,
  CatendaOAuth,
  CatendaOppsettfeil,
  CatendaUtilgjengelig,
  dokumentleverandoer,
  Integrasjonsnokkel,
  medEndringsflagg,
  TOPICTYPE,
  topicoppretter,
  UsikkertCatendautfall,
  VarigCatendaavvik,
  catendaFraMiljoe,
  type CatendaOppsett,
} from '../catenda.ts';

interface Mottatt {
  metode: string;
  sti: string;
  parametre: URLSearchParams;
  autorisasjon: string | undefined;
  kropp: URLSearchParams;
  raa: string;
  hoder: IncomingMessage['headers'];
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
    const raa = await les(req);
    const m: Mottatt = {
      metode: req.method ?? '',
      sti: adresse.pathname,
      parametre: adresse.searchParams,
      autorisasjon: req.headers.authorization,
      kropp: new URLSearchParams(raa),
      raa,
      hoder: req.headers,
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

  it('klienten og nøkkelen viser ikke klienthemmeligheten eller tokenet når de serialiseres eller logges', () => {
    const oauth = new CatendaOAuth(oppsett());
    const nokkel = new Integrasjonsnokkel(oppsett(), 'statisk-token');
    for (const objekt of [oauth, nokkel]) {
      expect(JSON.stringify(objekt)).not.toMatch(/hemmelig|statisk-token/);
      expect(inspect(objekt, { showHidden: true, depth: 5 })).not.toMatch(/hemmelig|statisk-token/);
    }
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

  it('en rad med tom id nøkles på brukerens ID, som i collection i Python', async () => {
    svar = () => ({
      json: [
        { ...medlem(1), id: '' },
        { ...medlem(2), id: '' },
      ],
    });
    const medlemmer = await new CatendaOAuth(oppsett()).medlemmer(PROSJEKT, 't');
    expect(medlemmer.map((m) => m.subjekt)).toEqual([hex(uuid(1)), hex(uuid(2))]);
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

describe('Catenda-prosjektet til et board (#836 punkt 2)', () => {
  it('leser bimsync_project_id i boardets detaljer, normalisert', async () => {
    const board = uuid(7);
    svar = () => ({ json: { project_id: board, bimsync_project_id: PROSJEKT, name: 'KOE' } });
    expect(await new CatendaOAuth(oppsett()).boardetsProsjekt(board, 't')).toBe(hex(PROSJEKT));
    expect(mottatt[0].sti).toBe(`/opencde/bcf/3.0/projects/${board}`);
    expect(mottatt[0].autorisasjon).toBe('Bearer t');
  });

  it('et ukjent board (404) gir null', async () => {
    svar = () => ({ status: 404 });
    expect(await new CatendaOAuth(oppsett()).boardetsProsjekt(uuid(7), 't')).toBeNull();
  });

  it.each([
    ['uten gyldig bimsync_project_id', { project_id: uuid(7), bimsync_project_id: 'x' }],
    ['for et annet board', { project_id: uuid(8), bimsync_project_id: PROSJEKT }],
  ])('et svar %s avvises', async (_, json) => {
    svar = () => ({ json });
    await expect(new CatendaOAuth(oppsett()).boardetsProsjekt(uuid(7), 't')).rejects.toBeInstanceOf(
      CatendaUtilgjengelig
    );
  });

  it('en board-ID som ikke er en UUID, når ikke Catenda', async () => {
    await expect(
      new CatendaOAuth(oppsett()).boardetsProsjekt('x/../y', 't')
    ).rejects.toBeInstanceOf(RangeError);
    expect(mottatt).toHaveLength(0);
  });
});

function jwt(exp: number): string {
  const del = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${del({ alg: 'none' })}.${del({ exp })}.signatur`;
}

describe('topicen på boardet for innboksen (#819)', () => {
  const board = uuid(7);
  const topic = uuid(9);

  it('leser tittelen, typen og forfatteren fra topicen, normalisert', async () => {
    svar = () => ({
      json: {
        guid: topic,
        title: 'Rystelser',
        topic_type: TOPICTYPE,
        bimsync_creation_author: { user: { ref: BRUKER, name: 'Kari' } },
      },
    });
    expect(await new CatendaOAuth(oppsett()).topic(board, topic, 't')).toEqual({
      tittel: 'Rystelser',
      type: TOPICTYPE,
      forfatter: hex(BRUKER),
    });
    expect(mottatt[0].sti).toBe(`/opencde/bcf/3.0/projects/${board}/topics/${topic}`);
    expect(mottatt[0].autorisasjon).toBe('Bearer t');
  });

  it('en topic uten forfatter gir forfatteren null', async () => {
    svar = () => ({ json: { guid: topic, title: 'x', topic_type: TOPICTYPE } });
    expect((await new CatendaOAuth(oppsett()).topic(board, topic, 't'))?.forfatter).toBeNull();
  });

  it('en topic Catenda ikke finner på boardet (404), gir null', async () => {
    svar = () => ({ status: 404 });
    expect(await new CatendaOAuth(oppsett()).topic(board, topic, 't')).toBeNull();
  });

  it('en topic uten tittel og type gir tomme verdier, ikke en feil som stenger innboksen', async () => {
    svar = () => ({ json: { guid: topic, topic_type: null } });
    expect(await new CatendaOAuth(oppsett()).topic(board, topic, 't')).toMatchObject({
      tittel: '',
      type: '',
    });
  });

  it.each([
    ['for en annen topic', { guid: uuid(8), title: 'x', topic_type: TOPICTYPE }],
    ['som ikke er et objekt', []],
  ])('et svar %s er et varig avvik', async (_, json) => {
    svar = () => ({ json });
    await expect(new CatendaOAuth(oppsett()).topic(board, topic, 't')).rejects.toBeInstanceOf(
      VarigCatendaavvik
    );
  });

  it('en topic-ID som ikke kan stå i stien, når ikke Catenda', async () => {
    await expect(new CatendaOAuth(oppsett()).topic(board, '../x', 't')).rejects.toBeInstanceOf(
      RangeError
    );
    expect(mottatt).toHaveLength(0);
  });
});

describe('topicen for en sak fra appen (#741)', () => {
  const BOARD = '6f1c2d3e-4a5b-4c6d-8e7f-901a2b3c4d5e';
  const topic = {
    tittel: 'Endret fundamentering',
    beskrivelse: 'Saken: https://app.example.no/p/s/kjerne',
  };

  it('poster tittelen, beskrivelsen og typen uten status, og gir GUID-en (punkt 15)', async () => {
    svar = () => ({ status: 201, json: { guid: 'topic-1', title: topic.tittel } });
    const oauth = new CatendaOAuth(oppsett());
    expect(await oauth.opprettTopic(BOARD, topic, 'integrasjon')).toBe('topic-1');
    const [m] = mottatt;
    expect(m.metode).toBe('POST');
    expect(m.sti).toBe(`/opencde/bcf/3.0/projects/${BOARD}/topics`);
    expect(m.autorisasjon).toBe('Bearer integrasjon');
    expect(JSON.parse(m.raa)).toEqual({
      title: topic.tittel,
      description: topic.beskrivelse,
      topic_type: TOPICTYPE,
    });
    expect(TOPICTYPE).toBe('Krav om endringsordre');
  });

  it.each([400, 403, 404, 429])(
    'avvisningen %i er en sikker feil, ikke et usikkert utfall (arbeidsvalget i PR #772)',
    async (status) => {
      svar = () => ({ status, json: { message: 'LEKKET' } });
      const feil = await new CatendaOAuth(oppsett())
        .opprettTopic(BOARD, topic, 't')
        .catch((e) => e);
      expect(feil).toBeInstanceOf(CatendaUtilgjengelig);
      expect(feil).not.toBeInstanceOf(UsikkertCatendautfall);
      // En varig avvisning parkeres; 429 går over og prøves igjen (#778).
      expect(feil instanceof CatendaAvvisning).toBe(status !== 429);
      expect(String(feil.message)).not.toMatch(/LEKKET/);
    }
  );

  it('når forbindelsen avvises, er topicen ikke laget', async () => {
    const lukket = createServer();
    await new Promise<void>((r) => lukket.listen(0, '127.0.0.1', r));
    const port = (lukket.address() as AddressInfo).port;
    await new Promise<void>((r) => lukket.close(() => r()));
    const oauth = new CatendaOAuth(oppsett({ grunnadresse: `http://127.0.0.1:${port}` }));
    const feil = await oauth.opprettTopic(BOARD, topic, 't').catch((e) => e);
    expect(feil).toBeInstanceOf(CatendaUtilgjengelig);
    expect(feil).not.toBeInstanceOf(UsikkertCatendautfall);
  });

  it.each<[string, Svar]>([
    ['svaret uteblir til tidsavbruddet', { vent: 500, json: { guid: 'sen' } }],
    ['Catenda svarer 500', { status: 500, json: { message: 'x' } }],
    ['en mellomtjener svarer 504', { status: 504, tekst: 'Gateway Timeout' }],
    ['en mellomtjener svarer 503', { status: 503, tekst: 'Service Unavailable' }],
    ['en mellomtjener svarer 408', { status: 408, tekst: 'Request Timeout' }],
    ['en mellomtjener svarer 499', { status: 499, tekst: 'Client Closed Request' }],
    ['Catenda svarer 202', { status: 202, json: { guid: 'x' } }],
    ['Catenda omdirigerer', { status: 303, tekst: '' }],
    ['svaret er ikke JSON', { status: 201, tekst: 'ikke json' }],
    ['svaret har ingen GUID', { status: 201, json: { title: 'x' } }],
  ])('%s: utfallet er usikkert (invariant 7)', async (_n, s) => {
    svar = () => s;
    const oauth = new CatendaOAuth(oppsett({ tidsavbruddMs: 100 }));
    await expect(oauth.opprettTopic(BOARD, topic, 't')).rejects.toBeInstanceOf(
      UsikkertCatendautfall
    );
  });

  it('en ugyldig board-ID kaller ikke Catenda', async () => {
    const oauth = new CatendaOAuth(oppsett());
    await expect(oauth.opprettTopic('../x', topic, 't')).rejects.toBeInstanceOf(RangeError);
    expect(mottatt).toHaveLength(0);
  });
});

describe('brevet som dokument med referansen på topicen (#371)', () => {
  const maal = {
    catenda_project_id: '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
    library_id: '1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e',
    folder_id: '2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e6f',
  };
  const BOARD = '6f1c2d3e-4a5b-4c6d-8e7f-901a2b3c4d5e';
  const dokument = {
    navn: 'brev-s-2-noekkel.txt',
    innhold: new TextEncoder().encode('Brevet æøå'),
  };
  const bibliotek = `/v2/projects/${maal.catenda_project_id}/libraries/${maal.library_id}/items`;

  it('laster opp filen med failOnDocumentExists og navnet, i mappen, og gir ID-en (B-03)', async () => {
    svar = () => ({ status: 201, json: [{ id: 'abc123', name: dokument.navn }] });
    expect(await new CatendaOAuth(oppsett()).lastOppDokument(maal, dokument, 'i')).toBe('abc123');
    const [m] = mottatt;
    expect([m.metode, m.sti, m.autorisasjon]).toEqual(['POST', bibliotek, 'Bearer i']);
    expect(m.hoder['content-type']).toBe('application/octet-stream');
    expect(JSON.parse(String(m.hoder['bimsync-params']))).toEqual({
      name: dokument.navn,
      document: { type: 'file', filename: dokument.navn },
      failOnDocumentExists: true,
      parentId: maal.folder_id,
    });
    expect(m.raa).toBe('Brevet æøå');
  });

  // Kilde: #903, og #921 for DEL (U+007F), som `fetch` avviser i et hode.
  it('et navn med tegn fra U+007F sendes som \\uXXXX i Bimsync-Params og leses tilbake uendret (#903)', async () => {
    svar = () => ({ status: 201, json: [{ id: 'abc123' }] });
    const navn = 'vedlegg-Łódź-æøå-😀-\x7f.pdf';
    expect(
      await new CatendaOAuth(oppsett()).lastOppDokument(maal, { ...dokument, navn }, 'i')
    ).toBe('abc123');
    const hode = String(mottatt[0].hoder['bimsync-params']);
    expect(hode).toMatch(/^[\x20-\x7e]+$/);
    expect(hode).toContain('\\u0141\\u00f3d\\u017a');
    expect(hode).toContain('\\u007f');
    expect(JSON.parse(hode)).toMatchObject({ name: navn, document: { filename: navn } });
  });

  it('et dokument som finnes med navnet (409), gir null, ikke en feil', async () => {
    svar = () => ({ status: 409, json: { message: 'exists' } });
    expect(await new CatendaOAuth(oppsett()).lastOppDokument(maal, dokument, 'i')).toBeNull();
  });

  it.each<[string, Svar]>([
    ['Catenda svarer 503', { status: 503, tekst: 'Service Unavailable' }],
    ['svaret har ingen ID', { status: 201, json: [{ name: 'x' }] }],
  ])('%s ved opplastingen: utfallet er usikkert (invariant 7)', async (_n, s) => {
    svar = () => s;
    await expect(
      new CatendaOAuth(oppsett()).lastOppDokument(maal, dokument, 'i')
    ).rejects.toBeInstanceOf(UsikkertCatendautfall);
  });

  // Arbeidsvalg (#877, #895-6): Catenda gir de samme to dokumentene ved neste forsøk, så
  // jobben parkeres som for #891, i stedet for å prøves igjen uten ende.
  it('finner dokumentet på navnet i mappen, og to med samme navn gir VarigCatendaavvik', async () => {
    svar = () => ({
      json: [
        { id: 'a1', name: 'annet' },
        { id: 'b2', name: dokument.navn },
      ],
    });
    const oauth = new CatendaOAuth(oppsett());
    expect(await oauth.finnDokument(maal, dokument.navn, 'i')).toBe('b2');
    expect(mottatt[0].sti).toBe(bibliotek);
    expect(mottatt[0].parametre.get('parentId')).toBe(maal.folder_id);
    expect(mottatt[0].parametre.get('search')).toBe(dokument.navn);
    expect(await oauth.finnDokument(maal, 'ukjent', 'i')).toBeNull();
    svar = () => ({
      json: [
        { id: 'a1', name: dokument.navn },
        { id: 'b2', name: dokument.navn },
      ],
    });
    await expect(oauth.finnDokument(maal, dokument.navn, 'i')).rejects.toBeInstanceOf(
      VarigCatendaavvik
    );
  });

  it('leser referansene med dokument-ID-en normalisert som catendaId, ellers som den er, og setter en ny (#783 punkt 4, #876)', async () => {
    const sti = `/opencde/bcf/3.0/projects/${BOARD}/topics/topic-1/document_references`;
    svar = () => ({
      json: [
        { guid: 'r1', document_guid: `{${BRUKER}}` },
        { guid: 'r2', document_guid: 'dok-1' },
      ],
    });
    const oauth = new CatendaOAuth(oppsett());
    expect(await oauth.dokumentreferanser(BOARD, 'topic-1', 'i')).toEqual([
      { id: 'r1', dokumentId: hex(BRUKER) },
      { id: 'r2', dokumentId: 'dok-1' },
    ]);
    svar = () => ({ status: 201, json: { guid: 'r3' } });
    expect(await oauth.opprettDokumentreferanse(BOARD, 'topic-1', 'abcd1234', 'i')).toBe('r3');
    expect([mottatt[1].metode, mottatt[1].sti]).toEqual(['POST', sti]);
    expect(JSON.parse(mottatt[1].raa)).toEqual({ document_guid: 'abcd1234' });
  });

  it('setter referansen med dokument-ID-en fra biblioteket som UUID med bindestreker, som BCF-API-et finner (#902)', async () => {
    svar = () => ({ status: 201, json: { guid: 'r3' } });
    const oauth = new CatendaOAuth(oppsett());
    await oauth.opprettDokumentreferanse(BOARD, 'topic-1', hex(BRUKER), 'i');
    await oauth.opprettDokumentreferanse(BOARD, 'topic-1', BRUKER, 'i');
    expect(mottatt.map((m) => JSON.parse(m.raa))).toEqual([
      { document_guid: BRUKER.toLowerCase() },
      { document_guid: BRUKER.toLowerCase() },
    ]);
  });

  // Kilde: oppdragsgiver 19.10 (#764): en referanse som verken er et dokument eller en
  // lenke, hoppes ikke over, avviket er varig, og meldingen sier hvilken referanse det er.
  it.each<[string, unknown, string]>([
    ['en referanse uten dokument', [{ guid: 'r2' }], 'med GUID r2'],
    ['en referanse med et tomt dokument', [{ guid: 'r2', document_guid: '' }], 'med GUID r2'],
    [
      'en referanse med et dokument som ikke er tekst',
      [{ guid: 'r2', document_guid: 7 }],
      'med GUID r2',
    ],
    [
      'en referanse med tom url og uten dokument',
      [
        { guid: 'r1', document_guid: 'dok-1' },
        { guid: 'r2', url: '' },
      ],
      'med GUID r2',
    ],
    [
      'en referanse med både url og et tomt dokument',
      [{ guid: 'r2', url: 'https://eksempel.no', document_guid: '' }],
      'med GUID r2',
    ],
    [
      'en referanse med en url som bare er mellomrom (#895-7)',
      [{ guid: 'r1', url: '  ' }],
      'med GUID r1',
    ],
    [
      'en referanse uten dokument og med GUID av feil form',
      [{ guid: 'r1', document_guid: 'dok-1' }, { guid: ' r2' }],
      'nr. 2',
    ],
    [
      'en referanse uten dokument og med en GUID i form av en UUID',
      [{ guid: '0f8fad5b-d9cb-469f-a165-70867728950e' }],
      'med GUID 0f8fad5b-d9cb-469f-a165-70867728950e',
    ],
    // Arbeidsvalg (#895): meldingen lagres og logges, så en GUID med andre tegn enn
    // bokstaver, sifre, _ og - nevnes ved nummeret.
    [
      'en referanse uten dokument og med linjeskift i GUID-en',
      [{ guid: 'r2\nJobben er levert' }],
      'nr. 1',
    ],
  ])(
    '%s fra Catenda gir VarigCatendaavvik som nevner referansen (#876, #877)',
    async (_n, json, navn) => {
      svar = () => ({ json });
      const feil = await new CatendaOAuth(oppsett())
        .dokumentreferanser(BOARD, 'topic-1', 'i')
        .catch((f: unknown) => f);
      expect(feil).toBeInstanceOf(VarigCatendaavvik);
      expect((feil as Error).message).toBe(
        `Referansen ${navn} på topicen viser verken til et dokument eller en lenke`
      );
    }
  );

  // Kilde: oppdragsgiver 19.10 (#764, #877): en lenke er en gyldig referanse og hoppes over.
  it('en lenke på topicen, med url og uten dokument, hoppes over når dokumentene leses (#877)', async () => {
    svar = () => ({
      json: [
        { guid: 'r1', url: 'https://eksempel.no/a' },
        { guid: 'r2', document_guid: 'dok-1' },
        { guid: 'r3', url: 'https://eksempel.no/b', document_guid: null },
      ],
    });
    expect(await new CatendaOAuth(oppsett()).dokumentreferanser(BOARD, 'topic-1', 'i')).toEqual([
      { id: 'r2', dokumentId: 'dok-1' },
    ]);
  });

  it('flagget for endring settes før en opplasting eller en ny referanse, ikke ved en lesing (#876)', async () => {
    const oauth = new CatendaOAuth(oppsett());
    const etter = async (kall: () => Promise<unknown>) => {
      const flagg = { endringBedt: false };
      await medEndringsflagg(flagg, kall).catch(() => {});
      return flagg.endringBedt;
    };
    svar = () => ({ json: [] });
    expect(await etter(() => oauth.dokumentreferanser(BOARD, 'topic-1', 'i'))).toBe(false);
    expect(await etter(() => oauth.finnDokument(maal, dokument.navn, 'i'))).toBe(false);
    svar = () => ({ status: 500, json: {} });
    expect(await etter(() => oauth.lastOppDokument(maal, dokument, 'i'))).toBe(true);
    expect(await etter(() => oauth.opprettDokumentreferanse(BOARD, 'topic-1', 'd', 'i'))).toBe(
      true
    );
    expect(
      await etter(() => oauth.opprettTopic(BOARD, { tittel: 't', beskrivelse: 'b' }, 'i'))
    ).toBe(true);
  });

  // Kilde: #783 punkt 3: en rad med feil form droppes ikke, så referansen lages ikke to ganger.
  // Kilde: oppdragsgiver 19.10 (#764): feil form er et varig avvik, som r1 (#891).
  it.each<[string, unknown]>([
    ['en referanse uten GUID', [{ document_guid: BRUKER }]],
    ['en referanse med en GUID over 100 tegn', [{ guid: 'r'.repeat(101), document_guid: BRUKER }]],
    ['en referanse med mellomrom rundt GUID-en', [{ guid: ' r1', document_guid: BRUKER }]],
    [
      'en referanse med en GUID med tegn utenfor [!-~] (#889-6)',
      [{ guid: 'ræ', document_guid: BRUKER }],
    ],
  ])(
    '%s fra Catenda gir VarigCatendaavvik som nevner referansen (#891, #895-4)',
    async (_n, json) => {
      svar = () => ({ json: [{ guid: 'r0', document_guid: BRUKER }, ...(json as unknown[])] });
      const feil = await new CatendaOAuth(oppsett())
        .dokumentreferanser(BOARD, 'topic-1', 'i')
        .catch((f: unknown) => f);
      expect(feil).toBeInstanceOf(VarigCatendaavvik);
      expect((feil as Error).message).toBe('Referansen nr. 2 på topicen har en GUID av feil form');
    }
  );

  // Kilde: tegnklassen `[!-~]` og lengden på `koe.leveringskvittering.catenda_id` (#889-6). En ny
  // ID og en ID som finnes igjen, har samme regel (#895-1).
  it.each(['abc 123', ' abc123', 'abcæ123', 'a'.repeat(101)])(
    'ID-en %j avvises både i svaret på opplastingen og når dokumentet finnes igjen (#895-1, #889-6)',
    async (id) => {
      const oauth = new CatendaOAuth(oppsett());
      svar = () => ({ status: 201, json: [{ id }] });
      await expect(oauth.lastOppDokument(maal, dokument, 'i')).rejects.toBeInstanceOf(
        UsikkertCatendautfall
      );
      svar = () => ({ json: [{ id, name: dokument.navn }] });
      await expect(oauth.finnDokument(maal, dokument.navn, 'i')).rejects.toBeInstanceOf(
        VarigCatendaavvik
      );
    }
  );

  // #877 p26: flagget følger den asynkrone konteksten. Kallet gjennom leverandøren venter først på
  // tokenet, og en henting som en annen kontekst startet, skal ikke ta med seg merket.
  it('flagget settes også gjennom leverandørene når tokenet hentes først, og bare i konteksten som ba om endringen (#877 p26)', async () => {
    svar = (m) =>
      m.sti === '/oauth2/token'
        ? { vent: 50, json: { access_token: 't', expires_in: 3600 } }
        : { status: 500, json: {} };
    const catenda = {
      oauth: new CatendaOAuth(oppsett()),
      integrasjonsnokkel: new Integrasjonsnokkel(oppsett()),
    };
    const lesing = { endringBedt: false };
    const endring = { endringBedt: false };
    const topic = { endringBedt: false };
    await Promise.all([
      medEndringsflagg(lesing, () =>
        dokumentleverandoer(catenda).dokumentreferanser(BOARD, 'topic-1')
      ).catch(() => {}),
      medEndringsflagg(endring, () =>
        dokumentleverandoer(catenda).lastOppDokument(maal, dokument)
      ).catch(() => {}),
      medEndringsflagg(topic, () =>
        topicoppretter(catenda).opprettTopic(BOARD, { tittel: 't', beskrivelse: 'b' })
      ).catch(() => {}),
    ]);
    expect(mottatt.filter((m) => m.sti === '/oauth2/token')).toHaveLength(1);
    expect([lesing, endring, topic].map((f) => f.endringBedt)).toEqual([false, true, true]);
  });

  it('et dokument som finnes igjen med en ID av feil form, gir VarigCatendaavvik (#783 punkt 3, #891)', async () => {
    svar = () => ({ json: [{ id: ' b2', name: dokument.navn }] });
    await expect(
      new CatendaOAuth(oppsett()).finnDokument(maal, dokument.navn, 'i')
    ).rejects.toBeInstanceOf(VarigCatendaavvik);
  });

  it('et token Catenda svarer 401 på, forkastes, og neste kall henter et nytt (#783 punkt 5)', async () => {
    let n = 0;
    svar = (m) =>
      m.sti === '/oauth2/token'
        ? { json: { access_token: `token-${++n}`, expires_in: 3600 } }
        : m.autorisasjon === 'Bearer token-1'
          ? { status: 401, json: {} }
          : { json: [] };
    const catenda = {
      oauth: new CatendaOAuth(oppsett()),
      integrasjonsnokkel: new Integrasjonsnokkel(oppsett()),
    };
    const leverandoer = dokumentleverandoer(catenda);
    await expect(leverandoer.dokumentreferanser(BOARD, 'topic-1')).rejects.toBeInstanceOf(
      CatendaUtilgjengelig
    );
    expect(await leverandoer.dokumentreferanser(BOARD, 'topic-1')).toEqual([]);
    expect(mottatt.map((m) => m.autorisasjon ?? m.sti)).toEqual([
      '/oauth2/token',
      'Bearer token-1',
      '/oauth2/token',
      'Bearer token-2',
    ]);
  });

  it('et ugyldig mål eller en ugyldig topic kaller ikke Catenda', async () => {
    const oauth = new CatendaOAuth(oppsett());
    await expect(
      oauth.lastOppDokument({ ...maal, library_id: '../x' }, dokument, 'i')
    ).rejects.toBeInstanceOf(RangeError);
    await expect(oauth.dokumentreferanser(BOARD, '../x', 'i')).rejects.toBeInstanceOf(RangeError);
    expect(mottatt).toHaveLength(0);
  });
});

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

  it('et avvist tokenkall gir CatendaUtilgjengelig, ikke CatendaAvvisning, og neste kall henter tokenet på nytt', async () => {
    svar = () => ({ status: 400, json: { error: 'invalid_client' } });
    const nokkel = new Integrasjonsnokkel(oppsett());
    const feil = await nokkel.token().catch((f: unknown) => f);
    expect(feil, '#783 punkt 5: oppsettet er feil').toBeInstanceOf(CatendaOppsettfeil);
    expect(feil).not.toBeInstanceOf(CatendaAvvisning);
    svar = () => ({ json: { access_token: 'nytt', expires_in: 3600 } });
    expect(await nokkel.token()).toBe('nytt');
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

  it('sender tilbakekallsadressen normalisert, som frontenden i innloggingen (#854 punkt 4)', () => {
    const { oauth } = catendaFraMiljoe({
      ...miljoe,
      CATENDA_LOGIN_REDIRECT_URI: 'https://Endring.øbf.example:443/api/auth/catenda/callback',
    });
    expect(new URL(oauth.autorisasjonsadresse('s')).searchParams.get('redirect_uri')).toBe(
      'https://endring.xn--bf-kka.example/api/auth/catenda/callback'
    );
  });

  // #806: brokeren nås over https også utenfor utvikling; ellers ingen stille fallback.
  it.each([
    ['https-origin i produksjon', 'https://broker.example', undefined, 'https://broker.example'],
    ['https med port', 'https://broker.example:8443/', 'production', 'https://broker.example:8443'],
    ['localhost i utvikling', 'http://localhost:9000', 'development', 'http://localhost:9000'],
  ])('godtar CATENDA_GRUNNADRESSE som %s', (_navn, verdi, appEnv, origin) => {
    const { oauth } = catendaFraMiljoe({ ...miljoe, CATENDA_GRUNNADRESSE: verdi, APP_ENV: appEnv });
    expect(new URL(oauth.autorisasjonsadresse('s')).origin).toBe(origin);
  });

  it.each([
    ['http utenfor localhost', 'http://broker.example', 'development'],
    ['localhost utenfor utvikling', 'http://localhost:9000', 'production'],
    ['en sti', 'https://broker.example/catenda', 'production'],
    ['en query', 'https://broker.example/?a=1', 'production'],
    ['et fragment', 'https://broker.example/#a', 'production'],
    ['et brukernavn', 'https://bruker@broker.example', 'production'],
    ['et passord', 'https://:hemmelig@broker.example', 'production'],
    ['en annen protokoll', 'ftp://broker.example', 'production'],
    ['noe som ikke er en adresse', 'broker.example', 'production'],
  ])('avviser CATENDA_GRUNNADRESSE med %s', (_navn, verdi, appEnv) => {
    expect(() =>
      catendaFraMiljoe({ ...miljoe, CATENDA_GRUNNADRESSE: verdi, APP_ENV: appEnv })
    ).toThrow(/CATENDA_GRUNNADRESSE/);
  });

  it.each(['CATENDA_CLIENT_ID', 'CATENDA_CLIENT_SECRET', 'CATENDA_LOGIN_REDIRECT_URI'])(
    'avvises uten %s',
    (navn) => {
      expect(() => catendaFraMiljoe({ ...miljoe, [navn]: '' })).toThrow(/mangler/);
    }
  );
});
