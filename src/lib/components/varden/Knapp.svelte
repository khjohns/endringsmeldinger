<!--
  Knappen i Varden: pilleform, minst 44 px høy. En handling parten kan gjøre nå, er alltid
  aktiv; knappen er `aria-disabled` bare mens en sending pågår (MM-U32).
  `Button` i primitives er 36 px.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    variant = 'sekundaer',
    opptatt = false,
    onclick,
    children,
    ...rest
  }: {
    variant?: 'primaer' | 'sekundaer' | 'lenke';
    opptatt?: boolean;
    onclick?: () => void;
    children: Snippet;
    [k: string]: unknown;
  } = $props();
</script>

<button
  type="button"
  class="knapp knapp-{variant}"
  aria-disabled={opptatt ? 'true' : undefined}
  aria-busy={opptatt ? 'true' : undefined}
  onclick={() => {
    if (!opptatt) onclick?.();
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
