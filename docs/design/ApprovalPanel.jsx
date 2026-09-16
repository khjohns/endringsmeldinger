import React from 'react';

const nok = (n) => `${n.toLocaleString('nb-NO')} kr`;

/**
 * Derives the sequential authorisation route from an amount and the ordered
 * chain of fullmaktshavere (ascending limits, index 0 = the current user).
 * The UI never asks the operator to pick a recipient — it states who the
 * amount requires. Attached as `ApprovalPanel.resolveRoute`.
 */
function resolveRoute({ amount, actors }) {
  const [sender, ...rest] = actors;
  const senderNode = { ...sender, state: 'sender', metaLabel: nok(sender.limit), statusLabel: 'Sender' };
  if (amount <= sender.limit) {
    return { requiresApproval: false, exceedsAllAuthority: false, decider: null, route: [senderNode] };
  }
  const deciderIndex = rest.findIndex((a) => amount <= a.limit);
  const needed = deciderIndex === -1 ? rest : rest.slice(0, deciderIndex + 1);
  const route = [
    senderNode,
    ...needed.map((a, i) => ({
      ...a,
      state: i === needed.length - 1 ? 'decider' : 'waiting',
      metaLabel: nok(a.limit),
      statusLabel: i === needed.length - 1 ? 'Avgjør' : 'Godkjenner',
    })),
  ];
  return {
    requiresApproval: true,
    exceedsAllAuthority: deciderIndex === -1,
    decider: needed[needed.length - 1] || null,
    route,
  };
}

const STATE_CLASS = { sender: 'is-sender', waiting: 'is-waiting', decider: 'is-decider', done: 'is-done', active: 'is-active' };

/** Floating send/approval panel — one anatomy for send, send-for-approval and in-flight. */
export function ApprovalPanel({
  eyebrow,
  title,
  description,
  figures = [],
  calculation,
  calculationOpen = false,
  chain,
  content,
  confirmLabel,
  confirmed = false,
  onConfirmChange,
  primaryLabel,
  primaryIcon,
  onPrimary,
  primaryDisabled,
  secondaryLabel,
  onSecondary,
  tertiaryLabel,
  onTertiary,
  tertiaryDanger = false,
  footnote,
  className = '',
}) {
  const gated = Boolean(confirmLabel);
  const disabled = primaryDisabled !== undefined ? primaryDisabled : gated && !confirmed;
  return (
    <section className={`approval-panel ${className}`.trim()}>
      {eyebrow && <p className="approval-panel__eyebrow">{eyebrow}</p>}
      <h2 className="approval-panel__title">{title}</h2>
      {description && <p className="approval-panel__body">{description}</p>}

      {figures.length > 0 && (
        <div className="approval-panel__figures">
          {figures.map((f) => (
            <React.Fragment key={f.label}>
              <span className="approval-panel__figure-label">{f.label}</span>
              <span className={`approval-panel__figure-value${f.over ? ' is-over' : ''}`}>{f.value}</span>
            </React.Fragment>
          ))}
        </div>
      )}

      {calculation && (
        <details className="approval-panel__calc" open={calculationOpen}>
          <summary>{calculation.summaryLabel}</summary>
          <div className="approval-panel__calc-rows">
            {calculation.rows.map((r) => (
              <div key={r.label}>
                <span>{r.label}</span>
                <span className="approval-panel__calc-num">{r.value}</span>
              </div>
            ))}
            {calculation.note && <p>{calculation.note}</p>}
          </div>
        </details>
      )}

      {chain && chain.length > 0 && (
        <ol className="approval-chain">
          {chain.map((a) => (
            <li key={a.name} className={`approval-chain__item ${STATE_CLASS[a.state] || ''}`.trim()}>
              <span className="approval-chain__dot" aria-hidden="true" />
              <span className="approval-chain__name">{a.name}</span>
              {a.metaLabel && <span className="approval-chain__meta">{a.metaLabel}</span>}
              <span className="approval-chain__role">{a.role}</span>
              {a.statusLabel && <span className="approval-chain__status">{a.statusLabel}</span>}
            </li>
          ))}
        </ol>
      )}

      {content && (
        <div className="approval-panel__content">
          <span>
            {content.label} <b>{content.value}</b>
          </span>
          {content.actionLabel && (
            <button type="button" className="approval-panel__link" onClick={content.onAction}>
              {content.actionLabel}
            </button>
          )}
        </div>
      )}

      {gated && (
        <label className="approval-panel__confirm">
          <input type="checkbox" checked={confirmed} onChange={(e) => onConfirmChange && onConfirmChange(e.target.checked)} />
          <span>{confirmLabel}</span>
        </label>
      )}

      <div className="approval-panel__actions">
        {primaryLabel && (
          <button type="button" className="btn btn-primary" disabled={disabled} onClick={onPrimary}>
            {primaryIcon}
            {primaryLabel}
          </button>
        )}
        {secondaryLabel && (
          <button type="button" className="btn btn-secondary" onClick={onSecondary}>
            {secondaryLabel}
          </button>
        )}
      </div>

      {tertiaryLabel && (
        <button type="button" className={`approval-panel__link${tertiaryDanger ? ' is-danger' : ''}`} onClick={onTertiary}>
          {tertiaryLabel}
        </button>
      )}

      {footnote && <p className="approval-panel__footnote">{footnote}</p>}
    </section>
  );
}

ApprovalPanel.resolveRoute = resolveRoute;
