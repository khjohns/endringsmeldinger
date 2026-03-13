<script lang="ts">
  interface Props {
    value: number | undefined;
    label?: string;
    suffix?: string;
    max?: number;
    referenceValue?: number;
    onchange: (value: number | undefined) => void;
  }

  let { value, label = '', suffix = '', max, referenceValue, onchange }: Props = $props();

  let editing = $state(false);
  let rawInput = $state('');

  let displayValue = $derived.by(() => {
    if (editing) return rawInput;
    if (value === undefined) return '';
    return value.toLocaleString('nb-NO');
  });

  let diff = $derived.by(() => {
    if (referenceValue === undefined || value === undefined || referenceValue === 0) return null;
    const pct = ((value - referenceValue) / referenceValue) * 100;
    return { pct, direction: pct > 0 ? 'up' : pct < 0 ? 'down' : ('neutral' as const) };
  });

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    rawInput = target.value;
    const raw = target.value.replace(/[^\d.-]/g, '');
    if (raw === '') {
      onchange(undefined);
      return;
    }
    let num = parseFloat(raw);
    if (isNaN(num)) return;
    if (max !== undefined && num > max) num = max;
    onchange(num);
  }

  function handleFocus() {
    editing = true;
    rawInput = value !== undefined ? String(value) : '';
  }

  function handleBlur() {
    editing = false;
  }
</script>

<div class="number-field">
  {#if label}
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <label class="number-label">{label}</label>
  {/if}
  <div class="number-input-wrap">
    <input
      type="text"
      inputmode="numeric"
      class="number-input"
      value={displayValue}
      oninput={handleInput}
      onfocus={handleFocus}
      onblur={handleBlur}
      aria-label={label || undefined}
    />
    {#if suffix}
      <span class="number-suffix">{suffix}</span>
    {/if}
  </div>
  {#if diff}
    <span
      class="number-diff"
      class:diff-up={diff.direction === 'up'}
      class:diff-down={diff.direction === 'down'}
      class:diff-neutral={diff.direction === 'neutral'}
    >
      {diff.pct > 0 ? '+' : ''}{diff.pct.toFixed(1)}%
    </span>
  {/if}
</div>

<style>
  .number-field {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .number-label {
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-ink-muted);
  }

  .number-input-wrap {
    display: flex;
    align-items: center;
    height: 36px;
    background: var(--color-canvas);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    transition: border-color 0.12s;
  }

  .number-input-wrap:focus-within {
    border-color: var(--color-wire-focus);
  }

  .number-input {
    flex: 1;
    height: 100%;
    padding: 0 var(--spacing-3);
    background: transparent;
    border: none;
    outline: none;
    font-family: var(--font-data);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    color: var(--color-ink);
    min-width: 0;
    text-align: right;
  }

  .number-suffix {
    padding-right: var(--spacing-3);
    font-family: var(--font-data);
    font-size: 12px;
    color: var(--color-ink-muted);
    flex-shrink: 0;
  }

  .number-diff {
    font-family: var(--font-data);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }

  .diff-up {
    color: var(--color-score-high);
  }

  .diff-down {
    color: var(--color-score-low);
  }

  .diff-neutral {
    color: var(--color-ink-ghost);
  }
</style>
