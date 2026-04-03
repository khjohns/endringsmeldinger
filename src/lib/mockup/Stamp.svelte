<script lang="ts">
  import type { Snippet } from 'svelte';

  type Variant = 'red' | 'gold' | 'green' | 'draft';

  let {
    variant,
    small = false,
    flat = false,
    children,
  }: { variant: Variant; small?: boolean; flat?: boolean; children: Snippet } = $props();
</script>

<span class="stamp stamp-{variant}" class:stamp-sm={small} class:stamp-flat={flat}>
  {@render children()}
</span>
