/**
 * Brokeren for Catenda-integrasjonen (#806). Forventningene er «Grepet» og
 * akseptkriteriene i issuet: nøkkelkontroll, tillatelsesliste avgrenset til
 * testprosjektet, og ingen kall til Catenda ved avvisning.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lagBroker, sammeNokkel, tillatt, Tokenlager, type Miljoe } from './broker.ts';

const PROSJEKT = '0123456789abcdef0123456789abcdef';
const BOARD = 'fedcba9876543210fedcba9876543210';
const ANNET = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const BIBLIOTEK = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const MAPPE = 'dddddddddddddddddddddddddddddddd';
const TOPIC = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const NOKKEL = 'brokernokkel-for-testen';

const miljoe: Miljoe = {
  BROKERNOKKEL: NOKKEL,
  CATENDA_CLIENT_ID: 'klient',
  CATENDA_CLIENT_SECRET: 'catenda-hemmelighet',
  CATENDA_PROSJEKT_ID: PROSJEKT,
  CATENDA_TOPIC_BOARD_ID: BOARD,
  CATENDA_BIBLIOTEK_ID: BIBLIOTEK,
  CATENDA_MAPPE_ID: MAPPE,
};

type Kall = { adresse: string; init: RequestInit };
let kall: Kall[];
let catendasvar: (init: RequestInit) => Response;

const hent = (async (adresse: string | URL | Request, init: RequestInit = {}) => {
  kall.push({ adresse: String(adresse), init });
  if (String(adresse).endsWith('/oauth2/token'))
    return Response.json({ access_token: 'catenda-token', expires_in: 3600 });
  return catendasvar(init);
}) as typeof fetch;

const ut = () => kall.filter((k) => !k.adresse.endsWith('/oauth2/token'));

let behandle: ReturnType<typeof lagBroker>;

beforeEach(() => {
  kall = [];
  catendasvar = () => Response.json({ ok: true });
  behandle = lagBroker(hent, new Tokenlager(hent));
});

function foresp(metode: string, sti: string, hoder: Record<string, string> = {}, kropp?: string) {
  return new Request(`https://broker.example${sti}`, { method: metode, headers: hoder, body: kropp });
}

const medNokkel = (metode: string, sti: string, hoder: Record<string, string> = {}, kropp?: string) =>
  foresp(metode, sti, { Authorization: `Bearer ${NOKKEL}`, ...hoder }, kropp);

describe('tokenkallet', () => {
  const tokenkall = (skjema: Record<string, string>) =>
    behandle(
      foresp('POST', '/oauth2/token', { 'Content-Type': 'application/x-www-form-urlencoded' }, new URLSearchParams(skjema).toString()),
      miljoe
    );

  it('svarer med brokernøkkelen når client_secret er brokernøkkelen', async () => {
    const s = await tokenkall({ grant_type: 'client_credentials', client_id: 'x', client_secret: NOKKEL });
    expect(s.status).toBe(200);
    expect(await s.json()).toMatchObject({ access_token: NOKKEL, token_type: 'Bearer' });
    expect(kall).toEqual([]);
  });

  it.each([
    ['feil nøkkel', { grant_type: 'client_credentials', client_secret: 'feil' }, 401],
    ['Catendas egen hemmelighet', { grant_type: 'client_credentials', client_secret: miljoe.CATENDA_CLIENT_SECRET }, 401],
    ['ingen nøkkel', { grant_type: 'client_credentials' }, 401],
    ['authorization_code', { grant_type: 'authorization_code', client_secret: NOKKEL, code: 'k' }, 400],
  ])('avviser %s uten kall til Catenda', async (_navn, skjema, status) => {
    const s = await tokenkall(skjema as Record<string, string>);
    expect(s.status).toBe(status);
    expect(kall).toEqual([]);
  });
});

describe('videresendingen', () => {
  it('sender et tillatt kall til Catenda med Catenda-tokenet, sti og query', async () => {
    const s = await behandle(
      medNokkel('GET', `/v2/projects/${PROSJEKT}/members?userType=user&page=2`, {
        Accept: 'application/json',
        Cookie: 'skal=ikke',
        'X-Annet': 'skal-ikke',
      }),
      miljoe
    );
    expect(s.status).toBe(200);
    expect(ut()).toHaveLength(1);
    const [{ adresse, init }] = ut();
    expect(adresse).toBe(`https://api.catenda.com/v2/projects/${PROSJEKT}/members?userType=user&page=2`);
    expect(init.redirect).toBe('manual');
    const hoder = new Headers(init.headers);
    expect(hoder.get('authorization')).toBe('Bearer catenda-token');
    expect(hoder.get('accept')).toBe('application/json');
    expect(hoder.get('cookie')).toBeNull();
    expect(hoder.get('x-annet')).toBeNull();
  });

  it('sender kroppen og Bimsync-Params ved opplasting', async () => {
    const s = await behandle(
      medNokkel(
        'POST',
        `/v2/projects/${PROSJEKT}/libraries/${ANNET}/items`,
        { 'Content-Type': 'application/octet-stream', 'Bimsync-Params': '{"a":1}' },
        'innhold'
      ),
      miljoe
    );
    expect(s.status).toBe(200);
    const { init } = ut()[0];
    expect(new Headers(init.headers).get('bimsync-params')).toBe('{"a":1}');
    expect(new TextDecoder().decode(init.body as ArrayBuffer)).toBe('innhold');
  });

  it('gir en redirect fra Catenda tilbake uendret', async () => {
    catendasvar = () =>
      new Response(null, { status: 302, headers: { Location: 'https://filer.example/signert', 'Set-Cookie': 'x=y' } });
    const s = await behandle(medNokkel('GET', `/v2/projects/${PROSJEKT}/libraries/${ANNET}/items/${ANNET}`), miljoe);
    expect(s.status).toBe(302);
    expect(s.headers.get('location')).toBe('https://filer.example/signert');
    expect(s.headers.get('set-cookie')).toBeNull();
  });

  it('godtar prosjekt-ID-en med bindestreker og store bokstaver, som catendaId', async () => {
    const medStreker = '01234567-89AB-CDEF-0123-456789ABCDEF';
    const s = await behandle(medNokkel('GET', `/v2/projects/${medStreker}/teams`), miljoe);
    expect(s.status).toBe(200);
  });

  it('henter Catenda-tokenet én gang og på nytt etter en 401', async () => {
    const sti = `/opencde/bcf/3.0/projects/${BOARD}/topics`;
    await behandle(medNokkel('GET', sti), miljoe);
    await behandle(medNokkel('GET', sti), miljoe);
    expect(kall.filter((k) => k.adresse.endsWith('/oauth2/token'))).toHaveLength(1);
    catendasvar = () => new Response(null, { status: 401 });
    expect((await behandle(medNokkel('GET', sti), miljoe)).status).toBe(401);
    catendasvar = () => Response.json([]);
    await behandle(medNokkel('GET', sti), miljoe);
    expect(kall.filter((k) => k.adresse.endsWith('/oauth2/token'))).toHaveLength(2);
  });
});

describe('slettingen live-testene rydder med', () => {
  it.each([
    ['en topic på boardet', `/opencde/bcf/3.0/projects/${BOARD}/topics/${TOPIC}`],
    ['en dokumentreferanse på boardet', `/opencde/bcf/3.0/projects/${BOARD}/topics/${TOPIC}/document_references/${ANNET}`],
  ])('sender DELETE på %s til Catenda med Catenda-tokenet', async (_navn, sti) => {
    catendasvar = () => new Response(null, { status: 204 });
    const s = await behandle(medNokkel('DELETE', sti), miljoe);
    expect(s.status).toBe(204);
    expect(ut()).toHaveLength(1);
    const [{ adresse, init }] = ut();
    expect(adresse).toBe(`https://api.catenda.com${sti}`);
    expect(init.method).toBe('DELETE');
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer catenda-token');
  });
});

describe('slettingen av items i testmappen', () => {
  const ITEM = `/v2/projects/${PROSJEKT}/libraries/${BIBLIOTEK}/items/${ANNET}`;
  const itemSvar = (oppslag: () => Response) => (init: RequestInit) =>
    init.method === 'GET' ? oppslag() : new Response(null, { status: 204 });

  it('(a) slår opp itemet og sletter det når parentId er testmappen', async () => {
    catendasvar = itemSvar(() => Response.json({ id: ANNET, parentId: MAPPE }));
    const s = await behandle(medNokkel('DELETE', ITEM), miljoe);
    expect(s.status).toBe(204);
    expect(ut().map((k) => [k.init.method, k.adresse])).toEqual([
      ['GET', `https://api.catenda.com${ITEM}`],
      ['DELETE', `https://api.catenda.com${ITEM}`],
    ]);
    for (const { init } of ut()) expect(new Headers(init.headers).get('authorization')).toBe('Bearer catenda-token');
    expect(new Headers(ut()[0].init.headers).get('accept')).toBe('application/json');
  });

  it('sletter når parentId og CATENDA_MAPPE_ID står med streker og store bokstaver', async () => {
    catendasvar = itemSvar(() => Response.json({ parentId: MAPPE.toUpperCase().replace(/^(.{8})(.{4})(.{4})(.{4})/, '$1-$2-$3-$4-') }));
    const m = { ...miljoe, CATENDA_MAPPE_ID: `urn:uuid:${MAPPE}` };
    expect((await behandle(medNokkel('DELETE', ITEM), m)).status).toBe(204);
  });

  it.each([
    ['(b) et item i en annen mappe', { parentId: ANNET }],
    ['(b) et item i roten', { parentId: null }],
    ['(b) et item uten parentId', {}],
    ['(c) selve testmappen', { id: MAPPE, parentId: ANNET, type: 'folder' }],
  ])('gir 403 og ingen DELETE for %s', async (_navn, item) => {
    catendasvar = itemSvar(() => Response.json(item));
    const s = await behandle(medNokkel('DELETE', ITEM), miljoe);
    expect(s.status).toBe(403);
    expect(await s.json()).toEqual({ feil: 'broker_avviste' });
    expect(ut().map((k) => k.init.method)).toEqual(['GET']);
  });

  it('gir 403 og ingen DELETE når oppslaget ikke er JSON', async () => {
    catendasvar = itemSvar(() => new Response('ikke json'));
    expect((await behandle(medNokkel('DELETE', ITEM), miljoe)).status).toBe(403);
    expect(ut().map((k) => k.init.method)).toEqual(['GET']);
  });

  it.each([404, 403, 302])('(d) gir Catendas %i tilbake og ingen DELETE når oppslaget ikke gir 200', async (status) => {
    catendasvar = itemSvar(() => new Response(null, { status }));
    const s = await behandle(medNokkel('DELETE', ITEM), miljoe);
    expect(s.status).toBe(status);
    expect(ut().map((k) => k.init.method)).toEqual(['GET']);
  });

  it.each(['CATENDA_MAPPE_ID', 'CATENDA_BIBLIOTEK_ID'] as const)('(e) gir 403 uten kall når %s mangler eller er tom, og lar resten være', async (navn) => {
    const uten: Miljoe = { ...miljoe };
    delete uten[navn];
    for (const m of [uten, { ...miljoe, [navn]: '' }]) {
      catendasvar = itemSvar(() => Response.json({ parentId: MAPPE }));
      const s = await behandle(medNokkel('DELETE', ITEM), m);
      expect(s.status).toBe(403);
      expect(kall).toEqual([]);
      expect(tillatt(m, 'GET', `/v2/projects/${PROSJEKT}/libraries/${ANNET}/items/${ANNET}`)).toBe(true);
      expect(tillatt(m, 'DELETE', `/opencde/bcf/3.0/projects/${BOARD}/topics/${TOPIC}`)).toBe(true);
    }
  });

  it('godtar bibliotek-ID-en i stien med streker og store bokstaver', () => {
    const medStreker = 'BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB';
    expect(tillatt(miljoe, 'DELETE', `/v2/projects/${PROSJEKT}/libraries/${medStreker}/items/${ANNET}`)).toBe(true);
  });

  it('tillater sletting når CATENDA_BIBLIOTEK_ID står med store bokstaver og streker', () => {
    const m = { ...miljoe, CATENDA_BIBLIOTEK_ID: 'BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB' };
    expect(tillatt(m, 'DELETE', ITEM)).toBe(true);
  });
});

describe('avvisningen', () => {
  it.each([
    ['uten Authorization', {}],
    ['med feil nøkkel', { Authorization: 'Bearer feil' }],
    ['med Catendas hemmelighet', { Authorization: `Bearer ${miljoe.CATENDA_CLIENT_SECRET}` }],
    ['med nøkkelen uten Bearer', { Authorization: NOKKEL }],
  ])('gir 401 %s, uten kall til Catenda', async (_navn, hoder) => {
    const s = await behandle(foresp('GET', `/v2/projects/${PROSJEKT}/teams`, hoder), miljoe);
    expect(s.status).toBe(401);
    expect(s.headers.get('cache-control')).toBe('no-store');
    expect(await s.json()).toEqual({ feil: 'brokernoekkel' });
    expect(kall).toEqual([]);
  });

  it.each([
    ['GET', '/v2/projects'],
    ['GET', '/v2/user'],
    ['GET', '/oauth2/authorize'],
    ['GET', `/v2/projects/${ANNET}/teams`],
    ['GET', `/opencde/bcf/3.0/projects/${ANNET}/topics`],
    ['GET', `/v2/projects/${PROSJEKT}/teams%2F..%2F${ANNET}`],
    ['GET', `/v2/projects/${PROSJEKT}/teams/`],
    ['DELETE', `/v2/projects/${PROSJEKT}/teams`],
    ['POST', `/v2/projects/${PROSJEKT}`],
    ['GET', `/v2/projects/${PROSJEKT}/webhooks`],
    ['DELETE', `/v2/projects/${PROSJEKT}/libraries/${ANNET}/items/${ANNET}`],
    ['DELETE', `/v2/projects/${PROSJEKT}/libraries/urn:uuid:${BIBLIOTEK}/items/${ANNET}`],
    ['GET', `/v2/projects/urn:uuid:${PROSJEKT}/teams`],
    ['GET', `/v2/projects/${PROSJEKT.replace(/^(.{4})/, '$1-')}/teams`],
    ['GET', `/v2/projects/-${PROSJEKT}/teams`],
    ['DELETE', `/v2/projects/${ANNET}/libraries/${BIBLIOTEK}/items/${ANNET}`],
    ['DELETE', `/v2/projects/${PROSJEKT}/libraries/${BIBLIOTEK}/items`],
    ['DELETE', `/v2/projects/${PROSJEKT}/libraries/${BIBLIOTEK}`],
    ['DELETE', `/v2/projects/${PROSJEKT}/libraries`],
    ['DELETE', `/v2/projects/${PROSJEKT}/webhooks/${ANNET}`],
    ['DELETE', `/v2/projects/${PROSJEKT}`],
    ['DELETE', `/opencde/bcf/3.0/projects/${ANNET}/topics/${TOPIC}`],
    ['DELETE', `/opencde/bcf/3.0/projects/${ANNET}/topics/${TOPIC}/document_references/${ANNET}`],
    ['DELETE', `/opencde/bcf/3.0/projects/${BOARD}/topics`],
    ['DELETE', `/opencde/bcf/3.0/projects/${BOARD}/topics/${TOPIC}/document_references`],
    ['DELETE', `/opencde/bcf/3.0/projects/${BOARD}/topics/${TOPIC}/related_topics`],
    ['DELETE', `/opencde/bcf/3.0/projects/${ANNET}/topics/${TOPIC}/related_topics/${ANNET}`],
    ['DELETE', `/opencde/bcf/3.0/projects/${BOARD}`],
  ])('gir 403 for %s %s, uten kall til Catenda', async (metode, sti) => {
    const s = await behandle(medNokkel(metode, sti), miljoe);
    expect(s.status).toBe(403);
    expect(s.headers.get('cache-control')).toBe('no-store');
    expect(await s.json()).toEqual({ feil: 'broker_avviste' });
    expect(kall).toEqual([]);
  });

  it('avviser alt når prosjekt-ID-en mangler i miljøet', () => {
    expect(tillatt({ ...miljoe, CATENDA_PROSJEKT_ID: '' }, 'GET', `/v2/projects/${PROSJEKT}/teams`)).toBe(false);
  });

  it('godtar ingen nøkkel når brokernøkkelen ikke er satt', async () => {
    const s = await behandle(foresp('GET', `/v2/projects/${PROSJEKT}/teams`, { Authorization: 'Bearer ' }), {
      ...miljoe,
      BROKERNOKKEL: '',
    });
    expect(s.status).toBe(401);
  });
});

describe('nøkkelsammenligningen', () => {
  it.each([
    ['lik', NOKKEL, true],
    ['ett tegn feil', NOKKEL.slice(0, -1) + 'x', false],
    ['kortere', NOKKEL.slice(0, -1), false],
    ['lengre', NOKKEL + 'x', false],
    ['tom', '', false],
  ])('%s', async (_navn, oppgitt, forventet) => {
    expect(await sammeNokkel(oppgitt, NOKKEL)).toBe(forventet);
  });
});

describe('feil mot Catenda', () => {
  it('gir 502 med steget når Catenda ikke svarer', async () => {
    catendasvar = () => {
      throw new TypeError('fetch failed');
    };
    const s = await behandle(medNokkel('GET', `/v2/projects/${PROSJEKT}/teams`), miljoe);
    expect(s.status).toBe(502);
    expect(await s.json()).toEqual({ feil: 'catenda_svarte_ikke' });
  });

  it.each([
    ['avvist med 401', () => Response.json({ error: 'invalid_client', hemmelig: 'x' }, { status: 401 }), 401],
    ['uten svar', () => Promise.reject(new TypeError('fetch failed')), 0],
    ['med ugyldig kropp', () => new Response('ikke json'), 0],
  ])('gir 502 med bare Catendas statuskode når tokenkallet blir %s', async (_navn, tokensvar, status) => {
    const h = (async (adresse: string | URL | Request) =>
      String(adresse).endsWith('/oauth2/token') ? tokensvar() : Response.json({})) as typeof fetch;
    const b = lagBroker(h, new Tokenlager(h));
    const s = await b(medNokkel('GET', `/v2/projects/${PROSJEKT}/teams`), miljoe);
    expect(s.status).toBe(502);
    expect(await s.json()).toEqual({ feil: 'tokenkall', status });
  });

  it('kaller fetch uten å binde den til tokenlageret, som Workers krever', async () => {
    const h = function (this: unknown) {
      if (this !== undefined) throw new TypeError('Illegal invocation');
      return Promise.resolve(Response.json({ access_token: 't' }));
    } as unknown as typeof fetch;
    expect(await new Tokenlager(h).token(miljoe)).toBe('t');
  });
});

describe('tokenlageret', () => {
  it('fornyer tokenet når det nærmer seg utløp', async () => {
    let naa = 0;
    const h = vi.fn(async () => Response.json({ access_token: `t${h.mock.calls.length}`, expires_in: 600 }));
    const lager = new Tokenlager(h as unknown as typeof fetch, () => naa);
    expect(await lager.token(miljoe)).toBe('t1');
    naa = 299_000;
    expect(await lager.token(miljoe)).toBe('t1');
    naa = 300_000;
    expect(await lager.token(miljoe)).toBe('t2');
  });
});
