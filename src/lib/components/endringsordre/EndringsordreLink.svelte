<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRight, FileText, RotateCw } from 'lucide-svelte';
  import { apiFetch } from '$lib/api/client';
  import { resolve } from '$app/paths';
  import type { EOStatus, SakState } from '$lib/types/timeline';

  let {
    state: sak,
    projectId,
    role,
  }: {
    state: SakState;
    projectId: string;
    role: 'BH' | 'TE';
  } = $props();

  interface LinkedOrder {
    eo_sak_id: string;
    eo_nummer: string;
    dato_utstedt?: string;
    status: EOStatus;
  }

  let orders = $state<LinkedOrder[]>([]);
  let loading = $state(true);
  let loaded = $state(false);
  let failed = $state(false);
  let controller: AbortController | undefined;

  const statusLabels: Record<EOStatus, string> = {
    utkast: 'Utkast',
    utstedt: 'Utstedt',
    akseptert: 'Akseptert',
    bestridt: 'Bestridt',
    revidert: 'Revidert',
  };

  const hasClaim = $derived(
    (!!sak.vederlag.metode && ['godkjent', 'laast'].includes(sak.vederlag.status)) ||
      (sak.frist.krevd_dager != null && ['godkjent', 'laast'].includes(sak.frist.status))
  );
  const canIssue = $derived(
    role === 'BH' &&
      (!sak.sakstype || sak.sakstype === 'standard') &&
      sak.kan_utstede_eo &&
      hasClaim
  );

  async function loadOrders() {
    controller?.abort();
    const requestController = new AbortController();
    controller = requestController;
    loading = true;
    loaded = false;
    failed = false;
    try {
      const result = await apiFetch<{ success: boolean; endringsordrer: LinkedOrder[] }>(
        `/api/endringsordre/by-relatert/${encodeURIComponent(sak.sak_id)}`,
        {
          headers: { 'X-Project-ID': projectId },
          signal: requestController.signal,
        }
      );
      if (requestController.signal.aborted) return;
      if (!result.success || !Array.isArray(result.endringsordrer))
        throw new Error('Kunne ikke hente endringsordrer.');
      orders = result.endringsordrer;
      loaded = true;
    } catch {
      if (!requestController.signal.aborted) failed = true;
    } finally {
      if (!requestController.signal.aborted) loading = false;
    }
  }

  onMount(() => {
    void loadOrders();
    return () => controller?.abort();
  });
</script>

{#if failed}
  <div class="eo-banner" role="alert">
    <FileText size={17} aria-hidden="true" />
    <p>Tilknyttede endringsordrer kunne ikke lastes.</p>
    <button type="button" onclick={loadOrders}>
      <RotateCw size={14} aria-hidden="true" /> Prøv igjen
    </button>
  </div>
{:else if loaded && orders.length}
  <section class="eo-banner" aria-label="Tilknyttede endringsordrer">
    <FileText size={17} aria-hidden="true" />
    <div class="eo-content">
      <strong>Inngår i {orders.length === 1 ? 'endringsordre' : 'endringsordrer'}</strong>
      <ul>
        {#each orders as order (order.eo_sak_id)}
          <li>
            <a
              href={resolve('/[prosjektId]/[sakId]', {
                prosjektId: projectId,
                sakId: order.eo_sak_id,
              })}
              aria-label={`Åpne endringsordre ${order.eo_nummer}`}
              ><span class="order-number">{order.eo_nummer}</span>
              <span class="order-status">{statusLabels[order.status] ?? 'Registrert'}</span>
              <ArrowRight size={14} aria-hidden="true" /></a
            >
          </li>
        {/each}
      </ul>
    </div>
  </section>
{:else if loaded && canIssue}
  <div class="eo-banner">
    <FileText size={17} aria-hidden="true" />
    <div class="eo-content">
      <strong>Kravene er avklart</strong>
      <p>Formaliser enigheten i en endringsordre. Flere avklarte KOE-saker kan tas med.</p>
    </div>
    <a
      class="issue-link"
      href={resolve(
        `/${encodeURIComponent(projectId)}/endringsordre/ny?koe=${encodeURIComponent(sak.sak_id)}`
      )}
    >
      Utsted endringsordre <ArrowRight size={14} aria-hidden="true" />
    </a>
  </div>
{:else if loading && canIssue}
  <p class="loading" role="status">Henter tilknyttede endringsordrer …</p>
{/if}

<style>
  .eo-banner {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 16px;
    padding: 14px 18px;
    border: var(--rule-strong);
    border-radius: 12px;
    background: var(--surface-warm);
    color: var(--ink-2);
    font-size: 12px;
    line-height: 1.5;
  }
  .eo-content {
    flex: 1;
    min-width: 180px;
  }
  strong {
    display: block;
    color: var(--ink);
    font-size: 13px;
    font-weight: 600;
  }
  p {
    margin: 0;
  }
  strong + p {
    margin-top: 3px;
  }
  ul {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 20px;
    padding: 0;
    margin: 6px 0 0;
    list-style: none;
  }
  a,
  button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--brand);
    font-size: 12px;
    font-weight: 600;
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .order-number {
    font-family: var(--font-mono);
  }
  .order-status {
    color: var(--ink-3);
    font-weight: 400;
  }
  .issue-link {
    padding: 8px 0;
  }
  button {
    margin-left: auto;
    padding: 8px 10px;
    background: var(--surface);
    border: var(--rule-strong);
    border-radius: 6px;
    cursor: pointer;
  }
  a:focus-visible,
  button:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 3px;
  }
  .loading {
    margin: 0 0 16px;
    color: var(--ink-3);
    font-size: 12px;
  }
</style>
