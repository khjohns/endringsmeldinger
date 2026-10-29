<!--
  Knappen i Varden: pilleform, minst 44 px høy. En knapp som ikke kan brukes ennå, er
  `aria-disabled` og kan fortsatt nås med tastaturet, så `hvorfor` leses opp med den.
  `Button` i primitives er 36 px og har ingen forklaring ved en sperret knapp.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    variant = 'sekundaer',
    sperret = false,
    hvorfor,
    opptatt = false,
    onclick,
    children,
    ...rest
  }: {
    variant?: 'primaer' | 'sekundaer' | 'lenke';
    sperret?: boolean;
    /** ID-en til teksten som sier hvorfor knappen ikke kan brukes. */
    hvorfor?: string;
    opptatt?: boolean;
    onclick?: () => void;
    children: Snippet;
    [k: string]: unknown;
  } = $props();
</script>

<button
  type="button"
  class="knapp knapp-{variant}"
  aria-disabled={sperret || opptatt ? 'true' : undefined}
  aria-describedby={sperret ? hvorfor : undefined}
  aria-busy={opptatt ? 'true' : undefined}
  onclick={() => {
    if (!sperret && !opptatt) onclick?.();
  }}
  {...rest}
>
  {@render children()}
</button>

<style>
  .knapp {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-2);
    min-height: 44px;
    padding: 0 var(--spacing-5);
    border-radius: 999px;
    font: inherit;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 150ms cubic-bezier(0.23, 1, 0.32, 1);
  }
  .knapp-primaer {
    background: var(--brand);
    color: var(--surface);
    border: 1px solid var(--brand);
  }
  /* Primærknappen er nesten svart (Blekk), så hover og trykk lysner den. */
  .knapp-primaer:hover {
    background: var(--ink-2);
  }
  .knapp-sekundaer {
    background: var(--surface);
    color: var(--ink);
    border: 1.5px solid var(--ink);
  }
  .knapp-sekundaer:hover {
    background: var(--surface-inset);
  }
  .knapp-lenke {
    min-height: 44px;
    padding: 0 var(--spacing-2);
    background: none;
    border: 0;
    color: var(--brand);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .knapp-lenke:hover {
    background: none;
    text-decoration-thickness: 2px;
  }
  .knapp-sekundaer:active {
    background: var(--surface-selected);
  }
  .knapp-primaer:active {
    background: var(--ink-3);
  }
  .knapp[aria-disabled='true'] {
    background: var(--surface-inset);
    color: var(--ink-3);
    border-color: var(--rule-strong-color);
    cursor: not-allowed;
  }
  .knapp:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    .knapp {
      transition: none;
    }
  }
</style>
