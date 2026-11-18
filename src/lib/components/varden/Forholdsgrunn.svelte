<!--
  Grunnen fra svaret på forholdet i «Gjelder hvis» i svaret på et krav. Avslaget åpner siden for
  forholdet uten å forkaste svarutkastet (U-16 i BF-20).
-->
<script lang="ts">
  import type { Subsidiaergrunn } from '#kjerne/regler/forhold.ts';
  import type { Brevref } from './lesing';
  import { SKJEMA } from './tekster';

  let {
    grunn,
    brev,
    onforholdet,
  }: { grunn: Subsidiaergrunn; brev: Brevref; onforholdet?: () => void } = $props();
</script>

{#if grunn === 'avslaatt' && onforholdet}
  <button type="button" onclick={onforholdet}>{SKJEMA.grunnen(grunn, brev)}</button>
{:else}
  {SKJEMA.grunnen(grunn, brev)}
{/if}

<style>
  /* Som lenkene ved siden av i «Gjelder hvis» (review av #2208). */
  button {
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
  }
  button:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
</style>
