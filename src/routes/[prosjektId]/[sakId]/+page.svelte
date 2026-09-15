<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { createCaseContextQuery } from '$lib/queries/caseContext';
  import CaseWorkspace from '$lib/kontraktsbord/CaseWorkspace.svelte';
  import EndringsordrePage from '$lib/components/endringsordre/EndringsordrePage.svelte';
  import { projectStore } from '$lib/stores/project.svelte';
  import {
    readWorkspaceView,
    workspaceViewUrl,
    type WorkspaceView,
  } from '$lib/kontraktsbord/viewState';

  const prosjektId = $derived(page.params.prosjektId ?? '');
  const sakId = $derived(page.params.sakId ?? '');
  const query = createCaseContextQuery(
    () => sakId,
    () => prosjektId
  );
  const storedRole =
    typeof localStorage !== 'undefined' && localStorage.getItem('koe-user-role') === 'TE'
      ? 'TE'
      : 'BH';
  const view = $derived(readWorkspaceView(page.url.searchParams, storedRole));

  $effect(() => {
    localStorage.setItem('koe-user-role', view.role);
  });

  function changeView(next: WorkspaceView) {
    const href = workspaceViewUrl(page.url, next);
    if (href !== page.url.pathname + page.url.search + page.url.hash)
      // href er utledet av gjeldende URL (bare query endres), ikke en ny rute.
      // eslint-disable-next-line svelte/no-navigation-without-resolve
      void goto(href, { noScroll: true, keepFocus: true });
  }

  async function refetch() {
    const result = await query.refetch();
    if (result.error) throw result.error;
    if (!result.data) throw new Error('Saken kunne ikke lastes.');
    return result.data;
  }
</script>

<svelte:head><title>{query.data?.state.sakstittel ?? 'Sak'} — Kontraktsbordet</title></svelte:head>

{#if query.data}
  {#key prosjektId + ':' + sakId}
    {#if query.data.state.sakstype === 'endringsordre'}
      <EndringsordrePage
        response={query.data}
        projectId={prosjektId}
        projectName={projectStore.current?.name ?? prosjektId}
        role={view.role}
        onrolechange={(role) => changeView({ ...view, role })}
      />
    {:else}
      <CaseWorkspace
        response={query.data}
        projectId={prosjektId}
        {refetch}
        {view}
        onviewchange={changeView}
        onnewcase={() => goto(resolve('/[prosjektId]/ny', { prosjektId }))}
      />
    {/if}
  {/key}
{:else if query.isError}
  <div class="case-message" role="alert">
    <h1>Kunne ikke laste saken</h1>
    <p>{query.error?.message}</p>
    <button onclick={() => query.refetch()}>Prøv igjen</button>
    <a href={resolve('/[prosjektId]', { prosjektId })}>Til saksoversikten</a>
  </div>
{:else}
  <div class="case-message" role="status">Laster sak …</div>
{/if}

<style>
  .case-message {
    padding: 40px;
    color: var(--color-ink);
  }
  .case-message h1 {
    font-size: 22px;
    margin-bottom: 12px;
  }
  .case-message p {
    margin-bottom: 16px;
  }
  .case-message button {
    margin-right: 16px;
    cursor: pointer;
  }
</style>
