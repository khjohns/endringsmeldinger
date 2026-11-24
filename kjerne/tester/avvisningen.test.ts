/**
 * Kommandoene kjernen avviser: en vurdering uten standpunkt, et
 * ukjent felt i vurderingene, svaret på kravpostene i kommandoen og påberopelsene som ikke er
 * bygget.
 * Saken i minnet er `sak()` i `brevsak.ts`.
 */

import { describe, expect, it } from 'vitest';
import { medP1 } from './klient.ts';
import { type Data, FRIST_FULLT, VEDERLAG_DELVIS, sakMedKrav, svar, tilbud } from './brevsak.ts';

/**
 * #304, MM-U2: en vurdering kjernen ennå ikke har et standpunkt for, avvises og forenkles
 * ikke. Kontrollsaken er samme svar uten vurderingen.
 */
describe('en vurdering kjernen ikke har et standpunkt for, avvises', () => {
  const brev = (...svar: Data[]) => ({ type: 'brev', svar });

  it.each([
    [
      'vederlag',
      'tilbakeholdelse etter § 30.2',
      { ...VEDERLAG_DELVIS[0], hold_tilbake: true },
      VEDERLAG_DELVIS[1],
    ],
    [
      'vederlag',
      'tilbakeholdelse etter § 30.2 med en verdi som ikke er boolsk',
      { ...VEDERLAG_DELVIS[0], hold_tilbake: 'ja' },
      VEDERLAG_DELVIS[1],
    ],
  ] as [string, string, Data, Data][])('%s: %s', (spor, _n, vurderinger, resultat) => {
    const s = sakMedKrav();
    expect(s.avvist('BH', brev(svar(spor, s.krav(spor as 'frist'), vurderinger, resultat)))).toBe(
      'VURDERING_UTENFOR_KJERNEN'
    );
    const uten = Object.fromEntries(
      Object.entries(vurderinger).filter(([k]) => k !== 'hold_tilbake')
    );
    expect(s.avvist('BH', brev(svar(spor, s.krav(spor as 'frist'), uten, resultat)))).toBeNull();
  });
});

/**
 * OV-U89 punkt 9: en påberopelse etter § 34.1.3 mot rigg og drift avvises, og forsvinner ikke
 * (MM-U2). Kontrollsaken er samme svar uten påberopelsen.
 */
describe('en påberopelse etter § 34.1.3 mot rigg og drift avvises (OV-U89 punkt 9)', () => {
  it.each([true, false])('rigg_varslet_i_tide: %s', (iTide) => {
    const s = sakMedKrav();
    const brev = (v: Data) => ({
      type: 'brev',
      svar: [svar('vederlag', s.krav('vederlag'), v, VEDERLAG_DELVIS[1])],
    });
    expect(s.avvist('BH', brev({ ...VEDERLAG_DELVIS[0], rigg_varslet_i_tide: iTide }))).toBe(
      'UGYLDIG_VURDERING'
    );
    expect(s.avvist('BH', brev(VEDERLAG_DELVIS[0]))).toBeNull();
    expect(s.avvist('BH', brev({ ...VEDERLAG_DELVIS[0], rigg_varslet_i_tide: null }))).toBeNull();
  });
});

/**
 * MM-U2 (kravet i #1663): et felt i vurderingene som kjernen ikke leser, avvises og godtas ikke
 * uten virkning. Kontrollsaken er samme svar uten feltet.
 */
describe('et ukjent felt i vurderingene i svaret på vederlaget avvises (MM-U2)', () => {
  it.each([
    ['rigg_godkjent_beloep', 100],
    ['hovedkrav_varslet_i_tid', true],
    ['varsel_justert_ep_ok', false],
  ])('%s', (felt, verdi) => {
    const s = sakMedKrav();
    const brev = (v: Data) => ({
      type: 'brev',
      svar: [svar('vederlag', s.krav('vederlag'), v, VEDERLAG_DELVIS[1])],
    });
    expect(s.avvist('BH', brev({ ...VEDERLAG_DELVIS[0], [felt]: verdi }))).toBe(
      'UGYLDIG_VURDERING'
    );
    expect(s.avvist('BH', brev(VEDERLAG_DELVIS[0]))).toBeNull();
  });
});

/**
 * MM-U2 (#1732): et felt kjernen ikke leser i vurderingene i svaret på forholdet og fristen, ville
 * blitt godtatt uten virkning, så det avvises som i svaret på vederlaget. Kontrollsaken er det
 * samme svaret uten feltet.
 */
describe('et ukjent felt i vurderingene i svaret på forholdet og fristen avvises (MM-U2)', () => {
  const forholdGodkjent = { resultat: 'godkjent', grunnlag_varslet_i_tide: true };
  const brev = (...svar: Data[]) => ({ type: 'brev', svar });
  it.each([
    ['forholdet', 'grunnlag_varslet_i_tid', true],
    ['forholdet', 'hold_tilbake', false],
    ['forholdet', 'frist_varsel_ok', true],
  ])('%s: %s', (_, felt, verdi) => {
    const s = sakMedKrav();
    const brevet = (v: Data) => brev(svar('forhold', s.krav('forhold'), v));
    expect(s.avvisning('BH', brevet({ ...forholdGodkjent, [felt]: verdi }))).toMatchObject({
      regel: 'UGYLDIG_VURDERING',
      melding: expect.stringContaining(`${felt}: kjernen leser ikke feltet i svaret på forholdet`),
    });
    expect(s.avvist('BH', brevet(forholdGodkjent))).toBeNull();
  });

  it.each([
    ['fristen', 'frist_varsel_ok_', true],
    ['fristen', 'godkjent_dager', 20],
    ['fristen', 'grunnlag_varslet_i_tide', true],
  ])('%s: %s', (_, felt, verdi) => {
    const s = sakMedKrav();
    const brevet = (v: Data) =>
      brev(svar('frist', s.krav('frist'), v, FRIST_FULLT[1] as unknown as Data));
    expect(s.avvisning('BH', brevet({ ...FRIST_FULLT[0], [felt]: verdi }))).toMatchObject({
      regel: 'UGYLDIG_VURDERING',
      melding: expect.stringContaining(`${felt}: kjernen leser ikke feltet i svaret på fristen`),
    });
    expect(s.avvist('BH', brevet(FRIST_FULLT[0]))).toBeNull();
  });
});

/**
 * KA-U57 (c) og (d), KA-U59, OV-U23: byggherren svarer på kravpostene kravet har, hver for seg
 * og høyst én gang, og et felt kjernen ikke leser i svaret på en kravpost, avvises (MM-U2).
 */
describe('svaret på kravpostene i kommandoen (KA-U57 (c) og (d), OV-U23, MM-U2)', () => {
  const melding = (v: Data) => {
    const s = sakMedKrav();
    return s.avvisning('BH', {
      type: 'brev',
      svar: [svar('vederlag', s.krav('vederlag'), v, VEDERLAG_DELVIS[1])],
    });
  };

  it('kontrollsak: svaret på P1 godtas', () => {
    expect(melding(VEDERLAG_DELVIS[0])).toBeNull();
  });

  it.each([
    [
      'en kravpost kravet ikke har',
      { kravposter: [{ gjelder: 'P2', vurdering: 'godkjent', aksepterer: true }] },
      'kravposter: kravet har ikke kravposten «P2»',
    ],
    [
      'samme kravpost to ganger',
      {
        kravposter: [
          { gjelder: 'P1', vurdering: 'delvis', godkjent_beloep: 100000, aksepterer: true },
          { gjelder: 'P1', vurdering: 'delvis', godkjent_beloep: 100000, aksepterer: true },
        ],
      },
      'P1: er besvart mer enn én gang',
    ],
    [
      'et felt kjernen ikke leser i svaret på kravposten',
      medP1(VEDERLAG_DELVIS[0], { hold_tilbake: false }),
      'P1.hold_tilbake: kjernen leser ikke feltet i svaret på kravposten',
    ],
    [
      'kravpostene som ikke er en liste',
      { kravposter: { gjelder: 'P1', vurdering: 'godkjent' } },
      'kravposter: er ikke en liste med svar på kravpostene',
    ],
    ['ingen vurdering av kravposten', { kravposter: [] }, 'P1.vurdering: mangler'],
  ] as const)('%s avvises med UGYLDIG_VURDERING', (_, v, feil) => {
    const a = melding(v as Data);
    expect(a?.regel).toBe('UGYLDIG_VURDERING');
    expect(a?.melding).toContain(feil);
  });
});

/**
 * #1775: rigg og drift i forlenget byggetid (OV-U89 punkt 17) er ikke i formatet før #1724 har
 * satt formen. Kravet med posten avvises og forenkles ikke til et krav uten den, og en lagret rad
 * med posten er ikke forstått (MM-U2). Kontrollsaken er samme krav uten posten. Posten etter
 * § 34.1.3 annet ledd er uendret.
 */
describe('rigg og drift i vederlagskravet avvises til posten er bygget (MM-U2, #1775)', () => {
  const riggposten = { rigg_og_drift: { beloep: 20000 } };
  const produktivitetsposten = { produktivitet: { beloep: 40000 } };
  const vederlagskravet = (saerskilt?: Data) => ({
    type: 'krav',
    spor: 'vederlag',
    innhold: tilbud(150000, saerskilt ? { saerskilt } : {}),
  });

  it.each([
    ['alene', riggposten],
    ['med posten etter § 34.1.3 annet ledd', { ...produktivitetsposten, ...riggposten }],
  ])('kravet med rigg og drift %s avvises med posten i meldingen', (_n, saerskilt) => {
    const s = sakMedKrav();
    const a = s.avvisning('TE', vederlagskravet(saerskilt));
    expect(a?.melding).toContain(
      '$.innhold.saerskilt.rigg_og_drift: posten for rigg og drift i forlenget byggetid er ikke bygget ennå, så kravet kan ikke sendes med den'
    );
    expect(s.avvisning('TE', vederlagskravet()), 'kontrollsaken uten posten').toBeNull();
    expect(
      s.avvisning('TE', vederlagskravet(produktivitetsposten)),
      'posten etter § 34.1.3 annet ledd'
    ).toBeNull();
  });

  it('en lagret rad med rigg og drift i vederlagskravet er ikke forstått', () => {
    const s = sakMedKrav();
    s.send('TE', vederlagskravet(produktivitetsposten));
    expect(s.u().forstaatt, 'kontrollsaken').toBe(true);
    const kravet = (s.journal.at(-1)!.data.krav as Data[])[0];
    expect(kravet, 'forutsetning: raden har vederlagskravet').toMatchObject({
      spor: 'vederlag',
      saerskilt: produktivitetsposten,
    });
    kravet.saerskilt = { ...produktivitetsposten, ...riggposten };
    expect(s.u().forstaatt).toBe(false);
  });
});
