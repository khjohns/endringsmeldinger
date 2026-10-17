/** Klienten mot TS-serveren (#663) og bryteren for TS-stien. */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { opprettSak, sendKommando } from '$lib/api/kjerne';
import { setActiveProjectId } from '$lib/api/client';
import { sakskilde, tsStienForNyeKoeSaker } from '$lib/kjernesak/bryter';

const json = (kropp: unknown, status = 200) =>
  new Response(JSON.stringify(kropp), { status, headers: { 'content-type': 'application/json' } });

describe('klienten mot TS-serveren', () => {
  const kall: [string, RequestInit][] = [];

  beforeEach(() => {
    kall.length = 0;
    setActiveProjectId('prosjekt-1');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit = {}) => {
        if (url.endsWith('/api/csrf-token')) return json({ csrfToken: 'token' });
        kall.push([url, init]);
        return json({ sak_id: 's', versjon: 1 }, 201);
      })
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('oppretter saken med kommandoen alene, med prosjektet og CSRF-tokenet', async () => {
    await opprettSak({ type: 'opprett' });
    const [[url, init]] = kall;
    expect(url).toBe('/api/kjerne/saker');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ kommando: { type: 'opprett' } });
    const headers = new Headers(init.headers);
    expect(headers.get('X-Project-ID')).toBe('prosjekt-1');
    expect(headers.get('X-CSRF-Token')).toBe('token');
  });

  it('oppretter saken i prosjektet fra ruta, ikke i det aktive', async () => {
    await opprettSak({ type: 'opprett' }, 'prosjekt-2');
    expect(new Headers(kall[0][1].headers).get('X-Project-ID')).toBe('prosjekt-2');
  });

  it('sender kommandoen med versjonen skjemaet så, til saken', async () => {
    await sendKommando('a/b', 3, { type: 'krav' });
    const [[url, init]] = kall;
    expect(url).toBe('/api/kjerne/saker/a%2Fb/kommandoer');
    expect(JSON.parse(init.body as string)).toEqual({
      expected_version: 3,
      kommando: { type: 'krav' },
    });
  });
});

describe('bryteren for TS-stien i nye KOE-saker', () => {
  it('er av uten verdi', () => {
    expect(tsStienForNyeKoeSaker(undefined)).toBe(false);
  });

  it.each(['false', '1', 'TRUE', ''])('er av med verdien %j', (verdi) => {
    expect(tsStienForNyeKoeSaker(verdi)).toBe(false);
  });

  it('er på med verdien "true"', () => {
    expect(tsStienForNyeKoeSaker('true')).toBe(true);
  });
});

describe('kilden saksruta leser saken fra (#665)', () => {
  it('er Python når bryteren er av, uansett hva TS-serveren har sagt', () => {
    expect(sakskilde(false, null)).toBe('python');
    expect(sakskilde(false, true)).toBe('python');
  });

  it('venter på TS-serveren når bryteren er på, så Python ikke kalles for en TS-sak', () => {
    expect(sakskilde(true, null)).toBe('venter');
    expect(sakskilde(true, true)).toBe('ts');
  });

  it('er Python når bryteren er på og TS-serveren sier at saken ikke finnes der', () => {
    expect(sakskilde(true, false)).toBe('python');
  });
});
