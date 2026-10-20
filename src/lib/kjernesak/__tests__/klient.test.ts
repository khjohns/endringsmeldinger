/** Klienten mot TS-serveren (#663). */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { opprettSak, sendKommando } from '$lib/api/kjerne';

import { setActiveProjectId } from '$lib/api/client';

const ID = '0b9c4c64-3f0e-4a8e-9a43-2a4b8f7f6a10';

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
    await opprettSak(ID, { type: 'opprett' }, 'prosjekt-1');
    const [[url, init]] = kall;
    expect(url).toBe('/api/kjerne/saker');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      kommando_id: ID,
      kommando: { type: 'opprett' },
    });
    const headers = new Headers(init.headers);
    expect(headers.get('X-Project-ID')).toBe('prosjekt-1');
    expect(headers.get('X-CSRF-Token')).toBe('token');
  });

  it('oppretter saken i prosjektet fra ruta, ikke i det aktive', async () => {
    await opprettSak(ID, { type: 'opprett' }, 'prosjekt-2');
    expect(new Headers(kall[0][1].headers).get('X-Project-ID')).toBe('prosjekt-2');
  });

  it('sender kommandoen til prosjektet fra ruta, ikke til det aktive', async () => {
    await sendKommando('a', 1, ID, { type: 'krav' }, 'prosjekt-2');
    expect(new Headers(kall[0][1].headers).get('X-Project-ID')).toBe('prosjekt-2');
  });

  // Kilde: #743 p4. Uten prosjekt fra ruta avviser serveren, i stedet for å bruke det aktive.
  it('en tom prosjekt-ID sendes som den er og gir ikke det aktive prosjektet', async () => {
    await sendKommando('a', 1, ID, { type: 'krav' }, '');
    expect(new Headers(kall[0][1].headers).get('X-Project-ID')).toBe('');
  });

  it('sender kommandoen med versjonen skjemaet så, til saken', async () => {
    await sendKommando('a/b', 3, ID, { type: 'krav' }, 'prosjekt-1');
    const [[url, init]] = kall;
    expect(url).toBe('/api/kjerne/saker/a%2Fb/kommandoer');
    expect(JSON.parse(init.body as string)).toEqual({
      expected_version: 3,
      kommando_id: ID,
      kommando: { type: 'krav' },
    });
  });
});
