import { describe, expect, it } from 'vitest';
import { transition } from './domain';
import { demoUsers, emptyApprovalState, type LetterDocument, type ReviewItem } from './types';
import { documentToBrev, letterText } from './letter';
const owner = demoUsers[0].id;
const chain = demoUsers.slice(1);
const claims = { grunnlag: 'g1', vederlag: 'v1', frist: 'f1' };
const item: ReviewItem = {
  id: 'r1',
  track: 'vederlag',
  eventType: 'respons_vederlag',
  data: {
    beregnings_resultat: 'delvis_godkjent',
    total_godkjent_belop: 150000,
    subsidiaer_godkjent_belop: 500000,
    begrunnelse: '<p>Vår begrunnelse.</p>',
  },
  claimId: 'v1',
  claimVersion: 1,
  owner,
  status: 'ferdigstilt',
  createdAt: '2026-09-11',
  form: { value: 150000 },
};
const letter: LetterDocument = {
  title: 'Svar på endringsmelding',
  caseId: 'case1',
  caseTitle: 'Endring',
  sender: 'BH',
  recipient: 'TE',
  date: '11. september 2026',
  introduction: 'Innledning',
  closing: 'Hilsen BH',
  items: [item],
};
function prepared() {
  return transition(emptyApprovalState(), { action: 'prepare', item }, owner, chain, claims);
}
function packaged() {
  return transition(prepared(), { action: 'package', letter }, owner, chain, claims);
}
function approved() {
  let state = packaged();
  const id = state.packages[0].id;
  state = transition(state, { action: 'approve', packageId: id }, chain[0].id, chain, claims);
  return transition(state, { action: 'approve', packageId: id }, chain[1].id, chain, claims);
}
describe('intern godkjenning', () => {
  it('freezes prepared content independently of the working form', () => {
    const state = prepared();
    expect(state.items[0].data).not.toBe(item.data);
    expect(emptyApprovalState().items).toEqual([]);
  });
  it('rejects empty packages and duplicate tracks', () => {
    expect(() =>
      transition(
        prepared(),
        { action: 'package', letter: { ...letter, items: [] } },
        owner,
        chain,
        claims
      )
    ).toThrow();
    expect(() =>
      transition(
        prepared(),
        { action: 'package', letter: { ...letter, items: [item, item] } },
        owner,
        chain,
        claims
      )
    ).toThrow();
  });
  it('uses stored decisions instead of client-modified item copies', () => {
    const state = transition(
      prepared(),
      {
        action: 'package',
        letter: { ...letter, items: [{ ...item, data: { total_godkjent_belop: 9 } }] },
      },
      owner,
      chain,
      claims
    );
    expect(state.packages[0].letter.items[0].data.total_godkjent_belop).toBe(150000);
  });
  it('prevents replacement of an assessment while it is in approval', () => {
    expect(() => transition(packaged(), { action: 'prepare', item }, owner, chain, claims)).toThrow(
      'låst'
    );
  });
  it('enforces the active reviewer and no self-approval', () => {
    const s = packaged();
    for (const actor of [owner, chain[1].id, 'te'])
      expect(() =>
        transition(s, { action: 'approve', packageId: s.packages[0].id }, actor, chain, claims)
      ).toThrow();
    expect(() =>
      transition(prepared(), { action: 'package', letter }, owner, [demoUsers[0]], claims)
    ).toThrow();
  });
  it('requires a return comment and preserves the frozen package', () => {
    const s = packaged();
    const packageId = s.packages[0].id;
    expect(() =>
      transition(s, { action: 'return', packageId, comment: ' ' }, chain[0].id, chain, claims)
    ).toThrow();
    const returned = transition(
      s,
      { action: 'return', packageId, comment: 'Begrunn avslaget.' },
      chain[0].id,
      chain,
      claims
    );
    expect(returned.packages[0].letter).toEqual(s.packages[0].letter);
    expect(returned.items[0].status).toBe('erstattet');
    const draft = returned.items.find((i) => i.status === 'kladd');
    expect(draft?.previousId).toBe(item.id);
    expect(draft?.id).not.toBe(item.id);
    expect(draft?.form).toEqual(item.form);
    expect(draft?.data).toEqual(item.data);
    expect(returned.packages[0].comment).toBe('Begrunn avslaget.');
  });
  it('withdrawal is only allowed before any decision', () => {
    const s = packaged();
    const packageId = s.packages[0].id;
    expect(
      transition(s, { action: 'withdraw', packageId }, owner, chain, claims).packages[0].status
    ).toBe('trukket');
    const next = transition(s, { action: 'approve', packageId }, chain[0].id, chain, claims);
    expect(() =>
      transition(next, { action: 'withdraw', packageId }, owner, chain, claims)
    ).toThrow();
  });
  it('separates approval from publication', () => {
    const s = approved();
    expect(s.packages[0].status).toBe('godkjent');
    expect(s.items[0].status).toBe('til_godkjenning');
    expect(
      transition(s, { action: 'publish', packageId: s.packages[0].id }, owner, chain, claims)
        .packages[0].status
    ).toBe('sendt');
  });
  it('blocks changed claims both during review and before publication', () => {
    for (const [s, action, actor] of [
      [packaged(), 'approve', chain[0].id],
      [approved(), 'publish', owner],
    ] as const) {
      expect(() =>
        transition(s, { action, packageId: s.packages[0].id }, actor, chain, {
          ...claims,
          vederlag: 'v2',
        })
      ).toThrow('endret');
    }
  });
  it('public letters contain only included assessments and no internal form values', () => {
    const publicLetter = documentToBrev(letter, 'p1');
    expect(publicLetter.seksjoner.begrunnelse.redigertTekst).toContain('150');
    expect(publicLetter.seksjoner.begrunnelse.redigertTekst).toContain('Subsidiært');
    expect(JSON.stringify(publicLetter)).not.toContain('form');
    expect(publicLetter.seksjoner.begrunnelse.redigertTekst).not.toContain('Frist');
  });
  it('renders locked tokens and HTML as plain recipient text', () => {
    expect(
      letterText('<p>Beløp <span data-locked-value="4">4 kr</span>.</p><p>{{dager:2:2 dager}}</p>')
    ).toBe('Beløp 4 kr.\n\n2 dager');
  });
});
