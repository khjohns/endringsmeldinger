<script lang="ts">
  import type { Snippet } from 'svelte';
  import AppTopbar from '$lib/components/navigation/AppTopbar.svelte';
  import '$lib/components/kontraktsbord/mockup.css';
  let { children }: { children: Snippet } = $props();
</script>

<div class="demo-order-shell">
  <AppTopbar
    projectName="Operatunnelen — Parsell 3"
    projectHref="/mockup/oversikt"
    caseLabel="Endringsordre · Demo"
    role="BH"
    lockedRole
    onrolechange={() => {}}
  />
  <p class="demo-note">Demo med eksempelsaker. Endringsordrer lagres bare i denne nettleseren.</p>
  <main>{@render children()}</main>
</div>

<style>
  .demo-order-shell {
    height: 100dvh;
    display: flex;
    flex-direction: column;
    background: var(--canvas);
    color: var(--ink);
  }
  .demo-note {
    padding: 10px 24px;
    background: var(--info-bg);
    border-bottom: var(--rule);
    color: var(--ink-3);
    font-size: 12px;
  }
  main {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }
  @media print {
    .demo-order-shell {
      height: auto;
      display: block;
    }
    .demo-order-shell :global(.app-topbar) {
      display: none;
    }
    main {
      overflow: visible;
    }
    .demo-note {
      padding: 8px 0;
    }
  }
</style>
