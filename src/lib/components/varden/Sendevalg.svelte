<!--
  Valget øverst i kravskjemaet for vederlaget: kravet, eller «Bare varsle, uten krav» (U-1 i
  BF-37, U-11 i BF-14). Kravskjemaet og skjemaet for varslene viser det samme valget.
-->
<script lang="ts">
  import Valg from './Valg.svelte';
  import { VEDERLAGSVARSEL } from './tekster';

  let {
    navn,
    hva,
    onvelg,
  }: {
    navn: string;
    hva: 'krav' | 'varsel';
    onvelg: (hva: 'krav' | 'varsel') => void;
  } = $props();
</script>

<section class="seksjon kompakt">
  <Valg
    {navn}
    spoersmaal={VEDERLAGSVARSEL.hvaSender}
    valg={[
      { verdi: 'krav' as const, tekst: VEDERLAGSVARSEL.hva.krav },
      { verdi: 'varsel' as const, tekst: VEDERLAGSVARSEL.hva.varsel },
    ]}
    bind:verdi={() => hva, (x) => x && x !== hva && onvelg(x)}
  />
</section>

<style>
  .seksjon {
    padding: var(--spacing-4) var(--spacing-6);
    border-bottom: var(--rule);
  }
</style>
