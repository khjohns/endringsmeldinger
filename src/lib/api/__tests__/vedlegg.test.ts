import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  formaterStorrelse,
  hentVedlegg,
  slettVedlegg,
  lastOppVedlegg,
  MAKS_VEDLEGG_BYTES,
  type Vedlegg,
} from '../vedlegg';
import { ApiError, clearCsrfToken } from '../client';

// Tokenet caches i modulen; uten nullstilling arver testene hverandres.
beforeEach(() => clearCsrfToken());
afterEach(() => vi.unstubAllGlobals());

function svar(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json' },
  });
}

function fil(navn: string, storrelse: number): File {
  const f = new File(['x'], navn);
  Object.defineProperty(f, 'size', { value: storrelse });
  return f;
}

describe('hentVedlegg', () => {
  it('sender prosjekt-headeren og returnerer listen', async () => {
    const hent = vi
      .fn()
      .mockResolvedValue(svar({ vedlegg: [{ id: 'a', navn: 'a.pdf' }], min_rolle: 'TE' }));
    vi.stubGlobal('fetch', hent);

    const resultat = await hentVedlegg('SAK-1');

    expect(resultat.vedlegg).toHaveLength(1);
    const [, init] = hent.mock.calls[0];
    expect(init.headers['X-Project-ID']).toBeDefined();
    expect(init.credentials).toBe('include');
  });

  it('sak-ID-en kodes inn i URL-en', async () => {
    const hent = vi.fn().mockResolvedValue(svar({ vedlegg: [] }));
    vi.stubGlobal('fetch', hent);

    await hentVedlegg('SAK/1 med mellomrom');

    expect(hent.mock.calls[0][0]).toContain('SAK%2F1%20med%20mellomrom');
  });

  it('løfter backendens feilmelding videre', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(svar({ message: 'Vedlegget finnes ikke.' }, { status: 404 }))
    );

    await expect(hentVedlegg('SAK-1')).rejects.toThrow('Vedlegget finnes ikke.');
  });

  it('tåler at feilsvaret ikke er JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>502</html>', { status: 502 }))
    );

    await expect(hentVedlegg('SAK-1')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('lastOppVedlegg', () => {
  it('avviser for store filer uten å kontakte serveren', async () => {
    const hent = vi.fn();
    vi.stubGlobal('fetch', hent);

    await expect(lastOppVedlegg('SAK-1', fil('stor.pdf', MAKS_VEDLEGG_BYTES + 1))).rejects.toThrow(
      /større enn/
    );
    expect(hent).not.toHaveBeenCalled();
  });

  it('avviser tomme filer uten å kontakte serveren', async () => {
    const hent = vi.fn();
    vi.stubGlobal('fetch', hent);

    await expect(lastOppVedlegg('SAK-1', fil('tom.pdf', 0))).rejects.toThrow('Filen er tom.');
    expect(hent).not.toHaveBeenCalled();
  });

  it('setter ikke Content-Type selv — nettleseren må sette multipart-grensen', async () => {
    const hent = vi
      .fn()
      .mockResolvedValueOnce(svar({ csrfToken: 'token' }))
      .mockResolvedValueOnce(svar({ id: 'a', navn: 'a.pdf' } satisfies Partial<Vedlegg>));
    vi.stubGlobal('fetch', hent);

    await lastOppVedlegg('SAK-1', fil('a.pdf', 10));

    const [, init] = hent.mock.calls.at(-1)!;
    expect(init.headers['Content-Type']).toBeUndefined();
    expect(init.headers['X-CSRF-Token']).toBe('token');
    expect(init.body).toBeInstanceOf(FormData);
  });
});

describe('slettVedlegg', () => {
  it('sender DELETE med CSRF-token', async () => {
    const hent = vi
      .fn()
      .mockResolvedValueOnce(svar({ csrfToken: 'token' }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', hent);

    await slettVedlegg('SAK-1', 'vedlegg-1');

    const [url, init] = hent.mock.calls.at(-1)!;
    expect(init.method).toBe('DELETE');
    expect(init.headers['X-CSRF-Token']).toBe('token');
    expect(url).toContain('vedlegg-1');
  });

  it('løfter backendens begrunnelse videre når vedlegget er i bruk', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(svar({ csrfToken: 'token' }))
        .mockResolvedValueOnce(
          svar(
            { message: 'Vedlegget er brukt i en sendt hendelse og kan ikke fjernes.' },
            { status: 409 }
          )
        )
    );

    await expect(slettVedlegg('SAK-1', 'v')).rejects.toThrow(/sendt hendelse/);
  });
});

describe('formaterStorrelse', () => {
  it.each([
    [512, '512 B'],
    [2048, '2 kB'],
    [1572864, '1,5 MB'],
  ])('%i → %s', (bytes, forventet) => {
    expect(formaterStorrelse(bytes)).toBe(forventet);
  });
});
