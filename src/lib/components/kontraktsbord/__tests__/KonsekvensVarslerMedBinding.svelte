<script lang="ts">
  import type { VarselValg } from '$lib/domain/konsekvensVarsler';
  import KonsekvensVarsler from '../KonsekvensVarsler.svelte';
  let { hovedkategori, tittel }: { hovedkategori: string; tittel: string } = $props();
  // `value` må bindes, som i TeVederlagForm og NewCaseForm.
  let value = $state<VarselValg>({});
</script>

<KonsekvensVarsler bind:value {hovedkategori} {tittel} />
