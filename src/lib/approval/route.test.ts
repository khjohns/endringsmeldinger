import { describe, expect, it } from 'vitest';
import { nok, resolveRoute, withLimit } from './route';

const sender = withLimit({ name: 'Kari Hansen', role: 'Prosjektleder' });
const chain = [
  withLimit({ name: 'Ola Nilsen', role: 'Prosjektdirektør' }),
  withLimit({ name: 'Anne Berg', role: 'Avdelingsleder' }),
];

describe('resolveRoute', () => {
  it('sends directly inside the sender’s own authority, limit inclusive', () => {
    const result = resolveRoute({ amount: 200000, sender, chain });
    expect(result.requiresApproval).toBe(false);
    expect(result.route).toHaveLength(1);
    expect(result.route[0]).toMatchObject({ state: 'sender', metaLabel: nok(200000) });
  });

  it('includes only the links the amount requires and marks the decider', () => {
    const one = resolveRoute({ amount: 500000, sender, chain });
    expect(one.approvers.map((a) => a.name)).toEqual(['Ola Nilsen']);
    expect(one.decider?.name).toBe('Ola Nilsen');
    const two = resolveRoute({ amount: 2930000, sender, chain });
    expect(two.route.map((n) => n.state)).toEqual(['sender', 'waiting', 'decider']);
    expect(two.route.map((n) => n.statusLabel)).toEqual(['Sender', 'Godkjenner', 'Avgjør']);
    expect(two.exceedsAllAuthority).toBe(false);
  });

  it('flags amounts above every limit instead of silently using the highest', () => {
    const result = resolveRoute({ amount: 3000001, sender, chain });
    expect(result.exceedsAllAuthority).toBe(true);
    expect(result.decider).toBeNull();
    expect(result.route.some((n) => n.state === 'decider')).toBe(false);
  });

  it('requires the whole chain when the amount cannot be computed', () => {
    const result = resolveRoute({ amount: null, sender, chain });
    expect(result.requiresApproval).toBe(true);
    expect(result.approvers).toHaveLength(2);
    expect(result.exceedsAllAuthority).toBe(false);
  });

  it('still refuses an agreed amount above every limit when the total is unresolved', () => {
    const result = resolveRoute({ amount: null, minimum: 50000000, sender, chain });
    expect(result.exceedsAllAuthority).toBe(true);
    expect(result.decider).toBeNull();
    const inside = resolveRoute({ amount: null, minimum: 150000, sender, chain });
    expect(inside.exceedsAllAuthority).toBe(false);
    expect(inside.approvers).toHaveLength(2);
  });

  it('keeps legacy chains without matrix roles for zero-value letters only', () => {
    const legacy = [{ name: 'Leder', role: 'Prosjekteier' }];
    const unknown = { name: 'Saksbehandler', role: 'Saksbehandler' };
    expect(resolveRoute({ amount: 0, sender: unknown, chain: legacy }).approvers).toHaveLength(1);
    expect(resolveRoute({ amount: 1, sender: unknown, chain: legacy }).exceedsAllAuthority).toBe(
      true
    );
  });

  it('lar ubegrenset fullmakt sende alene når beløpet ikke kan verdsettes', () => {
    const top = withLimit({ name: 'Direktør', role: 'Adm.dir (daglig leder)' });
    const result = resolveRoute({ amount: null, minimum: 50000000, sender: top, chain });
    expect(result.requiresApproval).toBe(false);
    expect(result.approvers).toHaveLength(0);
    const below = withLimit({ name: 'Divisjon', role: 'Divisjonsdirektør' });
    expect(resolveRoute({ amount: null, sender: below, chain }).approvers).toHaveLength(2);
    const ukjent = withLimit({ name: 'Ukjent', role: '' });
    expect(resolveRoute({ amount: null, sender: ukjent, chain }).approvers).toHaveLength(2);
  });

  it('krever kjeden for ubegrenset fullmakt når dagmulktssatsen mangler (B-06)', () => {
    const top = withLimit({ name: 'Direktør', role: 'Adm.dir (daglig leder)' });
    const result = resolveRoute({ amount: null, sender: top, chain, manglerSats: true });
    expect(result.requiresApproval).toBe(true);
    expect(result.approvers).toHaveLength(2);
    expect(
      resolveRoute({ amount: 9e9, sender: top, chain, manglerSats: true }).requiresApproval
    ).toBe(false);
  });

  it('treats unlimited authority as covering any amount', () => {
    const top = [withLimit({ name: 'Direktør', role: 'Adm.dir (daglig leder)' })];
    expect(resolveRoute({ amount: 9e9, sender, chain: top }).decider?.name).toBe('Direktør');
  });
});
