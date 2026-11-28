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
import { utledJournal, type Utledning } from '../utledning/utled.ts';
import { standpunkteneTilVarslene, varslerIEldreKrav } from '../spor/vederlag/utledning.ts';
import { KJERNE } from '../versjon.ts';
import { minnebane } from './bane.ts';
import { kjoer } from './kjoerer.ts';
import type { Handling } from './klient.ts';
import { dagklokke } from './testmiljoe.ts';
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
  it('rettes det eldre kravet selv, vises den nye datoen', () => {
    const { s, k2 } = medEldreKrav();
    rett(s, k2, '2026-09-27');
    nyVersjon(s);
    const u = s.u();
    expect(varseleneIEldreKrav(u)).toEqual([
      expect.objectContaining({
        dokument: dokumentet(u, k2),
        sendt: '2026-09-27',
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

describe('hva som var gjeldende, leser datoen som gjaldt den dagen kravet ble sendt (A1 i #2509, OV-U123 punkt 17, OV-U98, OV-U104)', () => {
  /** P1 som regningsarbeid, der TE sier at kravet er varselet. */
  const medValg = { ...P1('regningsarbeid'), varsel: { art: 'kravet' } };
  /** K1 lagt til 30.09 til fast sum og K2 26.09 som regningsarbeid; rettingen sendes 5. oktober. */
  function medRettingen(dato: string) {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('TE', lagtTil('2026-09-30', P1('tilbud', 50000)));
    const k2 = kravet(s.send('TE', lagtTil('2026-09-26', P1('regningsarbeid'))));
    rett(s, k2, dato);
    return s;
  }

  it('rettes K2 samme dag som K4 sendes, til den dagen, er K2 ikke sendt før K4, og K4 kan si at kravet er varselet', () => {
    const s = medRettingen('2026-10-05');
    expect(s.avvisning('TE', lagtTil('2026-10-05', medValg))).toBeNull();
    s.send('TE', lagtTil('2026-10-05', medValg));
    expect(s.u().begrensninger).toEqual([]);
  });

  it('kontrollsak: rettes K2 til dagen før, er K2 sendt før K4, og varselvalget avvises', () => {
    const s = medRettingen('2026-10-04');
    expect(s.avvisning('TE', lagtTil('2026-10-05', medValg))).toMatchObject({
      regel: 'KRAVPOSTVARSELET',
      melding: expect.stringContaining('hadde oppgjørsformen i en tidligere kravversjon'),
    });
  });

  it('kontrollsak fra #2517: en retting sendt etter dagen K4 ble sendt, regnes ikke med, og varselvalget avvises', () => {
    const s = medRettingen('2026-10-02');
    expect(s.avvisning('TE', lagtTil('2026-10-01', medValg))).toMatchObject({
      regel: 'KRAVPOSTVARSELET',
      melding: expect.stringContaining('hadde oppgjørsformen i en tidligere kravversjon'),
    });
  });
});

/**
 * Byggherrens påberopelse av at varselet for P1 kom for sent, når en retting gjør et annet eldre
 * krav til varselet (S-1 A i #2509, VS-U96 punkt 37). Forløpet bruker prefikset `krav_irreg`:
 * kravet fra løsningen 24.09 (steg 1) har P1 som regningsarbeid, og steg n skrives 23.09 + n dager.
 */
describe('påberopelsen står også mot det eldre kravet som er varselet etter rettingen (S-1 A i #2509)', () => {
  const regningsarbeid = (h: Data = {}): Handling => ({
    handling: 'krav',
    spor: 'vederlag',
    kravposter: [{ post: 'P1', oppgjoersform: 'regningsarbeid' }],
    ...h,
  });
  const k2 = regningsarbeid({ sendt: '2026-09-20', navn: 'K2' });
  const k3 = regningsarbeid({ sendt: '2026-09-21', navn: 'K3' });
  const forSent = (h: Data = {}): Handling => ({
    handling: 'brev',
    svar: [{ spor: 'vederlag', kravposter: [{ post: 'P1', varslet_i_tide: false }] }],
    ...h,
  });
  const retting = (gjelder: string, dato: string): Handling => ({
    handling: 'retting',
    gjelder,
    dato,
  });

  /** Byggherrens nye svar, som igjen sier at varselet for P1 kom for sent. */
  const nyttSvar: Handling = {
    handling: 'revisjon',
    spor: 'vederlag',
    kravposter: [{ post: 'P1', varslet_i_tide: false }],
  };

  let sisteTekst = '';
  /** Saken etter stegene. Hvert steg må godtas. Teksten i det nye svaret står i `sisteTekst`. */
  async function saken(steg: Handling[]): Promise<Utledning> {
    const bane = minnebane();
    const k = await kjoer(
      { id: 'eldre-krav-retting', rader: [], start: 'krav_irreg', steg: [], kontroller: [] },
      bane,
      { valg: { klokke: dagklokke() } }
    );
    for (const [i, h] of steg.entries()) {
      const utfall = await k.send(h);
      expect(utfall?.godtatt ? null : utfall?.avvisning, `steg ${i + 1} godtas`).toBeNull();
      if (utfall?.godtatt && h === nyttSvar) sisteTekst = laast(utfall.hendelser.at(-1)!).join(' ');
    }
    const u = utledJournal(await bane.journal(), KJERNE);
    expect(u.begrensninger, 'saken er forstått').toEqual([]);
    return u;
  }
  const staar = (u: Utledning) =>
    standpunkteneTilVarslene(u, null).filter((x) => x.hjemmel === '34.4' && !x.iTide);
  const varselet = (u: Utledning) => varslerIEldreKrav(u).map((v) => v.dokument);
  const brevetMed = (u: Utledning, i: number) => u.spor.vederlag.kravUtenforRekken[i]!.dokument;

  it('påberopelsen etter k2 står også mot k3 når k2 rettes til en dag etter K3', async () => {
    const u = await saken([regningsarbeid(), k2, forSent(), k3, retting('K2', '2026-09-22')]);
    expect(varselet(u), 'Forutsetning: k3 er varselet etter rettingen').toEqual([brevetMed(u, 1)]);
    expect(staar(u)).toHaveLength(1);
  });

  it('et nytt svar fra løsningen viser til påberopelsen etter k2 også når k3 er varselet etter rettingen', async () => {
    await saken([regningsarbeid(), k2, forSent(), k3, retting('K2', '2026-09-22'), nyttSvar]);
    expect(sisteTekst).toContain('jf. innsigelsen');
  });

  it('kontrollsak: det nye svaret viser ikke til en påberopelse før k2 ble lagt til (VS-U96 punkt 37)', async () => {
    await saken([regningsarbeid(), forSent(), k2, k3, retting('K2', '2026-09-22'), nyttSvar]);
    expect(sisteTekst).toContain('ikke ble gitt eller kom for sent');
    expect(sisteTekst).not.toContain('jf. innsigelsen');
  });

  it('kontrollsak: en påberopelse før k2 ble lagt til, følger ikke med til k3 (VS-U96 punkt 37)', async () => {
    const u = await saken([regningsarbeid(), forSent(), k2, k3, retting('K2', '2026-09-22')]);
    expect(staar(u)).toEqual([]);
  });

  it('kontrollsak: rettes k2 og k3 til en dag etter kravet, står påberopelsen før dem igjen mot kravet', async () => {
    const u = await saken([
      regningsarbeid(),
      forSent(),
      k2,
      k3,
      retting('K2', '2026-09-25'),
      retting('K3', '2026-09-25'),
    ]);
    expect(varselet(u)).toEqual([]);
    expect(staar(u)).toHaveLength(1);
  });

  it('et svar som legges til, sendt før rettingene, leser påberopelsen før k2 uten dem (A3 i #2509)', async () => {
    const u = await saken([
      regningsarbeid(),
      forSent(),
      k2,
      k3,
      retting('K2', '2026-09-25'),
      retting('K3', '2026-09-25'),
    ]);
    expect(
      standpunkteneTilVarslene(u, '2026-09-27', true).filter(
        (x) => x.hjemmel === '34.4' && !x.iTide
      )
    ).toEqual([]);
    expect(
      standpunkteneTilVarslene(u, '2026-09-29', true).filter(
        (x) => x.hjemmel === '34.4' && !x.iTide
      ),
      'kontrollsak: sendt samme dag som den siste rettingen'
    ).toHaveLength(1);
  });

  it('med journalen kuttet foran et senere krav som viser til et varsel for P1, faller påberopelsen før k2 bort som da (VS-U81)', async () => {
    const v: Handling = {
      handling: 'varsel',
      spor: 'vederlag',
      hjemmel: '34.4',
      sendt: '2026-09-18',
      navn: 'V',
    };
    const k5 = {
      handling: 'krav',
      spor: 'vederlag',
      kravposter: [{ post: 'P1', oppgjoersform: 'regningsarbeid', varsel: 'V' }],
      sendt: '2026-09-19',
    } satisfies Handling;
    const u = await saken([regningsarbeid(), forSent(), k2, k3, v, k5]);
    const kuttet = u.spor.vederlag.kravUtenforRekken.at(-1)!.dokument;
    expect(staar(u), 'Forutsetning: med k5 er ikke noe eldre krav varselet').toHaveLength(1);
    expect(
      standpunkteneTilVarslene(u, null, false, kuttet).filter(
        (x) => x.hjemmel === '34.4' && !x.iTide
      )
    ).toEqual([]);
  });

  // k2 rettes 26.09. Svaret lagt til står etter rettingen i saken, og k3 legges til etter svaret.
  it('et svar lagt til, sendt dagen før rettingen, står mot k2 som var varselet den dagen (OV-U98)', async () => {
    const u = await saken([
      regningsarbeid(),
      k2,
      retting('K2', '2026-09-22'),
      forSent({ sendt: '2026-09-25' }),
      k3,
    ]);
    expect(staar(u)).toHaveLength(1);
  });

  it('kontrollsak: et svar lagt til, sendt samme dag som rettingen, regner den med, og følger ikke med til k3 (OV-U104)', async () => {
    const u = await saken([
      regningsarbeid(),
      k2,
      retting('K2', '2026-09-22'),
      forSent({ sendt: '2026-09-26' }),
      k3,
    ]);
    expect(staar(u)).toEqual([]);
  });

  it('kontrollsak: et svar fra løsningen etter rettingen regner den med etter rekkefølgen i saken', async () => {
    const u = await saken([regningsarbeid(), k2, retting('K2', '2026-09-22'), forSent(), k3]);
    expect(staar(u)).toEqual([]);
  });
});
