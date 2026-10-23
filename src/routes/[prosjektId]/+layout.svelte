<script lang="ts">
  import { QueryClientProvider, QueryClient } from '@tanstack/svelte-query';
  import type { Project } from '$lib/types/project';
  import { projectStore } from '$lib/stores/project.svelte';
  import type { Snippet } from 'svelte';
  import { skalPrøveIgjen } from '$lib/api/client';
  let { children, data }: { children: Snippet; data: { project: Project | null } } = $props();
  $effect(() => {
    projectStore.set(data.project);
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: skalPrøveIgjen } } });
</script>

<QueryClientProvider client={queryClient}>
  <div class="project-shell">{@render children()}</div>
</QueryClientProvider>

<style>
  .project-shell {
    height: 100dvh;
    overflow: hidden;
  }
</style>
