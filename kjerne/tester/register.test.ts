/**
 * Vakta for registeret over hendelsene kjernen skriver (#320):
 * `docs/datamodell/kjernehendelser.toml` skal ha de samme typene, sporene,
 * artene og feltene som skjemaene i `format.ts`. Formen på registeret prøves i
 * `verktoy/tester/test_datamodell/test_kjernehendelser.py`.
 * Registeret leses med `lesRegister` (`registerleser.ts`).
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  BESLUTNINGSGRUNNLAG,
  BREVTEKST,
  DOKUMENT,
  FORMAT,
  HENDELSESTYPER,
  KRAV,
  OPPLYSNING,
  SAK_OPPRETTET,
  STANDPUNKT,
  TILLATTE_STANDPUNKTER,
  STANDPUNKTSARTER,
  SVAR,
  UTREGNINGSSKJEMA,
  UTSAGN,
  UTSAGNSARTER,
} from '../format/format.ts';
import type { Skjema } from '../format/skjema.ts';
import { SPOR } from '../typer.ts';
import { lesRegister, type Oppfoering } from './registerleser.ts';

const REGISTER = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../docs/datamodell/kjernehendelser.toml'
);

const register = lesRegister(readFileSync(REGISTER, 'utf8'));
const felt = (s: Skjema) => Object.keys(s.properties as Skjema).sort();
const oppfoering = (seksjon: string, noekkel: string, verdi: string, spor?: string) => {
  const o = (register[seksjon] ?? []).find(
    (x) => x[noekkel] === verdi && (spor === undefined || x.spor === spor)
  );
  if (!o) throw new Error(`Forutsetning: ${seksjon} ${verdi} står ikke i registeret`);
  return o;
};
const feltI = (o: Oppfoering) => [...(o.felt as string[])].sort();
const noekler = (seksjon: string, noekkel: string) =>
  (register[seksjon] ?? []).map((o) => o[noekkel]).sort();

describe('registeret over hendelsene kjernen skriver (#320)', () => {
  it('har formatet kjernen skriver', () => {
    expect(register.format).toBe(FORMAT);
  });

  it('har de samme typene, sporene og artene som kjernen', () => {
    expect(noekler('hendelse', 'navn')).toEqual([...HENDELSESTYPER].sort());
    expect(noekler('krav', 'spor')).toEqual([...SPOR].sort());
    expect(noekler('svar', 'spor')).toEqual([...SPOR].sort());
    expect(noekler('standpunkt', 'art')).toEqual([...STANDPUNKTSARTER].sort());
    expect(noekler('utsagn', 'art')).toEqual([...UTSAGNSARTER].sort());
  });

  it('har feltene skjemaene har', () => {
    expect(feltI(oppfoering('hendelse', 'navn', 'sak_opprettet'))).toEqual(felt(SAK_OPPRETTET));
    expect(feltI(oppfoering('hendelse', 'navn', 'dokument_registrert'))).toEqual(felt(DOKUMENT));
    for (const s of SPOR) {
      expect(feltI(oppfoering('krav', 'spor', s)), `krav ${s}`).toEqual(felt(KRAV[s]));
      expect(feltI(oppfoering('svar', 'spor', s)), `svar ${s}`).toEqual(felt(SVAR[s]));
      const utregning = UTREGNINGSSKJEMA[s];
      if (utregning)
        expect(feltI(oppfoering('del', 'navn', 'utregning', s)), `utregning ${s}`).toEqual(
          felt(utregning)
        );
    }
    for (const a of STANDPUNKTSARTER)
      expect(feltI(oppfoering('standpunkt', 'art', a)), a).toEqual(felt(STANDPUNKT[a]));
    for (const a of UTSAGNSARTER)
      expect(feltI(oppfoering('utsagn', 'art', a)), a).toEqual(felt(UTSAGN[a]));
    expect(feltI(oppfoering('del', 'navn', 'beslutningsgrunnlag'))).toEqual(
      felt(BESLUTNINGSGRUNNLAG)
    );
    expect(feltI(oppfoering('del', 'navn', 'brevtekst'))).toEqual(felt(BREVTEKST.items as Skjema));
    for (const [hva, skjema] of Object.entries(OPPLYSNING))
      expect(feltI(oppfoering('opplysning', 'hva', hva)), hva).toEqual(felt(skjema));
    expect(noekler('opplysning', 'hva')).toEqual(Object.keys(OPPLYSNING).sort());
  });

  it('har sporene hver art av standpunkter kan stå i', () => {
    for (const a of STANDPUNKTSARTER) {
      const spor = SPOR.filter((s) => TILLATTE_STANDPUNKTER[s].some((t) => t.art === a));
      expect([...(oppfoering('standpunkt', 'art', a).spor as string[])].sort(), a).toEqual(
        [...spor].sort()
      );
    }
  });

  it('leseren avviser en linje i en annen form', () => {
    expect(() => lesRegister('[[hendelse]]\nnavn: "x"')).toThrow(/ikke i formen/);
    expect(lesRegister('[[utsagn]]\nart = "trekk"\nfelt = ["id"]')).toEqual({
      utsagn: [{ art: 'trekk', felt: ['id'] }],
    });
  });
});
