/**
 * Kommandoen for TEs krav om vederlagsjustering (BF-14), uten visningen. Kilden for hver
 * forventning står i testnavnet.
 */

import { describe, expect, it } from 'vitest';
import {
  fordelingenPaaPns,
  gjeldendeVarselvalg,
  manglerIKravet,
  nyKravpost,
  summene,
  tomtVarselvalg,
  vederlagskravet,
  type Kravvalg,
} from '../vederlagskrav';

function valg(): Kravvalg {
  const v: Kravvalg = { poster: [], saerskilt: null, forbehold: '', nye: 0 };
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
  it('sender bare feltene oppgjørsformen har: beløp ved fast sum, overslag ved regningsarbeid (KA-U66, OV-U115 punkt 19)', () => {
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

  it('sender forbeholdet i feltet «forbehold», ikke som utdypningen for hele kravet (LV-U74)', () => {
    const v = { ...valg(), forbehold: ' Forutsetter dagtid. ' };
    const k = vederlagskravet(v, [null, null]) as Record<string, unknown>;
    expect(k.forbehold).toBe('Forutsetter dagtid.');
    expect(k).not.toHaveProperty('utdypning');
    expect(vederlagskravet(valg(), [null, null]), 'kontrollsak').not.toHaveProperty('forbehold');
  });

  it('sender varselvalget bare for en post kravet ellers er varselet for (VS-U49, VS-U50)', () => {
    const v = valg();
    v.poster[1].varsel = { ...tomtVarselvalg(), art: 'saken', varsel: 'v1' };
    expect(
      (
        vederlagskravet(v, [null, { art: 'kravet', hjemmel: '34.4' }]).innhold.kravposter as {
          varsel?: unknown;
        }[]
      )[1].varsel
    ).toEqual({ art: 'gitt', varsel: 'v1' });
    const foer = { art: 'foer' as const, hjemmel: '34.4' as const, krav: 'd1', varsel: null };
    expect(
      (vederlagskravet(v, [null, foer]).innhold.kravposter as { varsel?: string }[])[1].varsel
    ).toBeUndefined();
  });

  describe('varslene uten kravpost etter samme bestemmelse (U-7 i BF-37, VS-U87 punkt 23)', () => {
    const varsel = (id: string) => ({ id, hjemmel: '34.4' as const, dokument: `d-${id}` });
    const kravet = (...ider: string[]) => ({
      art: 'kravet' as const,
      hjemmel: '34.4' as const,
      velges: ider.map(varsel),
    });
    const sendt = (v: Kravvalg, vs: ReturnType<typeof kravet>) =>
      (vederlagskravet(v, [null, vs]).innhold.kravposter as { varsel?: unknown }[])[1].varsel;

    it('ett varsel er forhåndsvalgt og sendes som varselet posten viser til (D-5)', () => {
      expect(sendt(valg(), kravet('v1'))).toEqual({ art: 'gitt', varsel: 'v1' });
    });

    it('med to varsler er ingen forhåndsvalgt, og valget mangler (VS-U87 punkt 23, sjette setning)', () => {
      const v = valg();
      expect(sendt(v, kravet('v1', 'v2'))).toBeUndefined();
      const mangler = manglerIKravet(v, [null, kravet('v1', 'v2')], 'k', () => 'P2');
      expect(mangler.map((m) => m.felt)).toEqual([`k-varsel-${v.poster[1].noekkel}`]);
      v.poster[1].varsel = { ...tomtVarselvalg(), art: 'saken', varsel: 'v2' };
      expect(sendt(v, kravet('v1', 'v2'))).toEqual({ art: 'gitt', varsel: 'v2' });
      expect(manglerIKravet(v, [null, kravet('v1', 'v2')], 'k', () => 'P2')).toEqual([]);
    });

    it('«Ingen av dem» sender at kravet er varselet for posten', () => {
      const v = valg();
      v.poster[1].varsel = { ...tomtVarselvalg(), art: 'ingen' };
      expect(sendt(v, kravet('v1'))).toEqual({ art: 'kravet' });
      expect(gjeldendeVarselvalg(v, v.poster[1], kravet('v1')).art).toBe('ingen');
    });

    it('et varsel valgt før som ikke lenger er blant varslene uten kravpost, gjelder ikke', () => {
      const v = valg();
      v.poster[1].varsel = { ...tomtVarselvalg(), art: 'saken', varsel: 'brukt' };
      expect(sendt(v, kravet('v1'))).toEqual({ art: 'gitt', varsel: 'v1' });
    });

    it('uten varsler uten kravpost sendes standardvalget ikke, som før (#2010, kontrollsak)', () => {
      expect(sendt(valg(), kravet())).toBeUndefined();
    });
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
      art: 'gitt',
      varsel: { sendt: '2026-09-28', korrespondansetype: 'brev', dokumentasjon: ['f1'] },
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

describe('trekket av den særskilte vederlagsjusteringen (KA-U83)', () => {
  it('kravet trekker posten når TE har trukket den, og ellers ikke (kontrollsak)', () => {
    const v = { ...valg(), trekkerSaerskilt: true };
    expect(vederlagskravet(v, [null, null]).innhold).toMatchObject({
      trekker_saerskilt: ['produktivitet'],
    });
    expect(vederlagskravet(valg(), [null, null]).innhold).not.toHaveProperty('trekker_saerskilt');
  });

  it('tar TE med posten igjen, trekkes den ikke', () => {
    const v = { ...valg(), trekkerSaerskilt: true, saerskilt: { beloep: '40 000' } };
    expect(vederlagskravet(v, [null, null]).innhold).not.toHaveProperty('trekker_saerskilt');
  });
});
