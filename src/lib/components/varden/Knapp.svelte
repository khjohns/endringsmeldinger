<!--
  Knappen i Varden: pilleform, minst 44 px høy. En handling parten kan gjøre nå, er alltid
  aktiv; knappen er `aria-disabled` bare mens en sending pågår (MM-U32). Med `href` er den en
  lenke med samme form, for en handling som åpner en annen side.
  `Button` i primitives er 36 px.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    variant = 'sekundaer',
    opptatt = false,
    onclick,
    href,
    children,
    ...rest
  }: {
    variant?: 'primaer' | 'sekundaer' | 'lenke';
    opptatt?: boolean;
    /** Kalleren gir lenken løst. */
    href?: string;
    onclick?: () => void;
    children: Snippet;
    [k: string]: unknown;
  } = $props();
</script>

{#if href}
  <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- kalleren gir lenken løst -->
  <a class="knapp knapp-{variant}" {href} {...rest}>{@render children()}</a>
{:else}
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
{/if}

<style>
  .knapp {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-2);
    min-height: 44px;
    padding: var(--spacing-2) var(--spacing-5);
    border-radius: var(--r-knapp);
    font: inherit;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    transition: background-color 150ms cubic-bezier(0.23, 1, 0.32, 1);
  }
  .knapp-primaer {
    min-height: 48px;
    background: var(--brand);
    color: var(--on-brand);
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
