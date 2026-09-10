<script lang="ts">
  import { page } from '$app/state';
  import { createCaseListQuery } from '$lib/queries/caseList';
  import ProjectOverview from '$lib/components/saksoversikt/ProjectOverview.svelte';
  import { projectToMeta } from '$lib/constants/projectMeta';
  import { projectStore } from '$lib/stores/project.svelte';

  const prosjektId = $derived(page.params.prosjektId ?? '');
  const query = createCaseListQuery(() => prosjektId);
  const projectMeta = $derived(projectToMeta(projectStore.current, prosjektId));
</script>

<svelte:head><title>Aktivitetslogg — {projectMeta.name}</title></svelte:head>

<ProjectOverview
  activePage="activity"
  cases={query.data?.cases ?? []}
  {prosjektId}
  prosjektNavn={projectMeta.name}
  entreprise={projectMeta.entreprise}
  contract={projectStore.current?.settings.contract}
  projectDescription={projectStore.current?.description}
  projectImageUrl={projectStore.current?.settings.image_url}
  projectImageAlt={projectStore.current?.settings.image_alt}
  loading={query.isLoading}
  error={query.isError
    ? query.error instanceof Error
      ? query.error.message
      : 'Prøv igjen senere.'
    : null}
/>
