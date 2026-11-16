<!--
  Bestemmelsen i NS 8407 til høyre på linja med overskriften i et skjema, som dempet tekst og ikke
  som et merke (OV-U75, system.md, «Høyst tre nivåer av flater», #1925).
-->
<script lang="ts">
  import { hjemmelsmerke } from './tekster';

  let { id, numre }: { id?: string; /** Punktene, uten «pkt.». */ numre: readonly string[] } =
    $props();
</script>

<span {id}>{hjemmelsmerke(...numre)}</span>

<style>
  span {
    margin-left: auto;
    font-size: 14px;
    font-weight: 400;
    color: var(--ink-3);
    white-space: nowrap;
  }
</style>
