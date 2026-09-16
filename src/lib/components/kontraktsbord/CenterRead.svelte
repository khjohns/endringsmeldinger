<script lang="ts">
  import { ArrowLeft } from 'lucide-svelte';
  import { getCaseWorkspace } from '$lib/kontraktsbord/context.svelte';
  const store = getCaseWorkspace();
  import { fmt } from './utils.js';
  import { getEventTypeLabel } from '$lib/constants/eventTypeLabels.js';
  import { formatDateTimeNorwegian } from '$lib/utils/dateFormatters.js';
  import SendteVarsler from './SendteVarsler.svelte';
  import Stamp from './Stamp.svelte';
  import GrunnlagOverview from './GrunnlagOverview.svelte';
  import VederlagOverview from './VederlagOverview.svelte';
  import FristOverview from './FristOverview.svelte';
  import type { SporKey } from './types.js';
  import type { TimelineEvent } from '$lib/types/timeline';

  let {
    sel,
    activeEvent = null,
    onform,
    onbacktonow,
  }: {
    sel: SporKey;
    activeEvent?: TimelineEvent | null;
    onform: (key: SporKey) => void;
    onbacktonow?: () => void;
  } = $props();

  const display = $derived(store.display(sel));
  const isSub = $derived(display.isSubsidiary);
</script>

{#if activeEvent}
  <!-- Historikk snapshot-modus -->
  <div class="read-content">
    <div class="snap-banner">
      <button class="snap-back-btn" onclick={() => onbacktonow?.()}>
        <ArrowLeft size={13} /> Tilbake til nåtid
      </button>
      <span class="snap-date font-mono"
        >{activeEvent.time ? formatDateTimeNorwegian(activeEvent.time) : ''}</span
      >
    </div>

    <div class="snap-event-card">
      <div class="snap-event-header">
        <div
          class="snap-actor-badge font-mono"
          style:background={activeEvent.actorrole === 'TE' ? 'var(--brand)' : 'var(--surface)'}
          style:color={activeEvent.actorrole === 'TE' ? 'white' : 'var(--ink)'}
          style:border-color={activeEvent.actorrole === 'TE' ? 'var(--brand)' : 'var(--ink-3)'}
        >
          {activeEvent.actorrole ?? '?'}
        </div>
        <div class="snap-event-meta">
          <div class="snap-event-type">
            {getEventTypeLabel(activeEvent.type?.replace('no.oslo.koe.', '') ?? '')}
          </div>
          <div class="snap-event-actor">{activeEvent.actor ?? ''}</div>
        </div>
        {#if activeEvent.spor}
          <span class="font-mono snap-spor-badge">{activeEvent.spor}</span>
        {/if}
      </div>

      {#if activeEvent.summary}
        <p class="snap-summary">{activeEvent.summary}</p>
      {/if}

      {#if activeEvent.data && typeof activeEvent.data === 'object'}
        {@const d = activeEvent.data as unknown as Record<string, unknown>}
        {#if d.varsler && typeof d.varsler === 'object'}
          {#each Object.entries(d.varsler) as [varselKind, tekst] (varselKind)}
            {#if typeof tekst === 'string'}<p class="snap-detail-text">{tekst}</p>{/if}
          {/each}
        {/if}
        {#if d.beskrivelse}
          <div class="snap-detail-section">
            <div class="snap-detail-label">Beskrivelse</div>
            <p class="snap-detail-text">{d.beskrivelse}</p>
          </div>
        {/if}
        {#if d.begrunnelse}
          <div class="snap-detail-section">
            <div class="snap-detail-label">Begrunnelse</div>
            <p class="snap-detail-text">{d.begrunnelse}</p>
          </div>
        {/if}
        {#if d.endrings_begrunnelse}
          <div class="snap-detail-section">
            <div class="snap-detail-label">Endringsbegrunnelse</div>
            <p class="snap-detail-text">{d.endrings_begrunnelse}</p>
          </div>
        {/if}
        {#if d.krevd_belop != null}
          <div class="snap-detail-section">
            <div class="snap-detail-label">Krevd beløp</div>
            <div class="font-mono snap-detail-value">{fmt(d.krevd_belop as number)},-</div>
          </div>
        {/if}
        {#if d.krevd_dager != null}
          <div class="snap-detail-section">
            <div class="snap-detail-label">Krevd fristforlengelse</div>
            <div class="font-mono snap-detail-value">{d.krevd_dager} dager</div>
          </div>
        {/if}
      {/if}
    </div>
  </div>
{:else}
  <div class="read-content">
    <!-- Section heading -->
    <div class="section-heading">
      <div class="heading-row">
        <h2 class="heading-text">
          {sel === 'vederlag'
            ? 'Krav om vederlagsjustering'
            : sel === 'frist'
              ? 'Krav om fristforlengelse'
              : display.label}
        </h2>
        {#if isSub}
          <Stamp variant="green" small flat>Subsidiært</Stamp>
        {/if}
      </div>
      <div class="heading-underline" class:underline-green={isSub}></div>
    </div>

    <!-- Subsidiær notice -->
    {#if isSub && !display.isWithdrawn}
      <div class="sub-notice-top">
        <div class="sub-diamond-inline"></div>
        <span class="sub-notice-top-text">
          Ansvarsgrunnlaget er bestridt. {store.bhNavn}s posisjon på dette sporet er subsidiær —
          betinget av at ansvar foreligger.
        </span>
      </div>
    {/if}

    <!-- Trukket-visning -->
    {#if display.isWithdrawn}
      <div class="withdrawn-card">
        <div class="withdrawn-header">
          <Stamp variant="avslag" small>Trukket</Stamp>
          {#if display.withdrawnViaGrunnlag}
            <span class="withdrawn-via">Trukket via ansvarsgrunnlaget</span>
          {/if}
        </div>
        {#if display.withdrawnReason}
          <p class="withdrawn-reason">{display.withdrawnReason}</p>
        {:else}
          <p class="withdrawn-reason withdrawn-no-reason">Ingen begrunnelse oppgitt.</p>
        {/if}
      </div>
    {:else if sel === 'ansvar'}
      <SendteVarsler
        varsler={[...(store.sak.vederlag.varsler ?? []), ...(store.sak.frist.varsler ?? [])].filter(
          (v) =>
            store.timeline.some((e) => e.id === v.event_id && e.type.endsWith('grunnlag_opprettet'))
        )}
      />
      <GrunnlagOverview onform={() => onform(sel)} />
    {:else if sel === 'vederlag'}
      <SendteVarsler varsler={store.sak.vederlag.varsler} />
      {#if !store.sak.vederlag.metode}
        <p>
          {store.sak.vederlag.varsler?.length
            ? 'Varslet – ikke spesifisert'
            : 'Vederlagskrav er ikke varslet i systemet.'}
        </p>
        <p>Beløp og beregningsmetode kan spesifiseres når beregningsgrunnlaget foreligger.</p>
      {:else}
        <VederlagOverview onform={() => onform(sel)} />
      {/if}
    {:else if sel === 'frist'}
      <SendteVarsler varsler={store.sak.frist.varsler} />
      <FristOverview onform={() => onform(sel)} />
    {/if}
  </div>
{/if}

<style>
  .read-content {
    width: 100%;
    padding: 28px;
  }

  /* ── Section heading ── */
  .section-heading {
    margin-bottom: 24px;
  }
  .heading-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .heading-text {
    font-size: 30px;
    font-weight: 700;
    line-height: 36px;
    letter-spacing: -0.02em;
  }
  .heading-underline {
    display: none;
  }
  .heading-underline.underline-green {
    background: var(--green);
  }

  /* ── Subsidiær notice ── */
  .sub-notice-top {
    display: flex;
    align-items: flex-start;
    gap: 11px;
    padding: 11px 14px;
    background: var(--green-bg);
    border: 1px solid var(--green-border);
    border-radius: 12px;
    margin-bottom: 24px;
  }
  .sub-diamond-inline {
    width: 11px;
    height: 11px;
    min-width: 11px;
    background: var(--green);
    transform: rotate(45deg);
    margin-top: 3px;
  }
  .sub-notice-top-text {
    font-size: 12px;
    line-height: 1.625;
    color: var(--ink-2);
  }

  /* ── Withdrawn ── */
  .withdrawn-card {
    padding: 24px;
    background: var(--danger-bg);
    border: 1px solid var(--danger-border);
    border-radius: 4px;
  }
  .withdrawn-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }
  .withdrawn-via {
    font-size: 13px;
    color: var(--ink-3);
  }
  .withdrawn-reason {
    font-size: 16px;
    line-height: 1.6;
    color: var(--ink-2);
  }
  .withdrawn-no-reason {
    color: var(--ink-4);
  }

  /* ── Historikk snapshot ── */
  .snap-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    background: var(--warning-bg);
    border: 1px solid var(--warning);
    border-radius: 4px;
    margin-bottom: 24px;
    animation: dropIn 0.15s ease-out;
  }
  .snap-back-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    font-size: 13px;
    font-weight: 600;
    font-family: var(--font-sans);
    color: var(--warning);
    background: none;
    border: 1px solid var(--warning);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .snap-back-btn:hover {
    background: var(--warning-bg);
    color: var(--ink);
  }
  .snap-date {
    font-size: 12px;
    font-weight: 600;
    color: var(--warning);
  }
  .snap-event-card {
    background: var(--surface);
    border: var(--rule);
    border-radius: 4px;
    padding: 24px;
    animation: fadeUp 0.2s ease-out;
  }
  .snap-event-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }
  .snap-actor-badge {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    border: 1.5px solid;
    border-radius: 4px;
    flex-shrink: 0;
  }
  .snap-event-meta {
    flex: 1;
  }
  .snap-event-type {
    font-size: 16px;
    font-weight: 700;
  }
  .snap-event-actor {
    font-size: 13px;
    color: var(--ink-3);
  }
  .snap-spor-badge {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 3px 8px;
    background: var(--surface-inset);
    border: var(--rule-subtle);
    border-radius: 2px;
    color: var(--ink-3);
  }
  .snap-summary {
    font-size: 16px;
    line-height: 1.65;
    color: var(--ink-2);
    margin-bottom: 20px;
  }
  .snap-detail-section {
    padding-top: 16px;
    border-top: var(--rule-subtle);
    margin-top: 16px;
  }
  .snap-detail-label {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink-3);
    margin-bottom: 8px;
  }
  .snap-detail-text {
    font-size: 16px;
    line-height: 1.65;
    color: var(--ink-2);
    max-width: 62ch;
  }
  .snap-detail-value {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  /* ── Mobile ── */
  @media (max-width: 768px) {
    .read-content {
      padding: 16px 16px 120px;
    }
    .heading-text {
      font-size: 20px;
    }
  }
</style>
