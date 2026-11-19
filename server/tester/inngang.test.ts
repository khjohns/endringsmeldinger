/**
 * Det ruteren og inngangene deler (`inngang.ts`). Forventningen for hodene er
 * #854 punkt 2: kontrollen før sesjonen endres, prøver de samme hodene som
 * ruteren skriver. Forventningen for loggen er policyen i #867 punkt 5: ingen
 * melding, som kan bære et token eller et navn (CLAUDE.md).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { fast, svarhoder } from '../inngang.ts';
import { loggFeil, medLoggkontekst } from '../logg.ts';

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
    medLoggkontekst(() => loggFeil('Synkroniseringen feilet', feil), {
      korrelasjons_id: '3a5b86de-c166-444e-8970-773ce664edd0',
      aktor_id: '4b283460-6c4d-4855-8031-5bd1fd97c19d',
      prosjekt_id: 'prosjekt-test',
    });
    const [linje] = logg.mock.calls[0] as [string];
    expect(linje.split('\n')).toHaveLength(1);
    expect(JSON.parse(linje)).toMatchObject({
      tidspunkt: expect.stringMatching(/^\d{4}-\d\d-\d\dT.*Z$/),
      nivaa: 'error',
      sted: 'Synkroniseringen feilet',
      korrelasjons_id: '3a5b86de-c166-444e-8970-773ce664edd0',
      aktor_id: '4b283460-6c4d-4855-8031-5bd1fd97c19d',
      prosjekt_id: 'prosjekt-test',
      feilklasse: 'TypeError',
      feilnummer: 52044,
      kallstakk: expect.arrayContaining([expect.stringMatching(/^\s+at /)]),
    });
    expect(linje).not.toContain('hemmelig');
    expect(linje).not.toContain('Kari');
  });

  it.each(['ETIMEOUT', 'ECLOSE', 'EPARAM'])(
    'en feil uten feilnummer har koden %s, så loggen skiller tidsavbrudd, lukket forbindelse og parameterfeil (#926)',
    (kode) => {
      const logg = vi.spyOn(console, 'error').mockImplementation(() => {});
      loggFeil('Kallet feilet', Object.assign(new Error('token=hemmelig'), { code: kode }));
      const [linje] = logg.mock.calls[0] as [string];
      expect(JSON.parse(linje)).toMatchObject({
        sted: 'Kallet feilet',
        feilklasse: 'Error',
        feilkode: kode,
      });
      expect(linje).not.toContain('hemmelig');
    }
  );

  it('en feil som pakker inn en annen, har koden eller feilnummeret fra den indre (#926)', () => {
    const logg = vi.spyOn(console, 'error').mockImplementation(() => {});
    loggFeil(
      'Kallet feilet',
      new Error('ytre', { cause: Object.assign(new Error('x'), { code: 'ESOCKET' }) })
    );
    loggFeil(
      'Kallet feilet',
      new Error('ytre', { cause: Object.assign(new Error('x'), { number: 1205 }) })
    );
    const [[foerste], [andre]] = logg.mock.calls as [string][];
    expect(JSON.parse(foerste)).toMatchObject({ feilkode: 'ESOCKET' });
    expect(JSON.parse(andre)).toMatchObject({ feilnummer: 1205 });
    expect(JSON.parse(andre)).not.toHaveProperty('feilkode');
  });

  it('en kode som ikke har formen til en kode, logges ikke, og feilnummeret går foran koden', () => {
    const logg = vi.spyOn(console, 'error').mockImplementation(() => {});
    loggFeil('Kallet feilet', Object.assign(new Error('x'), { code: 'Kari Nordmann' }));
    loggFeil('Kallet feilet', Object.assign(new Error('x'), { code: 'ETIMEOUT', number: 1205 }));
    const [[foerste], [andre]] = logg.mock.calls as [string][];
    expect(JSON.parse(foerste)).not.toHaveProperty('feilkode');
    expect(JSON.parse(andre)).toMatchObject({ feilnummer: 1205 });
    expect(JSON.parse(andre)).not.toHaveProperty('feilkode');
  });

  it('en meldingslinje som begynner med «at», kommer ikke med i stakken', () => {
    const logg = vi.spyOn(console, 'error').mockImplementation(() => {});
    loggFeil(
      'Synkroniseringen feilet',
      new Error('Catenda svarte:\n    at Kari Nordmann token=hemmelig')
    );
    const [linje] = logg.mock.calls[0] as [string];
    expect(JSON.parse(linje).kallstakk).toEqual(
      expect.arrayContaining([expect.stringMatching(/^\s+at /)])
    );
    expect(linje).not.toContain('hemmelig');
    expect(linje).not.toContain('Kari');
  });

  it('et navn med linjeskift kommer ikke med i rammene', () => {
    const logg = vi.spyOn(console, 'error').mockImplementation(() => {});
    loggFeil('Navnet', Object.assign(new Error('m'), { name: 'N\n    at Kari' }));
    const [linje] = logg.mock.calls[0] as [string];
    expect(JSON.parse(linje).kallstakk).toEqual(
      expect.arrayContaining([expect.stringMatching(/^\s+at /)])
    );
    expect(linje).not.toContain('Kari');
  });

  it('en melding endret etter at stakken ble laget, gir ingen rammer', () => {
    const logg = vi.spyOn(console, 'error').mockImplementation(() => {});
    const feil = new Error('a\n    at Kari token=hemmelig');
    void feil.stack;
    feil.message = 'kort';
    loggFeil('Endret', feil);
    const linje = JSON.parse(String(logg.mock.calls[0][0]));
    expect(linje).toMatchObject({ sted: 'Endret', feilklasse: 'Error' });
    expect(linje).not.toHaveProperty('kallstakk');
  });

  it('en feil fra Node med kode har koden og rammene (#926)', () => {
    // Node skriver hodet som `navn [kode]: melding`; i vitest skrives stakken om uten koden.
    const logg = vi.spyOn(console, 'error').mockImplementation(() => {});
    const feil = Object.assign(new RangeError('Received -1'), {
      code: 'ERR_OUT_OF_RANGE',
      stack:
        'RangeError [ERR_OUT_OF_RANGE]: Received -1\n    at Function.alloc (node:buffer:395:3)',
    });
    loggFeil('Kode', feil);
    expect(JSON.parse(String(logg.mock.calls[0][0]))).toMatchObject({
      sted: 'Kode',
      feilklasse: 'RangeError',
      feilkode: 'ERR_OUT_OF_RANGE',
      kallstakk: ['    at Function.alloc (node:buffer:395:3)'],
    });
  });

  it('en melding som ikke kan bli tekst, gir ingen rammer og ingen ny feil', () => {
    const logg = vi.spyOn(console, 'error').mockImplementation(() => {});
    const feil = {
      stack: 'Error: m\n    at f (x.ts:1:1)',
      get message(): string {
        throw new Error('token=hemmelig');
      },
    };
    loggFeil('Getter', feil);
    const linje = JSON.parse(String(logg.mock.calls[0][0]));
    expect(linje).toMatchObject({ sted: 'Getter', feilklasse: 'Object' });
    expect(linje).not.toHaveProperty('kallstakk');
  });

  it('en melding forkortet etter at stakken ble laget, gir ingen meldingslinje', () => {
    const logg = vi.spyOn(console, 'error').mockImplementation(() => {});
    const feil = new Error('Catenda svarte:\n    at Kari token=hemmelig');
    void feil.stack;
    feil.message = 'Catenda svarte:';
    loggFeil('Forkortet', feil);
    const tom = new Error('x\n    at Kari');
    void tom.stack;
    tom.message = '';
    loggFeil('Tom', tom);
    const linjer = logg.mock.calls.map(([l]) => l as string);
    expect(linjer).toHaveLength(2);
    for (const l of linjer) expect(l).not.toContain('Kari');
  });

  it('en ramme fra eval og en sti med mellomrom kommer med (#890 punkt 2)', () => {
    const logg = vi.spyOn(console, 'error').mockImplementation(() => {});
    const feil = new Error('x');
    feil.stack = [
      'Error: x',
      '    at eval (eval at lag (file:///srv/app.ts:3:9), <anonymous>:1:7)',
      '    at kjoer (/srv/mappe med mellomrom/app.ts:12:3)',
      '    at /srv/mappe med mellomrom/start.ts:4:1',
    ].join('\n');
    loggFeil('Eval', feil);
    const [linje] = logg.mock.calls[0] as [string];
    expect(JSON.parse(linje).kallstakk).toEqual(feil.stack.split('\n').slice(1));
  });

  it('nivået warn logger med console.warn', () => {
    const advarsel = vi.spyOn(console, 'warn').mockImplementation(() => {});
    loggFeil('Navneoppslaget feilet', Object.assign(new Error('Kari'), { number: 229 }), 'warn');
    const [linje] = advarsel.mock.calls[0] as [string];
    expect(JSON.parse(linje)).toMatchObject({
      nivaa: 'warn',
      sted: 'Navneoppslaget feilet',
      feilnummer: 229,
    });
    expect(linje).not.toContain('Kari');
  });

  it('et tomt navn gir rammene, som hodet V8 skriver', () => {
    const logg = vi.spyOn(console, 'error').mockImplementation(() => {});
    const feil = Object.assign(new Error('m'), {
      name: '',
      stack: 'm\n    at f (x.ts:1:1)',
    });
    loggFeil('Tomt navn', feil);
    expect(JSON.parse(String(logg.mock.calls[0][0]))).toMatchObject({
      sted: 'Tomt navn',
      feilklasse: 'Error',
      kallstakk: ['    at f (x.ts:1:1)'],
    });
  });

  it('null og undefined gir typen', () => {
    const logg = vi.spyOn(console, 'error').mockImplementation(() => {});
    loggFeil('Ingen årsak', undefined);
    loggFeil('Ingen årsak', null);
    expect(logg.mock.calls.map(([l]) => JSON.parse(String(l)).feilklasse)).toEqual([
      'undefined',
      'object',
    ]);
  });

  it('en verdi som ikke er en feil, gir typen', () => {
    const logg = vi.spyOn(console, 'error').mockImplementation(() => {});
    loggFeil('Svaret kunne ikke skrives', 'token=hemmelig');
    const linje = String(logg.mock.calls[0][0]);
    expect(JSON.parse(linje)).toMatchObject({
      sted: 'Svaret kunne ikke skrives',
      feilklasse: 'String',
    });
    expect(linje).not.toContain('hemmelig');
  });
});
