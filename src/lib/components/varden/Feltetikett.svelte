<!-- Labelen over et felt i skjemaene (system.md, «Feltene står under hverandre», #2059). -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let { for: felt, id, children }: { for: string; id?: string; children: Snippet } = $props();
</script>

<label for={felt} {id}>{@render children()}</label>

<style>
  label {
    font-size: 16px;
    font-weight: 600;
    color: var(--ink);
  }
</style>
