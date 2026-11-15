<!--
  Forbeholdet etter GR-U34 i kortet «Kravet og svaret», én gang: det svaret ble sendt med, og
  stillingen i forholdet nå (U-3 og D-3 i BF-44, D-11 i BF-45), med lenke til forholdet.
-->
<script lang="ts">
  import type { Utledning } from '$kjerne/utledning/utled';
  import Knapp from './Knapp.svelte';
  import Melding from './Melding.svelte';
  import type { Brevet } from './lesing';
  import { VEDERLAGET } from './tekster';

  let {
    svarbrev,
    u,
    alle,
    onforholdet,
  }: {
    svarbrev: Brevet;
    u: Utledning;
    /** Brevene i saken (`brevene(u)`). */
    alle: Brevet[];
    onforholdet?: () => void;
  } = $props();
  // Byggherrens svar på forholdet etter svaret, som forbeholdet skiller fra.
  const forholdssvar = $derived(
    alle.find((b) => b.id === u.spor.forhold.gjeldendeSvar?.dokument) ?? null
  );
</script>

<div class="forbehold">
  <Melding art="info" levende={false}>
    {VEDERLAGET.forbehold(svarbrev, forholdssvar)}
    {#if onforholdet}<Knapp variant="lenke" kompakt onclick={onforholdet}
        >{VEDERLAGET.tilForholdet}</Knapp
      >{/if}
  </Melding>
</div>

<style>
  .forbehold {
    margin-top: var(--spacing-5);
  }
</style>
