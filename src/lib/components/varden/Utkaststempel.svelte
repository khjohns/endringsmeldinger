<!-- Stempelet i brevhodet mens brevet skrives og kontrolleres (system.md, #2178). -->
<script lang="ts">
  import { BREVKONTROLL } from './tekster';
</script>

<span>{BREVKONTROLL.utkast}</span>

<style>
  span {
    display: inline-block;
    justify-self: end;
    padding: 1px var(--spacing-2);
    border: 1px dashed var(--draft);
    border-radius: var(--r-merke);
    background: var(--draft-bg);
    color: var(--draft);
    font: 500 12px / 20px var(--font-sans);
    white-space: nowrap;
  }
</style>
