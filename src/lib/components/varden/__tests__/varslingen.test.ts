/**
 * Kommandoen og det som mangler i «Bare varsle» for vederlaget (BF-37). Forventningene viser til
 * U-punktene i bestillingen `docs/domenetabell/brukerforlop/BF-37.md`, VS-U87 og U-1 og U-6 i
 * BF-48. Kjernen avviser det samme; her prøves at skjemaet sender det TE fyller ut.
 */

import { describe, expect, it } from 'vitest';
import { tomKorrespondanse } from '../korrespondansen';
import {
  foersteVarsel,
  handlingsnoekkel,
  hjemlerForRaden,
  manglerIVarslingen,
  nyVarselrad,
  startvarsling,
  tilbudteHjemler,
  varslingen,
  type Varslingsvalg,
} from '../vederlagsvarsel';

const navnet = () => 'Varselet';
const ALLE = ['34.4', '34.3.3', '34.1.2', '34.1.3'] as const;
const brev = (): Varslingsvalg => {
  const v = startvarsling('34.4', false);
  v.rader[0]!.arbeid = 'Ekstra graving i grøften ved kum 4';
  const r = nyVarselrad(v, '34.4');
  r.arbeid = '  Omlegging av fjernvarmerør  ';
  v.rader.push(r, nyVarselrad(v, '34.1.3'));
  return v;
};

describe('kommandoen for varslene (BF-37)', () => {
  it('sender ett varsel per rad fra løsningen, med arbeidet etter punkt 34.4 og uten tom dato (U-2, VS-U87 punkt 27)', () => {
    expect(varslingen(brev())).toEqual({
      type: 'send_varsel',
      varsler: [
        { hjemmel: '34.4', arbeid: 'Ekstra graving i grøften ved kum 4' },
        { hjemmel: '34.4', arbeid: 'Omlegging av fjernvarmerør' },
        { hjemmel: '34.1.3' },
      ],
    });
  });

  it('datoen etter punkt 34.1.3 følger bare det varselet (U-1 i BF-48, VS-U86 punkt 12)', () => {
    const v = startvarsling('34.1.3', false);
    v.rader[0]!.klarOver = '2026-10-10';
    v.rader.push({ ...nyVarselrad(v, '34.1.2'), klarOver: '2026-10-11' });
    expect(varslingen(v).varsler).toEqual([
      { hjemmel: '34.1.3', klar_over_utgiftene: '2026-10-10' },
      { hjemmel: '34.1.2' },
    ]);
  });

  it('registrerer varslene sendt utenfor løsningen med én dato for alle (U-5, D-4)', () => {
    const v = startvarsling('34.4', true, {
      ...tomKorrespondanse(),
      type: 'e_post',
      dato: '2026-11-03',
      beskrivelse: 'E-post om gravingen',
    });
    v.rader.push(nyVarselrad(v, '34.3.3'));
    expect(varslingen(v)).toEqual({
      type: 'varsel',
      varsler: [{ hjemmel: '34.4' }, { hjemmel: '34.3.3' }],
      sendt: '2026-11-03',
      korrespondansetype: 'e_post',
      beskrivelse: 'E-post om gravingen',
      dokumentasjon: [],
    });
  });
});

describe('det som mangler (BF-37)', () => {
  it('et varsel etter punkt 34.3.3 eller 34.4 fra løsningen må ha arbeidet, og ved registrering ikke (U-3, VS-U87 punkt 27)', () => {
    const v = startvarsling('34.3.3', false);
    expect(manglerIVarslingen(v, 'x', navnet, '2026-11-26', ALLE)).toEqual([
      {
        felt: 'x-arbeid-varsel-1',
        post: 'varsel-1',
        tekst: 'Varselet: Mangler arbeidet varselet gjelder',
        ved: 'Mangler arbeidet varselet gjelder',
      },
    ]);
    v.utenfor = { ...tomKorrespondanse(), type: 'notat', dato: '2026-11-03', beskrivelse: 'x' };
    v.utenfor.vedlegg = [
      { vedlegg_id: 'v1', filnavn: 'a.pdf', innhold_sha256: 'a', stoerrelse: 1 },
    ];
    expect(manglerIVarslingen(v, 'x', navnet, '2026-11-03', ALLE)).toEqual([]);
  });

  it('et brev uten varsler sendes ikke («Ugyldig valg og avbrudd» i BF-37)', () => {
    const v = startvarsling('34.4', false);
    v.rader = [];
    expect(manglerIVarslingen(v, 'x', navnet, '2026-11-26', ALLE).map((m) => m.felt)).toEqual([
      'x-legg-til',
    ]);
  });

  it('en dato etter punkt 34.1.3 etter datoen brevet sendes, stoppes ved feltet, og samme dag går (U-6 i BF-48, VS-U83)', () => {
    const v = startvarsling('34.1.3', false);
    v.rader[0]!.klarOver = '2026-11-27';
    expect(manglerIVarslingen(v, 'x', navnet, '2026-11-26', ALLE).map((m) => m.felt)).toEqual([
      'x-klar-over-varsel-1',
    ]);
    v.rader[0]!.klarOver = '2026-11-26';
    expect(manglerIVarslingen(v, 'x', navnet, '2026-11-26', ALLE)).toEqual([]);
  });
});

describe('bestemmelsene skjemaet tilbyr (D-2 i BF-37)', () => {
  const handlinger = ['sende_varsel:vederlag', 'sende_varsel:34.4', 'varsle:34.3.3'];

  it('følger handlingene kjernen tilbyr, fra løsningen eller som registrering', () => {
    expect(handlingsnoekkel('sende_varsel', '34.1.2')).toBe('sende_varsel:vederlag');
    expect(tilbudteHjemler(handlinger, false)).toEqual(['34.4', '34.1.2']);
    expect(tilbudteHjemler(handlinger, true)).toEqual(['34.3.3']);
  });

  it('varselet etter punkt 34.1.2 står i én rad, og varselet etter punkt 34.4 i flere (SK-12, VS-U87 punkt 27)', () => {
    const v = startvarsling('34.1.2', false);
    const andre = nyVarselrad(v, '34.4');
    v.rader.push(andre);
    expect(hjemlerForRaden(v, andre, ['34.4', '34.1.2'])).toEqual(['34.4']);
    expect(hjemlerForRaden(v, v.rader[0]!, ['34.4', '34.1.2'])).toEqual(['34.4', '34.1.2']);
    expect(hjemlerForRaden(v, null, ['34.4', '34.1.2'])).toEqual(['34.4']);
  });
});

describe('et varsel kjernen ikke tilbyr slik det gis nå (D-2 i BF-37)', () => {
  it('står i raden med bestemmelsen og stoppes ved feltet', () => {
    const v = startvarsling('34.1.2', false);
    expect(hjemlerForRaden(v, v.rader[0]!, ['34.4'])).toEqual(['34.4', '34.1.2']);
    expect(manglerIVarslingen(v, 'x', navnet, '2026-11-26', ['34.4'])).toEqual([
      expect.objectContaining({ felt: 'x-hjemmel-varsel-1', post: 'varsel-1' }),
    ]);
  });

  it('«Bare varsle» og registreringen begynner med varselet etter punkt 34.1.2 når kjernen tilbyr det (OV-U5)', () => {
    expect(foersteVarsel(['varsle:34.4', 'varsle:vederlag'], true)).toBe('34.1.2');
    expect(foersteVarsel(['sende_varsel:34.4', 'varsle:vederlag'], false)).toBe('34.4');
  });
});
