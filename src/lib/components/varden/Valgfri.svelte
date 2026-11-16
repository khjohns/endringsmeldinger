<!--
  Teksten i en label eller et spørsmål over et valgfritt felt, med «Valgfri» til høyre på linja
  (system.md, «Et valgfritt felt har «Valgfri» til høyre», oppdragsgiver 16.11). Skjermleseren leser
  «<label>, Valgfri».
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { SKJEMA } from './tekster';

  let { children }: { children: Snippet } = $props();
</script>

<!-- prettier-ignore -->
<span class="linje">{@render children()}<span class="visually-hidden">,</span>&#32;<span class="valgfri">{SKJEMA.valgfri}</span></span>

<style>
  .linje {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 var(--spacing-3);
  }
  .valgfri {
    margin-left: auto;
    font-size: 14px;
    font-weight: 400;
    color: var(--ink-3);
  }
</style>
