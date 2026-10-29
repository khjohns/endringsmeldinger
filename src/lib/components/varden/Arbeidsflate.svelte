<!--
  Arbeidet i sporet (Varden, prinsipp 8): hovedkolonnen med det brukeren gjør nå, og høyre
  kolonne med det som støtter arbeidet. Under 1024 px legger høyre kolonne seg under arbeidet.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    overskrift,
    undertekst,
    handling,
    hoved,
    hoeyre,
  }: {
    overskrift: string;
    undertekst?: string;
    handling?: Snippet;
    hoved: Snippet;
    hoeyre?: Snippet;
  } = $props();
</script>

<div class="flate">
  <div class="hoved">
    <header class="topp">
      <div>
        <h2>{overskrift}</h2>
        {#if undertekst}<p class="undertekst">{undertekst}</p>{/if}
      </div>
      {#if handling}<div class="handling">{@render handling()}</div>{/if}
    </header>
    {@render hoved()}
  </div>
  {#if hoeyre}
    <div class="hoeyre">{@render hoeyre()}</div>
  {/if}
</div>

<style>
  .flate {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: var(--spacing-6);
    align-items: start;
  }
  .hoved {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }
  .topp {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-3);
    padding-bottom: var(--spacing-3);
    border-bottom: var(--rule);
  }
  h2 {
    font-size: 22px;
    font-weight: 600;
  }
  .undertekst {
    color: var(--ink-3);
    font-size: 14px;
  }
  .hoeyre {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
    min-width: 0;
  }
  @media (max-width: 1023px) {
    .flate {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
