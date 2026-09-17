import { authorityMatrix } from './authority';

/** One link in the sequential authorisation chain. */
export interface ApprovalChainNode {
  id?: string;
  name: string;
  /** Role title, e.g. "Avdelingsleder" — add "· deg" for the current user */
  role: string;
  /** Right-aligned monospace meta: authority limit, timestamp or elapsed time */
  metaLabel?: string;
  /** ALL-CAPS status word: "Sender", "Godkjenner", "Avgjør", "Godkjent", "Behandler" */
  statusLabel?: string;
  state?: 'sender' | 'waiting' | 'decider' | 'done' | 'active';
}

export interface ApprovalPanelFigure {
  label: string;
  /** Pre-formatted nb-NO string, e.g. "2 930 000 kr" */
  value: string;
  /** Danger ink — the amount that breaches the authority limit */
  over?: boolean;
}

export interface ApprovalActor {
  id?: string;
  name: string;
  role: string;
  /** NOK. `null` is unlimited; `undefined` means the role is not in the matrix. */
  limit?: number | null;
}

export interface ApprovalRoute {
  /** false when the amount is inside the sender's own authority */
  requiresApproval: boolean;
  /** true when no one in the chain has sufficient documented authority */
  exceedsAllAuthority: boolean;
  /** The actor who finally resolves the case */
  decider: ApprovalActor | null;
  /** Approvers only, in order — what the server freezes as package steps */
  approvers: ApprovalActor[];
  /** Ready-to-render chain, sender first, only the links the amount requires */
  route: ApprovalChainNode[];
}

export const nok = (value: number) => `${value.toLocaleString('nb-NO')} kr`;

export function limitFor(role: string): number | null | undefined {
  return authorityMatrix.find((row) => row.role === role)?.limit;
}

export const withLimit = <T extends { role: string }>(person: T): T & ApprovalActor =>
  ({ ...person, limit: limitFor(person.role) }) as T & ApprovalActor;

export function limitLabel(limit: number | null | undefined) {
  return limit === null ? 'Ubegrenset' : limit === undefined ? 'Ikke angitt' : nok(limit);
}

const covers = (limit: number | null | undefined, amount: number) =>
  limit === null || (limit !== undefined && amount <= limit);

/**
 * Derives the sequential authorisation route from an amount and the ordered chain.
 * The UI never asks the operator to pick a recipient — it states who the amount requires.
 * `amount: null` (uncomputable) requires the whole configured chain.
 * Mirrors `resolve_route` in backend/services/approval_authority.py.
 */
export function resolveRoute({
  amount,
  sender,
  chain,
}: {
  amount: number | null;
  sender: ApprovalActor;
  chain: ApprovalActor[];
}): ApprovalRoute {
  const senderNode: ApprovalChainNode = {
    id: sender.id,
    name: sender.name,
    role: `${sender.role} · deg`,
    state: 'sender',
    metaLabel: limitLabel(sender.limit),
    statusLabel: 'Sender',
  };
  if (amount !== null && covers(sender.limit, amount))
    return {
      requiresApproval: false,
      exceedsAllAuthority: false,
      decider: null,
      approvers: [],
      route: [senderNode],
    };
  const deciderIndex = amount === null ? -1 : chain.findIndex((a) => covers(a.limit, amount));
  // Legacy chains without matrix roles still apply in full to zero-value letters.
  const exceeds = deciderIndex === -1 && amount !== null && !(amount === 0 && chain.length > 0);
  const approvers = deciderIndex === -1 ? chain : chain.slice(0, deciderIndex + 1);
  return {
    requiresApproval: true,
    exceedsAllAuthority: exceeds || !approvers.length,
    decider: exceeds ? null : (approvers.at(-1) ?? null),
    approvers,
    route: [
      senderNode,
      ...approvers.map((a, i): ApprovalChainNode => {
        const last = i === approvers.length - 1 && !exceeds;
        return {
          id: a.id,
          name: a.name,
          role: a.role,
          state: last ? 'decider' : 'waiting',
          metaLabel: limitLabel(a.limit),
          statusLabel: last ? 'Avgjør' : 'Godkjenner',
        };
      }),
    ],
  };
}
