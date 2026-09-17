import {
  emptyApprovalState,
  type ApprovalState,
  type ApprovalUser,
  type LetterDocument,
  type ReviewItem,
} from './types';
import { calculateAuthority } from './authority';
import { resolveRoute, withLimit } from './route';

export type ApprovalCommand =
  | { action: 'saveLetter'; draft: { introduction: string; closing: string; included: string[] } }
  | { action: 'prepare'; item: ReviewItem }
  | { action: 'revise'; itemId: string }
  | { action: 'package'; letter: LetterDocument; previousId?: string }
  | { action: 'approve' | 'return' | 'withdraw' | 'publish'; packageId: string; comment?: string };

/** The approvers a letter requires; empty when it is inside the sender's own authority. */
export function approversFor(
  items: ReviewItem[],
  chain: ApprovalUser[],
  authority: { sender: ApprovalUser; dailyRate: number | null }
): ApprovalUser[] {
  const route = resolveRoute({
    amount: calculateAuthority(items, authority.dailyRate).amount,
    sender: withLimit(authority.sender),
    chain: chain.map(withLimit),
  });
  if (route.exceedsAllAuthority)
    throw new Error('Godkjenningskjeden har ikke tilstrekkelig fullmakt for brevet.');
  return route.approvers.map((a) => chain.find((u) => u.id === a.id)!);
}

/** Demo adapter only. The live API independently enforces all transitions and identities. */
export function transition(
  current: ApprovalState = emptyApprovalState(),
  command: ApprovalCommand,
  actor: string,
  chain: ApprovalUser[],
  currentClaims: Record<string, string>,
  now = new Date().toISOString(),
  authority?: { sender: ApprovalUser; dailyRate: number | null }
): ApprovalState {
  const next = structuredClone(current);
  const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
  };
  const fresh = (items: ReviewItem[]) =>
    assert(
      items.every(
        (i) =>
          currentClaims[i.track] === i.claimId &&
          (!i.basis || currentClaims.grunnlag === i.basis.claimId)
      ),
      'Kravet er endret. Revider vurderingen før du fortsetter.'
    );
  if (command.action === 'saveLetter') {
    next.drafts ??= {};
    next.drafts[actor] = structuredClone(command.draft);
  } else if (command.action === 'prepare') {
    const item = structuredClone(command.item);
    assert(
      !next.items.some((i) => i.track === item.track && i.status === 'til_godkjenning'),
      'Vurderingen er låst under godkjenning.'
    );
    fresh([item]);
    next.items
      .filter((i) => i.track === item.track && ['ferdigstilt', 'kladd'].includes(i.status))
      .forEach((i) => {
        i.status = 'erstattet';
      });
    next.items.push({ ...item, owner: actor, status: 'ferdigstilt', createdAt: now });
  } else if (command.action === 'revise') {
    const item = next.items.find((i) => i.id === command.itemId);
    assert(
      item && item.owner === actor && item.status === 'ferdigstilt',
      'Vurderingen kan ikke revideres nå.'
    );
    item!.status = 'erstattet';
    next.items.push({
      ...structuredClone(item!),
      id: crypto.randomUUID(),
      previousId: item!.id,
      status: 'kladd',
      createdAt: now,
    });
  } else if (command.action === 'package') {
    const ids = command.letter.items.map((i) => i.id);
    const items = ids.map((id) => next.items.find((i) => i.id === id)!);
    assert(
      items.length && items.every((i) => i && i.owner === actor && i.status === 'ferdigstilt'),
      'Velg ferdigstilte vurderinger.'
    );
    assert(
      new Set(items.map((i) => i.track)).size === items.length,
      'Velg én revisjon per vurdering.'
    );
    assert(
      new Set(chain.map((u) => u.id)).size === chain.length && chain.every((u) => u.id !== actor),
      'Godkjenningskjeden må inneholde andre personer enn saksbehandleren.'
    );
    const approvers = authority ? approversFor(items, chain, authority) : chain;
    assert(approvers.length || authority, 'Godkjenningskjeden mangler.');
    fresh(items);
    items.forEach((i) => {
      i.status = 'til_godkjenning';
    });
    next.packages.push({
      id: crypto.randomUUID(),
      // Inside the sender's own authority the letter is approved on submission.
      status: approvers.length ? 'til_godkjenning' : 'godkjent',
      owner: actor,
      ownerName: authority?.sender.name,
      createdAt: now,
      previousId: command.previousId,
      letter: { ...structuredClone(command.letter), items: structuredClone(items) },
      steps: approvers.map((u, index) => ({ ...u, status: index === 0 ? 'aktiv' : 'venter' })),
    });
  } else {
    const p = next.packages.find((p) => p.id === command.packageId);
    assert(p, 'Fant ikke pakken.');
    if (!p) return next;
    const active = p.steps.find((s) => s.status === 'aktiv');
    if (command.action === 'publish') {
      assert(
        p.status === 'godkjent' || p.status === 'publisering_feilet',
        'Pakken er ikke godkjent.'
      );
      assert(
        actor === p.owner || p.steps.some((s) => s.id === actor),
        'Du har ikke tilgang til sending.'
      );
      fresh(p.letter.items);
      p.status = 'sendt';
      p.sentAt = now;
      next.items
        .filter((i) => p.letter.items.some((s) => s.id === i.id))
        .forEach((i) => {
          i.status = 'sendt';
        });
    } else {
      assert(p.status === 'til_godkjenning', 'Pakken er ikke til godkjenning.');
      if (command.action === 'withdraw') {
        assert(
          p.owner === actor && !p.steps.some((s) => s.status === 'godkjent'),
          'Pakken kan bare trekkes før første godkjenning.'
        );
        p.status = 'trukket';
      } else {
        assert(active?.id === actor, 'Bare aktiv godkjenner kan beslutte pakken.');
        if (command.action === 'return') {
          assert(command.comment?.trim(), 'Skriv en begrunnelse for retur.');
          p.status = 'returnert';
          p.comment = command.comment!.trim();
          p.returnedBy = actor;
        } else {
          fresh(p.letter.items);
          active!.status = 'godkjent';
          active!.decidedAt = now;
          const following = p.steps.find((s) => s.status === 'venter');
          if (following) following.status = 'aktiv';
          else p.status = 'godkjent';
        }
      }
      if (p.status === 'returnert' || p.status === 'trukket') {
        next.items
          .filter((i) => p.letter.items.some((s) => s.id === i.id))
          .forEach((i) => {
            i.status = 'erstattet';
            next.items.push({
              ...structuredClone(i),
              id: crypto.randomUUID(),
              previousId: i.id,
              status: 'kladd',
              createdAt: now,
            });
          });
      }
    }
  }
  next.version++;
  return next;
}
