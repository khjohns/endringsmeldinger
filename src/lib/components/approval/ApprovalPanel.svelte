<!--
  Sticky send/approval panel — one anatomy for three states: inside authority (send now),
  above authority (send for approval) and in flight (the same panel tracks status).
  Rules: no modal; the chain is derived with resolveRoute, never picked; authority sits
  next to the button; the footnote states the consequence. See docs/design/ApprovalPanel.prompt.md.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ApprovalChainNode, ApprovalPanelFigure } from '$lib/approval/route';

  let {
    eyebrow,
    title,
    description,
    figures = [],
    calculation,
    calculationOpen = false,
    chain,
    content,
    confirmLabel,
    confirmed = $bindable(false),
    primaryLabel,
    primaryIcon,
    onprimary,
    primaryDisabled,
    secondaryLabel,
    onsecondary,
    secondaryDisabled = false,
    tertiaryLabel,
    ontertiary,
    tertiaryDanger = false,
    footnote,
    children,
  }: {
    /** ALL-CAPS kicker, e.g. "Krever godkjenning" */
    eyebrow?: string;
    /** States who must act, not what the screen is */
    title: string;
    description?: Snippet | string;
    figures?: ApprovalPanelFigure[];
    /** Collapsed authority calculation — one click away */
    calculation?: {
      summaryLabel: string;
      rows: { label: string; value: string }[];
      note?: string;
    };
    calculationOpen?: boolean;
    /** Derive with resolveRoute — never a recipient picker */
    chain?: ApprovalChainNode[];
    /** What is included, with a link back to the editing step */
    content?: { label: string; value: string; actionLabel?: string; onaction?: () => void };
    /** Presence gates the primary button until checked */
    confirmLabel?: string;
    confirmed?: boolean;
    primaryLabel?: string;
    primaryIcon?: Snippet;
    onprimary?: () => void;
    /** Overrides the confirm gate */
    primaryDisabled?: boolean;
    secondaryLabel?: string;
    onsecondary?: () => void;
    secondaryDisabled?: boolean;
    /** Underlined text action, e.g. "Trekk fra godkjenning" */
    tertiaryLabel?: string;
    ontertiary?: () => void;
    tertiaryDanger?: boolean;
    /** Consequence for the counterparty and what gets locked */
    footnote?: Snippet | string;
    /** Inline notices or inputs placed directly above the actions */
    children?: Snippet;
  } = $props();

  const gated = $derived(Boolean(confirmLabel));
  const disabled = $derived(primaryDisabled ?? (gated && !confirmed));
</script>

<section class="approval-panel" aria-label={title}>
  {#if eyebrow}<p class="eyebrow">{eyebrow}</p>{/if}
  <h2 class="title">{title}</h2>
  {#if description}
    <p class="body">
      {#if typeof description === 'string'}{description}{:else}{@render description()}{/if}
    </p>
  {/if}

  {#if figures.length}
    <div class="figures">
      {#each figures as f (f.label)}
        <span class="figure-label">{f.label}</span>
        <span class="figure-value" class:over={f.over}>{f.value}</span>
      {/each}
    </div>
  {/if}

  {#if calculation}
    <details class="calc" open={calculationOpen}>
      <summary>{calculation.summaryLabel}</summary>
      <div class="calc-rows">
        {#each calculation.rows as r (r.label)}
          <div><span>{r.label}</span><span class="calc-num">{r.value}</span></div>
        {/each}
        {#if calculation.note}<p>{calculation.note}</p>{/if}
      </div>
    </details>
  {/if}

  {#if chain?.length}
    <ol class="chain" aria-label="Godkjenningskjede">
      {#each chain as a, i (a.id ?? `${a.name}-${i}`)}
        <li class="chain-item is-{a.state ?? 'none'}">
          <span class="dot" aria-hidden="true"></span>
          <span class="name">{a.name}</span>
          {#if a.metaLabel}<span class="meta">{a.metaLabel}</span>{/if}
          <span class="role">{a.role}</span>
          {#if a.statusLabel}<span class="status">{a.statusLabel}</span>{/if}
        </li>
      {/each}
    </ol>
  {/if}

  {#if content}
    <div class="content">
      <span>{content.label} <b>{content.value}</b></span>
      {#if content.actionLabel}
        <button type="button" class="link" onclick={content.onaction}>{content.actionLabel}</button>
      {/if}
    </div>
  {/if}

  {#if gated}
    <label class="confirm">
      <input type="checkbox" bind:checked={confirmed} />
      <span>{confirmLabel}</span>
    </label>
  {/if}

  {@render children?.()}

  {#if primaryLabel || secondaryLabel}
    <div class="actions">
      {#if primaryLabel}
        <button type="button" class="action primary" {disabled} onclick={onprimary}>
          {@render primaryIcon?.()}{primaryLabel}
        </button>
      {/if}
      {#if secondaryLabel}
        <button
          type="button"
          class="action secondary"
          disabled={secondaryDisabled}
          onclick={onsecondary}>{secondaryLabel}</button
        >
      {/if}
    </div>
  {/if}

  {#if tertiaryLabel}
    <button type="button" class="link tertiary" class:danger={tertiaryDanger} onclick={ontertiary}
      >{tertiaryLabel}</button
    >
  {/if}

  {#if footnote}
    <p class="footnote">
      {#if typeof footnote === 'string'}{footnote}{:else}{@render footnote()}{/if}
    </p>
  {/if}
</section>

<style>
  .approval-panel {
    position: sticky;
    top: var(--spacing-6, 24px);
    background: var(--surface);
    border: var(--rule);
    border-radius: 12px;
    box-shadow: var(--overlay-shadow-lg);
    padding: 22px 22px 20px;
    font-family: var(--font-ui);
    color: var(--ink);
  }
  .eyebrow {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--ink-4);
    margin: 0;
  }
  .title {
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--ink);
    margin: 8px 0;
  }
  .body {
    font-size: 13px;
    line-height: 1.6;
    color: var(--ink-3);
    margin: 0;
  }
  .body :global(b) {
    font-weight: 600;
    color: var(--ink-2);
  }
  .figures {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 6px 12px;
    margin-top: 16px;
    padding: 14px 0;
    border-top: var(--rule-subtle);
    border-bottom: var(--rule-subtle);
  }
  .figure-label {
    font-size: 12px;
    color: var(--ink-3);
  }
  .figure-value {
    font-family: var(--font-data);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    color: var(--ink);
    text-align: right;
  }
  .figure-value.over {
    color: var(--danger);
  }
  .calc {
    margin-top: 12px;
  }
  .calc summary {
    font-size: 12px;
    color: var(--ink-2);
    cursor: pointer;
    list-style: none;
    transition: color 120ms;
  }
  .calc summary::-webkit-details-marker {
    display: none;
  }
  .calc summary::before {
    content: '▸ ';
    color: var(--ink-4);
  }
  .calc[open] summary::before {
    content: '▾ ';
  }
  .calc summary:hover {
    color: var(--ink);
  }
  .calc-rows {
    display: grid;
    gap: 7px;
    margin-top: 10px;
    padding: 12px 14px;
    background: var(--surface-inset);
    border-radius: 4px;
    font-size: 12px;
    color: var(--ink-3);
  }
  .calc-rows > div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }
  .calc-num {
    font-family: var(--font-data);
    font-variant-numeric: tabular-nums;
    color: var(--ink-2);
    white-space: nowrap;
  }
  .calc-rows p {
    margin: 2px 0 0;
    font-size: 11px;
    line-height: 1.5;
    color: var(--ink-4);
  }
  .chain {
    list-style: none;
    position: relative;
    margin: 18px 0 0;
    padding: 0;
  }
  .chain::before {
    content: '';
    position: absolute;
    left: 5px;
    top: 12px;
    bottom: 12px;
    width: 1px;
    background: var(--rule-color);
  }
  .chain-item {
    position: relative;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 2px 10px;
    padding: 0 0 16px 22px;
  }
  .chain-item:last-child {
    padding-bottom: 0;
  }
  .dot {
    position: absolute;
    left: 0;
    top: 4px;
    width: 11px;
    height: 11px;
    border-radius: 999px;
    border: 1.5px solid var(--rule-strong-color);
    background: var(--surface);
  }
  .name {
    grid-column: 1;
    grid-row: 1;
    font-size: 13px;
    font-weight: 600;
    color: var(--ink);
  }
  .role {
    grid-column: 1;
    grid-row: 2;
    font-size: 12px;
    color: var(--ink-4);
  }
  .meta {
    grid-column: 2;
    grid-row: 1;
    font-family: var(--font-data);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    color: var(--ink-4);
    text-align: right;
  }
  .status {
    grid-column: 2;
    grid-row: 2;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink-ghost);
    text-align: right;
  }
  .is-sender .dot {
    background: var(--ink-3);
    border-color: var(--ink-3);
  }
  .is-waiting .name,
  .is-waiting .role {
    color: var(--ink-4);
  }
  .is-decider .dot {
    background: var(--brand);
    border-color: var(--brand);
  }
  .is-decider .status,
  .is-active .status {
    color: var(--brand);
  }
  .is-done .dot {
    background: var(--success);
    border-color: var(--success);
  }
  .is-done .status {
    color: var(--success);
  }
  .is-active .dot {
    border-color: var(--brand);
    box-shadow: 0 0 0 3px rgb(45 74 59 / 16%);
    animation: pulse 2s ease-in-out infinite;
  }
  @keyframes pulse {
    50% {
      box-shadow: 0 0 0 5px rgb(45 74 59 / 8%);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .is-active .dot {
      animation: none;
    }
  }
  .content {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-top: 16px;
    padding-top: 14px;
    border-top: var(--rule-subtle);
    font-size: 12px;
    color: var(--ink-3);
  }
  .content b {
    font-weight: 600;
    color: var(--ink-2);
  }
  .confirm {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin: 18px 0 14px;
    font-size: 13px;
    line-height: 1.5;
    color: var(--ink-2);
    cursor: pointer;
  }
  .confirm input {
    margin: 2px 0 0;
    width: 16px;
    height: 16px;
    accent-color: var(--brand);
    flex: none;
  }
  .actions {
    display: grid;
    gap: 8px;
    margin-top: 18px;
  }
  .confirm + .actions {
    margin-top: 0;
  }
  .action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    min-height: 44px;
    padding: 10px 20px;
    font-family: var(--font-sans, var(--font-ui));
    font-size: 14px;
    font-weight: 600;
    line-height: 1;
    border-radius: 999px;
    cursor: pointer;
    transition:
      background 120ms,
      border-color 120ms,
      filter 120ms;
  }
  .action:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .action.primary {
    background: var(--brand-2);
    color: #ffffff;
    border: 1px solid var(--brand-2);
  }
  .action.primary:hover:not(:disabled) {
    filter: brightness(1.1);
  }
  .action.secondary {
    background: var(--surface);
    color: var(--ink);
    border: var(--control-border, var(--rule-strong));
  }
  .action.secondary:hover:not(:disabled) {
    border-color: var(--ink-3);
    background: var(--surface-inset);
  }
  .action :global(svg) {
    width: 15px;
    height: 15px;
  }
  .link {
    font-family: inherit;
    font-size: 12px;
    color: var(--ink-3);
    background: none;
    border: 0;
    padding: 0;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 3px;
    transition: color 120ms;
  }
  .link:hover {
    color: var(--ink);
  }
  .link.danger {
    color: var(--danger);
  }
  .tertiary {
    margin-top: 10px;
  }
  .action:focus-visible,
  .link:focus-visible,
  .calc summary:focus-visible {
    outline: 2px solid var(--brand);
    outline-offset: 3px;
  }
  .footnote {
    margin: 14px 0 0;
    font-size: 11px;
    line-height: 1.5;
    color: var(--ink-4);
  }
</style>
