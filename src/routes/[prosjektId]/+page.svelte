<script lang="ts">
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import { createCaseListQuery } from '$lib/queries/caseList';
  import Saksliste from '$lib/components/varden/Saksliste.svelte';
  import { projectToMeta } from '$lib/constants/projectMeta';
  import { projectStore } from '$lib/stores/project.svelte';

  const prosjektId = $derived(page.params.prosjektId ?? '');
  const query = createCaseListQuery(() => prosjektId);
  const projectMeta = $derived(projectToMeta(projectStore.current, prosjektId));
</script>

<svelte:head><title>Saker — {projectMeta.name}</title></svelte:head>

<div class="rull">
  <Saksliste
    saker={query.data?.saker ?? []}
    part={query.data?.part ?? null}
    laster={query.isLoading}
    feil={query.isError
      ? query.error instanceof Error
        ? query.error.message
        : 'Prøv igjen senere.'
      : null}
    onproevIgjen={() => query.refetch()}
    prosjektNavn={projectMeta.name}
    sakslenke={(sakId) => resolve('/[prosjektId]/[sakId]', { prosjektId, sakId })}
    nyttKrav={resolve('/[prosjektId]/ny', { prosjektId })}
  />
</div>

<style>
  /* `.project-shell` i layouten er like høy som vinduet og ruller ikke, så lista ruller her. */
  .rull {
    height: 100%;
    overflow-y: auto;
  }
</style>
