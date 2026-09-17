<!--
  Change orders in internal approval: the document in the page, ApprovalPanel at its side.
  Approvers act here; the handler follows status and withdraws. The chain is never picked.
-->
<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { RefreshCw } from 'lucide-svelte';
  import EndringsordreDocument from './EndringsordreDocument.svelte';
  import EOApprovalPanel from './EOApprovalPanel.svelte';
  import {
    createEOApprovalWorkspace,
    type EOApprovalSource,
  } from '$lib/approval/eoApproval.svelte';
  import type { EOApprovalStatus } from '$lib/api/endringsordre';
  import { demoUsers } from '$lib/approval/types';
  import { requestToDocument } from '$lib/domain/endringsordre';
  import { formatDateNorwegian } from '$lib/utils/dateFormatters';

  let {
    source,
    projectId,
    projectName,
    issuedHref,
    newOrderHref,
    initialId = '',
  }: {
    source: EOApprovalSource;
    projectId: string;
    projectName: string;
    issuedHref: (sakId: string) => string;
    newOrderHref: string;
    initialId?: string;
  } = $props();

  const approvals = createEOApprovalWorkspace(untrack(() => source));
  let selectedId = $state(untrack(() => initialId));

  const labels: Record<EOApprovalStatus, string> = {
    til_godkjenning: 'Til godkjenning',
    returnert: 'Returnert',
    trukket: 'Trukket',
    godkjent: 'Godkjent',
    utstedelse_feilet: 'Utstedelse feilet',
    utstedt: 'Utstedt',
  };
  const waitsForMe = (p: (typeof approvals.packages)[number]) =>
    p.status === 'til_godkjenning' &&
    p.steps.find((s) => s.status === 'aktiv')?.id === approvals.actor;
  const packages = $derived(
    [...approvals.packages].reverse().sort((a, b) => Number(waitsForMe(b)) - Number(waitsForMe(a)))
  );
  const selected = $derived(packages.find((p) => p.id === selectedId) ?? packages[0]);

  onMount(() => void approvals.load());
</script>

<div class="eo-approval-page">
  <header class="heading">
    <div>
      <p class="eyebrow">Byggherrens interne behandling</p>
      <h1>Endringsordrer til godkjenning</h1>
      <p>Endringsordrer over saksbehandlerens fullmakt utstedes først etter siste godkjenning.</p>
    </div>
    <div class="tools">
      {#if approvals.isDemo}
        <label class="demo-actor">
          <span>Demo · vis som</span>
          <select
            value={approvals.actor}
            onchange={(e) => {
              selectedId = '';
              void approvals.setActor(e.currentTarget.value);
            }}
          >
            {#each demoUsers as user (user.id)}<option value={user.id}
                >{user.name} · {user.role}</option
              >{/each}
          </select>
        </label>
      {/if}
      <button class="text-button" disabled={approvals.busy} onclick={() => approvals.load()}
        ><RefreshCw size={15} />Oppdater status</button
      >
    </div>
  </header>

  {#if approvals.unconfigured}
    <p class="empty">
      Intern godkjenning er ikke konfigurert for {projectName}. Endringsordrer utstedes direkte.
    </p>
  {:else if approvals.error && !approvals.loaded}
    <p class="empty error" role="alert">{approvals.error}</p>
  {:else if approvals.loaded && !packages.length}
    <p class="empty">
      Ingen endringsordrer venter på deg.
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- the route passes a resolved path -->
      <a href={newOrderHref}>Ny endringsordre</a>
    </p>
  {:else if selected}
    <nav class="packages" aria-label="Endringsordrer">
      {#each packages as p (p.id)}
        <button
          class:chosen={p.id === selected.id}
          aria-current={p.id === selected.id}
          onclick={() => (selectedId = p.id)}
        >
          <strong>{p.request.eo_nummer}</strong>
          <span>{labels[p.status]}{waitsForMe(p) ? ' · venter på deg' : ''}</span>
          <small>{formatDateNorwegian(p.createdAt)}</small>
        </button>
      {/each}
    </nav>
    <div class="layout">
      {#key selected.id}
        <EndringsordreDocument
          data={requestToDocument(selected.request)}
          {projectId}
          {projectName}
          sources={selected.request.koe_sak_ids.map((id) => ({ id, title: id }))}
          preview
        />
        <aside>
          <EOApprovalPanel
            {approvals}
            request={selected.request}
            pkg={selected}
            {issuedHref}
            legacy={{ issue: async () => {}, sending: false, createdId: '' }}
          />
        </aside>
      {/key}
    </div>
  {/if}
</div>

<style>
  .eo-approval-page {
    max-width: 1180px;
    margin: 0 auto;
    padding: 36px 32px 64px;
    color: var(--ink);
    font-family: var(--font-sans);
  }
  .heading {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 24px;
  }
  .eyebrow {
    font-size: 10px;
    color: var(--ink-3);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 600;
  }
  h1 {
    font-size: 30px;
    font-weight: 650;
    letter-spacing: -0.8px;
    margin: 8px 0 10px;
  }
  .heading p:last-child {
    font-size: 14px;
    color: var(--ink-3);
  }
  .tools {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  .demo-actor {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: var(--ink-3);
  }
  select {
    padding: 7px 8px;
    color: var(--ink);
    background: var(--surface);
    border: var(--rule-strong);
    border-radius: 6px;
    font-size: 12px;
  }
  .text-button {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 0;
    background: transparent;
    color: var(--ink-3);
    padding: 8px;
    font: inherit;
    font-size: 12px;
    cursor: pointer;
    border-radius: 8px;
  }
  .text-button:hover:not(:disabled) {
    background: var(--surface-inset);
    color: var(--ink);
  }
  .packages {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    margin-bottom: 20px;
    padding-bottom: 4px;
  }
  .packages button {
    display: grid;
    gap: 3px;
    min-width: 170px;
    padding: 10px 14px;
    text-align: left;
    border: var(--rule);
    border-radius: 10px;
    background: var(--surface);
    color: var(--ink);
    font: inherit;
    cursor: pointer;
  }
  .packages .chosen {
    border: var(--rule-strong);
    box-shadow: inset 3px 0 var(--brand);
  }
  .packages strong {
    font-size: 13px;
  }
  .packages span {
    font-size: 12px;
    color: var(--ink-2);
  }
  .packages small {
    font-size: 11px;
    color: var(--ink-4);
  }
  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 28px;
    align-items: start;
  }
  aside {
    position: sticky;
    top: 24px;
  }
  .empty {
    padding: 40px;
    text-align: center;
    border: var(--rule);
    border-radius: 12px;
    background: var(--surface);
    color: var(--ink-3);
    font-size: 14px;
  }
  .empty a {
    color: var(--brand);
  }
  .error {
    color: var(--danger);
  }
  :is(button, a, select):focus-visible {
    outline: 2px solid var(--brand);
    outline-offset: 3px;
  }
  @media (max-width: 900px) {
    .layout {
      grid-template-columns: 1fr;
    }
    aside,
    aside :global(.approval-panel) {
      position: static;
    }
  }
  @media (max-width: 600px) {
    .eo-approval-page {
      padding: 24px 12px 48px;
    }
    h1 {
      font-size: 26px;
    }
  }
</style>
