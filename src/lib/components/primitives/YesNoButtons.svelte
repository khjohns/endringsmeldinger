<script lang="ts">
  interface Props {
    value: boolean | null;
    label?: string;
    paragrafRef?: string;
    onchange: (value: boolean) => void;
  }

  let { value, label = '', paragrafRef = '', onchange }: Props = $props();
</script>

<div class="yesno-field">
  {#if label}
    <div class="yesno-label">
      {label}
      {#if paragrafRef}
        <span class="yesno-ref">{paragrafRef}</span>
      {/if}
    </div>
  {/if}
  <div class="yesno-group" role="group" aria-label={label || 'Ja/Nei'}>
    <button
      class="yesno-btn yesno-ja"
      class:yesno-active={value === true}
      onclick={() => onchange(true)}
      aria-pressed={value === true}
    >
      Ja
    </button>
    <button
      class="yesno-btn yesno-nei"
      class:yesno-active={value === false}
      onclick={() => onchange(false)}
      aria-pressed={value === false}
    >
      Nei
    </button>
  </div>
</div>

<style>
  .yesno-field {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .yesno-label {
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-ink-muted);
  }

  .yesno-ref {
    font-weight: 400;
    color: var(--color-ink-muted);
    margin-left: var(--spacing-2);
  }

  .yesno-group {
    display: inline-flex;
    gap: 1px;
  }

  .yesno-btn {
    height: 36px;
    min-width: 52px;
    padding: 0 var(--spacing-4);
    font-family: var(--font-ui);
    font-size: 13px;
    font-weight: 600;
    border: 1px solid var(--color-wire-strong);
    background: transparent;
    color: var(--color-ink-secondary);
    cursor: pointer;
    transition:
      background-color 0.12s,
      color 0.12s,
      border-color 0.12s;
  }

  .yesno-ja {
    border-radius: var(--radius-sm) 0 0 var(--radius-sm);
    border-right: none;
  }

  .yesno-nei {
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  }

  .yesno-btn:hover:not(.yesno-active) {
    background: var(--color-felt-hover);
    color: var(--color-ink);
  }

  .yesno-btn:focus-visible {
    outline: none;
    border-color: var(--color-wire-focus);
    box-shadow: 0 0 0 2px var(--color-vekt-bg);
    z-index: 1;
    position: relative;
  }

  .yesno-ja.yesno-active {
    background: var(--color-score-high-bg);
    color: var(--color-score-high);
    border-color: var(--color-score-high);
  }

  .yesno-ja.yesno-active + .yesno-nei {
    border-left-color: var(--color-score-high);
  }

  .yesno-nei.yesno-active {
    background: var(--color-score-low-bg);
    color: var(--color-score-low);
    border-color: var(--color-score-low);
  }
</style>
