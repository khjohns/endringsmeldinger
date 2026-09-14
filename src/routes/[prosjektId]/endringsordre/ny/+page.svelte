<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { useQueryClient } from '@tanstack/svelte-query';
  import AppTopbar from '$lib/components/navigation/AppTopbar.svelte';
  import EndringsordreForm from '$lib/components/endringsordre/EndringsordreForm.svelte';
  import { projectStore } from '$lib/stores/project.svelte';
  import '$lib/components/kontraktsbord/theme.css';
  const projectId = $derived(page.params.prosjektId ?? '');
  const projectName = $derived(projectStore.current?.name ?? projectId);
  const queryClient = useQueryClient();
  async function created(sakId: string) {
    await queryClient.invalidateQueries({ queryKey: ['cases', projectId] });
    await goto(resolve(`/${encodeURIComponent(projectId)}/${encodeURIComponent(sakId)}?rolle=BH`));
  }
</script>

<svelte:head><title>Ny endringsordre — {projectName}</title></svelte:head>
<div class="eo-page">
  <AppTopbar
    {projectName}
    projectHref={`/${encodeURIComponent(projectId)}`}
    caseLabel="Ny endringsordre"
    role="BH"
    lockedRole
    onrolechange={() => {}}
  />
  <main>
    {#key projectId}<EndringsordreForm
        {projectId}
        {projectName}
        userId={page.data.user?.id}
        initialKoe={page.url.searchParams.get('koe') ?? ''}
        oncreated={created}
      />{/key}
  </main>
</div>

<style>
  .eo-page {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    background: var(--canvas);
  }
  main {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }
</style>
