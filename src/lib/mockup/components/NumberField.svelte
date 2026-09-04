<script lang="ts">
  interface Props {
    id: string;
    label: string;
    suffix: string;
    value?: number;
    placeholder?: string;
    min?: number;
    max?: number;
    hint?: string;
    onchange: (value: number | undefined) => void;
  }

  let {
    id,
    label,
    suffix,
    value,
    placeholder = '0',
    min = 0,
    max,
    hint,
    onchange,
  }: Props = $props();
</script>

<div class="number-field">
  <label class="number-input-label" for={id}>{label}</label>
  <div class="number-input-wrap">
    <input
      {id}
      type="text"
      inputmode="numeric"
      value={value ?? ''}
      oninput={(event) => {
        const digits = event.currentTarget.value.replace(/\D/g, '');
        event.currentTarget.value = digits;
        const nextValue = parseInt(digits, 10);
        const constrainedValue = isNaN(nextValue)
          ? undefined
          : Math.min(max ?? Infinity, Math.max(min, nextValue));
        if (constrainedValue !== undefined && constrainedValue !== nextValue) {
          event.currentTarget.value = String(constrainedValue);
        }
        onchange(constrainedValue);
      }}
      {placeholder}
      class="font-mono measurement-input"
    />
    <span class="number-input-suffix">{suffix}</span>
  </div>
  {#if hint}
    <span class="number-input-hint">{hint}</span>
  {/if}
</div>

<style>
  .number-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-width: 260px;
    margin-top: 14px;
  }
  .number-input-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .number-input-wrap {
    display: flex;
    align-items: stretch;
  }
  .number-input-wrap .measurement-input {
    min-width: 0;
    flex: 1;
    width: auto;
    text-align: right;
    border-radius: 8px 0 0 8px;
  }
  .number-input-suffix {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    color: var(--ink-3);
    background: var(--surface-inset);
    border: var(--control-border);
    border-left: none;
    border-radius: 0 8px 8px 0;
  }
  .number-input-hint {
    margin-top: 1px;
    font-size: 11px;
    color: var(--ink-4);
  }

  @media (max-width: 768px) {
    .number-field {
      max-width: none;
    }
  }
</style>
