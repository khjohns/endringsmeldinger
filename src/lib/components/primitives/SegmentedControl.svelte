<script lang="ts" generics="T extends string | boolean">
  import type { Icon } from 'lucide-svelte';
  interface SegmentOption {
    id: T;
    label: string;
    icon?: typeof Icon;
    tone?: 'success' | 'danger' | 'warning' | 'neutral';
  }

  interface Props {
    value: T | undefined;
    options: SegmentOption[];
    onchange: (value: T) => void;
    disabled?: boolean;
    variant?: 'default' | 'mockup';
    label?: string;
    onclear?: () => void;
  }

  let {
    value,
    options,
    onchange,
    disabled = false,
    variant = 'default',
    label,
    onclear,
  }: Props = $props();

  function handleKeydown(event: KeyboardEvent, index: number) {
    if (disabled) return;
    let next: number;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
      next = (index + 1) % options.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
      next = (index - 1 + options.length) % options.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = options.length - 1;
    else return;
    event.preventDefault();
    const button = event.currentTarget as HTMLButtonElement;
    button.parentElement?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus();
    onchange(options[next].id);
  }
</script>

<div
  class="segment-container"
  class:segment-mockup={variant === 'mockup'}
  class:segment-disabled={disabled}
  role="radiogroup"
  aria-label={label}
>
  {#each options as option, index (option.id)}
    <button
      type="button"
      class="segment-option"
      data-tone={option.tone}
      class:segment-active={value === option.id}
      role="radio"
      aria-checked={value === option.id}
      aria-disabled={disabled}
      {disabled}
      tabindex={value === option.id || (!options.some((item) => item.id === value) && index === 0)
        ? 0
        : -1}
      onkeydown={(event) => handleKeydown(event, index)}
      onclick={() => {
        if (!disabled) {
          if (value === option.id && onclear) onclear();
          else onchange(option.id);
        }
      }}
    >
      {#if option.icon}<option.icon size={14} />{/if}
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

  .segment-option {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
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

  .segment-option:hover:not(.segment-active) {
    color: var(--color-ink);
  }

  .segment-option:focus-visible {
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

  .segment-mockup {
    flex-wrap: wrap;
    flex: none;
    gap: 3px;
    width: fit-content;
    background: var(--surface-inset);
    border: var(--rule-strong);
    border-radius: 999px;
  }
  .segment-mockup .segment-option {
    min-height: 34px;
    padding: 7px 14px;
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
    color: var(--ink-3);
    border-radius: 999px;
  }
  .segment-mockup .segment-option:hover:not(.segment-active):not(:disabled) {
    color: var(--ink);
    background: var(--surface);
  }
  .segment-mockup .segment-active {
    color: white;
    background: var(--brand-2);
    box-shadow: 0 1px 2px rgba(27, 42, 34, 0.12);
  }
  .segment-mockup .segment-active[data-tone='success'] {
    background: var(--success);
  }
  .segment-mockup .segment-active[data-tone='danger'] {
    background: var(--danger);
  }
  .segment-mockup .segment-active[data-tone='warning'] {
    background: var(--warning);
  }
  .segment-mockup .segment-active[data-tone='neutral'] {
    background: var(--ink-3);
  }
  .segment-mockup .segment-option:focus-visible {
    outline: 2px solid var(--brand-2);
    outline-offset: 2px;
  }
  @media (max-width: 768px) {
    .segment-mockup {
      border-radius: 12px;
    }
  }
</style>
