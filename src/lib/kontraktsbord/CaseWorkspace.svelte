<script lang="ts">
  import Kontrollrommet from '$lib/components/kontraktsbord/Kontrollrommet.svelte';
  import '$lib/components/kontraktsbord/mockup.css';
  import { createCaseWorkspace, setCaseWorkspace } from './context.svelte';
  import type { WorkspaceView } from './viewState';
  import type { CaseContextResponse } from '$lib/types/api';

  let {
    response,
    projectId,
    refetch,
    view,
    onviewchange,
    onnewcase,
  }: {
    response: CaseContextResponse;
    projectId: string;
    refetch: () => Promise<CaseContextResponse>;
    view: WorkspaceView;
    onviewchange: (view: WorkspaceView) => void;
    onnewcase: () => void;
  } = $props();

  // The route keys this component by project and case, so this context never crosses cases.
  const workspace = setCaseWorkspace(createCaseWorkspace(response, { projectId, refetch }));
  $effect(() => workspace.replace(response));
  $effect(() => {
    if (view.mode === 'form') workspace.beginEdit(`${view.role}:${view.track}`);
    else workspace.endEdit();
  });
</script>

<Kontrollrommet {view} {onviewchange} {onnewcase} overviewHref="/{projectId}" />
