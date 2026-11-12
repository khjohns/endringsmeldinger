/**
 * Kommandoen for TEs krav om vederlagsjustering (BF-14), uten visningen. Kilden for hver
 * forventning står i testnavnet.
 */

import { describe, expect, it } from 'vitest';
import {
  fordelingenPaaPns,
  nyKravpost,
  summene,
  tomtVarselvalg,
  vederlagskravet,
  type Kravvalg,
} from '../vederlagskrav';

function valg(): Kravvalg {
  const v: Kravvalg = { poster: [], saerskilt: null, begrunnelse: '', nye: 0 };
  const p1 = nyKravpost(v);
  Object.assign(p1, { beskrivelse: ' Omlegging ', form: 'tilbud', beloep: '210 000', pns: '31' });
  const p2 = nyKravpost(v);
  Object.assign(p2, {
    beskrivelse: 'Graving',
    form: 'regningsarbeid',
    overslag: '150 000',
    beloep: '999',
    pns: '21',
  });
  v.poster = [p1, p2];
  return v;
}

describe('vederlagskravet', () => {
  it('sender bare feltene oppgjørsformen har: beløp ved fast sum, overslag ved regningsarbeid (KA-U66, OV-U95 punkt 19)', () => {
    const k = vederlagskravet(valg(), [null, { art: 'kravet', hjemmel: '34.4' }]);
    expect(k.innhold.kravposter).toEqual([
      { beskrivelse: 'Omlegging', oppgjoersform: 'tilbud', beloep: 210000, pns: '31' },
      {
        beskrivelse: 'Graving',
        oppgjoersform: 'regningsarbeid',
        kostnadsoverslag: 150000,
        pns: '21',
      },
    ]);
  });

  it('sender varselvalget bare for en post kravet ellers er varselet for (VS-U49, VS-U50)', () => {
    const v = valg();
    v.poster[1].varsel = { ...tomtVarselvalg(), art: 'saken', varsel: 'v1' };
    expect(
      (
        vederlagskravet(v, [null, { art: 'kravet', hjemmel: '34.4' }]).innhold.kravposter as {
          varsel?: string;
        }[]
      )[1].varsel
    ).toBe('v1');
    const foer = { art: 'foer' as const, hjemmel: '34.4' as const, krav: 'd1', varsel: null };
    expect(
      (vederlagskravet(v, [null, foer]).innhold.kravposter as { varsel?: string }[])[1].varsel
    ).toBeUndefined();
  });

  it('«samme dokument» sender det samme dokumentet som den andre posten (VS-U52, oppdragsgiver 11.11)', () => {
    const v = valg();
    const p3 = nyKravpost(v);
    Object.assign(p3, { beskrivelse: 'Tetting', form: 'enhetspriser', justert: true });
    v.poster.push(p3);
    v.poster[1].varsel = {
      ...tomtVarselvalg(),
      art: 'dokument',
      type: 'brev',
      dato: '2026-09-28',
      vedlegg: [{ vedlegg_id: 'f1', filnavn: 'a.pdf', innhold_sha256: 'x', stoerrelse: 1 }],
    };
    p3.varsel = { ...tomtVarselvalg(), art: 'samme', som: v.poster[1].noekkel };
    const kravet = { art: 'kravet' as const, hjemmel: '34.4' as const };
    const [, a, b] = vederlagskravet(v, [null, kravet, { ...kravet, hjemmel: '34.3.3' }]).innhold
      .kravposter as { varsel?: unknown }[];
    expect(b.varsel).toEqual(a.varsel);
    expect(a.varsel).toEqual({
      sendt: '2026-09-28',
      korrespondansetype: 'brev',
      dokumentasjon: ['f1'],
    });
  });

  it('summerer de faste beløpene for seg og anslagene for seg, også per PNS (U-3, U-5)', () => {
    const v = valg();
    v.saerskilt = { beloep: '40 000' };
    expect(summene(v)).toEqual({ faste: 250000, iKravpostene: 210000, anslag: 150000 });
    expect(fordelingenPaaPns(v)).toEqual([
      { pns: '21', faste: 0, anslag: 150000 },
      { pns: '31', faste: 210000, anslag: 0 },
    ]);
  });

  it('en trukket post sendes som trekk og ikke som kravpost (KA-U56)', () => {
    const v = valg();
    Object.assign(v.poster[0], { id: 'k1', betegnelse: 'P1', trukket: true });
    const k = vederlagskravet(v, [{ art: 'kravet', hjemmel: '34.4' }]);
    expect(k.innhold.trekker).toEqual(['k1']);
    expect((k.innhold.kravposter as unknown[]).length).toBe(1);
  });
});
