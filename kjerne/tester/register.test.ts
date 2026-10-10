/**
 * Vakta for registeret over hendelsene kjernen skriver (#320):
 * `docs/datamodell/kjernehendelser.toml` skal ha de samme typene, sporene,
 * artene og feltene som skjemaene i `format.ts`. Formen på registeret prøves i
 * `backend/tests/test_datamodell/test_kjernehendelser.py`.
 *
 * Registeret leses med en liten leser for den delen av TOML det bruker:
 * `[[seksjon]]`, `nøkkel = "tekst"`, `nøkkel = """…"""`, `nøkkel = [ … ]` på
 * én linje og heltall. Står registeret i en annen form, feiler leseren.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  BESLUTNINGSGRUNNLAG,
  DOKUMENT,
  FORMAT,
  HENDELSESTYPER,
  KRAV,
  OPPLYSNING,
  SAK_OPPRETTET,
  STANDPUNKT,
  STANDPUNKTER_I_SPORET,
  STANDPUNKTSARTER,
  SVAR,
  UTREGNING,
  UTSAGN,
  UTSAGNSARTER,
} from '../format.ts';
import type { Skjema } from '../skjema.ts';
import { SPOR } from '../typer.ts';

const REGISTER = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../docs/datamodell/kjernehendelser.toml'
);

type Oppfoering = Record<string, string | number | string[]>;
type Register = { format?: number } & Record<string, Oppfoering[]>;

/** Den delen av TOML registeret bruker. Kaster på en linje den ikke kjenner. */
export function lesRegister(tekst: string): Register {
  const ut: Register = {};
  let gjeldende: Record<string, unknown> = ut;
  const linjer = tekst.split('\n');
  for (let i = 0; i < linjer.length; i++) {
    const linje = linjer[i].trim();
    if (!linje || linje.startsWith('#')) continue;
    const seksjon = /^\[\[([a-z_]+)\]\]$/.exec(linje);
    if (seksjon) {
      const liste = ((ut[seksjon[1]] as Oppfoering[] | undefined) ??= []);
      liste.push((gjeldende = {}) as Oppfoering);
      continue;
    }
    const par = /^([a-z_]+) = (.*)$/.exec(linje);
    if (!par) throw new Error(`Linje ${i + 1} er ikke i formen registeret bruker: ${linje}`);
    const [, noekkel, verdi] = par;
    if (verdi.startsWith('"""')) {
      const deler = [verdi.slice(3)];
      while (!deler.at(-1)!.endsWith('"""')) {
        if (++i >= linjer.length) throw new Error(`${noekkel}: """ er ikke lukket`);
        deler.push(linjer[i]);
      }
      gjeldende[noekkel] = deler.join('\n').slice(0, -3).trim();
    } else if (/^-?\d+$/.test(verdi)) {
      gjeldende[noekkel] = Number(verdi);
    } else {
      gjeldende[noekkel] = JSON.parse(verdi) as unknown;
    }
  }
  return ut;
}

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
      const utregning = UTREGNING[s];
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
    expect(feltI(oppfoering('del', 'navn', 'opplysning'))).toEqual(felt(OPPLYSNING));
  });

  it('har sporene hver art av standpunkter kan stå i', () => {
    for (const a of STANDPUNKTSARTER) {
      const spor = SPOR.filter((s) => STANDPUNKTER_I_SPORET[s].some((t) => t.art === a));
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
