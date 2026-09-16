import type { ReactNode } from 'react';

/** One link in the sequential authorisation chain. */
export interface ApprovalChainNode {
  name: string;
  /** Role title, e.g. "Avdelingsleder" — add "· deg" for the current user */
  role: string;
  /** Right-aligned monospace meta: authority limit, timestamp or elapsed time */
  metaLabel?: string;
  /** ALL-CAPS status word: "Sender", "Godkjenner", "Avgjør", "Sendt", "Til behandling" */
  statusLabel?: string;
  /** sender = you · waiting = queued/undecided · decider = resolves the case · done = approved · active = currently handling */
  state?: 'sender' | 'waiting' | 'decider' | 'done' | 'active';
}

export interface ApprovalActor {
  name: string;
  role: string;
  /** Authority limit in NOK (prokura) */
  limit: number;
}

export interface ApprovalRoute {
  /** false when the amount is inside the sender's own authority */
  requiresApproval: boolean;
  /** true when no one in the chain has sufficient authority — escalate/flag */
  exceedsAllAuthority: boolean;
  /** The actor who finally resolves the case */
  decider: ApprovalActor | null;
  /** Ready-to-render chain, sender first, only the links the amount requires */
  route: ApprovalChainNode[];
}

export interface ApprovalPanelFigure {
  label: string;
  /** Pre-formatted with nb-NO spacing, e.g. "2 930 000 kr" or "22.09.2026" */
  value: string;
  /** Renders in danger ink — use on the amount that breaches the authority limit */
  over?: boolean;
}

export interface ApprovalPanelProps {
  /** ALL-CAPS kicker, e.g. "Krever godkjenning", "Til godkjenning · sendt 16.09.2026" */
  eyebrow?: string;
  /** States who must act, not what the screen is: "Avdelingsleder må godkjenne" */
  title: string;
  /** One or two sentences naming amount, authority and what happens on send */
  description?: ReactNode;
  /** Two-column key/figure rows (amount vs. authority limit, deadline) */
  figures?: ApprovalPanelFigure[];
  /** Collapsed authority calculation — the fullmaktsmatrise, one click away */
  calculation?: {
    summaryLabel: string;
    rows: Array<{ label: string; value: string }>;
    note?: string;
  };
  calculationOpen?: boolean;
  /** Derive with ApprovalPanel.resolveRoute — never a recipient picker */
  chain?: ApprovalChainNode[];
  /** What is included in the sending, with a link back to the editing step */
  content?: { label: string; value: string; actionLabel?: string; onAction?: () => void };
  /** Presence of this gates the primary button until checked */
  confirmLabel?: string;
  confirmed?: boolean;
  onConfirmChange?: (checked: boolean) => void;
  /** Imperative: "Send svar" inside authority, "Send til godkjenning" above it */
  primaryLabel?: string;
  /** Lucide icon at 15px */
  primaryIcon?: ReactNode;
  onPrimary?: () => void;
  /** Overrides the confirm gate */
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Underlined text action, e.g. "Trekk fra godkjenning" */
  tertiaryLabel?: string;
  onTertiary?: () => void;
  tertiaryDanger?: boolean;
  /** Consequence for the counterparty and what gets locked */
  footnote?: ReactNode;
  className?: string;
}

/**
 * Floating (sticky) panel that carries authority, chain and the send action for
 * a sending that may need sequential approval. One anatomy for three states:
 * inside authority (send now), above authority (send for approval), and
 * in flight (the same panel becomes status tracking).
 */
export function ApprovalPanel(props: ApprovalPanelProps): JSX.Element;
export namespace ApprovalPanel {
  /** Pure helper: derives the sequential route from amount + ordered actors. */
  function resolveRoute(input: { amount: number; actors: ApprovalActor[] }): ApprovalRoute;
}
