<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import AppTopbar from '$lib/components/navigation/AppTopbar.svelte';
  import EOApprovalPage from '$lib/components/endringsordre/EOApprovalPage.svelte';
  import { apiEOApprovals } from '$lib/approval/eoApproval.svelte';
  import { projectStore } from '$lib/stores/project.svelte';
  import '$lib/components/kontraktsbord/theme.css';
  const projectId = $derived(page.params.prosjektId ?? '');
  const projectName = $derived(projectStore.current?.name ?? projectId);
</script>

<svelte:head><title>Endringsordrer til godkjenning — {projectName}</title></svelte:head>
<div class="eo-page">
  <AppTopbar
    {projectName}
    projectHref={`/${encodeURIComponent(projectId)}`}
    caseLabel="Endringsordrer til godkjenning"
    role="BH"
    lockedRole
    onrolechange={() => {}}
  />
  <main>
    {#key projectId}<EOApprovalPage
        source={apiEOApprovals(projectId)}
        {projectId}
        {projectName}
        initialId={page.url.searchParams.get('pakke') ?? ''}
        newOrderHref={resolve(`/${encodeURIComponent(projectId)}/endringsordre/ny`)}
        issuedHref={(sakId) =>
          resolve(`/${encodeURIComponent(projectId)}/${encodeURIComponent(sakId)}?rolle=BH`)}
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
