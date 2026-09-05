<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = {
    eyebrow: string;
    partyName: string;
    reference?: string;
    submittedAt?: string;
    submittedLabel?: string;
    revisionLabel?: string;
    icon?: Snippet;
    children: Snippet;
  };

  let {
    eyebrow,
    partyName,
    reference,
    submittedAt,
    submittedLabel = 'Sendt',
    revisionLabel,
    icon,
    children,
  }: Props = $props();
</script>

<section class="statement-card">
  <header class="statement-header">
    <div class="party-heading">
      <div class="eyebrow-row">
        {#if icon}
          {@render icon()}
        {/if}
        <span class="eyebrow">{eyebrow}</span>
      </div>
      <h3>{partyName}</h3>
      {#if submittedAt || revisionLabel}
        <div class="submission-meta">
          {#if submittedAt}<span>{submittedLabel} {submittedAt}</span>{/if}
          {#if revisionLabel}<span>{revisionLabel}</span>{/if}
        </div>
      {/if}
    </div>
    {#if reference}
      <span class="party-ref">{reference}</span>
    {/if}
  </header>

  {@render children()}
</section>

<style>
  .statement-card {
    overflow: hidden;
    margin-bottom: 20px;
    background: var(--surface, var(--color-canvas));
    border: var(--rule, 1px solid var(--color-wire));
    border-radius: 12px;
    box-shadow: var(--overlay-shadow-sm, 0 2px 5px rgb(27 42 34 / 7%));
  }
  .statement-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    padding: 14px 16px;
    border-bottom: var(--rule, 1px solid var(--color-wire));
  }
  .party-heading {
    min-width: 0;
  }
  .eyebrow-row {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--ink-4, var(--color-ink-muted));
  }
  .eyebrow {
    display: block;
    font-size: 10px;
    font-weight: 700;
    line-height: 1.35;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: inherit;
  }
  h3 {
    margin: 4px 0 0;
    font-family: var(--font-sans, var(--font-ui));
    font-size: 14px;
    line-height: 1.4;
    color: var(--ink, var(--color-ink));
  }
  .submission-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px 9px;
    margin-top: 4px;
    font-size: 11px;
    color: var(--ink-4, var(--color-ink-muted));
  }
  .submission-meta span + span::before {
    margin-right: 9px;
    content: '\00b7';
  }
  .party-ref {
    flex: none;
    font-family: var(--font-mono, var(--font-data));
    font-size: 12px;
    color: var(--ink-4, var(--color-ink-muted));
  }
</style>
