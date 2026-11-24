/**
 * Fristtabellen med forlengelsene i sakene, slik inngangen `GET /api/projects/<p>/kontraktsfrister`
 * og siden for fristen leser den. Forventningene har kilde i KA-U77, GR-U38 og GR-U39: datoen regnes
 * med dagene partene er enige om i andre saker, og det som ikke er tatt med, nevnes med grunnen;
 * HF-U5: siden for fristen regner datoen uten dagene i saken den viser; MM-U2: en sak kjernen ikke
 * forstår, gjør datoen ukjent.
 */

import { describe, expect, it } from 'vitest';
import {
  datoenEtterForlengelsene,
  fristtabellsvaret,
  type FristIKontrakten,
  type Forlengelsene,
} from '../spor/frist/visning.ts';

describe('fristtabellsvaret', () => {
  const frist = (fristId: number, dato: string): FristIKontrakten => ({
    fristId,
    nummer: null,
    navn: `Frist ${fristId}`,
    dato,
    dagmulktbelagt: false,
  });
  const TABELL = [frist(1, '2027-06-30'), frist(2, '2026-12-15')];
  const KODE = { kode: 'koe' as const, loepenummer: 4 };
  const lest = (l: Partial<Forlengelsene>): Forlengelsene => ({
    tattMed: [],
    ikkeTattMed: [],
    ikkeForstaatt: [],
    sakskoder: new Map([
      ['a', KODE],
      ['b', null],
      ['c', null],
    ]),
    ...l,
  });

  it('KA-U77: datoen regnes med de avtalte dagene i alle sakene, frist for frist, og sakene nevnes', () => {
    const { frister, saker_ikke_forstaatt } = fristtabellsvaret(
      TABELL,
      lest({
        tattMed: [
          { sakId: 'a', fristId: 1, dager: 3, grunnlag: 'avtalt' },
          { sakId: 'b', fristId: 1, dager: 2, grunnlag: 'avtalt' },
          { sakId: 'b', fristId: 2, dager: 5, grunnlag: 'avtalt' },
        ],
      })
    );
    expect(saker_ikke_forstaatt).toEqual([]);
    expect(frister.map((f) => [f.frist_id, f.dato, f.dato_etter_forlengelsene])).toEqual([
      [1, '2027-06-30', '2027-07-05'],
      [2, '2026-12-15', '2026-12-20'],
    ]);
    expect(frister[0]!.forlengelser).toEqual([
      { sak_id: 'a', sakskode: KODE, dager: 3 },
      { sak_id: 'b', sakskode: null, dager: 2 },
    ]);
    expect(frister[0]!.ikke_tatt_med).toEqual([]);
  });

  it('KA-U77, GR-U38: dager byggherren har godkjent uten enighet, og subsidiære dager, er ikke tatt med og nevnes med grunnen', () => {
    const { frister } = fristtabellsvaret(
      TABELL,
      lest({
        tattMed: [{ sakId: 'a', fristId: 1, dager: 3, grunnlag: 'godkjent' }],
        ikkeTattMed: [
          { sakId: 'b', fristId: 1, dager: 4, grunnlag: 'subsidiaert_til_forholdet' },
          { sakId: 'c', fristId: 2, dager: 6, grunnlag: 'subsidiaert_i_fristen' },
        ],
      })
    );
    expect(frister.map((f) => f.dato_etter_forlengelsene)).toEqual(['2027-06-30', '2026-12-15']);
    expect(frister.map((f) => f.forlengelser)).toEqual([[], []]);
    expect(frister.map((f) => f.ikke_tatt_med)).toEqual([
      [
        { sak_id: 'a', sakskode: KODE, dager: 3, grunnlag: 'godkjent' },
        { sak_id: 'b', sakskode: null, dager: 4, grunnlag: 'subsidiaert_til_forholdet' },
      ],
      [{ sak_id: 'c', sakskode: null, dager: 6, grunnlag: 'subsidiaert_i_fristen' }],
    ]);
  });

  it('MM-U2: en sak kjernen ikke forstår, gjør datoen ukjent for hver frist og nevnes', () => {
    const { frister, saker_ikke_forstaatt } = fristtabellsvaret(
      TABELL,
      lest({
        tattMed: [{ sakId: 'a', fristId: 1, dager: 3, grunnlag: 'avtalt' }],
        ikkeForstaatt: ['c'],
      })
    );
    expect(frister.map((f) => f.dato_etter_forlengelsene)).toEqual([null, null]);
    expect(frister[0]!.forlengelser).toEqual([{ sak_id: 'a', sakskode: KODE, dager: 3 }]);
    expect(saker_ikke_forstaatt).toEqual([{ sak_id: 'c', sakskode: null }]);
  });
});

describe('datoenEtterForlengelsene', () => {
  const avtalt = [
    { sakId: 'a', fristId: 1, dager: 3 },
    { sakId: 'b', fristId: 1, dager: 2 },
    { sakId: 'b', fristId: 2, dager: 30 },
  ];

  it('KA-U77, HF-U5: dagene i saken siden viser, er ikke med, og dagene for en annen frist heller ikke', () => {
    expect(datoenEtterForlengelsene('2027-06-30', 1, avtalt, [])).toBe('2027-07-05');
    expect(datoenEtterForlengelsene('2027-06-30', 1, avtalt, [], 'b')).toBe('2027-07-03');
  });

  it('MM-U2: en annen sak kjernen ikke forstår, gjør datoen ukjent, men ikke saken siden viser', () => {
    expect(datoenEtterForlengelsene('2027-06-30', 1, avtalt, ['c'], 'b')).toBeNull();
    expect(datoenEtterForlengelsene('2027-06-30', 1, avtalt, ['b'], 'b')).toBe('2027-07-03');
  });
});
