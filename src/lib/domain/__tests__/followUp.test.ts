import { describe, expect, it } from 'vitest';
import { taskHref, type FollowUpTask } from '../followUp';

const oppgave: FollowUpTask = {
  id: 'KOE-1:frist:BH',
  caseId: 'KOE-1',
  caseTitle: 'Uten tittel',
  track: 'frist',
  role: 'BH',
  title: 'Frist',
  detail: '',
  mode: 'form',
};

describe('taskHref', () => {
  it('lenker et skjema til den gamle visningen på /kjerne, der skjemaene står (S3 i #1414)', () => {
    expect(taskHref(oppgave, 'P001')).toBe('/P001/KOE-1/kjerne?spor=frist&rolle=BH&mode=form');
    expect(taskHref(oppgave, 'P001', 'scenario1')).toBe(
      '/mockup?spor=frist&rolle=BH&mode=form&scenario=scenario1'
    );
  });

  it('åpner saken i Varden uten skjema når oppgaven bare skal leses (S4 i #1414)', () => {
    expect(taskHref({ ...oppgave, mode: 'read' }, 'P001')).toBe('/P001/KOE-1?spor=frist&rolle=BH');
  });
});
