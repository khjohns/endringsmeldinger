<script lang="ts" generics="T extends string">
  interface SegmentOption {
    id: T;
    label: string;
  }

  interface Props {
    value: T;
    options: SegmentOption[];
    onchange: (value: T) => void;
    disabled?: boolean;
  }

  let { value, options, onchange, disabled = false }: Props = $props();
</script>

<div class="segment-container" class:segment-disabled={disabled} role="radiogroup">
  {#each options as option (option.id)}
    <button
      class="segment-btn"
      class:segment-active={value === option.id}
      role="radio"
      aria-checked={value === option.id}
      aria-disabled={disabled}
      onclick={() => {
        if (!disabled) onchange(option.id);
      }}
    >
      {option.label}
    </button>
  {/each}
</div>

<style>
  .segment-container {
    display: inline-flex;
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-md);
    padding: 3px;
  }

  .segment-btn {
    padding: var(--spacing-2) var(--spacing-4);
    font-family: var(--font-ui);
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink-secondary);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition:
      background-color 0.15s,
      color 0.15s,
      font-weight 0.15s;
    letter-spacing: -0.005em;
  }

  .segment-btn:hover:not(.segment-active) {
    color: var(--color-ink);
  }

  .segment-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--color-vekt-bg);
  }

  .segment-active {
    background: var(--color-vekt-bg-strong);
    color: var(--color-vekt);
    font-weight: 600;
  }

  .segment-disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
