/**
 * Hvilket eldre krav utenfor rekken som er varselet for en kravpost når totalentreprenøren har
 * rettet datoen for et av dem (#2509). Kildene er OV-U120 (vilkår 4 og 5), MM-U63 (datoen som
 * gjelder er premiss for hvilket varsel som er det første), OV-U123 punkt 17 og punkt 18 i
 * samlevedtaket for retting av sendt brev (MM-U59): hva som var gjeldende, leser datoen TE oppga.
 * Datoen i visningen er arbeidsvalget A4 i #2509 (D-15 og U-15 i BF-49).
 *
 * Saken: påberopelsen fra løsningen 2. oktober, vederlagskravet K1 lagt til, sendt 30. september,
 * med P1 til fast sum, og to eldre krav lagt til med P1 som regningsarbeid: K2 sendt 26. september
 * og K3 sendt 28. september. Begge står utenfor rekken.
 */

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { Utledning } from '../utledning/utled.ts';
import { varseleneIEldreKrav } from '../spor/vederlag/visning.ts';
import { SOM_BREV } from './brevet.ts';
import { type Data, laast, PAABEROPELSE, sak } from './brevsak.ts';

type Sak = ReturnType<typeof sak>;

const P1 = (oppgjoersform: string, beloep?: number) => ({
  betegnelse: 'P1',
  beskrivelse: 'Riving',
  oppgjoersform,
  ...(beloep === undefined ? {} : { beloep }),
});
const lagtTil = (sendt: string, post: Data) => ({
  type: 'krav',
  spor: 'vederlag',
  innhold: { kravposter: [post] },
  sendt,
  ...SOM_BREV,
  dokumentasjon: [randomUUID()],
});
const kravet = (rad: { data: Data }) => (rad.data.krav as Data[])[0].id as string;
const rett = (s: Sak, gjelder: string, dato: string) =>
  s.send('TE', { type: 'retting', gjelder, dato });
const dokumentet = (u: Utledning, krav: string) =>
  u.spor.vederlag.kravUtenforRekken.find((k) => k.id === krav)!.dokument;

/** K1 i rekken med P1 til fast sum, og de eldre kravene K2 og K3 med P1 som regningsarbeid. */
function medEldreKrav() {
  const s = sak();
  s.send('TE', PAABEROPELSE);
  s.send('TE', lagtTil('2026-09-30', P1('tilbud', 50000)));
  const k2 = kravet(s.send('TE', lagtTil('2026-09-26', P1('regningsarbeid'))));
  const k3 = kravet(s.send('TE', lagtTil('2026-09-28', P1('regningsarbeid'))));
  expect(
    s.u().spor.vederlag.kravUtenforRekken.map((k) => k.id),
    'Forutsetning: K2 og K3 står utenfor rekken'
  ).toEqual([k2, k3]);
  return { s, k2, k3 };
}

const BREVET_28 = 'totalentreprenørens brev av 28. september 2026.';
/** Kravversjonen fra løsningen med P1 som regningsarbeid, og brevteksten den får. */
const nyVersjon = (s: Sak) =>
  laast(
    s.send('TE', {
      type: 'krav',
      spor: 'vederlag',
      innhold: { kravposter: [P1('regningsarbeid')] },
    })
  ).join(' ');

describe('K2 rettes til en dag etter K3 (MM-U63, OV-U120, #2509)', () => {
  it('er K3 varselet for P1 i visningen, med datoen som gjelder', () => {
    const { s, k2, k3 } = medEldreKrav();
    rett(s, k2, '2026-09-29');
    nyVersjon(s);
    const etter = s.u();
    expect(varseleneIEldreKrav(etter)).toEqual([
      expect.objectContaining({
        dokument: dokumentet(etter, k3),
        sendt: '2026-09-28',
        rettet: null,
      }),
    ]);
  });

  it('er K3 varselet for P1 i brevet med den neste versjonen', () => {
    const { s, k2, k3 } = medEldreKrav();
    rett(s, k2, '2026-09-29');
    const u = s.u();
    expect(nyVersjon(s)).toContain(`ble gitt i ${BREVET_28}`);
    expect(varseleneIEldreKrav(s.u()).map((v) => v.dokument)).toEqual([dokumentet(u, k3)]);
  });

  it('kontrollsak: uten rettingen er K2 varselet', () => {
    const { s, k2 } = medEldreKrav();
    const u = s.u();
    expect(nyVersjon(s)).toContain('ble gitt i totalentreprenørens brev av 26. september 2026.');
    expect(varseleneIEldreKrav(s.u()).map((v) => v.dokument)).toEqual([dokumentet(u, k2)]);
  });

  it('kontrollsak: rettes K3 i stedet til en dag etter K2, er K2 fortsatt varselet', () => {
    const { s, k2, k3 } = medEldreKrav();
    rett(s, k3, '2026-09-29');
    expect(nyVersjon(s)).toContain('ble gitt i totalentreprenørens brev av 26. september 2026.');
    const u = s.u();
    expect(varseleneIEldreKrav(u).map((v) => v.dokument)).toEqual([dokumentet(u, k2)]);
  });
});

describe('visningen viser datoen som gjelder for det eldre kravet (A4 i #2509, D-15 og U-15 i BF-49)', () => {
  it('rettes varselet selv, vises den nye datoen og brevet med rettingen', () => {
    const { s, k2 } = medEldreKrav();
    const retting = rett(s, k2, '2026-09-27');
    nyVersjon(s);
    const u = s.u();
    expect(varseleneIEldreKrav(u)).toEqual([
      expect.objectContaining({
        dokument: dokumentet(u, k2),
        sendt: '2026-09-27',
        rettet: retting.event_id,
      }),
    ]);
  });
});

describe('et eldre krav rettet til en dag etter kravversjonen som ellers er varselet (A1 og A2 i #2509)', () => {
  /** K1 i rekken til fast sum, K2 utenfor rekken som regningsarbeid, og K4 lagt til 1. oktober. */
  function medK4() {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('TE', lagtTil('2026-09-30', P1('tilbud', 50000)));
    const k2 = kravet(s.send('TE', lagtTil('2026-09-26', P1('regningsarbeid'))));
    const k4 = kravet(s.send('TE', lagtTil('2026-10-01', P1('regningsarbeid'))));
    expect(s.u().spor.vederlag.gjeldendeKrav?.id, 'Forutsetning: K4 er gjeldende').toBe(k4);
    return { s, k2 };
  }

  it('står K2 fortsatt utenfor rekken, saken er forstått, og K2 er ikke varselet (OV-U120 vilkår 5)', () => {
    const { s, k2 } = medK4();
    rett(s, k2, '2026-10-02');
    const u = s.u();
    expect(u.begrensninger).toEqual([]);
    expect(u.spor.vederlag.kravUtenforRekken.map((k) => k.id)).toEqual([k2]);
    expect(varseleneIEldreKrav(u)).toEqual([]);
  });

  it('kontrollsak: uten rettingen er K2 varselet for P1 i K4', () => {
    const { s, k2 } = medK4();
    const u = s.u();
    expect(varseleneIEldreKrav(u).map((v) => v.dokument)).toEqual([dokumentet(u, k2)]);
  });
});
