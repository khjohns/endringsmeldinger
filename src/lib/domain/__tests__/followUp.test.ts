import { describe, expect, it } from 'vitest';
import { caseFollowUp, taskHref, type FollowUpContext } from '../followUp';
import { mockSaksoversikt } from '$lib/mocks/saksoversikt';

function fixture() {
  const track = { status: 'sendt', antall_versjoner: 1 };
  const oppfolging: FollowUpContext = {
    sakstype: 'standard',
    overordnet_status: 'SENDT',
    grunnlag: { ...track },
    vederlag: { ...track, metode: 'enhetspriser' },
    frist: { ...track, varsel_type: 'spesifisert', krevd_dager: 45 },
  };
  return { ...mockSaksoversikt[0], oppfolging };
}
describe('follow-up from current track state', () => {
  it('creates independent BH tasks and links to the correct track and role', () => {
    const item = fixture();
    const tasks = caseFollowUp(item);
    expect(tasks.map((t) => t.track)).toEqual(['ansvar', 'vederlag', 'frist']);
    expect(tasks.every((t) => t.role === 'BH')).toBe(true);
    expect(taskHref(tasks[2], 'P001')).toBe(`/P001/${item.sak_id}?spor=frist&rolle=BH&mode=form`);
    expect(taskHref(tasks[2], 'P001', 'scenario1')).toBe(
      '/mockup?spor=frist&rolle=BH&mode=form&scenario=scenario1'
    );
  });
  it('reopens only the revised track after an answer', () => {
    const item = fixture();
    Object.values(item.oppfolging).forEach((track) => {
      if (typeof track === 'object')
        Object.assign(track, { bh_resultat: 'godkjent', bh_respondert_versjon: 0 });
    });
    expect(caseFollowUp(item)).toEqual([]);
    item.oppfolging.frist.antall_versjoner = 2;
    expect(caseFollowUp(item).map((t) => t.track)).toEqual(['frist']);
    expect(caseFollowUp(item)[0].detail).toContain('Versjon 2');
  });
  it('does not confuse an explicit zero with an unanswered claim', () => {
    const item = fixture();
    Object.assign(item.oppfolging.frist, {
      krevd_dager: 0,
      bh_resultat: 'avslatt',
      bh_respondert_versjon: 0,
    });
    const task = caseFollowUp(item).find((t) => t.track === 'frist')!;
    expect(task.role).toBe('TE');
    expect(task.mode).toBe('read');
    expect(taskHref(task, 'P001')).not.toContain('mode=form');
  });
  it('asks TE to specify notices, including a BH request', () => {
    const item = fixture();
    item.oppfolging.vederlag.metode = null;
    Object.assign(item.oppfolging.frist, {
      krevd_dager: null,
      varsel_type: 'varsel',
      har_bh_foresporsel: true,
    });
    expect(
      caseFollowUp(item)
        .filter((t) => t.role === 'TE')
        .map((t) => t.title)
    ).toEqual(['Spesifiser vederlagskravet', 'Besvar forespørsel om fristkravet']);
  });
  it('omits closed, withdrawn, accepted and missing context', () => {
    const item = fixture();
    item.oppfolging.grunnlag.status = 'trukket';
    item.oppfolging.vederlag.te_akseptert = true;
    item.oppfolging.frist.status = 'ikke_relevant';
    expect(caseFollowUp(item)).toEqual([]);
    const closed = fixture();
    closed.oppfolging.overordnet_status = 'OMFORENT';
    expect(caseFollowUp(closed)).toEqual([]);
    expect(caseFollowUp({ ...item, oppfolging: null })).toEqual([]);
  });
});
