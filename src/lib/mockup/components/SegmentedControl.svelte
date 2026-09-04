<script lang="ts">
  interface Option {
    value: string;
    label: string;
  }

  interface Props {
    options: Option[];
    value: string;
    onchange: (value: string) => void;
  }

  let { options, value, onchange }: Props = $props();
</script>

<div class="segment-row" role="group">
  {#each options as option}
    <button
      type="button"
      class="segment-btn"
      class:active={value === option.value}
      aria-pressed={value === option.value}
      onclick={() => onchange(option.value)}>{option.label}</button
    >
  {/each}
</div>

<style>
  .segment-row {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 3px;
    width: fit-content;
    margin-top: 14px;
    padding: 3px;
    overflow: visible;
    background: var(--surface-inset);
    border: var(--rule-strong);
    border-radius: 999px;
  }
  .segment-btn {
    flex: none;
    min-height: 34px;
    padding: 7px 14px;
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
    color: var(--ink-3);
    background: transparent;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    transition:
      background 120ms,
      color 120ms,
      box-shadow 120ms;
  }
  .segment-btn:hover:not(.active) {
    color: var(--ink);
    background: var(--surface);
  }
  .segment-btn.active {
    color: white;
    background: var(--brand-2);
    box-shadow: 0 1px 2px rgba(27, 42, 34, 0.12);
  }

  @media (max-width: 768px) {
    .segment-row {
      border-radius: 12px;
    }
  }
</style>
