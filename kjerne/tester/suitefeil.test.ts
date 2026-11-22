/**
 * Reporteren og rapportvurderingen i feilinnføringene (#1133, #1425, #2108): feil på
 * filnivå, i `describe` og uhåndterte feil fra Vitest skal nå både `vurder` og `kontrollfeil`.
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { kontrollfeil, suitenavn, vurder, type Mutasjon, type Rapport } from './feilrapport.ts';
import SuitefeilReporter, { samleSuitefeil, type Suitefeil, type Testfil } from './suitefeil.ts';

const ROT = '/kopi';
const MAALFIL = 'kjerne/tester/kjerne.test.ts';
const ANNEN_FIL = 'kjerne/tester/annet.test.ts';

const MUTASJON: Mutasjon = {
  id: 'F-prøve',
  feilklasse: 'prøvemutasjon',
  fil: 'kjerne/utledning/utled.ts',
  endringer: [['a', 'b']],
  mal: ['M-1'],
};

const MAALFILER = new Set([MAALFIL]);

const fil = (sti: string, tester: Rapport['testResults'][number]['assertionResults']) => ({
  name: `${ROT}/${sti}`,
  status: tester.some((t) => t.status === 'failed') ? 'failed' : 'passed',
  message: '',
  assertionResults: tester,
});

const assertionFeil = (navn: string) => ({
  fullName: navn,
  status: 'failed',
  failureMessages: ['AssertionError: expected 1 to be 2'],
});

const gronnTest = (navn: string) => ({
  fullName: navn,
  status: 'passed',
  failureMessages: [],
});

const testfil = (
  moduleId: string,
  filfeil: { message?: unknown; name?: string; type?: string }[],
  suiter: { fullName: string; feil: { message?: unknown; name?: string; type?: string }[] }[] = []
): Testfil => ({
  moduleId,
  errors: () => filfeil,
  children: {
    allSuites: () => suiter.map((s) => ({ fullName: s.fullName, errors: () => s.feil })),
  },
});

describe('SuitefeilReporter og samleSuitefeil (#1133, #1425)', () => {
  it('samler feil på filnivå, i describe og uhåndterte feil med testfil når Vitest oppgir den', () => {
    const filer: Testfil[] = [
      testfil(
        `${ROT}/${MAALFIL}`,
        [{ message: 'importfeil' }],
        [{ fullName: 'oppsett', feil: [{ message: 'hook feilet' }] }]
      ),
    ];
    const feil = samleSuitefeil(filer, [
      {
        message: 'uhåndtert i annen fil',
        type: 'Unhandled Rejection',
        VITEST_TEST_PATH: `${ROT}/${ANNEN_FIL}`,
      },
      { message: 'uhåndtert uten fil', type: 'Unhandled Rejection' },
      { message: undefined, name: 'Error', type: 'Unhandled Rejection' },
      { message: 42, type: 'Unhandled Rejection' },
    ]);
    expect(feil).toEqual<Suitefeil[]>([
      { fil: `${ROT}/${MAALFIL}`, suite: '', melding: 'importfeil' },
      { fil: `${ROT}/${MAALFIL}`, suite: 'oppsett', melding: 'hook feilet' },
      { fil: `${ROT}/${ANNEN_FIL}`, suite: '', melding: 'uhåndtert i annen fil' },
      { fil: '', suite: '', melding: 'uhåndtert uten fil' },
      { fil: '', suite: '', melding: 'Error' },
      { fil: '', suite: '', melding: '42' },
    ]);
  });

  it('onTestRunEnd skriver filfeil og uhåndterte feil til FEILINNFOERING_SUITEFEIL', () => {
    const mappe = mkdtempSync(join(tmpdir(), 'suitefeil-test-'));
    const ut = join(mappe, 'suitefeil.json');
    const forrige = process.env.FEILINNFOERING_SUITEFEIL;
    process.env.FEILINNFOERING_SUITEFEIL = ut;
    try {
      new SuitefeilReporter().onTestRunEnd(
        [testfil(`${ROT}/${MAALFIL}`, [])],
        [
          {
            message: 'avvisning i målfil',
            type: 'Unhandled Rejection',
            VITEST_TEST_PATH: `${ROT}/${MAALFIL}`,
          },
          { message: 'avvisning utenfor test', type: 'Unhandled Rejection' },
        ]
      );
      expect(JSON.parse(readFileSync(ut, 'utf8'))).toEqual([
        { fil: `${ROT}/${MAALFIL}`, suite: '', melding: 'avvisning i målfil' },
        { fil: '', suite: '', melding: 'avvisning utenfor test' },
      ]);
    } finally {
      if (forrige === undefined) delete process.env.FEILINNFOERING_SUITEFEIL;
      else process.env.FEILINNFOERING_SUITEFEIL = forrige;
      rmSync(mappe, { recursive: true, force: true });
    }
  });
});

describe('suitenavn (#1425)', () => {
  it('viser fil, fil med describe, og «uhåndtert» når fil er tom', () => {
    expect(suitenavn({ fil: `${ROT}/${MAALFIL}`, suite: '', melding: '' }, ROT)).toBe(MAALFIL);
    expect(suitenavn({ fil: `${ROT}/${MAALFIL}`, suite: 'del', melding: '' }, ROT)).toBe(
      `${MAALFIL} > del`
    );
    expect(suitenavn({ fil: '', suite: '', melding: 'boom' }, ROT)).toBe('uhåndtert');
  });
});

describe('uhåndterte feil i vurder og kontrollfeil (#1425)', () => {
  it('en mutasjon med både målassertion og uhåndtert feil meldes ikke oppdaget', () => {
    const rapport: Rapport = {
      testResults: [fil(MAALFIL, [assertionFeil('M-1: forventning')])],
      suitefeil: [{ fil: '', suite: '', melding: 'avvisning utenfor test\nstack' }],
    };
    const u = vurder(MUTASJON, rapport, ROT, MAALFILER);
    expect(u.oppdaget).toBe(false);
    expect(u.tidsavbrudd).toBe(false);
    expect(u.linjer).toContain('  suitefeil: uhåndtert: avvisning utenfor test');
  });

  it('kontrollsak: samme mutasjon uten uhåndtert feil meldes oppdaget', () => {
    const rapport: Rapport = {
      testResults: [fil(MAALFIL, [assertionFeil('M-1: forventning')])],
      suitefeil: [],
    };
    const u = vurder(MUTASJON, rapport, ROT, MAALFILER);
    expect(u.oppdaget).toBe(true);
  });

  it('en uhåndtert feil godtas ikke gjennom forutsetninger', () => {
    const medForutsetning: Mutasjon = {
      ...MUTASJON,
      forutsetninger: [{ test: 'uhåndtert', melding: 'avvisning' }],
    };
    const rapport: Rapport = {
      testResults: [fil(MAALFIL, [assertionFeil('M-1: forventning')])],
      suitefeil: [{ fil: '', suite: '', melding: 'avvisning utenfor test' }],
    };
    expect(vurder(medForutsetning, rapport, ROT, MAALFILER).oppdaget).toBe(false);
  });

  it('en suitefeil eller uhåndtert feil i en annen fil enn målfilene avgjør ikke utfallet (#2108)', () => {
    const rapport: Rapport = {
      testResults: [fil(MAALFIL, [assertionFeil('M-1: forventning')])],
      suitefeil: samleSuitefeil(
        [
          testfil(
            `${ROT}/${ANNEN_FIL}`,
            [],
            [{ fullName: 'annen', feil: [{ message: 'oppsett feilet' }] }]
          ),
        ],
        [
          {
            message: 'avvisning i annen fil',
            type: 'Unhandled Rejection',
            VITEST_TEST_PATH: `${ROT}/${ANNEN_FIL}`,
          },
        ]
      ),
    };
    const u = vurder(MUTASJON, rapport, ROT, MAALFILER);
    expect(u.oppdaget).toBe(true);
    expect(u.linjer).toContain(
      `  utenfor målfilene, avgjør ikke utfallet: ${ANNEN_FIL}: 2 feil som ikke er assertions`
    );
  });

  it('en uhåndtert feil med VITEST_TEST_PATH i målfilen hindrer oppdaget', () => {
    const rapport: Rapport = {
      testResults: [fil(MAALFIL, [assertionFeil('M-1: forventning')])],
      suitefeil: samleSuitefeil(
        [],
        [
          {
            message: 'avvisning i målfil',
            type: 'Unhandled Rejection',
            VITEST_TEST_PATH: `${ROT}/${MAALFIL}`,
          },
        ]
      ),
    };
    const u = vurder(MUTASJON, rapport, ROT, MAALFILER);
    expect(u.oppdaget).toBe(false);
    expect(u.linjer).toContain(`  suitefeil: ${MAALFIL}: avvisning i målfil`);
  });

  it('kontrollfeil melder uhåndterte feil både med og uten testfil selv når alle testene er grønne', () => {
    const medUhaandtert: Rapport = {
      testResults: [fil(MAALFIL, [gronnTest('M-1: forventning')])],
      suitefeil: samleSuitefeil(
        [],
        [
          {
            message: 'avvisning i annen fil\nlinje 2',
            type: 'Unhandled Rejection',
            VITEST_TEST_PATH: `${ROT}/${ANNEN_FIL}`,
          },
          { message: 'avvisning utenfor test\nlinje 2', type: 'Unhandled Rejection' },
        ]
      ),
    };
    const uten: Rapport = {
      testResults: [fil(MAALFIL, [gronnTest('M-1: forventning')])],
      suitefeil: [],
    };
    expect(kontrollfeil(medUhaandtert, ROT)).toEqual([
      `${ANNEN_FIL}: avvisning i annen fil`,
      'uhåndtert: avvisning utenfor test',
    ]);
    expect(kontrollfeil(uten, ROT)).toEqual([]);
  });
});
