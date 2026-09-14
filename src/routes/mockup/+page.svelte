<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { untrack } from 'svelte';
  import { readPreferredRole } from '$lib/utils/rolePreference';
  import { readWorkspaceView, workspaceViewUrl } from '$lib/kontraktsbord/viewState';
  import '$lib/components/kontraktsbord/theme.css';
  import Kontrollrommet from '$lib/components/kontraktsbord/Kontrollrommet.svelte';
  import { createDemoStore } from '$lib/mockup/store.svelte';
  import { setCaseWorkspace } from '$lib/kontraktsbord/context.svelte';

  const store = setCaseWorkspace(createDemoStore());
  const defaultRole = readPreferredRole();
  const scenarioId = $derived(page.url.searchParams.get('scenario'));
  const view = $derived(readWorkspaceView(page.url.searchParams, defaultRole));
  $effect(() => {
    const id = scenarioId;
    if (id) untrack(() => store.demo?.selectScenario(id));
  });
</script>

<svelte:head>
  <title>KOE Mockup — Kontraktsbordet</title>
</svelte:head>

<Kontrollrommet
  {view}
  onviewchange={(next) =>
    goto(workspaceViewUrl(page.url, next), { noScroll: true, keepFocus: true })}
/>
