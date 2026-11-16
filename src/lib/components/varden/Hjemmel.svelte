<!--
  Bestemmelsen i NS 8407 etter overskriften i et skjema, som dempet tekst og ikke som et merke
  (OV-U75, system.md, «Høyst tre nivåer av flater», #1925).
-->
<script lang="ts">
  import { hjemmelsmerke } from './tekster';

  let { numre }: { /** Punktene, uten «pkt.». */ numre: readonly string[] } = $props();
</script>

<span>{hjemmelsmerke(...numre)}</span>

<style>
  span {
    font-size: 14px;
    font-weight: 400;
    color: var(--ink-3);
    white-space: nowrap;
  }
</style>
