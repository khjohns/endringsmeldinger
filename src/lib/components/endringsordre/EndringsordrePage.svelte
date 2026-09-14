<script lang="ts">
  import { resolve } from '$app/paths';
  import { onMount } from 'svelte';
  import { Printer, ArrowLeft } from 'lucide-svelte';
  import AppTopbar from '$lib/components/navigation/AppTopbar.svelte';
  import EndringsordreDocument from './EndringsordreDocument.svelte';
  import { fetchEOContext } from '$lib/api/endringsordre';
  import { getEventTypeLabel } from '$lib/constants/eventTypeLabels';
  import { formatDateTimeNorwegian } from '$lib/utils/formatters';
  import type { CaseContextResponse } from '$lib/types/api';
  import type { SakState } from '$lib/types/timeline';
  import type { Role } from '$lib/components/kontraktsbord/types';
  import '$lib/components/kontraktsbord/theme.css';

  let {
    response,
    projectId,
    projectName,
    role,
    onrolechange,
  }: {
    response: CaseContextResponse;
    projectId: string;
    projectName: string;
    role: Role;
    onrolechange: (role: Role) => void;
  } = $props();
  let related = $state<Record<string, SakState>>({});
  let error = $state('');
  const data = $derived(response.state.endringsordre_data);
  const sources = $derived(
    Object.values(related).map((s) => ({ id: s.sak_id, title: s.sakstittel }))
  );
  const history = $derived(
    [...response.timeline].sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
  );
  async function loadRelated() {
    error = '';
    try {
      related = (await fetchEOContext(projectId, response.state.sak_id)).sak_states;
    } catch {
      error = 'Titlene til de tilknyttede KOE-sakene kunne ikke lastes.';
    }
  }
  onMount(() => {
    if (data?.relaterte_koe_saker.length) void loadRelated();
  });
</script>

<div class="eo-page">
  <div class="navigation">
    <AppTopbar
      {projectName}
      projectHref={`/${encodeURIComponent(projectId)}`}
      caseLabel={data?.eo_nummer ?? 'Endringsordre'}
      {role}
      {onrolechange}
    />
  </div>
  <main>
    <div class="toolbar">
      <a href={resolve('/[prosjektId]', { prosjektId: projectId })}
        ><ArrowLeft size={16} />Krav og endringer</a
      ><button onclick={() => window.print()}><Printer size={16} />Skriv ut / lagre PDF</button>
    </div>
    {#if data}
      <div class="document-layout">
        <EndringsordreDocument {data} {projectId} {projectName} {sources} />
        <aside aria-label="Endringsordrens historikk">
          <p class="eyebrow">Saksinformasjon</p>
          <h2>Historikk</h2>
          <p class="help">
            Endringsordren er registrert i prosjektet. Dokumentet viser innholdet i gjeldende
            revisjon.
          </p>
          {#if error}<p role="alert" class="error">{error}</p>
            <button onclick={loadRelated}>Prøv igjen</button>{/if}
          <ol>
            {#each history as event (event.id)}<li>
                <strong
                  >{event.summary ||
                    getEventTypeLabel(event.type.replace('no.oslo.koe.', ''))}</strong
                ><span>{event.time ? formatDateTimeNorwegian(event.time) : ''}</span><span
                  >{event.actor}</span
                >
              </li>{/each}
          </ol>
        </aside>
      </div>
    {:else}<p role="alert">Endringsordren mangler dokumentdata.</p>{/if}
  </main>
</div>

<style>
  .eo-page {
    height: 100dvh;
    display: flex;
    flex-direction: column;
    background: var(--canvas);
    color: var(--ink);
    font-family: var(--font-sans);
  }
  main {
    min-height: 0;
    flex: 1;
    overflow-y: auto;
    padding: 24px 32px 64px;
  }
  .toolbar {
    max-width: 1100px;
    margin: 0 auto 24px;
    display: flex;
    justify-content: space-between;
    gap: 16px;
  }
  .toolbar a,
  button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--brand);
    cursor: pointer;
  }
  button {
    border: var(--rule-strong);
    padding: 9px 12px;
    border-radius: 6px;
    background: var(--surface);
  }
  .document-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 260px;
    gap: 24px;
    max-width: 1100px;
    margin: auto;
    align-items: start;
  }
  aside {
    background: var(--surface);
    padding: 24px;
    border: var(--rule);
    border-radius: 12px;
  }
  .eyebrow {
    color: var(--ink-3);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 10px;
  }
  h2 {
    font-size: 18px;
    font-weight: 600;
    margin-top: 8px;
  }
  .help,
  .error {
    font-size: 12px;
    line-height: 1.7;
    margin-top: 16px;
    color: var(--ink-3);
  }
  .error {
    color: var(--danger);
  }
  ol {
    padding: 0;
    list-style: none;
  }
  li {
    display: grid;
    gap: 6px;
    padding: 20px 0;
    border-bottom: var(--rule);
  }
  li strong {
    font-size: 12px;
    font-weight: 600;
  }
  li span {
    font-size: 11px;
    color: var(--ink-3);
  }
  a:focus-visible,
  button:focus-visible {
    outline: 2px solid var(--brand);
    outline-offset: 3px;
  }
  @media (max-width: 900px) {
    .document-layout {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 600px) {
    main {
      padding: 20px 12px 48px;
    }
  }
  @media print {
    .navigation,
    .toolbar,
    aside {
      display: none;
    }
    .eo-page,
    main {
      height: auto;
      display: block;
      overflow: visible;
      background: white;
      padding: 0;
    }
    .document-layout {
      display: block;
      max-width: none;
    }
    :global(.project-shell) {
      height: auto !important;
      overflow: visible !important;
    }
    :global(.session-control) {
      display: none !important;
    }
  }
</style>
