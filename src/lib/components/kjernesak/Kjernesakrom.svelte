<script lang="ts">
  /** Kontrollrommet for en TS-sak (FK-8b, #718), med sakskonteksten fra kjernen. */
  import Kontrollrommet from '$lib/components/kontraktsbord/Kontrollrommet.svelte';
  import '$lib/components/kontraktsbord/theme.css';
  import { setCaseWorkspace } from '$lib/kontraktsbord/context.svelte';
  import { lagKjernesakflate } from '$lib/kjernesak/arbeidsflate.svelte';
  import type { Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';
  import type { WorkspaceView } from '$lib/kontraktsbord/viewState';

  let {
    kjernesak,
    projectId,
    view,
    onviewchange,
    onnewcase,
  }: {
    kjernesak: Kjernesakkontekst;
    projectId: string;
    view: WorkspaceView;
    onviewchange: (view: WorkspaceView) => void;
    onnewcase: () => void;
  } = $props();

  // Ruta nøkler komponenten på prosjekt og sak, så konteksten krysser aldri saker.
  setCaseWorkspace(lagKjernesakflate(kjernesak, projectId));
</script>

{#if kjernesak.ventende}
  <div
    role="alert"
    class="flex items-center gap-3 border-b border-amber-300 bg-amber-50 p-2 text-sm"
  >
    <p>{kjernesak.feil}</p>
    <button
      type="button"
      class="rounded border border-amber-400 px-2 py-1"
      disabled={kjernesak.sender}
      onclick={() => void kjernesak.provIgjen()}>Prøv igjen</button
    >
  </div>
{/if}
<Kontrollrommet {view} {onviewchange} {onnewcase} overviewHref="/{projectId}" />
