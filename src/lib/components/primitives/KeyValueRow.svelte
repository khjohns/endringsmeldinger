<script lang="ts">
  interface Props {
    label: string;
    value: string;
    mono?: boolean;
  }

  let { label, value, mono = false }: Props = $props();
</script>

<div class="kv-row">
  <span class="kv-label">{label}</span>
  <span class="kv-leader"></span>
  <span class="kv-value" class:kv-mono={mono}>{value}</span>
</div>

<style>
  .kv-row {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-2);
    font-family: var(--font-ui);
    font-size: 13px;
    line-height: 1.6;
  }

  .kv-label {
    color: var(--color-ink-secondary);
    font-weight: 500;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .kv-leader {
    flex: 1;
    border-bottom: 1px dotted var(--color-wire-strong);
    min-width: 16px;
    margin-bottom: 3px;
  }

  .kv-value {
    color: var(--color-ink);
    font-weight: 500;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .kv-mono {
    font-family: var(--font-data);
    font-variant-numeric: tabular-nums;
  }
</style>
