<script lang="ts">
  import { BookOpen, ChevronUp, Paperclip } from 'lucide-svelte';

  type Props = {
    label: string;
    html?: string;
    emptyText?: string;
    clampThreshold?: number;
    attachmentCount?: number;
    attachmentPages?: number;
    readMoreLabel?: string;
  };

  let {
    label,
    html = '',
    emptyText = 'Ingen begrunnelse registrert.',
    clampThreshold = 420,
    attachmentCount = 0,
    attachmentPages = 0,
    readMoreLabel = 'Les hele begrunnelsen',
  }: Props = $props();

  let expanded = $state(false);
  const isLong = $derived(html.length > clampThreshold);
</script>

<div class="reasoning-section">
  <span class="eyebrow">{label}</span>
  {#if html}
    <!-- Rich-text HTML must be sanitized or otherwise trusted before it reaches this component. -->
    <div class="reasoning-text" class:clamped={!expanded && isLong}>
      {@html html}
    </div>
    {#if isLong}
      <button class="read-button" type="button" onclick={() => (expanded = !expanded)}>
        {#if expanded}<ChevronUp size={13} /> Vis mindre
        {:else}<BookOpen size={13} /> {readMoreLabel}{/if}
      </button>
    {/if}
  {:else}
    <p class="empty-text">{emptyText}</p>
  {/if}
  {#if attachmentCount > 0}
    <div class="attachment-meta">
      <Paperclip size={12} />
      {attachmentCount} vedlegg
      {#if attachmentPages > 0}
        · {attachmentPages} {attachmentPages === 1 ? 'side' : 'sider'}
      {/if}
    </div>
  {/if}
</div>

<style>
  .reasoning-section {
    padding: 18px 24px 20px;
    border-top: var(--rule, 1px solid var(--color-wire));
  }
  .eyebrow {
    display: block;
    font-size: 10px;
    font-weight: 700;
    line-height: 1.35;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--ink-4, var(--color-ink-muted));
  }
  .reasoning-text {
    max-width: 74ch;
    margin-top: 9px;
    font-size: 14px;
    line-height: 1.65;
    color: var(--ink-2, var(--color-ink-secondary));
  }
  .reasoning-text.clamped {
    display: -webkit-box;
    overflow: hidden;
    line-clamp: 5;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 5;
  }
  :global(.reasoning-text p) {
    margin: 0 0 0.75em;
  }
  :global(.reasoning-text p:last-child) {
    margin-bottom: 0;
  }
  .read-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 11px;
    padding: 0;
    font-family: var(--font-sans, var(--font-ui));
    font-size: 12px;
    font-weight: 600;
    color: var(--green, var(--color-vekt));
    background: transparent;
    border: 0;
    cursor: pointer;
  }
  .attachment-meta {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-top: 13px;
    font-size: 11px;
    color: var(--ink-4, var(--color-ink-muted));
  }
  .empty-text {
    margin: 9px 0 0;
    font-size: 14px;
    font-style: italic;
    color: var(--ink-4, var(--color-ink-muted));
  }

  @media (max-width: 640px) {
    .reasoning-section {
      padding-right: 18px;
      padding-left: 18px;
    }
  }
</style>
