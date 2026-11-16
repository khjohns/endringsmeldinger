<!--
  Labelen over et felt i skjemaene, med «Valgfri» til høyre på linja (system.md, «Feltene står
  under hverandre» og «Høyst tre nivåer av flater», #2059).
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { SKJEMA } from './tekster';

  let {
    for: felt,
    id,
    valgfri = false,
    children,
  }: { for: string; id?: string; valgfri?: boolean; children: Snippet } = $props();
</script>

<!-- prettier-ignore -->
<label for={felt} {id}>{@render children()}{#if valgfri}<span class="visually-hidden">,</span>&#32;<span class="valgfri">{SKJEMA.valgfri}</span>{/if}</label>

<style>
  label {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 0 var(--spacing-3);
    font-size: 16px;
    font-weight: 600;
    color: var(--ink);
  }
  .valgfri {
    font-size: 14px;
    font-weight: 400;
    color: var(--ink-3);
  }
</style>
