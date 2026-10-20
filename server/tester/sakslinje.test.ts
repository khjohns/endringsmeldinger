/**
 * Linja og nøkkeltallene i sakslisten (#1022), regnet av journalen i minnet med
 * kjernens forløp i testene. Lesingen fra basen og prosjektgrensen prøves i
 * `saksliste.test.ts`.
 *
 * Kildene for forventningene: svarene fra oppdragsgiver 20.10 i #1022
 * (https://github.com/khjohns/endringsmeldinger/issues/1022#issuecomment-6290027563),
 * ført som MM-U28 (krav, svar og enighet; summene) og MM-U29 (det som foreligger),
 * og MM-U22 for de fire saksbetegnelsene. Eksempelet i svar 2 er forløp A i
 * bevis-sakene: grunnlaget avslått, vederlaget vurdert subsidiært og godtatt.
 */

import { describe, expect, it } from 'vitest';
import { minnebane } from '../../kjerne/tester/bane.ts';
import type { Handling } from '../../kjerne/tester/klient.ts';
import { Kjoering } from '../../kjerne/tester/kjoerer.ts';
import { KJERNE } from '../../kjerne/versjon.ts';
import { noekkeltall, sakslinje, type Sakslinje } from '../saksliste.ts';

const KRAV: Handling[] = [
  { handling: 'krav', spor: 'grunnlag', underkategori: 'irregulaer_endring', navn: 'K-g1' },
  { handling: 'krav', spor: 'vederlag', belop: 100000, navn: 'K-v1' },
  { handling: 'krav', spor: 'frist', dager: 20, navn: 'K-f1' },
];
const SVAR_FRIST = {
  spor: 'frist',
  varsel_i_tide: true,
  spesifisering_i_tide: true,
  hindring: true,
};
/** Forløp A i bevis-sakene, til og med aksepten av vederlaget. */
const FORLOEP_A: Handling[] = [
  ...KRAV,
  {
    handling: 'brev',
    navn: 'D4',
    svar: [
      { spor: 'grunnlag', resultat: 'avslaatt', varslet_i_tide: true },
      { spor: 'vederlag', vurdering: 'delvis', godkjent_belop: 60000 },
      { ...SVAR_FRIST, navn: 'S-f1' },
    ],
  },
];
const FULL_GODKJENNING: Handling[] = [
  ...KRAV,
  {
    handling: 'brev',
    navn: 'D1',
    svar: [
      { spor: 'grunnlag', resultat: 'godkjent', varslet_i_tide: true },
      { spor: 'vederlag', vurdering: 'godkjent', godkjent_belop: 100000 },
      SVAR_FRIST,
    ],
  },
];

async function linje(handlinger: Handling[]): Promise<Sakslinje> {
  const k = new Kjoering(minnebane());
  for (const h of handlinger) {
    const utfall = await k.send(h);
    expect(utfall?.godtatt, `${h.handling}: ${JSON.stringify(utfall)}`).toBe(true);
  }
  const journal = await k.bane.journal();
  return sakslinje(
    { sakId: k.bane.sakId, sakstype: 'standard', opprettet: journal[0]!.tidsstempel, journal },
    KJERNE
  );
}

describe('linja i sakslisten (#1022)', () => {
  it('krav uten svar venter på byggherrens svar i alle tre sporene (MM-U29)', async () => {
    const l = await linje(KRAV);
    expect(l).toMatchObject({
      forstaatt: true,
      saksbetegnelse: null,
      hovedkategori: 'endring',
      grunnlag: { svar: null, venter_paa_svar: true, svar_ikke_godtatt: false },
      vederlag: {
        krav: { beloep: 100000, metode: 'tilbud' },
        svar: null,
        enighet: null,
        venter_paa_svar: true,
        svar_ikke_godtatt: false,
      },
      frist: { krav: { dager: 20 }, svar: null, enighet: null, venter_paa_svar: true },
    });
  });

  it('svar 2: et subsidiært beløp er merket, og svaret står uten enighet (MM-U28, MM-U29)', async () => {
    const l = await linje(FORLOEP_A);
    expect(l.grunnlag).toMatchObject({
      svar: { resultat: 'avslaatt' },
      venter_paa_svar: false,
      svar_ikke_godtatt: true,
    });
    expect(l.vederlag).toMatchObject({
      svar: { beloep: 60000, subsidiaert: true },
      enighet: null,
      venter_paa_svar: false,
      svar_ikke_godtatt: true,
    });
  });

  it('svar 2: enigheten om det subsidiære beløpet er betinget av ansvaret (MM-U28)', async () => {
    const l = await linje([...FORLOEP_A, { handling: 'aksept', spor: 'vederlag', navn: 'D6' }]);
    expect(l.vederlag).toMatchObject({
      krav: { beloep: 100000 },
      svar: { beloep: 60000, subsidiaert: true },
      enighet: { beloep: 60000, virkning: 'betinget' },
      svar_ikke_godtatt: false,
    });
    expect(l.saksbetegnelse).toBeNull();
    expect(noekkeltall([l]).vederlag).toMatchObject({
      krav_sum: 100000,
      svar_subsidiaert_sum: 60000,
      enighet_betinget_sum: 60000,
      enighet_virksom_sum: 0,
    });
  });

  it('et svar som godkjenner kravet fullt ut, gir enighet ved sammenfall og står ikke som ikke godtatt, i alle tre sporene', async () => {
    const l = await linje(FULL_GODKJENNING);
    for (const spor of ['grunnlag', 'vederlag', 'frist'] as const) {
      expect(l[spor].svar, spor).not.toBeNull();
      expect(l[spor].svar_ikke_godtatt, spor).toBe(false);
      expect(l[spor].venter_paa_svar, spor).toBe(false);
    }
    expect(l.vederlag.enighet).toEqual({ beloep: 100000, virkning: 'virksom' });
    expect(l.frist.enighet).toEqual({ dager: 20, virkning: 'virksom' });
    expect(l.saksbetegnelse).toBe('kravene_avgjort');
    expect(noekkeltall([l]).vederlag).toMatchObject({
      enighet_virksom_sum: 100000,
      enighet_betinget_sum: 0,
      svar_subsidiaert_sum: 0,
    });
  });

  it.each([
    [
      'avslaget_paa_grunnlaget_godtatt',
      [...FORLOEP_A, { handling: 'aksept', spor: 'grunnlag' }] as Handling[],
    ],
    ['grunnlaget_trukket', [...KRAV, { handling: 'trekk', spor: 'grunnlag' }] as Handling[]],
  ])('saken har betegnelsen %s (MM-U22)', async (betegnelse, handlinger) => {
    expect((await linje(handlinger)).saksbetegnelse).toBe(betegnelse);
  });

  it('en sak kjernen ikke forstår, står i lista med betegnelsen og telles ikke i summene (MM-U2, MM-U22)', async () => {
    const k = new Kjoering(minnebane());
    for (const h of KRAV) expect((await k.send(h))?.godtatt).toBe(true);
    const journal = await k.bane.journal();
    const siste = journal.at(-1)!;
    journal.push({
      ...siste,
      event_id: crypto.randomUUID(),
      versjon: siste.versjon + 1,
      event_type: 'ukjent_hendelse',
      data: {},
    });
    const l = sakslinje(
      { sakId: k.bane.sakId, sakstype: 'standard', opprettet: journal[0]!.tidsstempel, journal },
      KJERNE
    );
    expect(l).toMatchObject({
      forstaatt: false,
      saksbetegnelse: 'ikke_forstaatt',
      vederlag: { krav: null, svar: null, enighet: null, venter_paa_svar: false },
    });
    const n = noekkeltall([l, await linje(KRAV)]);
    expect(n).toMatchObject({ saker: 2, ikke_forstaatt: 1 });
    expect(n.vederlag).toMatchObject({ krav_antall: 1, krav_sum: 100000, venter_paa_svar: 1 });
    expect(n.frist).toEqual({ krav_antall: 1, venter_paa_svar: 1 });
  });
});
