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
const NOKKEL = 'brokernokkel-for-testen';

const miljoe: Miljoe = {
  BROKERNOKKEL: NOKKEL,
  CATENDA_CLIENT_ID: 'klient',
  CATENDA_CLIENT_SECRET: 'catenda-hemmelighet',
  CATENDA_PROSJEKT_ID: PROSJEKT,
  CATENDA_TOPIC_BOARD_ID: BOARD,
};

type Kall = { adresse: string; init: RequestInit };
let kall: Kall[];
let catendasvar: () => Response;

const hent = (async (adresse: string | URL | Request, init: RequestInit = {}) => {
  kall.push({ adresse: String(adresse), init });
  if (String(adresse).endsWith('/oauth2/token'))
    return Response.json({ access_token: 'catenda-token', expires_in: 3600 });
  return catendasvar();
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

describe('avvisningen', () => {
  it.each([
    ['uten Authorization', {}],
    ['med feil nøkkel', { Authorization: 'Bearer feil' }],
    ['med Catendas hemmelighet', { Authorization: `Bearer ${miljoe.CATENDA_CLIENT_SECRET}` }],
    ['med nøkkelen uten Bearer', { Authorization: NOKKEL }],
  ])('gir 401 %s, uten kall til Catenda', async (_navn, hoder) => {
    const s = await behandle(foresp('GET', `/v2/projects/${PROSJEKT}/teams`, hoder), miljoe);
    expect(s.status).toBe(401);
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
  ])('gir 403 for %s %s, uten kall til Catenda', async (metode, sti) => {
    const s = await behandle(medNokkel(metode, sti), miljoe);
    expect(s.status).toBe(403);
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
  it('gir 502 når Catenda ikke svarer', async () => {
    catendasvar = () => {
      throw new TypeError('fetch failed');
    };
    const s = await behandle(medNokkel('GET', `/v2/projects/${PROSJEKT}/teams`), miljoe);
    expect(s.status).toBe(502);
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
