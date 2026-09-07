import { describe, it, expect } from 'vitest';
import { buildKonsekvensVarsler, type VarselValg } from '../konsekvensVarsler';
import { buildLetterContent } from '$lib/components/kontraktsbord/letterContentBuilder';
import type { SakState, TimelineEvent } from '$lib/types/timeline';

describe('notices submitted with basis', () => {
  it('includes the exact selected declarations in the event letter', () => {
    const varsler = buildKonsekvensVarsler(
      { frist: { valgt: true, forklaring: 'Arbeidet må vente.' } },
      'SVIKT',
      'Tegninger'
    );
    const event = {
      id: 'basis',
      type: 'no.oslo.koe.grunnlag_opprettet',
      actorrole: 'TE',
      time: '2026-09-06T12:00:00Z',
      spor: 'grunnlag',
      data: { beskrivelse: 'Tegninger mangler.', varsler },
    } as TimelineEvent;
    const sak = { sak_id: 'case', grunnlag: { tittel: 'Tegninger' } } as SakState;
    const text = buildLetterContent(event, sak).seksjoner.begrunnelse.originalTekst;
    expect(text).toContain('Tegninger mangler.');
    expect(text).toContain(varsler.frist);
    expect(text).not.toContain('vederlagsjustering');
  });
  it('sends nothing by default and never treats unchecked options as waiver', () => {
    expect(buildKonsekvensVarsler({}, 'SVIKT', 'Tegninger')).toEqual({});
    expect(
      buildKonsekvensVarsler(
        { vederlag: { valgt: false, forklaring: 'Gammel kladd' } },
        'SVIKT',
        'Tegninger'
      )
    ).toEqual({});
  });
  it('does not infer special notices from a general compensation notice', () => {
    const notices = buildKonsekvensVarsler(
      { vederlag: { valgt: true, forklaring: '' } },
      'SVIKT',
      'Tegninger'
    );
    expect(Object.keys(notices)).toEqual(['vederlag']);
    expect(notices.vederlag).toContain('(pkt. 34.1)');
  });
  it('allows a special notice independently and includes its explanation and basis', () => {
    const notices = buildKonsekvensVarsler(
      { rigg_drift: { valgt: true, forklaring: 'Brakkene må stå lenger.' } },
      'ENDRING',
      'Endret fundament'
    );
    expect(Object.keys(notices)).toEqual(['rigg_drift']);
    expect(notices.rigg_drift).toContain('34.1.3');
    expect(notices.rigg_drift).toContain('Endret fundament');
    expect(notices.rigg_drift).toContain('Brakkene må stå lenger.');
  });
  it('preserves selections, explanations and declaration when the category changes', () => {
    const all: VarselValg = Object.fromEntries(
      ['vederlag', 'rigg_drift', 'produktivitet', 'frist'].map((k) => [
        k,
        { valgt: true, forklaring: 'Tilleggsforklaring' },
      ])
    );
    const expected = buildKonsekvensVarsler(all, 'ENDRING', 'Hindring');
    for (const category of ['SVIKT', 'FORCE_MAJEURE', 'ANNET', '']) {
      expect(buildKonsekvensVarsler(all, category, 'Hindring')).toEqual(expected);
    }
    expect(Object.keys(expected)).toHaveLength(4);
    expect(expected.vederlag).toContain('(pkt. 34.1)');
    expect(expected.vederlag).toContain('Tilleggsforklaring');
    expect(buildKonsekvensVarsler(all, 'SVIKT', 'Svikt', false).frist).toBeUndefined();
  });
});
