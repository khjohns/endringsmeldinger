/**
 * Innloggingsinngangene (F0b-5a, #659) over HTTP mot testbasene. Forventningene
 * fastholder atferden i Python, som flyttes uendret: `backend/routes/auth_routes.py`
 * (stiene, kapslene og attributtene, `no-store` og `no-referrer`, feil i
 * tilbakekallet til `/login?error=login_failed`), `safe_return_path` i
 * `backend/lib/auth/domain.py` og `/api/csrf-token` i
 * `backend/routes/utility_routes.py`. Kravene om returstien og feilene står i
 * kommentarene til #659, og kravet om identiteten i sikkerhetsinvariantene i
 * AGENTS.md: samme issuer og normaliserte subjekt, og ingen sesjon når
 * identiteten ikke kan avgjøres.
 *
 * Medlemskapet ved innlogging (F0b-5b, #638) følger `AuthService.login`: listen
 * hentes med brukerens token for hvert koblet prosjekt brukeren er med i, og
 * medlemskapet blir inaktivt i de andre koblede prosjektene (DL-U8). Identiteten
 * løses før deaktiveringen, så fraværet føres også ved første innlogging (DL-U9,
 * kravet under «Åpne spørsmål» i PR #652). En ufullstendig prosjektliste gir ingen
 * deaktivering og ingen sesjon (B-04 punkt 4).
 *
 * Catenda står bak `Innloggingsleverandoer`; ekte OAuth mot Catenda prøves ikke.
 */

import { randomBytes, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { catendaId, sesjonsnavn } from '../autorisasjon.ts';
import { CatendaUtilgjengelig, type CatendaBruker } from '../catenda.ts';
import { innloggingFraMiljoe, tryggRetursti, type Innloggingsleverandoer } from '../innlogging.ts';
import { basensKlokke, synkroniserMedlemskap, type Medlem } from '../medlemskap.ts';
import { opprettInnloggingsforsoek, opprettSesjon } from '../sesjon.ts';
import { basensKlokkeEtter, settInn } from './sqlserver_migrert.ts';
import {
  lagOppsett,
  rydd,
  startServer,
  TESTBASE_URL,
  type KjorendeServer,
  type Oppsett,
} from './testbase.ts';

describe('returstien kontrolleres som safe_return_path', () => {
  it.each([
    ['/saker/1?fane=frist', '/saker/1?fane=frist'],
    ['/%C3%A6rlig', '/%C3%A6rlig'],
    [null, '/'],
    ['', '/'],
    ['//angriper.example', '/'],
    ['/%2Fangriper.example', '/'],
    ['/\\angriper.example', '/'],
    ['/%5Cangriper.example', '/'],
    ['/saker\u0001', '/'],
    ['/saker%0A', '/'],
    ['/saker%7F', '/'],
    ['/api/auth/session', '/'],
    ['/%61pi/auth/session', '/'],
    ['/login', '/'],
    ['/login?error=x', '/'],
    // Nettleseren løser opp punktsegmentene før den følger omdirigeringen.
    ['/./login', '/'],
    ['/saker/../api/auth/session', '/'],
    ['/%2e/api/auth/session', '/'],
    ['/saker/../saker/1', '/saker/../saker/1'],
    // Tegn utenfor ASCII prosentkodes, så stien kan stå i `Location`.
    ['/😀/æ', '/%F0%9F%98%80/%C3%A6'],
    ['/saker 1', '/saker%201'],
    ['/\ud800', '/'],
    // 2047 tegn, men 6142 enheter prosentkodet.
    [`/${'æ'.repeat(2047)}`, '/'],
    ['https://angriper.example', '/'],
    // Dekodet begynner den med `/`, men basen krever at stien selv gjør det.
    ['%2Fsaker', '/'],
    // Ugyldig prosentkoding gir `/`; `unquote` i Python lar den stå.
    ['/%E0%A4%A', '/'],
    [`/${'a'.repeat(2047)}`, `/${'a'.repeat(2047)}`],
    [`/${'a'.repeat(2048)}`, '/'],
    // 1025 kodepunkter, men 2049 UTF-16-enheter, som basen teller (#659).
    [`/${'😀'.repeat(1024)}`, '/'],
  ])('%j gir %j', (inn, ut) => {
    expect(tryggRetursti(inn)).toBe(ut);
  });
});

describe('innloggingen fra miljøet, som validate_config', () => {
  const miljoe = {
    APP_ENV: 'production',
    AUTH_FRONTEND_URL: 'https://app.example.no/',
    CATENDA_CLIENT_ID: 'klient',
    CATENDA_CLIENT_SECRET: 'svært-hemmelig',
    CATENDA_LOGIN_REDIRECT_URI: 'https://app.example.no/api/auth/catenda/callback',
  };

  it('gir opprinnelsen uten / til slutt', () => {
    expect(innloggingFraMiljoe(miljoe).frontend).toBe('https://app.example.no');
  });

  it('godtar HTTP mot localhost bare i utvikling', () => {
    const lokal = {
      ...miljoe,
      AUTH_FRONTEND_URL: 'http://localhost:5173',
      CATENDA_LOGIN_REDIRECT_URI: 'http://localhost:5173/api/auth/catenda/callback',
    };
    expect(innloggingFraMiljoe({ ...lokal, APP_ENV: 'development' }).frontend).toBe(
      'http://localhost:5173'
    );
    expect(() => innloggingFraMiljoe(lokal)).toThrow();
  });

  it.each([
    { AUTH_FRONTEND_URL: '' },
    { AUTH_FRONTEND_URL: 'https://app.example.no/app' },
    { AUTH_FRONTEND_URL: 'https://bruker:passord@app.example.no' },
    { AUTH_FRONTEND_URL: 'http://app.example.no' },
    { CATENDA_LOGIN_REDIRECT_URI: 'https://app.example.no/callback?x=1' },
    { CATENDA_LOGIN_REDIRECT_URI: 'https://app.example.no/callback#x' },
    { CATENDA_LOGIN_REDIRECT_URI: '' },
    { CATENDA_CLIENT_SECRET: '' },
  ])('avviser %j uten å gi verdiene i meldingen', (endring) => {
    const galt = { ...miljoe, ...endring };
    expect(() => innloggingFraMiljoe(galt)).toThrow();
    try {
      innloggingFraMiljoe(galt);
    } catch (feil) {
      expect(String((feil as Error).message)).not.toMatch(/svært-hemmelig|example/);
    }
  });
});

interface Svar {
  status: number;
  hoder: Headers;
  kapsler: Map<string, string>;
  kropp: Record<string, unknown> | null;
}

async function hent(
  url: string,
  {
    kapsler = {},
    metode = 'GET',
    csrf,
  }: { kapsler?: Record<string, string>; metode?: string; csrf?: string } = {}
): Promise<Svar> {
  const hoder: Record<string, string> = {};
  const kapsel = Object.entries(kapsler)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
  if (kapsel) hoder.Cookie = kapsel;
  if (csrf) hoder['X-CSRF-Token'] = csrf;
  const svar = await fetch(url, { method: metode, headers: hoder, redirect: 'manual' });
  const tekst = await svar.text();
  return {
    status: svar.status,
    hoder: svar.headers,
    kapsler: new Map(svar.headers.getSetCookie().map((k) => [k.split('=', 1)[0], k])),
    kropp: tekst ? (JSON.parse(tekst) as Record<string, unknown>) : null,
  };
}

const verdi = (kapsel: string | undefined) =>
  kapsel?.split(';', 1)[0].split('=').slice(1).join('=');

describe.skipIf(!TESTBASE_URL)('innloggingsinngangene mot testbasene', () => {
  const FRONTEND = 'https://app.example.no';
  const SESJON = sesjonsnavn();
  const FORSOEK = `${SESJON}_login`;
  const MISLYKTES = `${FRONTEND}/login?error=login_failed`;
  let o: Oppsett;
  let server: KjorendeServer;
  let utenOppsett: KjorendeServer;
  let catenda: CatendaBruker | Error;
  let catendaProsjekter: Set<string> | Error;
  let medlemslister: Record<string, Medlem[] | Error>;
  const oauth: Innloggingsleverandoer = {
    autorisasjonsadresse: (state) => `https://catenda.test/oauth2/authorize?state=${state}`,
    async byttKode(kode) {
      if (kode !== 'god-kode') throw new CatendaUtilgjengelig('Catenda svarte med feil');
      return 'brukertoken';
    },
    async bruker(token) {
      expect(token).toBe('brukertoken');
      if (catenda instanceof Error) throw catenda;
      return catenda;
    },
    async prosjekter(token) {
      expect(token).toBe('brukertoken');
      if (catendaProsjekter instanceof Error) throw catendaProsjekter;
      return catendaProsjekter;
    },
    async medlemmer(catendaProsjekt, token) {
      expect(token).toBe('brukertoken');
      const liste = medlemslister[catendaId(catendaProsjekt)!];
      if (!liste) throw new Error('Ingen medlemsliste i testen');
      if (liste instanceof Error) throw liste;
      return liste;
    },
  };

  beforeAll(async () => {
    o = await lagOppsett();
    server = await startServer(o, { innlogging: { frontend: FRONTEND, oauth } });
    utenOppsett = await startServer(o);
  }, 240_000);
  afterAll(async () => {
    await server?.stopp();
    await utenOppsett?.stopp();
    if (o) await rydd(o);
  });
  beforeEach(() => {
    catenda = { subjekt: 'a'.repeat(32), epost: 'kari@test.example', navn: 'Kari' };
    catendaProsjekter = new Set();
    medlemslister = {};
  });

  const eier = () => o.datalag.base.pool;

  async function startInnlogging(returTil?: string) {
    const sti = returTil === undefined ? '' : `?return_to=${encodeURIComponent(returTil)}`;
    const svar = await hent(`${server.url}/api/auth/catenda/login${sti}`);
    const state = new URL(svar.hoder.get('location') ?? '').searchParams.get('state') ?? '';
    return { svar, state, nettleser: verdi(svar.kapsler.get(FORSOEK)) ?? '' };
  }

  async function tilbakekall(parametre: string, kapsler: Record<string, string>) {
    return hent(`${server.url}/api/auth/catenda/callback?${parametre}`, { kapsler });
  }

  async function loggInn(returTil?: string, kapsler: Record<string, string> = {}) {
    const { state, nettleser } = await startInnlogging(returTil);
    return tilbakekall(`state=${state}&code=god-kode`, { ...kapsler, [FORSOEK]: nettleser });
  }

  const identiteter = async (subjekt: string) =>
    (
      await eier().request().input('s', subjekt).query<{
        user_id: string;
      }>("SELECT user_id FROM koe.app_identities WHERE provider = N'catenda' AND subject = @s")
    ).recordset.map((r) => r.user_id.toLowerCase());

  it('innloggingen sender til Catenda med staten og setter innloggingskapselen', async () => {
    const { svar, state, nettleser } = await startInnlogging('/saker/1');
    expect(svar.status).toBe(302);
    expect(svar.hoder.get('location')).toMatch(
      /^https:\/\/catenda\.test\/oauth2\/authorize\?state=/
    );
    expect(state).toMatch(/^[\w-]{43}$/);
    expect(nettleser).toMatch(/^[\w-]{43}$/);
    const kapsel = svar.kapsler.get(FORSOEK)!;
    for (const del of ['Max-Age=600', 'HttpOnly', 'Path=/', 'SameSite=Lax'])
      expect(kapsel).toContain(del);
    expect(kapsel.includes('Secure')).toBe(FORSOEK.startsWith('__Host-'));
    expect(svar.hoder.get('cache-control')).toBe('no-store');
    expect(svar.hoder.get('referrer-policy')).toBe('no-referrer');
  });

  it('et hode Node ikke godtar, gir 500 og tar ikke ned serveren (#716 punkt 2)', async () => {
    const galt = await startServer(o, {
      innlogging: {
        frontend: FRONTEND,
        oauth: { ...oauth, autorisasjonsadresse: (state) => `https://catenda.test/\r\n${state}` },
      },
    });
    try {
      const svar = await hent(`${galt.url}/api/auth/catenda/login`);
      expect(svar.status).toBe(500);
      expect(svar.kropp?.error).toBe('INTERNAL_ERROR');
      expect(svar.hoder.get('location')).toBeNull();
      // Kontrollsak: med en gyldig adresse svarer samme inngang 302.
      expect((await startInnlogging()).svar.status).toBe(302);
      expect((await hent(`${galt.url}/api/auth/catenda/login`)).status).toBe(500);
    } finally {
      await galt.stopp();
    }
  });

  it('tilbakekallet løser identiteten, oppretter sesjonen og sender til returstien', async () => {
    const svar = await loggInn('/saker/1?fane=frist');
    expect(svar.status).toBe(302);
    expect(svar.hoder.get('location')).toBe(`${FRONTEND}/saker/1?fane=frist`);
    const kapsel = svar.kapsler.get(SESJON)!;
    expect(kapsel).toContain('Max-Age=28800');
    expect(kapsel).toContain('HttpOnly');
    expect(svar.kapsler.get(FORSOEK)).toContain('Max-Age=0');
    expect(svar.hoder.get('referrer-policy')).toBe('no-referrer');

    const [bruker] = await identiteter('a'.repeat(32));
    const sesjon = await hent(`${server.url}/api/auth/session`, {
      kapsler: { [SESJON]: verdi(kapsel)! },
    });
    expect(sesjon.status).toBe(200);
    expect(sesjon.kropp).toEqual({
      user: { id: bruker, email: 'kari@test.example', name: 'Kari' },
      csrfToken: expect.stringMatching(/^[\w-]{43}$/),
    });
  });

  it('en retursti med tegn utenfor ASCII prosentkodes i Location', async () => {
    const svar = await loggInn('/😀/æ');
    expect(svar.status).toBe(302);
    expect(svar.hoder.get('location')).toBe(`${FRONTEND}/%F0%9F%98%80/%C3%A6`);
  });

  it('samme Catenda-identitet gir samme bruker ved neste innlogging', async () => {
    catenda = { subjekt: 'b'.repeat(32), epost: 'ola@test.example', navn: 'Ola' };
    await loggInn();
    await loggInn();
    expect(await identiteter('b'.repeat(32))).toHaveLength(1);
  });

  it('et subjekt som ikke er normalisert, gir ingen sesjon og ingen bruker', async () => {
    const telling = async () =>
      (await eier().request().query<{ n: number }>('SELECT COUNT(*) AS n FROM koe.app_users'))
        .recordset[0].n;
    const foer = await telling();
    catenda = {
      subjekt: 'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA',
      epost: 'x@test.example',
      navn: 'X',
    };
    const svar = await loggInn();
    expect(svar.hoder.get('location')).toBe(MISLYKTES);
    expect(svar.kapsler.has(SESJON)).toBe(false);
    expect(await telling()).toBe(foer);
  });

  it.each<
    [string, (s: string, n: string) => [string, Record<string, string>], (CatendaBruker | Error)?]
  >([
    ['uten state', (_s, n) => ['code=god-kode', { [FORSOEK]: n }]],
    ['med to state', (s, n) => [`state=${s}&state=${s}&code=god-kode`, { [FORSOEK]: n }]],
    ['uten innloggingskapsel', (s) => [`state=${s}&code=god-kode`, {}]],
    ['med en annen nettlesers kapsel', (s) => [`state=${s}&code=god-kode`, { [FORSOEK]: 'annen' }]],
    [
      'med feil fra Catenda',
      (s, n) => [`state=${s}&code=god-kode&error=access_denied`, { [FORSOEK]: n }],
    ],
    ['uten kode', (s, n) => [`state=${s}`, { [FORSOEK]: n }]],
    ['med to koder', (s, n) => [`state=${s}&code=god-kode&code=god-kode`, { [FORSOEK]: n }]],
    ['når koden ikke kan byttes', (s, n) => [`state=${s}&code=feil-kode`, { [FORSOEK]: n }]],
    [
      'når brukeren ikke kan hentes',
      (s, n) => [`state=${s}&code=god-kode`, { [FORSOEK]: n }],
      new CatendaUtilgjengelig('Forventet en brukeridentitet'),
    ],
  ])('tilbakekallet %s gir login_failed uten sesjon', async (_navn, lag, feil) => {
    if (feil) catenda = feil;
    const { state, nettleser } = await startInnlogging();
    const svar = await tilbakekall(...lag(state, nettleser));
    expect(svar.status).toBe(302);
    expect(svar.hoder.get('location')).toBe(MISLYKTES);
    expect(svar.kapsler.has(SESJON)).toBe(false);
    expect(svar.kapsler.get(FORSOEK)).toContain('Max-Age=0');
  });

  describe('medlemskapet ved innlogging', () => {
    const r = () => eier().request();

    /** Et prosjekt koblet til et nytt Catenda-prosjekt, uten medlemsliste. */
    async function koblet() {
      const p = { id: `innlogging-${randomBytes(4).toString('hex')}`, catenda: randomUUID() };
      await settInn(r, 'projects', {
        id: p.id,
        name: p.id,
        organisasjon_id: 'org-test',
        is_active: true,
      });
      await settInn(r, 'catenda_project_configs', {
        internal_project_id: p.id,
        catenda_project_id: p.catenda,
        library_id: randomUUID(),
        is_active: true,
      });
      return { ...p, catendaId: catendaId(p.catenda)! };
    }

    async function aktive(prosjektId: string) {
      const svar = await r()
        .input('p', prosjektId)
        .query<{ catenda_subject: string }>(
          `SELECT catenda_subject FROM koe.app_project_memberships
            WHERE project_id = @p AND active = 1 ORDER BY catenda_subject`
        );
      return svar.recordset.map((m) => m.catenda_subject);
    }

    const som = (b: CatendaBruker): Medlem => ({
      subjekt: b.subjekt,
      epost: b.epost,
      navn: b.navn,
      rolle: 'member',
    });

    beforeEach(() => {
      const s = randomBytes(16).toString('hex');
      catenda = { subjekt: s, epost: `${s.slice(0, 6)}@test.example`, navn: 'Ny' };
    });

    it('listen hentes for hvert koblet prosjekt brukeren er med i, og gir medlemskapet', async () => {
      const med = await koblet();
      const utenListe = await koblet();
      const bruker = catenda as CatendaBruker;
      catendaProsjekter = new Set([med.catendaId, catendaId(randomUUID())!]);
      medlemslister = { [med.catendaId]: [som(bruker)] };
      const svar = await loggInn();
      expect(svar.kapsler.has(SESJON)).toBe(true);
      expect(await aktive(med.id)).toEqual([bruker.subjekt]);
      expect(await aktive(utenListe.id)).toEqual([]);
    });

    it('ved første innlogging gir en liste hentet før innloggingen ikke medlemskap i et prosjekt brukeren ikke er med i (DL-U9)', async () => {
      const p = await koblet();
      const bruker = catenda as CatendaBruker;
      const hentetFoer = new Date(Date.now() - 5_000);
      catendaProsjekter = new Set();
      expect((await loggInn()).kapsler.has(SESJON)).toBe(true);
      const innlogget = await basensKlokke(eier());
      await synkroniserMedlemskap(eier(), {
        prosjekt: p.id,
        catendaProsjekt: p.catenda,
        hentet: hentetFoer,
        medlemmer: [som(bruker)],
      });
      expect(await aktive(p.id)).toEqual([]);
      // Kontroll: en liste hentet etter innloggingen gir medlemskapet.
      await synkroniserMedlemskap(eier(), {
        prosjekt: p.id,
        catendaProsjekt: p.catenda,
        hentet: await basensKlokkeEtter(eier(), innlogget),
        medlemmer: [som(bruker)],
      });
      expect(await aktive(p.id)).toEqual([bruker.subjekt]);
    });

    it('medlemskapet blir inaktivt i et koblet prosjekt brukeren ikke lenger er med i (DL-U8)', async () => {
      const p = await koblet();
      const bruker = catenda as CatendaBruker;
      catendaProsjekter = new Set([p.catendaId]);
      medlemslister = { [p.catendaId]: [som(bruker)] };
      await loggInn();
      expect(await aktive(p.id)).toEqual([bruker.subjekt]);
      catendaProsjekter = new Set();
      expect((await loggInn()).kapsler.has(SESJON)).toBe(true);
      expect(await aktive(p.id)).toEqual([]);
    });

    it.each([
      [
        'prosjektlisten',
        () => (catendaProsjekter = new CatendaUtilgjengelig('Ufullstendig samling')),
      ],
      ['medlemslisten', (c: string) => (medlemslister = { [c]: new CatendaUtilgjengelig('Nede') })],
    ])(
      'feiler %s, gir tilbakekallet login_failed uten sesjon og uten deaktivering',
      async (_navn, feil) => {
        const p = await koblet();
        const bruker = catenda as CatendaBruker;
        catendaProsjekter = new Set([p.catendaId]);
        medlemslister = { [p.catendaId]: [som(bruker)] };
        await loggInn();
        expect(await aktive(p.id)).toEqual([bruker.subjekt]);
        const annet = await koblet();
        catendaProsjekter = new Set([annet.catendaId]);
        feil(annet.catendaId);
        const svar = await loggInn();
        expect(svar.hoder.get('location')).toBe(MISLYKTES);
        expect(svar.kapsler.has(SESJON)).toBe(false);
        expect(await aktive(p.id)).toEqual([bruker.subjekt]);
      }
    );
  });

  it('forsøket kan bare brukes én gang', async () => {
    const { state, nettleser } = await startInnlogging();
    const parametre = `state=${state}&code=god-kode`;
    expect((await tilbakekall(parametre, { [FORSOEK]: nettleser })).kapsler.has(SESJON)).toBe(true);
    const igjen = await tilbakekall(parametre, { [FORSOEK]: nettleser });
    expect(igjen.hoder.get('location')).toBe(MISLYKTES);
    expect(igjen.kapsler.has(SESJON)).toBe(false);
  });

  it('den lagrede returstien kontrolleres igjen etter at forsøket er brukt', async () => {
    const forsoek = await opprettInnloggingsforsoek(o.datalag.kjoeretid.pool, '/api/auth/session');
    const svar = await tilbakekall(`state=${forsoek.state}&code=god-kode`, {
      [FORSOEK]: forsoek.nettleser,
    });
    expect(svar.hoder.get('location')).toBe(`${FRONTEND}/`);
  });

  it('en for lang retursti gir / uten at innloggingen feiler', async () => {
    const svar = await loggInn(`/${'😀'.repeat(1024)}`);
    expect(svar.hoder.get('location')).toBe(`${FRONTEND}/`);
  });

  it('en ny innlogging sletter den gamle sesjonen', async () => {
    const gammel = await opprettSesjon(o.datalag.kjoeretid.pool, o.te.id);
    const svar = await loggInn(undefined, { [SESJON]: gammel.token });
    expect(svar.kapsler.has(SESJON)).toBe(true);
    const etter = await hent(`${server.url}/api/auth/session`, {
      kapsler: { [SESJON]: gammel.token },
    });
    expect(etter.status).toBe(401);
  });

  it('sesjonen uten innlogging gir 401 med no-store', async () => {
    const svar = await hent(`${server.url}/api/auth/session`);
    expect(svar.status).toBe(401);
    expect(svar.kropp?.error).toBe('UNAUTHORIZED');
    expect(svar.hoder.get('cache-control')).toBe('no-store');
    expect(svar.hoder.get('referrer-policy')).toBe('no-referrer');
  });

  it('CSRF-tokenet er sesjonens, med no-store', async () => {
    const svar = await hent(`${server.url}/api/csrf-token`, { kapsler: { [SESJON]: o.te.token } });
    expect(svar.status).toBe(200);
    expect(svar.kropp).toEqual({ csrfToken: o.te.csrf, expiresIn: 3600 });
    expect(svar.hoder.get('cache-control')).toBe('no-store');
  });

  it('utloggingen sletter sesjonen og tømmer kapselen', async () => {
    const ny = await opprettSesjon(o.datalag.kjoeretid.pool, o.te.id);
    const kapsler = { [SESJON]: ny.token };
    const svar = await hent(`${server.url}/api/auth/logout`, {
      kapsler,
      metode: 'POST',
      csrf: ny.csrfToken,
    });
    expect(svar.status).toBe(200);
    expect(svar.kropp).toEqual({ success: true });
    expect(svar.kapsler.get(SESJON)).toMatch(new RegExp(`^${SESJON}=;.*Max-Age=0`));
    expect(svar.hoder.get('cache-control')).toBe('no-store');
    expect((await hent(`${server.url}/api/auth/session`, { kapsler })).status).toBe(401);
  });

  it('uten oppsett svarer innloggingen og tilbakekallet 503', async () => {
    const start = await hent(`${utenOppsett.url}/api/auth/catenda/login`);
    expect(start.status).toBe(503);
    expect(start.kropp).toEqual({
      error: 'AUTH_UNAVAILABLE',
      message: 'Innlogging er midlertidig utilgjengelig.',
    });
    expect(start.hoder.get('cache-control')).toBe('no-store');
    const tilbake = await hent(`${utenOppsett.url}/api/auth/catenda/callback?state=x&code=y`);
    expect(tilbake.status).toBe(503);
    expect(tilbake.kropp).toEqual({ error: 'AUTH_UNAVAILABLE' });
  });
});
