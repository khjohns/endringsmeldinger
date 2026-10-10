import { describe, expect, it } from 'vitest';
import { buildLetterContent } from '../letterContentBuilder';
import type { SakState, TimelineEvent } from '$lib/types/timeline';

const sak = { sak_id: 'KOE-1', grunnlag: { tittel: 'Tegninger' } } as SakState;
const hendelse = (actorrole: 'TE' | 'BH', spor: TimelineEvent['spor']) =>
  ({
    id: 'e1',
    type: 'no.oslo.koe.grunnlag_opprettet',
    actorrole,
    time: '2026-10-10T12:00:00Z',
    spor,
    data: { begrunnelse: 'Begrunnelse.' },
  }) as TimelineEvent;

// HF-U2 og arbeidsvalget 10.10 i #313: «grunnlaget», ikke «ansvarsgrunnlaget».
describe('brevet for grunnlaget', () => {
  it('har tittelen «Grunnlaget for kravet» fra TE', () => {
    expect(buildLetterContent(hendelse('TE', 'grunnlag'), sak).tittel).toBe(
      'Grunnlaget for kravet — Tegninger'
    );
  });

  it('har tittelen «Svar på grunnlaget» fra BH', () => {
    expect(buildLetterContent(hendelse('BH', 'grunnlag'), sak).tittel).toBe(
      'Svar på grunnlaget — Tegninger'
    );
  });

  it('viser til grunnlaget i innledningen', () => {
    const innledning = buildLetterContent(hendelse('BH', 'grunnlag'), sak).seksjoner.innledning
      .originalTekst;
    expect(innledning).toContain('Vi viser til grunnlaget i sak KOE-1');
    expect(innledning).toContain('Brevet gjelder grunnlaget.');
    expect(innledning).not.toMatch(/ansvar/i);
  });

  it('beholder titlene for vederlag og frist', () => {
    expect(buildLetterContent(hendelse('TE', 'vederlag'), sak).tittel).toBe(
      'Krav om vederlagsjustering — Tegninger'
    );
    expect(buildLetterContent(hendelse('BH', 'frist'), sak).tittel).toBe(
      'Svar på krav om fristforlengelse — Tegninger'
    );
  });
});
