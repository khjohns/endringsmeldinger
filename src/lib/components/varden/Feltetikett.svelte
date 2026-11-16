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
    underordnet = false,
    children,
  }: {
    for: string;
    id?: string;
    valgfri?: boolean;
    /** Et punkt under en felles overskrift, nedtonet (system.md, «Feltene står under hverandre»). */
    underordnet?: boolean;
    children: Snippet;
  } = $props();
</script>

<label for={felt} {id} class:underordnet
  >{#if valgfri}<Valgfri>{@render children()}</Valgfri>{:else}{@render children()}{/if}</label
>

<style>
  label {
    font-size: 16px;
    font-weight: 600;
    color: var(--ink);
  }
  label.underordnet {
    font-weight: 400;
    color: var(--ink-2);
  }
</style>
