<!--
  «Gjelder hvis» over et spørsmål i svaret: det i et foregående lag som rammer standpunktet,
  én forutsetning per linje i brevets rekkefølge (oppdragsgiver 30.10, #1391, #1400). Hva en
  forutsetning er, og hvordan den skrives, er sporets eget (`Utkastlag<F>`, #1778).
-->
<script lang="ts" generics="F">
  import type { Snippet } from 'svelte';
  import { SKJEMA } from './tekster';

  let {
    id,
    liste,
    punkt,
  }: {
    /** Spørsmålet viser til lista med `aria-describedby`. */
    id: string;
    liste: F[];
    punkt: Snippet<[F]>;
  } = $props();
</script>

{#if liste.length}
  <div class="forutsetninger" {id}>
    <p>{SKJEMA.gjelderHvis}</p>
    <ul>
      {#each liste as f, i (i)}
        <li>{@render punkt(f)} {SKJEMA.ikkeFoererFrem}</li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  /* Subsidiært har ingen farge; laget skilles med kantlinjen og teksten (#197). */
  .forutsetninger {
    padding: var(--spacing-1) 0 var(--spacing-1) var(--spacing-3);
    border-left: 2px solid var(--ink);
    color: var(--ink-2);
    font-size: 14px;
  }
  .forutsetninger p {
    font-weight: 600;
    color: var(--ink);
  }
  .forutsetninger ul {
    margin: var(--spacing-1) 0 0;
    padding-left: var(--spacing-5);
    list-style: disc;
  }
  .forutsetninger :global(a) {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
</style>
