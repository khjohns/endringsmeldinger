<script lang="ts">
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { ArrowLeft, Plus, Printer } from 'lucide-svelte';
  import EndringsordreDocument from '$lib/components/endringsordre/EndringsordreDocument.svelte';
  import { loadDemoOrders, demoEOCandidates, type DemoOrder } from '$lib/mocks/endringsordre';
  import { demoScenarioIds } from '$lib/mocks/projectOverview';
  let orders = $state<DemoOrder[]>([]);
  let loaded = $state(false);
  const order = $derived(orders.find((o) => o.sakId === page.params.sakId));
  const sources = demoEOCandidates.map((c) => ({ id: c.sak_id, title: c.tittel }));
  const caseHref = (id: string): `/${string}` =>
    `/mockup?scenario=${encodeURIComponent(demoScenarioIds[id] ?? '')}&rolle=BH&spor=ansvar`;
  onMount(() => {
    orders = loadDemoOrders();
    loaded = true;
  });
</script>

<svelte:head
  ><title>{order?.data.eo_nummer ?? 'Endringsordre'} · Demo — Kontraktsbordet</title></svelte:head
>
<div class="demo-document">
  <nav aria-label="Endringsordre">
    <a href={resolve('/mockup/oversikt')}><ArrowLeft size={16} />Krav og endringer</a><a
      href={resolve('/mockup/endringsordre/ny')}><Plus size={16} />Ny endringsordre</a
    >{#if order}<button onclick={() => window.print()}
        ><Printer size={16} />Skriv ut / lagre PDF</button
      >{/if}
  </nav>
  {#if order}<EndringsordreDocument
      data={order.data}
      projectId="P001"
      projectName="Operatunnelen — Parsell 3"
      {sources}
      {caseHref}
    />
  {:else if loaded}<p role="status">
      Denne demoordren finnes ikke i nettleseren. Opprett en ny endringsordre for å prøve flyten.
    </p>
  {:else}<p role="status">Henter endringsordre …</p>{/if}
</div>

<style>
  .demo-document {
    max-width: 960px;
    margin: auto;
    padding: 24px 24px 48px;
  }
  nav {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 24px;
  }
  nav a,
  nav button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--brand);
    cursor: pointer;
  }
  nav button {
    margin-left: auto;
    border: var(--rule-strong);
    padding: 9px 12px;
    border-radius: 6px;
    background: var(--surface);
  }
  a:focus-visible,
  button:focus-visible {
    outline: 2px solid var(--brand);
    outline-offset: 3px;
  }
  @media (max-width: 600px) {
    .demo-document {
      padding: 20px 12px 48px;
    }
  }
  @media print {
    nav {
      display: none;
    }
    .demo-document {
      max-width: none;
      padding: 0;
    }
  }
</style>
