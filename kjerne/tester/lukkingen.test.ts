/**
 * Lukkingen når TE godtar et svar som påberoper at forholdet er varslet for sent (#2426). Etter
 * HF-U35 punkt 10 og HF-U37 avgjør det subsidiære standpunktet til forholdet om saken lukkes:
 *
 * - Avslår byggherren forholdet subsidiært, er aksepten også en aksept av avslaget, og saken
 *   lukkes etter HF-U35 punkt 9 (HF-U37).
 * - Godkjenner byggherren forholdet subsidiært, gir aksepten enighet om preklusjonen. Enigheten om
 *   vederlag og frist får ingen virkning (GR-U34 punkt 12), men saken lukkes ikke, og den kan tas
 *   med i en endringsordre (HF-U35 punkt 10, MM-U62).
 */

import { describe, expect, it } from 'vitest';
import { regnUtSvar } from '../frosset/utregning.ts';
import { kanInngaaIEo } from '../spor/forhold/utledning.ts';
import { forlengelseneISaken } from '../spor/frist/utledning.ts';
import { enighetensVirkning, sporetErLukket } from '../utledning/utled.ts';
import { forseringKanVelges, saksbetegnelse } from '../utledning/visning.ts';
import { KJERNE } from '../versjon.ts';
import { medKravpostIder } from './klient.ts';
import {
  type Data,
  FRIST_FULLT,
  VEDERLAG_DELVIS,
  medFristen,
  sak,
  sakMedKrav,
  svar,
} from './brevsak.ts';

type Sak = ReturnType<typeof sak>;
type Sporet = 'forhold' | 'vederlag' | 'frist';

const utregnet = (s: Sak, spor: Sporet, v: Data) => {
  const u = s.u();
  const krav = u.spor[spor].gjeldendeKrav!;
  const paaberopelse = u.spor.forhold.gjeldendeKrav;
  v = medKravpostIder(v, krav);
  return svar(
    spor,
    krav.id,
    v,
    regnUtSvar(spor, medFristen(v), { krav, paaberopelse }, KJERNE.regler)
  );
};

const godtar = (s: Sak, spor: Sporet) =>
  s.send('TE', {
    type: 'aksept',
    spor,
    svar: s.u().spor[spor].gjeldendeSvar!.id,
    regelversjon: KJERNE.regler.versjon,
  });

const PREKLUSJON_OG_GODKJENT = { resultat: 'godkjent', grunnlag_varslet_i_tide: false };
const PREKLUSJON_OG_AVSLAG = { resultat: 'avslaatt', grunnlag_varslet_i_tide: false };

/**
 * Byggherren svarer på alle tre sporene og godkjenner fristen fullt, så enigheten i fristen er
 * registrert (GR-U7). TE godtar svarene på vederlag og forholdet.
 */
function godtattSvar(forholdet: Data): Sak {
  const s = sakMedKrav();
  s.send('BH', {
    type: 'brev',
    svar: [
      utregnet(s, 'forhold', forholdet),
      utregnet(s, 'vederlag', VEDERLAG_DELVIS[0]),
      utregnet(s, 'frist', FRIST_FULLT[0]),
    ],
  });
  godtar(s, 'vederlag');
  godtar(s, 'forhold');
  return s;
}

describe('TE godtar et svar som påberoper at forholdet er varslet for sent (HF-U35, HF-U37)', () => {
  it('HF-U35 punkt 10: med forholdet godkjent subsidiært lukkes saken ikke, og den kan tas med i en endringsordre', () => {
    const s = godtattSvar(PREKLUSJON_OG_GODKJENT);
    const u = s.u();
    expect(u.spor.forhold.enighet, 'forutsetning: aksepten er registrert').not.toBeNull();
    expect(u.preklusjonGodtatt).toBe(true);
    expect(u.forholdAvvist).toBe(false);
    expect(sporetErLukket(u)).toBe(false);
    expect(saksbetegnelse(u)).toBeNull();
    // MM-U62 E5, HF-U37: EO-U39 punkt 8 sperrer ikke.
    expect(kanInngaaIEo(u)).toBe(true);
    // Det som kan endre utfallet, avvises ikke som i en lukket sak (HF-U35 punkt 9).
    expect(s.avvisning('TE', { type: 'trekk', spor: 'frist' })).toBeNull();
  });

  it('GR-U34 punkt 12: med forholdet godkjent subsidiært får enigheten om vederlag og frist ingen virkning', () => {
    const u = godtattSvar(PREKLUSJON_OG_GODKJENT).u();
    expect(enighetensVirkning(u, 'vederlag')).toBe('uten_virkning');
    expect(enighetensVirkning(u, 'frist')).toBe('uten_virkning');
    expect(forlengelseneISaken(u)).toEqual({ tattMed: [], ikkeTattMed: [] });
  });

  it('HF-U37: med forholdet avslått subsidiært er aksepten også en aksept av avslaget, og saken lukkes', () => {
    const s = godtattSvar(PREKLUSJON_OG_AVSLAG);
    const u = s.u();
    expect(u.forholdAvvist).toBe(true);
    expect(u.preklusjonGodtatt).toBe(true);
    expect(sporetErLukket(u)).toBe(true);
    expect(saksbetegnelse(u)).toBe('avslaget_paa_forholdet_godtatt');
    expect(kanInngaaIEo(u)).toBe(false);
    expect(enighetensVirkning(u, 'vederlag')).toBe('uten_virkning');
    expect(s.avvisning('TE', { type: 'trekk', spor: 'frist' })?.regel).toBe('FORHOLD_AVVIST');
  });

  it('FO-U1: etter at TE har godtatt preklusjonen av forholdet, kan TE ikke velge forsering for dagene preklusjonen avslår', () => {
    const s = sakMedKrav();
    s.send('BH', {
      type: 'brev',
      svar: [
        utregnet(s, 'forhold', PREKLUSJON_OG_GODKJENT),
        utregnet(s, 'frist', { ...FRIST_FULLT[0], dager: 10 }),
      ],
    });
    expect(forseringKanVelges(s.u()), 'kontroll: før aksepten').toBe(true);
    godtar(s, 'forhold');
    expect(s.u().preklusjonGodtatt, 'forutsetning').toBe(true);
    expect(forseringKanVelges(s.u())).toBe(false);
  });

  it('kontrollsak: uten aksept av svaret på forholdet er saken åpen og enighetene virksomme etter forholdet', () => {
    const s = sakMedKrav();
    s.send('BH', {
      type: 'brev',
      svar: [
        utregnet(s, 'forhold', PREKLUSJON_OG_GODKJENT),
        utregnet(s, 'vederlag', VEDERLAG_DELVIS[0]),
      ],
    });
    godtar(s, 'vederlag');
    const u = s.u();
    expect(u.preklusjonGodtatt).toBe(false);
    expect(u.forholdAvvist).toBe(false);
    expect(enighetensVirkning(u, 'vederlag')).toBe('betinget');
  });
});
