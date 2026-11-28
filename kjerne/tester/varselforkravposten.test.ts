/**
 * Hvilket krav som er varselet for en kravpost når posten står i flere versjoner, eller et eldre
 * krav utenfor rekken er varselet (VS-U87 punkt 22, OV-U120). `datoerVedSvar` og svarskjemaet i
 * Varden leser varselet derfra, så den rettede datoen står ved varselet og ikke ved versjonen som
 * viderefører posten (U-6 og U-7 i BF-50, #2515).
 */

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { kravposterI } from '../spor/vederlag/format.ts';
import { varseletForKravposten } from '../spor/vederlag/utledning.ts';
import { SOM_BREV } from './brevet.ts';
import { type Data, PAABEROPELSE, sak } from './brevsak.ts';

type Sak = ReturnType<typeof sak>;

const P1 = (oppgjoersform: string) => ({
  betegnelse: 'P1',
  beskrivelse: 'Riving',
  oppgjoersform,
  ...(oppgjoersform === 'tilbud' ? { beloep: 50000 } : {}),
});
const lagtTil = (sendt: string, oppgjoersform: string) => ({
  type: 'krav',
  spor: 'vederlag',
  innhold: { kravposter: [P1(oppgjoersform)] },
  sendt,
  ...SOM_BREV,
  dokumentasjon: [randomUUID()],
});
const fraLoesningen = (s: Sak) =>
  s.send('TE', { type: 'krav', spor: 'vederlag', innhold: { kravposter: [P1('regningsarbeid')] } });
const kravet = (rad: { data: Data }) => (rad.data.krav as Data[])[0].id as string;
const rett = (s: Sak, gjelder: string, dato: string) =>
  s.send('TE', { type: 'retting', gjelder, dato });
const posten = (s: Sak) => kravposterI(s.u().spor.vederlag.gjeldendeKrav!)[0].id;

describe('en kravpost som står i flere versjoner i rekken (VS-U87 punkt 22)', () => {
  function medToVersjoner() {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    fraLoesningen(s);
    const [k1] = s.u().spor.vederlag.krav;
    fraLoesningen(s);
    const [, k2] = s.u().spor.vederlag.krav;
    return { s, k1, k2 };
  }

  it('er første versjon varselet for posten i den neste, så en retting av den leses ved varselet', () => {
    const { s, k1, k2 } = medToVersjoner();
    expect(varseletForKravposten(s.u(), k2, posten(s))).toBe(k1.id);
  });

  it('er første versjon varselet for posten i seg selv', () => {
    const { s, k1 } = medToVersjoner();
    expect(varseletForKravposten(s.u(), k1, posten(s))).toBe(k1.id);
  });

  it('kontrollsak: en post uten varselhjemmel har ikke noe varsel', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('TE', {
      type: 'krav',
      spor: 'vederlag',
      innhold: { kravposter: [P1('tilbud')] },
    });
    const k = s.u().spor.vederlag.gjeldendeKrav!;
    expect(varseletForKravposten(s.u(), k, posten(s))).toBeUndefined();
  });
});

describe('et krav utenfor rekken er varselet for posten (OV-U120)', () => {
  function medEldreKrav() {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('TE', lagtTil('2026-09-30', 'tilbud'));
    const eldre = kravet(s.send('TE', lagtTil('2026-09-26', 'regningsarbeid')));
    fraLoesningen(s);
    return { s, eldre };
  }

  it('er det eldre kravet varselet for posten i versjonen i rekken', () => {
    const { s, eldre } = medEldreKrav();
    expect(varseletForKravposten(s.u(), s.u().spor.vederlag.gjeldendeKrav!, posten(s))).toBe(eldre);
  });

  it('er det fortsatt varselet når det rettes, så lenge det ikke rettes til etter et annet krav', () => {
    const { s, eldre } = medEldreKrav();
    rett(s, eldre, '2026-09-27');
    expect(varseletForKravposten(s.u(), s.u().spor.vederlag.gjeldendeKrav!, posten(s))).toBe(eldre);
  });
});
