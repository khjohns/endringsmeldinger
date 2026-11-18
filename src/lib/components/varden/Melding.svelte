<!--
  Feil, kvittering eller informasjon på nøytral flate (system.md, «En feil har én form»).
  Feil har kant og ikon i --danger. Informasjon har kant i blekk. Kalleren eier teksten.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { CircleAlert, CircleCheck } from 'lucide-svelte';

  let {
    art,
    levende = true,
    element = $bindable(null),
    children,
    ...rest
  }: {
    /** `feil` leses opp straks (role="alert"); de andre er status. */
    art: 'feil' | 'kvittering' | 'info';
    /** `false` når meldingen står i en levende region som finnes fra før, så den ikke leses to ganger. */
    levende?: boolean;
    element?: HTMLElement | null;
    children: Snippet;
    [k: string]: unknown;
  } = $props();
</script>

<div
  class="melding"
  role={levende ? (art === 'feil' ? 'alert' : 'status') : undefined}
  data-art={art}
  bind:this={element}
  {...rest}
>
  {#if art === 'feil'}
    <CircleAlert size={18} aria-hidden="true" />
  {:else if art === 'kvittering'}
    <CircleCheck size={18} aria-hidden="true" />
  {/if}
  <div class="tekst">{@render children()}</div>
</div>

<style>
  .melding {
    display: flex;
    gap: var(--spacing-3);
    padding: var(--spacing-3) var(--spacing-4);
    border-left: 3px solid var(--ink);
    background: var(--surface-inset);
    color: var(--ink);
    font-size: 14px;
  }
  .melding[data-art='feil'] {
    border-left-color: var(--danger);
  }
  .melding:focus {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .melding[data-art='feil'] > :global(svg) {
    color: var(--danger);
  }
  .melding > :global(svg) {
    flex: none;
    margin-top: 1px;
  }
  .tekst {
    min-width: 0;
  }
</style>
