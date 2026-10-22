import { afterEach, expect, it, vi } from 'vitest';
import { NETTFEIL, setActiveProjectId } from './client';
import { hentFil } from './fil';

afterEach(() => vi.unstubAllGlobals());

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

it('henter fila med sesjonen og prosjektet fra ruta', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('pdf'));
  vi.stubGlobal('fetch', fetch);
  expect(await (await hentFil('/api/fil', 'p1', 'Feil')).text()).toBe('pdf');
  expect(fetch.mock.calls[0][1]).toMatchObject({
    credentials: 'include',
    headers: { 'X-Project-ID': 'p1' },
  });
});

it('et manglende prosjekt i ruta erstattes ikke av det aktive prosjektet (#743)', async () => {
  setActiveProjectId('aktivt');
  const fetch = vi.fn().mockResolvedValue(new Response('pdf'));
  vi.stubGlobal('fetch', fetch);
  await hentFil('/api/fil', undefined as unknown as string, 'Feil');
  expect(fetch.mock.calls[0][1].headers).not.toHaveProperty('X-Project-ID');
});

it('en utløpt sesjon sender brukeren til innloggingen, som apiFetch (#1083)', async () => {
  const replace = vi.fn();
  vi.stubGlobal('window', { location: { pathname: '/p/c', search: '', replace } });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ message: 'Sesjonen er utløpt' }, 401)));
  await expect(hentFil('/api/fil', 'p1', 'Feil')).rejects.toMatchObject({
    status: 401,
    message: 'Sesjonen er utløpt',
  });
  expect(replace).toHaveBeenCalledWith('/login?return_to=%2Fp%2Fc');
});

it('et brutt nett gir meldingen på bokmål, ikke nettleserens «Failed to fetch» (#1083)', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
  await expect(hentFil('/api/fil', 'p1', 'Feil')).rejects.toMatchObject({
    status: 0,
    message: NETTFEIL,
  });
});

it('et nett som brytes mens fila leses, gir samme melding (#1083)', async () => {
  const svar = new Response('pdf');
  vi.spyOn(svar, 'blob').mockRejectedValue(new TypeError('network error'));
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(svar));
  await expect(hentFil('/api/fil', 'p1', 'Feil')).rejects.toMatchObject({ message: NETTFEIL });
});

it('et avslag viser serverens melding, og ellers feilteksten til kalleren', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ message: 'Brevet er et utkast' }, 404)));
  await expect(hentFil('/api/fil', 'p1', 'Feil')).rejects.toMatchObject({
    status: 404,
    message: 'Brevet er et utkast',
  });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })));
  await expect(hentFil('/api/fil', 'p1', 'PDF-en kunne ikke lastes ned.')).rejects.toMatchObject({
    message: 'PDF-en kunne ikke lastes ned.',
  });
});
