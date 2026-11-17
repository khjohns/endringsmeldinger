<!--
  Primærknappen i et skjema, med sendehindringen under (system.md, «En knapp er aldri sperret»,
  #2118). Knappen viser til hindringen med `aria-describedby`, og begge leser `sendeflyt`.
  `ramme` legger knappen i kallerens rad, og hindringen står under raden.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import Knapp from './Knapp.svelte';
  import Melding from './Melding.svelte';
  import type { sendeflyt } from './sendeflyt.svelte';

  let {
    flyt,
    onclick,
    opptatt = false,
    medHindring = true,
    ramme,
    children,
  }: {
    flyt: Pick<ReturnType<typeof sendeflyt>, 'hindring' | 'hindringId'>;
    onclick: () => void;
    opptatt?: boolean;
    /** `false` der knappen står en gang til, så hindringen og ID-en den har, finnes én gang. */
    medHindring?: boolean;
    /** Raden knappen står i, med knappen som argument. */
    ramme?: Snippet<[knapp: Snippet]>;
    children: Snippet;
  } = $props();
</script>

{#snippet knappen()}
  <Knapp
    variant="primaer"
    {onclick}
    {opptatt}
    aria-describedby={flyt.hindring ? flyt.hindringId : undefined}>{@render children()}</Knapp
  >
{/snippet}

{#if ramme}{@render ramme(knappen)}{:else}{@render knappen()}{/if}
{#if medHindring && flyt.hindring}
  <Melding art="feil" levende={false} id={flyt.hindringId} tabindex="-1">{flyt.hindring}</Melding>
{/if}
