<script lang="ts">
  import { setCaseWorkspace, type CaseWorkspace } from '$lib/kontraktsbord/context.svelte';
  import type { WorkspaceView } from '$lib/kontraktsbord/viewState';
  import Kontrollrommet from '../Kontrollrommet.svelte';
  let { workspace, view }: { workspace: CaseWorkspace; view?: WorkspaceView } = $props();
  setCaseWorkspace(workspace);
</script>

<Kontrollrommet {view} />
