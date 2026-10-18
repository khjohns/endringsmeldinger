import { describe, expect, it } from 'vitest';
import { buildLetterContent } from '../letterContentBuilder';
import type { SakState, SporType, TimelineEvent } from '$lib/types/timeline';

const sak = { sak_id: 'KOE-1', grunnlag: { tittel: 'Tegninger' } } as SakState;
const hendelse = (actorrole: 'TE' | 'BH', spor: SporType) =>
  ({
    id: 'e1',
    type: 'no.oslo.koe.grunnlag_opprettet',
    actorrole,
    time: '2026-10-10T12:00:00Z',
    spor,
    data: { begrunnelse: 'Begrunnelse.' },
  }) as TimelineEvent & { spor: SporType };

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

// #365: brevet for sporet forutsetter et spor. En hendelse uten spor får ikke brevet for
// grunnlaget; et lagret brev vises fortsatt.
describe('en hendelse uten spor', () => {
  const utenSpor = { ...hendelse('BH', 'grunnlag'), type: 'forsering_respons', spor: null };

  it('får ikke noe brev', () => {
    expect(buildLetterContent(utenSpor as TimelineEvent, sak)).toBeNull();
  });

  it('viser det lagrede brevet', () => {
    const brev = buildLetterContent(hendelse('BH', 'frist'), sak);
    const lagret = { ...utenSpor, data: { brev } } as unknown as TimelineEvent;
    expect(buildLetterContent(lagret, sak)).toEqual(brev);
  });
});
