<script lang="ts">
  import { QueryClientProvider, QueryClient } from '@tanstack/svelte-query';
  import type { Project } from '#lib/types/project.ts';
  import { projectStore } from '#lib/stores/project.svelte.ts';
  import type { Snippet } from 'svelte';
  import { skalPrøveIgjen } from '#lib/api/client.ts';
  let { children, data }: { children: Snippet; data: { project: Project | null } } = $props();
  $effect(() => {
    projectStore.set(data.project);
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: skalPrøveIgjen } } });
</script>

<QueryClientProvider client={queryClient}>
  {@render children()}
</QueryClientProvider>
