<!--
  Stegviseren for skjemaet og brevkontrollen (#2190).
-->
<script lang="ts">
  import { BREVSTEG } from './tekster';

  let {
    kontroll = false,
    element = $bindable(null),
  }: {
    kontroll?: boolean;
    element?: HTMLOListElement | null;
  } = $props();
</script>

<ol aria-label={BREVSTEG.stegene} tabindex="-1" bind:this={element}>
  <li aria-current={kontroll ? undefined : 'step'}>
    <span aria-hidden="true">1</span>{BREVSTEG.skriv}
  </li>
  <li aria-current={kontroll ? 'step' : undefined}>
    <span aria-hidden="true">2</span>{BREVSTEG.kontroller}
  </li>
</ol>

<style>
  ol {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-2) var(--spacing-5);
    padding: var(--spacing-3) var(--spacing-5);
    color: var(--ink-3);
    font-size: 13px;
  }
  li {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
  }
  span {
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border: var(--rule-strong);
    border-radius: 100%;
    font-size: 12px;
  }
  [aria-current='step'] {
    color: var(--ink);
    font-weight: 600;
  }
  [aria-current='step'] span {
    background: var(--ink);
    color: var(--surface);
    border-color: var(--ink);
  }
</style>
