<!--
  Oppsummeringen øverst i et krav- eller svarskjema av det som mangler før brevet kan lages, med en
  lenke til hvert felt (MM-U32). Kalleren flytter fokus hit med `element` og åpner posten et felt
  står i med `ongaa`.
-->
<script lang="ts">
  import type { Mangel } from './mangler';

  let {
    tittel,
    mangler,
    ongaa,
    element = $bindable(null),
  }: {
    tittel: string;
    mangler: readonly Mangel[];
    /** Brukeren valgte lenken til feltet. Kalleren kan åpne posten og stoppe standardvalget. */
    ongaa?: (m: Mangel, e: MouseEvent) => void;
    element?: HTMLElement | null;
  } = $props();
  const uid = $props.id();
</script>

<div class="mangler" role="group" tabindex="-1" bind:this={element} aria-labelledby={uid}>
  <p id={uid}>{tittel}</p>
  <ul>
    {#each mangler as m (m.felt)}
      <li><a href={`#${m.felt}`} onclick={(e) => ongaa?.(m, e)}>{m.tekst}</a></li>
    {/each}
  </ul>
</div>

<style>
  .mangler {
    margin: var(--spacing-5) var(--spacing-6) 0;
    padding: var(--spacing-4);
    border-left: 3px solid var(--danger);
    background: var(--danger-bg);
  }
  .mangler:focus {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  p {
    font-weight: 600;
  }
  ul {
    margin-top: var(--spacing-2);
    padding-left: var(--spacing-5);
    list-style: disc;
  }
  a {
    color: var(--ink);
    text-underline-offset: 3px;
  }
  a:hover {
    text-decoration-thickness: 2px;
  }
</style>
