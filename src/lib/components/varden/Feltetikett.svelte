<!--
  Labelen over et felt i skjemaene, med «Valgfri» til høyre på linja (system.md, «Feltene står
  under hverandre» og «Høyst tre nivåer av flater», #2059).
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import Valgfri from './Valgfri.svelte';

  let {
    for: felt,
    id,
    valgfri = false,
    children,
  }: { for: string; id?: string; valgfri?: boolean; children: Snippet } = $props();
</script>

<label for={felt} {id} class:valgfri
  >{@render children()}{#if valgfri}<Valgfri />{/if}</label
>

<style>
  label {
    font-size: 16px;
    font-weight: 600;
    color: var(--ink);
  }
  label.valgfri {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 var(--spacing-3);
  }
</style>
