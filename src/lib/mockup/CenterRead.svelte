<script lang="ts">
  import { untrack } from 'svelte';
  import { XSquare, Pencil, BookOpen, ChevronUp, ArrowLeft } from 'lucide-svelte';
  import { store } from './store.svelte.js';
  import { fmt, BESTRIDT_LABEL } from './utils.js';
  import { getEventTypeLabel } from '$lib/constants/eventTypeLabels.js';
  import { formatDateTimeNorwegian } from '$lib/utils/dateFormatters.js';
  import Stamp from './Stamp.svelte';
  import SubStripe from './SubStripe.svelte';
  import CountUp from './CountUp.svelte';
  import type { SporKey, Role } from './types.js';
  import type { TimelineEvent } from '$lib/types/timeline';

  let {
    sel,
    role,
    activeEvent = null,
    onform,
    onbacktonow,
  }: {
    sel: SporKey;
    role: Role;
    activeEvent?: TimelineEvent | null;
    onform: (key: SporKey) => void;
    onbacktonow?: () => void;
  } = $props();

  const display = $derived(store.display(sel));
  const ui = $derived(store.getUI(sel));
  const isSub = $derived(display.isSubsidiary);

  let expandedSide: 'te' | 'bh' | null = $state(null);

  $effect(() => {
    sel;
    untrack(() => {
      expandedSide = null;
    });
  });

  const hasGap = $derived(
    !display.isBinary &&
      display.krevdValue != null &&
      display.bhPrinsipal != null &&
      display.krevdValue > display.bhPrinsipal
  );

  const gapPct = $derived(
    hasGap ? ((display.krevdValue! - display.bhPrinsipal!) / display.krevdValue!) * 100 : 0
  );
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
        <h2 class="heading-text">{display.label}{isSub ? ' (Sub.)' : ''}</h2>
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
    {:else if expandedSide === 'te'}
      <div class="card-full">
        <div class="reading-party">
          <span class="reading-party-name">{store.teNavn}</span>
        </div>
        <p class="reading-text">{display.teText}</p>
        <button class="back-btn" onclick={() => (expandedSide = null)}>
          <ChevronUp size={13} /> Tilbake til sammenligning
        </button>
      </div>
    {:else if expandedSide === 'bh'}
      <div class="card-full">
        <div class="reading-party">
          <span class="reading-party-name">{store.bhNavn}</span>
        </div>
        <p class="reading-text">{display.bhText}</p>
        <button class="back-btn" onclick={() => (expandedSide = null)}>
          <ChevronUp size={13} /> Tilbake til sammenligning
        </button>
      </div>
    {:else}
      <!-- Dual card view -->
      <div class="cards">
        <!-- TE card -->
        <div class="doc-panel te-panel">
          <div class="doc-sidebar te-sidebar">
            <div class="party-name">{store.teNavn}</div>
            {#if display.isBinary}
              <div class="font-mono te-position">{display.tePosition}</div>
              <div class="font-mono te-ref">{display.teRef}</div>
            {:else}
              <div class="font-mono te-value">
                <CountUp value={display.krevdValue!} suffix={display.krevdUnit} />
              </div>
            {/if}
          </div>
          <div class="doc-content">
            {#if display.teText.length > 200}
              <div class="truncated">
                <p class="argument-text">{display.teText}</p>
              </div>
              <button class="read-btn" onclick={() => (expandedSide = 'te')}>
                <BookOpen size={12} /> Les hele begrunnelsen
              </button>
            {:else}
              <p class="argument-text">{display.teText}</p>
            {/if}
          </div>
        </div>

        <!-- BH card -->
        {#if isSub}
          <SubStripe>
            {@render bhCard()}
          </SubStripe>
        {:else}
          {@render bhCard()}
        {/if}
      </div>

      <!-- Posisjonsoversikt -->
      {#if hasGap}
        <div class="gap-viz">
          <span class="font-mono gap-viz-label">Posisjonsoversikt</span>
          <div class="gap-bar">
            <div class="gap-seg-ok" style:width="{100 - gapPct}%"></div>
            <div class="gap-seg-gap" style:width="{gapPct}%"></div>
          </div>
          <div class="gap-labels">
            <span class="font-mono gap-label-ok"
              >{store.bhNavn}: {fmt(display.bhPrinsipal!)}{display.bhUnit}</span
            >
            <span class="font-mono gap-label-gap"
              >Gap: {fmt(display.krevdValue! - display.bhPrinsipal!)}{display.bhUnit}</span
            >
          </div>
        </div>
      {/if}

      <!-- Draft -->
      {#if ui.draft}
        <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
        <div class="draft-section draft-clickable" onclick={() => onform(sel)}>
          <div class="draft-header">
            <div class="draft-meta">
              <Stamp variant="draft" small>Kladd</Stamp>
              <Pencil size={12} style="color: var(--draft)" />
              <span class="draft-label">Internt — ikke synlig for motpart</span>
              {#if ui.draft.value}
                <span class="font-mono draft-value">{fmt(ui.draft.value)},-</span>
              {/if}
            </div>
          </div>
          <p class="draft-text">{ui.draft.text}</p>
        </div>
      {/if}
    {/if}
  </div>
{/if}

{#snippet bhCard()}
  <div class="doc-panel bh-panel" class:disputed={display.isDisputed}>
    <div class="doc-sidebar bh-sidebar">
      <div class="party-name">
        {store.bhNavn}
      </div>
      {#if display.isDisputed}
        <div class="rejected-badge" style:color="var(--danger)">
          <XSquare size={18} />
          <span class="rejected-text">Avslått</span>
        </div>
        <div class="sidebar-stamp">
          <Stamp variant="avslag" small>{BESTRIDT_LABEL}</Stamp>
        </div>
      {:else if display.isBinary}
        {@const bhVariant =
          store.sak.grunnlag.bh_resultat === 'godkjent'
            ? 'green'
            : store.sak.grunnlag.bh_resultat === 'frafalt'
              ? 'gold'
              : store.sak.grunnlag.bh_resultat === 'avslatt'
                ? 'avslag'
                : 'neutral'}
        <Stamp variant={bhVariant}>{display.bhPosition}</Stamp>
      {:else}
        <div class="font-mono bh-value">
          <CountUp value={display.bhSubsidiaer!} suffix={display.bhUnit} />
        </div>
      {/if}
    </div>
    <div class="doc-content">
      {#if display.bhText.length > 200}
        <div class="truncated">
          <p class="argument-text">
            {display.bhText}
          </p>
        </div>
        <button class="read-btn" onclick={() => (expandedSide = 'bh')}>
          <BookOpen size={12} /> Les hele begrunnelsen
        </button>
      {:else}
        <p class="argument-text">
          {display.bhText}
        </p>
      {/if}
    </div>
  </div>
{/snippet}

<style>
  .read-content {
    max-width: 840px;
    margin: 0 auto;
    padding: 32px 40px 120px;
  }

  /* ── Section heading ── */
  .section-heading {
    padding-bottom: 12px;
    margin-bottom: 24px;
  }
  .heading-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .heading-text {
    font-size: 24px;
    font-weight: 700;
    line-height: 32px;
  }
  .heading-underline {
    width: 52px;
    height: 3px;
    background: var(--accent);
    margin-top: 8px;
  }
  .heading-underline.underline-green {
    background: var(--green);
  }

  /* ── Subsidiær notice ── */
  .sub-notice-top {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 14px;
    background: var(--green-bg);
    border: 1px solid var(--green-border);
    border-radius: 4px;
    margin-bottom: 16px;
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
    font-size: 14px;
    line-height: 1.55;
    color: var(--ink-2);
  }

  /* ── Cards ── */
  .cards {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .doc-panel {
    display: flex;
    border: var(--rule);
    border-radius: 4px;
  }
  .te-panel {
    background: var(--surface);
  }
  .bh-panel {
    position: relative;
    background: var(--surface);
  }
  .bh-panel.disputed {
    background: var(--danger-bg);
    border-color: var(--danger-border);
  }
  .doc-sidebar {
    width: 195px;
    flex-shrink: 0;
    padding: 20px;
    border-right: var(--rule);
    display: flex;
    flex-direction: column;
  }
  .te-sidebar {
    background: var(--surface-warm);
  }
  .bh-sidebar {
    background: var(--surface-warm);
  }
  .bh-panel.disputed .bh-sidebar {
    background: var(--danger-bg);
    border-right-color: var(--danger-border);
  }
  .party-name {
    font-size: 14px;
    margin-bottom: 12px;
    font-weight: 600;
  }
  .bh-sidebar .party-name {
    font-weight: 500;
    color: var(--ink-2);
  }
  .bh-panel.disputed .party-name {
    font-weight: 700;
    color: var(--danger);
  }
  .te-position {
    font-size: 12px;
    font-weight: 700;
    background: var(--brand);
    color: white;
    padding: 4px 8px;
    border-radius: 2px;
    display: inline-block;
    width: fit-content;
    margin-bottom: 8px;
  }
  .te-ref {
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-2);
  }
  .te-value,
  .bh-value {
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1;
  }
  .rejected-badge {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .rejected-text {
    font-size: 18px;
    font-weight: 700;
  }
  .doc-content {
    flex: 1;
    padding: 20px 24px;
  }
  .argument-text {
    font-size: 18px;
    line-height: 1.75;
    color: var(--ink-2);
  }
  .bh-panel.disputed .argument-text {
    color: var(--danger);
  }
  .sidebar-stamp {
    margin-top: auto;
    padding-top: 16px;
  }

  /* ── Truncation ── */
  .truncated {
    max-height: 96px;
    overflow: hidden;
    -webkit-mask-image: linear-gradient(to bottom, black 40%, transparent 100%);
    mask-image: linear-gradient(to bottom, black 40%, transparent 100%);
  }
  .read-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    padding: 4px 0;
    font-size: 13px;
    font-weight: 600;
    font-family: var(--font-sans);
    color: var(--ink-3);
    background: none;
    border: none;
    cursor: pointer;
    transition: color 0.15s;
  }
  .read-btn:hover {
    color: var(--ink);
  }

  /* ── Full reading mode ── */
  .card-full {
    max-width: 720px;
    margin: 0 auto;
    padding: 32px 0;
    animation: fadeUp 0.15s ease-out;
  }
  .reading-party {
    margin-bottom: 16px;
  }
  .reading-party-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--ink-2);
  }
  .reading-text {
    font-size: 18px;
    line-height: 1.75;
    max-width: 62ch;
  }
  .back-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 24px;
    padding: 6px 12px;
    font-size: 13px;
    font-weight: 600;
    font-family: var(--font-sans);
    color: var(--ink-2);
    background: var(--surface);
    border: var(--rule);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .back-btn:hover {
    border-color: var(--ink-3);
    color: var(--ink);
  }

  /* ── Posisjonsoversikt ── */
  .gap-viz {
    padding: 8px 16px;
    background: var(--surface-inset);
    border-radius: 4px;
    margin-top: 12px;
  }
  .gap-viz-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--ink-3);
    display: block;
    margin-bottom: 8px;
  }
  .gap-bar {
    display: flex;
    gap: 2px;
    height: 14px;
  }
  .gap-seg-ok {
    background: var(--green);
    opacity: 0.8;
    min-width: 8px;
    border-radius: 4px 0 0 4px;
  }
  .gap-seg-gap {
    background: var(--danger);
    opacity: 0.85;
    min-width: 8px;
    border-radius: 0 4px 4px 0;
  }
  .gap-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 6px;
  }
  .gap-label-ok {
    font-size: 11px;
    font-weight: 700;
    color: var(--green);
  }
  .gap-label-gap {
    font-size: 11px;
    font-weight: 700;
    color: var(--danger);
  }

  /* ── Draft ── */
  .draft-section {
    padding: 16px 24px;
    background: var(--draft-bg);
    border: 1.5px dashed var(--draft-border);
    border-radius: 4px;
    margin-top: 12px;
  }
  .draft-clickable {
    cursor: pointer;
    transition:
      border-color 0.15s,
      background 0.15s;
  }
  .draft-clickable:hover {
    border-color: var(--draft);
  }
  .draft-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
  .draft-meta {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .draft-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--draft);
  }
  .draft-value {
    font-size: 18px;
    font-weight: 700;
    color: var(--draft);
    margin-left: 8px;
  }
  .draft-text {
    font-size: 16px;
    line-height: 1.65;
    color: var(--draft);
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
    .doc-panel {
      flex-direction: column;
    }
    .doc-sidebar {
      width: 100%;
      padding: 12px 16px;
      border-right: none;
      border-bottom: var(--rule);
      flex-direction: row;
      align-items: center;
      gap: 12px;
    }
    .party-name {
      margin-bottom: 0;
    }
    .te-value,
    .bh-value {
      font-size: 18px;
    }
    .rejected-badge {
      gap: 6px;
    }
    .rejected-text {
      font-size: 14px;
    }
    .doc-content {
      padding: 16px;
    }
    .argument-text {
      font-size: 16px;
      line-height: 1.6;
    }
    .card-full {
      padding: 24px 0;
    }
    .reading-text {
      font-size: 16px;
      line-height: 1.6;
    }
    .gap-bar {
      flex-direction: column;
    }
    .gap-seg-ok,
    .gap-seg-gap {
      width: 100% !important;
      min-width: 0;
      border-radius: 4px;
    }
    .draft-section {
      padding: 16px;
    }
    .draft-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
    .draft-meta {
      flex-wrap: wrap;
      gap: 8px;
    }
  }
</style>
