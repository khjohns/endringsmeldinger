<!--
  Et sitat fra et brev utenfor brevet, med etiketten for hva det er: utdraget i tråden og
  setningen om endringsordren i svarskjemaet for forholdet (#2035). Teksten i sitatet står i
  avsenderens brevskrift, som komponenten som bruker sitatet, setter («Typografi» i `system.md`).
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let { etikett = null, children }: { etikett?: string | null; children: Snippet } = $props();
</script>

<div class="sitat">
  {#if etikett}<p class="etikett">{etikett}</p>{/if}
  {@render children()}
</div>

<style>
  .sitat {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
    padding-left: var(--spacing-3);
    border-left: 2px solid var(--rule-strong-color);
    font-size: 14px;
  }
  .etikett {
    font-size: 12px;
    color: var(--ink-3);
  }
</style>
