/**
 * Returstien og hodene i tilbakekallet fra innloggingen (#716 punkt 7, #763
 * punkt 8). Resten av innloggingsinngangene prøves i `innlogging.test.ts`.
 *
 * Forventningen for returstien er kravet i #659: en lokal sti, og nettleseren
 * løser opp punktsegmentene før den følger omdirigeringen, så stien må være
 * lokal også etterpå. Forventningen for hodene er funnet i #763 punkt 8: et hode
 * Node avviser, gir 500 uten kapsel, så ingen sesjon skal være opprettet eller
 * slettet før hodene er prøvd.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sesjonsnavn } from '../autorisasjon.ts';
import { tryggRetursti, type Innloggingsleverandoer } from '../innlogging.ts';
import { lesSesjon, opprettInnloggingsforsoek, opprettSesjon } from '../sesjon.ts';
import {
  lagOppsett,
  rydd,
  startServer,
  TESTBASE_URL,
  type KjorendeServer,
  type Oppsett,
} from './testbase.ts';

describe('en retursti som løses opp til //, gir / (#716 punkt 7)', () => {
  it.each([
    '/.//angriper.example',
    '/x/..//angriper.example',
    '/%2e//angriper.example',
    '/x/%2e%2e//angriper.example',
  ])('%j', (inn) => {
    // Forutsetningen: nettleseren gjør stien til `//angriper.example`.
    expect(new URL(inn, 'https://app.example.no').pathname).toBe('//angriper.example');
    expect(tryggRetursti(inn)).toBe('/');
  });

  it.each([
    ['/./saker/1', '/./saker/1'],
    ['/x/../saker//1', '/x/../saker//1'],
  ])('kontrollsak: %j gir %j', (inn, ut) => {
    expect(tryggRetursti(inn)).toBe(ut);
  });
});

describe.skipIf(!TESTBASE_URL)('hodene i tilbakekallet mot testbasene', () => {
  const SESJON = sesjonsnavn();
  let o: Oppsett;
  let server: KjorendeServer;
  let byttet = 0;
  const oauth: Innloggingsleverandoer = {
    autorisasjonsadresse: (state) => `https://catenda.test/oauth2/authorize?state=${state}`,
    async byttKode() {
      byttet += 1;
      return 'brukertoken';
    },
    async bruker() {
      return { subjekt: 'b'.repeat(32), epost: 'ola@test.example', navn: 'Ola' };
    },
    async prosjekter() {
      return new Set<string>();
    },
    async medlemmer() {
      throw new Error('Ingen koblede prosjekter i testen.');
    },
  };

  beforeAll(async () => {
    o = await lagOppsett();
    // `☃` er utenfor latin1, så Node avviser `Location`.
    server = await startServer(o, { innlogging: { frontend: 'https://☃.example', oauth } });
  }, 240_000);
  afterAll(async () => {
    await server?.stopp();
    if (o) await rydd(o);
  }, 60_000);

  it('et hode Node avviser, gir 500 før koden byttes, og den gamle sesjonen består (#763 punkt 8)', async () => {
    const pool = o.datalag.kjoeretid.pool;
    const gammel = await opprettSesjon(pool, o.te.id);
    const forsoek = await opprettInnloggingsforsoek(pool, '/saker/1');
    const svar = await fetch(
      `${server.url}/api/auth/catenda/callback?state=${forsoek.state}&code=kode`,
      {
        headers: { Cookie: `${SESJON}=${gammel.token}; ${SESJON}_login=${forsoek.nettleser}` },
        redirect: 'manual',
      }
    );
    expect(svar.status).toBe(500);
    expect(svar.headers.getSetCookie()).toEqual([]);
    expect(byttet).toBe(0);
    expect((await lesSesjon(pool, gammel.token))?.bruker.id.toLowerCase()).toBe(o.te.id);
  });
});
