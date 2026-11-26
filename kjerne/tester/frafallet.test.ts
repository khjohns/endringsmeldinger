/**
 * Byggherrens nye svar etter et frafall etter punkt 32.3 første ledd c (#2431, GR-U41 punkt 2–4,
 * HF-U29 punkt 4). Saken i minnet er `sak()` i `brevsak.ts`.
 */

import { describe, expect, it } from 'vitest';
import { standpunktet } from '../frosset/byggeklosser.ts';
import { regnUtSvar } from '../frosset/utregning.ts';
import { frafaller } from '../spor/forhold/utledning.ts';
import { KJERNE } from '../versjon.ts';
import { type Data, PAABEROPELSE, sakMedKrav, svar } from './brevsak.ts';

type Sak = ReturnType<typeof sakMedKrav>;

const FRAFALL = { resultat: 'paalegg_frafalt', grunnlag_varslet_i_tide: true };
const AVSLAG = { resultat: 'avslaatt', grunnlag_varslet_i_tide: true };
/** Forholdet godkjent subsidiært, med påberopelse av at varselet kom for sent (punkt 32.2). */
const VARSLET_FOR_SENT = { resultat: 'godkjent', grunnlag_varslet_i_tide: false };

/** Svaret på gjeldende versjon av forholdet, med serverens utregning. */
const utregnet = (s: Sak, v: Data) => {
  const krav = s.u().spor.forhold.gjeldendeKrav!;
  return svar(
    'forhold',
    krav.id,
    v,
    regnUtSvar('forhold', v, { krav, paaberopelse: krav }, KJERNE.regler)
  );
};
const nyttSvar = (s: Sak, v: Data) => ({ type: 'brev', svar: [utregnet(s, v)] });
const revisjon = (s: Sak, v: Data) => ({
  type: 'revisjon',
  erstatter: s.u().spor.forhold.gjeldendeSvar!.id,
  svar: utregnet(s, v),
});
/** En ny versjon av forholdet. Forholdet er avklart ved frafallet mens den venter (GR-U41 punkt 3). */
const nyVersjon = (s: Sak) => {
  s.send('TE', PAABEROPELSE);
  expect(s.u().spor.forhold.gjeldendeSvar, 'forutsetning: ny versjon venter på svar').toBeNull();
  expect(s.u().forholdAvklart, 'kontrollsak: avklart mens versjonen venter').toBe(true);
};

/** Saken etter frafallet, og frafallet slik det står i sporet når det er sendt. */
function medFrafall() {
  const s = sakMedKrav();
  s.send('BH', nyttSvar(s, FRAFALL));
  const frafallet = s.u().spor.forhold.gjeldendeSvar!;
  expect(frafaller(frafallet), 'forutsetning: svaret frafaller pålegget').toBe(true);
  expect(s.u().frafalt, 'forutsetning: pålegget er frafalt').toBe(true);
  expect(s.u().forholdAvklart, 'kontrollsak: avklart ved frafallet (GR-U41 punkt 3)').toBe(true);
  return { s, frafallet: structuredClone(frafallet) };
}

/** GR-U41 punkt 4: frafallet står i sporet, uendret, etter det nye svaret. */
function frafalletStaar(s: Sak, frafallet: ReturnType<typeof medFrafall>['frafallet']) {
  const svarene = s.u().spor.forhold.svar;
  expect(svarene.find((x) => x.id === frafallet.id)).toEqual(frafallet);
}

/**
 * Gjeldende svar er det byggherren nettopp sendte: et annet svar enn frafallet, med resultatet og
 * rettidigheten i svaret. En påberopelse av at forholdet er varslet for sent har virkning
 * prinsipalt (HF-U29 punkt 4, HF-U27).
 */
function gjeldendeEr(
  s: Sak,
  frafallet: { id: string },
  v: typeof AVSLAG | typeof VARSLET_FOR_SENT
) {
  const g = s.u().spor.forhold.gjeldendeSvar;
  expect(g, 'svaret er gjeldende').not.toBeNull();
  expect(g!.id).not.toBe(frafallet.id);
  expect(standpunktet(g!, 'forhold')?.resultat).toBe(v.resultat);
  const rettidighet = standpunktet(g!, 'rettidighet');
  expect(rettidighet?.iTide).toBe(v.grunnlag_varslet_i_tide);
  const virkning = g!.beslutningsgrunnlag.virkninger.find((p) => p.standpunkt === rettidighet?.id);
  if (!v.grunnlag_varslet_i_tide) expect(virkning?.virkning, 'prinsipalt').toBe(1);
}

describe('byggherrens nye svar på en ny versjon av forholdet etter frafallet (GR-U41 punkt 4, HF-U29 punkt 4)', () => {
  it('et avslag tas imot, frafallet står i saken, og forholdet er ikke lenger avklart ved frafallet (GR-U41 punkt 3)', () => {
    const { s, frafallet } = medFrafall();
    nyVersjon(s);
    expect(s.u().spor.forhold.krav.length, 'forutsetning: ny versjon av forholdet').toBe(2);
    const avslaget = nyttSvar(s, AVSLAG);
    expect(s.avvist('BH', avslaget)).toBeNull();
    s.send('BH', avslaget);
    gjeldendeEr(s, frafallet, AVSLAG);
    const u = s.u();
    expect(u.forstaatt).toBe(true);
    expect(u.frafalt).toBe(false);
    expect(u.forholdAvklart, 'GR-U41 punkt 3').toBe(false);
    frafalletStaar(s, frafallet);
  });

  it('en påberopelse av at forholdet er varslet for sent tas imot, og frafallet står i saken (GR-U41 punkt 2, HF-U27)', () => {
    const { s, frafallet } = medFrafall();
    nyVersjon(s);
    const paaberopelsen = nyttSvar(s, VARSLET_FOR_SENT);
    expect(s.avvist('BH', paaberopelsen)).toBeNull();
    s.send('BH', paaberopelsen);
    gjeldendeEr(s, frafallet, VARSLET_FOR_SENT);
    expect(s.u().forstaatt).toBe(true);
    expect(s.u().frafalt).toBe(false);
    expect(s.u().forholdAvklart, 'GR-U41 punkt 3').toBe(false);
    frafalletStaar(s, frafallet);
  });

  it('et nytt frafall tas imot, og det første frafallet står i saken ved siden av det', () => {
    const { s, frafallet } = medFrafall();
    nyVersjon(s);
    const frafallet2 = nyttSvar(s, FRAFALL);
    expect(s.avvist('BH', frafallet2)).toBeNull();
    s.send('BH', frafallet2);
    expect(s.u().frafalt).toBe(true);
    expect(s.u().forholdAvklart).toBe(true);
    expect(s.u().spor.forhold.svar.filter(frafaller)).toHaveLength(2);
    frafalletStaar(s, frafallet);
  });
});

describe('byggherrens nye svar på samme versjon av forholdet etter frafallet (GR-U41 punkt 4, HF-U29 punkt 4)', () => {
  it('et avslag som erstatter frafallet, tas imot, og frafallet står i saken', () => {
    const { s, frafallet } = medFrafall();
    const avslaget = revisjon(s, AVSLAG);
    expect(s.avvist('BH', avslaget)).toBeNull();
    s.send('BH', avslaget);
    gjeldendeEr(s, frafallet, AVSLAG);
    const u = s.u();
    expect(u.forstaatt).toBe(true);
    expect(u.frafalt).toBe(false);
    expect(u.forholdAvklart, 'GR-U41 punkt 3').toBe(false);
    frafalletStaar(s, frafallet);
  });

  it('en påberopelse av at forholdet er varslet for sent, som erstatter frafallet, tas imot, og frafallet står i saken (GR-U41 punkt 2)', () => {
    const { s, frafallet } = medFrafall();
    const paaberopelsen = revisjon(s, VARSLET_FOR_SENT);
    expect(s.avvist('BH', paaberopelsen)).toBeNull();
    s.send('BH', paaberopelsen);
    gjeldendeEr(s, frafallet, VARSLET_FOR_SENT);
    expect(s.u().forstaatt).toBe(true);
    expect(s.u().frafalt).toBe(false);
    expect(s.u().forholdAvklart, 'GR-U41 punkt 3').toBe(false);
    frafalletStaar(s, frafallet);
  });
});
