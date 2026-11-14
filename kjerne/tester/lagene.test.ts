/**
 * Lagene svaret på forholdet opptok foran vederlaget i brevet (OV-U32, OV-U33): svaret på
 * forholdet i samme brev, ellers svaret på påberopelsesversjonen svaret ble regnet mot som
 * gjaldt før brevet (svaret i #1199). Et svar på forholdet revidert etter brevet endrer ikke det
 * brevet sa; at svaret er subsidiært til forholdet, er en relasjon som leses for seg
 * (vedtaket 05.10, `subsidiaer`). Forventningen i hver sak er linja i det frosne brevet.
 */

import { describe, expect, it } from 'vitest';
import { minnebane } from './bane.ts';
import { kjoer, type Forloep } from './kjoerer.ts';
import type { Handling } from './klient.ts';
import { plassene } from '../frosset/byggeklosser.ts';
import { kroner } from '../frosset/tekst.ts';
import { vederlagssvaret } from '../spor/vederlag/visning.ts';
import { utregningIVederlaget } from '../spor/vederlag/format.ts';

async function utledning(steg: Handling[]) {
  const forloep: Forloep = { id: 'lagene', rader: [], start: null, steg, kontroller: [] };
  const k = await kjoer(forloep, minnebane({ sakstittel: 'Fasaden' }));
  return k.utledning();
}

const PAABEROPELSE: Handling = {
  handling: 'krav',
  spor: 'forhold',
  underkategori: 'irregulaer_endring',
  navn: 'K-g1',
};
const VEDERLAG: Handling = { handling: 'krav', spor: 'vederlag', belop: 100000, navn: 'K-v1' };
const forholdet = (resultat: string, iTide = true) => ({
  spor: 'forhold',
  navn: 'S-g1',
  resultat,
  varslet_i_tide: iTide,
});
const vederlaget = { spor: 'vederlag', navn: 'S-v1', vurdering: 'delvis', godkjent_belop: 60000 };
const brevet = (...svar: Record<string, unknown>[]): Handling => ({
  handling: 'brev',
  navn: 'D3',
  svar,
});
const revisjon = (resultat: string): Handling => ({
  handling: 'revisjon',
  spor: 'forhold',
  navn: 'S-g2',
  dokument: 'D4',
  resultat,
  varslet_i_tide: true,
});

const SUBSIDIAERT = `Byggherrens standpunkt: subsidiært godkjent med ${kroner(60000)}.`;
const UTEN_LAG = `Byggherrens standpunkt: godkjent med ${kroner(60000)}.`;

/** Svaret på vederlaget: linja i brevet, svaret på forholdet foran det og postene med lag. */
async function svaret(steg: Handling[]) {
  const u = await utledning(steg);
  const svar = u.spor.vederlag.svar[0];
  const forholdet = u.spor.forhold.svar.find((g) => g.dokument === svar.dokument);
  return {
    linje: svar.beslutningsgrunnlag.linje,
    foran: u.svar[svar.id].forholdssvaret,
    forste: u.spor.forhold.svar[0].id,
    iBrevet: forholdet?.id ?? null,
    poster: vederlagssvaret(u, svar).poster.map((p) => [p.lag, p.etikett]),
  };
}

describe('svaret på forholdet brevet hadde foran vederlaget (OV-U32, OV-U33)', () => {
  it('forholdet avslått i samme brev: svaret i brevet står foran, og posten subsidiært', async () => {
    const s = await svaret([PAABEROPELSE, VEDERLAG, brevet(forholdet('avslaatt'), vederlaget)]);
    expect(s.linje).toBe(SUBSIDIAERT);
    expect(s.foran).toBe(s.iBrevet);
    expect(s.poster).toEqual([[2, 'subsidiært']]);
  });

  it('forholdet godkjent og revidert til avslått etter brevet: posten har fortsatt ingen lag', async () => {
    const s = await svaret([
      PAABEROPELSE,
      VEDERLAG,
      brevet(forholdet('godkjent'), vederlaget),
      revisjon('avslaatt'),
    ]);
    expect(s.linje).toBe(UTEN_LAG);
    expect(s.foran).toBe(s.forste);
    expect(s.poster).toEqual([[1, null]]);
  });

  it('forholdet avslått og revidert til godkjent etter brevet: posten står fortsatt subsidiært', async () => {
    const s = await svaret([
      PAABEROPELSE,
      VEDERLAG,
      brevet(forholdet('avslaatt'), vederlaget),
      revisjon('godkjent'),
    ]);
    expect(s.linje).toBe(SUBSIDIAERT);
    expect(s.foran).toBe(s.forste);
    expect(s.poster).toEqual([[2, 'subsidiært']]);
  });

  it('vederlaget besvart mens en ny påberopelsesversjon venter på svar: posten har ingen lag, som frysingen ga', async () => {
    const s = await svaret([
      PAABEROPELSE,
      VEDERLAG,
      brevet(forholdet('avslaatt')),
      { ...PAABEROPELSE, navn: 'K-g2' },
      { handling: 'brev', navn: 'D5', svar: [vederlaget] },
    ]);
    expect(s.linje).toBe(UTEN_LAG);
    expect(s.foran).toBeNull();
    expect(s.poster).toEqual([[1, null]]);
  });

  it('svaret på forholdet i et senere brev er ikke foran svaret på vederlaget', async () => {
    const s = await svaret([
      PAABEROPELSE,
      VEDERLAG,
      brevet(vederlaget),
      { handling: 'brev', navn: 'D4', svar: [forholdet('avslaatt')] },
    ]);
    expect(s.linje).toBe(UTEN_LAG);
    expect(s.foran).toBeNull();
    expect(s.poster).toEqual([[1, null]]);
  });
});

describe('plassen til grunnene fra forholdet foran sporet (OV-U32, OV-U33, LV-U4 punkt 4)', () => {
  it('avslag og påberopt preklusjon etter § 32.2 opptar første og andre lag, posten tredje', async () => {
    const u = await utledning([
      PAABEROPELSE,
      VEDERLAG,
      brevet(forholdet('avslaatt', false), vederlaget),
    ]);
    const svar = u.spor.vederlag.svar[0];
    expect(svar.beslutningsgrunnlag.linje).toBe(
      `Byggherrens standpunkt: videre subsidiært godkjent med ${kroner(60000)}.`
    );
    const p = plassene(svar, svar.beslutningsgrunnlag.virkninger, 2);
    expect([p.grunn(0), p.grunn(1)]).toEqual([
      { lag: 1, etikett: 'prinsipalt' },
      { lag: 2, etikett: 'subsidiært' },
    ]);
    const beloep = svar.standpunkter.find((x) => x.art === 'beloep')!;
    expect(p.standpunkt(beloep.id)).toEqual({ lag: 3, etikett: 'videre subsidiært' });
  });
});

// G-14 i #1906: demosaken for BF-44 gjennom klienten. Tallene er utgangspunktet i BF-44.md.
describe('svaret på kravet med posten etter § 34.1.3 gjennom klienten (BF-44, VS-U5, OV-U27)', () => {
  const paaberopelse: Handling = {
    handling: 'krav',
    spor: 'forhold',
    hovedkategori: 'svikt',
    underkategori: 'prosjektering',
    navn: 'K-g1',
  };
  const kravet: Handling = {
    handling: 'krav',
    spor: 'vederlag',
    belop: 150000,
    produktivitet: 40000,
    navn: 'K-v1',
  };
  const svaret = {
    spor: 'vederlag',
    navn: 'S-v1',
    varslet_i_tide: false,
    vurdering: 'delvis',
    godkjent_belop: 100000,
    produktivitet: {
      vurdering: 'delvis',
      godkjent_belop: 30000,
      varslet_i_tide: false,
      begrenset_belop: 10000,
    },
  };

  it('prinsipalt 0 kr, subsidiært 110 000 kr og videre subsidiært 130 000 kr', async () => {
    const u = await utledning([paaberopelse, kravet, brevet(svaret)]);
    const svar = u.spor.vederlag.svar[0];
    // OV-U31: prinsipalt og om ingen innsigelse fører fram er lagret; mellomlaget er ikke det.
    const ut = utregningIVederlaget(svar.utregning);
    expect([ut.godkjent_beloep, ut.subsidiaert_godkjent_beloep]).toEqual([0, 130000]);
    // Laget og beløpet per post: begrensningen etter § 34.1.3 gir 10 000 kr i det subsidiære
    // laget, så summen der er 100 000 + 10 000 kr.
    expect(
      vederlagssvaret(u, svar).poster.map((p) => [
        p.lag,
        p.godkjent,
        p.begrensning && [p.begrensning.lag, p.begrensning.beloep],
      ])
    ).toEqual([
      [2, 100000, null],
      [3, 30000, [2, 10000]],
    ]);
    expect(svar.beslutningsgrunnlag.linje).toBe(
      'Byggherrens standpunkt: prinsipalt varselet etter punkt 34.1.2 kom for sent, ' +
        `subsidiært godkjent med ${kroner(100000)} for justeringen ellers, begrenset etter punkt ` +
        `34.1.3 til ${kroner(10000)}, videre subsidiært godkjent med ${kroner(30000)} for ` +
        'særskilt justering (punkt 34.1.3 annet ledd).'
    );
  });
});
