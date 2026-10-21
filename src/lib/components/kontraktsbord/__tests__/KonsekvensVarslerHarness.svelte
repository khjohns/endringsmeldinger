<script lang="ts">
  import type { VarselValg } from '$lib/domain/konsekvensVarsler';
  import KonsekvensVarsler from '../KonsekvensVarsler.svelte';
  let { hovedkategori, tittel }: { hovedkategori: string; tittel: string } = $props();
  // Skjemaene binder valget (TeVederlagForm, NewCaseForm). Uten binding regner Svelte
  // standardverdien ut på nytt når en prop endres, og valget forsvinner (svelte 5.55.6).
  let value = $state<VarselValg>({});
</script>

<KonsekvensVarsler bind:value {hovedkategori} {tittel} />
