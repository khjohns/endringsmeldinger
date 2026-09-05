<script lang="ts">
  import { Pencil } from 'lucide-svelte';

  type Props = {
    text: string;
    value?: string;
    onopen: () => void;
    label?: string;
  };

  let { text, value, onopen, label = 'Internt — ikke synlig for motpart' }: Props = $props();
</script>

<button class="internal-draft-card" type="button" onclick={onopen}>
  <span class="draft-content">
    <span class="draft-heading">
      <span class="draft-chip">Kladd</span>
      <Pencil size={13} aria-hidden="true" />
      <span>{label}</span>
      {#if value}
        <strong class="draft-value">{value}</strong>
      {/if}
    </span>
    <span class="draft-text">{text}</span>
  </span>
</button>

<style>
  .internal-draft-card {
    display: flex;
    width: 100%;
    padding: 15px 16px;
    text-align: left;
    font-family: var(--font-sans, var(--font-ui));
    color: var(--draft, var(--color-ink-secondary));
    background: var(--draft-bg, var(--color-felt));
    border: 1.5px dashed var(--draft-border, var(--color-wire-strong));
    border-radius: 12px;
    cursor: pointer;
    transition:
      border-color 120ms,
      background-color 120ms;
  }
  .internal-draft-card:hover {
    border-color: var(--draft, var(--color-ink-secondary));
    background: var(--surface-warm, var(--color-felt-hover));
  }
  .draft-content {
    min-width: 0;
    width: 100%;
  }
  .draft-heading {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 9px;
    font-size: 12px;
    font-weight: 600;
  }
  .draft-chip {
    display: inline-flex;
    align-items: center;
    padding: 3px 8px;
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0.02em;
    color: var(--draft, var(--color-ink-secondary));
    background: var(--draft-bg, var(--color-felt));
    border: 1px dashed currentColor;
    border-radius: 999px;
  }
  .draft-value {
    margin-left: auto;
    font-family: var(--font-mono, var(--font-data));
    font-size: 13px;
  }
  .draft-text {
    display: block;
    margin-top: 9px;
    font-size: 13px;
    line-height: 1.55;
  }

  @media (max-width: 640px) {
    .draft-value {
      width: 100%;
      margin-left: 0;
    }
  }
</style>
