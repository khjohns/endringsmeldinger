<!--
  Et lite kort i høyre kolonne i svarskjemaet, under panelet, med det byggherren trenger ved
  svaret som ikke er en del av brevet: svarene fra forrige brev (VS-U65) og totalentreprenørens
  dato etter punkt 34.1.3 (U-9 i BF-48).
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    id,
    tittel,
    children,
    bunn,
  }: { id: string; tittel: string; children: Snippet; bunn?: Snippet } = $props();
</script>

<section class="kort" aria-labelledby={id}>
  <h2 class="hode" {id}>{tittel}</h2>
  <div class="innhold">{@render children()}</div>
  {#if bunn}<div class="bunn">{@render bunn()}</div>{/if}
</section>

<style>
  .kort {
    background: var(--surface);
    border: var(--rule);
    border-radius: var(--r-kort);
  }
  .hode {
    padding: var(--spacing-4) var(--spacing-5);
    border-bottom: var(--rule);
    font-size: 16px;
    font-weight: 600;
  }
  .innhold {
    padding: var(--spacing-4) var(--spacing-5);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }
  .bunn {
    padding: var(--spacing-3) var(--spacing-5) var(--spacing-4);
    border-top: var(--rule);
  }
</style>
