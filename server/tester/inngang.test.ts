/**
 * Det ruteren og inngangene deler (`inngang.ts`). Forventningen for hodene er
 * #854 punkt 2: kontrollen før sesjonen endres, prøver de samme hodene som
 * ruteren skriver. Forventningen for loggen er policyen i #867 punkt 5: ingen
 * melding, som kan bære et token eller et navn (AGENTS.md).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { fast, loggFeil, svarhoder } from '../inngang.ts';

describe('hodene ruteren skriver (#854 punkt 2)', () => {
  it('en JSON-kropp får Content-Type, og svarets hoder går foran rutens', () => {
    expect(
      svarhoder([200, { ok: true }, { 'Cache-Control': 'private' }], {
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
      })
    ).toEqual({
      'content-type': 'application/json; charset=utf-8',
      'Cache-Control': 'private',
      'Referrer-Policy': 'no-referrer',
    });
  });

  it.each([
    ['uten kropp', null],
    ['med en fil', Buffer.from('pdf')],
  ])('et svar %s får ikke Content-Type fra ruteren', (_navn, kropp) => {
    expect(svarhoder([302, kropp, { Location: '/x' }], undefined)).toEqual({ Location: '/x' });
  });
});

describe('en fast sti (#716 punkt 4)', () => {
  it('tegnene i stien står for seg selv', () => {
    const { sti, eksempel } = fast('/api/a.b');
    expect(sti.test('/api/a.b')).toBe(true);
    expect(sti.test('/api/aXb')).toBe(false);
    expect(sti.test('/api/a.b/c')).toBe(false);
    expect(eksempel()).toBe('/api/a.b');
  });
});

describe('loggen av en feil (#867 punkt 5)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('har stedet, klassen, feilnummeret og kallstakken, ikke meldingen', () => {
    const logg = vi.spyOn(console, 'error').mockImplementation(() => {});
    const feil = Object.assign(new TypeError('token=hemmelig, Kari Nordmann'), { number: 52044 });
    loggFeil('Synkroniseringen feilet', feil);
    const [linje] = logg.mock.calls[0] as [string];
    expect(linje).toMatch(/^Synkroniseringen feilet \(TypeError, feilnummer 52044\)\n\s+at /);
    expect(linje).not.toContain('hemmelig');
    expect(linje).not.toContain('Kari');
  });

  it('en meldingslinje som begynner med «at», kommer ikke med i stakken', () => {
    const logg = vi.spyOn(console, 'error').mockImplementation(() => {});
    loggFeil(
      'Synkroniseringen feilet',
      new Error('Catenda svarte:\n    at Kari Nordmann token=hemmelig')
    );
    const [linje] = logg.mock.calls[0] as [string];
    expect(linje).toMatch(/\n\s+at /);
    expect(linje).not.toContain('hemmelig');
    expect(linje).not.toContain('Kari');
  });

  it('et navn med linjeskift kommer ikke med i rammene', () => {
    const logg = vi.spyOn(console, 'error').mockImplementation(() => {});
    loggFeil('Navnet', Object.assign(new Error('m'), { name: 'N\n    at Kari' }));
    const [linje] = logg.mock.calls[0] as [string];
    expect(linje).toMatch(/\n\s+at /);
    expect(linje).not.toContain('Kari');
  });

  it('en melding endret etter at stakken ble laget, gir ingen rammer', () => {
    const logg = vi.spyOn(console, 'error').mockImplementation(() => {});
    const feil = new Error('a\n    at Kari token=hemmelig');
    void feil.stack;
    feil.message = 'kort';
    loggFeil('Endret', feil);
    expect(logg).toHaveBeenCalledWith('Endret (Error)');
  });

  it('null og undefined gir typen', () => {
    const logg = vi.spyOn(console, 'error').mockImplementation(() => {});
    loggFeil('Ingen årsak', undefined);
    loggFeil('Ingen årsak', null);
    expect(logg.mock.calls.map(([l]) => l)).toEqual([
      'Ingen årsak (undefined)',
      'Ingen årsak (object)',
    ]);
  });

  it('en verdi som ikke er en feil, gir typen', () => {
    const logg = vi.spyOn(console, 'error').mockImplementation(() => {});
    loggFeil('Svaret kunne ikke skrives', 'token=hemmelig');
    expect(logg).toHaveBeenCalledWith('Svaret kunne ikke skrives (String)');
  });
});
