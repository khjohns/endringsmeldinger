<script lang="ts">
  import type { SporType, SakState, TimelineEvent } from '$lib/types/timeline';
  import { beregnVarslingStatus } from '$lib/utils/varslingStatus';
  import { isAwaitingResponse } from '$lib/utils/sporStatus';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import SporkortHeader from './SporkortHeader.svelte';
  import SporkortData from './SporkortData.svelte';
  import SporkortHistorikk from './SporkortHistorikk.svelte';
  import AvventerRad from './AvventerRad.svelte';

  interface Props {
    sporType: SporType;
    state: SakState;
    events: TimelineEvent[];
    prosjektId: string;
    sakId: string;
    onFocusEvent?: (event: TimelineEvent | null) => void;
    focusedEvent?: TimelineEvent | null;
  }

  let {
    sporType,
    state: sakState,
    events,
    prosjektId,
    sakId,
    onFocusEvent,
    focusedEvent = null,
  }: Props = $props();

  // Expanded state for hendelseslogg — lives here so card can shift visually
  let loggExpanded = $state(false);

  function handleLoggToggle() {
    loggExpanded = !loggExpanded;
  }

  // Get the track state for this spor type
  const trackState = $derived(sakState[sporType]);

  // Compute varsling items for all tracks (header will filter per track)
  const varsling = $derived(beregnVarslingStatus(sakState));

  // Compute days since last event for passivitet check
  const daysSinceLastEvent = $derived.by(() => {
    if (!trackState.siste_oppdatert) return 0;
    const lastDate = new Date(trackState.siste_oppdatert);
    const now = new Date();
    return Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  });

  // Passivitet: grunnlag sent > 14 days without response
  const hasPassivitet = $derived(
    sporType === 'grunnlag' && sakState.grunnlag.status === 'sendt' && daysSinceLastEvent > 14
  );

  // User role — reactive via storage event from ActionBanner toggle
  let userRole = $state<'TE' | 'BH' | null>(
    browser ? (localStorage.getItem('koe-user-role') as 'TE' | 'BH' | null) : null
  );

  onMount(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'koe-user-role') userRole = e.newValue as 'TE' | 'BH' | null;
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  });

  // TE send label depends on track type
  const teSendLabel = $derived(sporType === 'grunnlag' ? 'Varsle' : 'Send krav');

  // Visual state computation
  type BorderVariant =
    | 'critical'
    | 'godkjent'
    | 'avslatt'
    | 'handling'
    | 'venter'
    | 'bortfalt'
    | 'default';

  interface CardVisualState {
    bgClass: string;
    borderClass: string;
    borderVariant: BorderVariant;
    action: { label: string; urgent: boolean } | null;
  }

  // Role-aware action: TE sends krav/varsel, BH responds
  function roleAction(
    teAction: { label: string; urgent: boolean } | null,
    bhAction: { label: string; urgent: boolean } | null
  ): { label: string; urgent: boolean } | null {
    if (userRole === 'TE') return teAction;
    if (userRole === 'BH') return bhAction;
    return null; // no role set → no action buttons
  }

  const visualState = $derived.by<CardVisualState>(() => {
    const status = trackState.status;

    // BH has already responded? Use "Endre svar" label
    const bhHarSvart = sporType === 'grunnlag' && sakState.grunnlag.bh_resultat !== undefined;

    // Passivitet overrides everything for grunnlag — BH must respond
    if (hasPassivitet) {
      return {
        bgClass: 'bg-critical',
        borderClass: 'border-critical',
        borderVariant: 'critical' as BorderVariant,
        action: roleAction(null, { label: bhHarSvart ? 'Endre svar' : 'Svar nå', urgent: true }),
      };
    }

    // Godkjent / låst — no actions
    if (status === 'godkjent' || status === 'laast') {
      return {
        bgClass: 'bg-default',
        borderClass: 'border-godkjent',
        borderVariant: 'godkjent' as BorderVariant,
        action: null,
      };
    }

    // Avslått — TE can consider forsering
    if (status === 'avslatt') {
      return {
        bgClass: 'bg-default',
        borderClass: 'border-avslatt',
        borderVariant: 'avslatt' as BorderVariant,
        action: roleAction({ label: 'Forsering?', urgent: false }, null),
      };
    }

    // Delvis godkjent / under forhandling — BH responds, TE can update
    if (status === 'delvis_godkjent' || status === 'under_forhandling') {
      return {
        bgClass: 'bg-default',
        borderClass: 'border-handling',
        borderVariant: 'handling' as BorderVariant,
        action: roleAction(
          { label: 'Oppdater', urgent: false },
          { label: bhHarSvart ? 'Endre svar' : 'Svar', urgent: false }
        ),
      };
    }

    // Sendt / under_behandling — BH should respond
    if (status === 'sendt' || status === 'under_behandling') {
      return {
        bgClass: 'bg-default',
        borderClass: 'border-venter',
        borderVariant: 'venter' as BorderVariant,
        action: roleAction(null, { label: bhHarSvart ? 'Endre svar' : 'Svar', urgent: false }),
      };
    }

    // Trukket — bortfalt
    if (status === 'trukket') {
      return {
        bgClass: 'bg-default',
        borderClass: 'border-bortfalt',
        borderVariant: 'bortfalt' as BorderVariant,
        action: null,
      };
    }

    // Default (utkast, ikke_relevant) — TE can send
    return {
      bgClass: 'bg-default',
      borderClass: 'border-venter',
      borderVariant: 'default' as BorderVariant,
      action: roleAction({ label: teSendLabel, urgent: false }, null),
    };
  });

  // --- Hendelse-kontekst: siste hendelse for dette sporet ---

  // Nyeste hendelse (med tid) — brukes for kontekstlinje og card-click
  const latestEvent = $derived.by(() => {
    const withTime = events.filter((e) => e.time);
    if (withTime.length === 0) return null;
    return withTime.reduce((a, b) =>
      new Date(b.time!).getTime() > new Date(a.time!).getTime() ? b : a
    );
  });

  const href = $derived(`/${prosjektId}/${sakId}/${sporType}`);

  // Action href: maps role + sporType to the correct send/svar route
  const actionHref = $derived.by(() => {
    if (!visualState.action) return null;
    const base = `/${prosjektId}/${sakId}`;

    if (userRole === 'TE') {
      if (sporType === 'grunnlag') return `${base}/grunnlag`;
      if (sporType === 'vederlag') return `${base}/send-vederlag`;
      if (sporType === 'frist') return `${base}/send-frist`;
    }
    if (userRole === 'BH') {
      if (sporType === 'grunnlag') return `${base}/svar-grunnlag`;
      if (sporType === 'vederlag') return `${base}/svar-vederlag`;
      if (sporType === 'frist') return `${base}/svar-frist`;
    }
    return null;
  });

  const isAwaiting = $derived(isAwaitingResponse(trackState.status));

  // AvventerRad always links to BH svar route
  const avventerHref = $derived.by(() => {
    const base = `/${prosjektId}/${sakId}`;
    if (sporType === 'grunnlag') return `${base}/svar-grunnlag`;
    if (sporType === 'vederlag') return `${base}/svar-vederlag`;
    if (sporType === 'frist') return `${base}/svar-frist`;
    return null;
  });

  const SPOR_NAMES: Record<SporType, string> = {
    grunnlag: 'Kontraktsforhold',
    vederlag: 'Vederlagskrav',
    frist: 'Fristkrav',
  };

  const STATUS_LABELS: Record<string, string> = {
    ikke_relevant: 'Ikke relevant',
    utkast: 'Utkast',
    sendt: 'Sendt',
    under_behandling: 'Under behandling',
    godkjent: 'Godkjent',
    delvis_godkjent: 'Delvis godkjent',
    avslatt: 'Avslått',
    under_forhandling: 'Under forhandling',
    trukket: 'Trukket',
    laast: 'Låst',
  };

  const ariaLabel = $derived(
    `${SPOR_NAMES[sporType]} — ${STATUS_LABELS[trackState.status] ?? trackState.status}`
  );

  function handleCardClick() {
    // Click on card opens preview panel with latest event
    if (latestEvent) {
      onFocusEvent?.(latestEvent);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === ' ') {
      // Toggle hendelseslogg on Space if there are 4+ events
      if (events.length >= 4) {
        e.preventDefault();
        handleLoggToggle();
      }
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCardClick();
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class="sporkort {visualState.bgClass} {visualState.borderClass}"
  class:sporkort-expanded={loggExpanded}
  data-spor={sporType}
  data-status={trackState.status}
  data-border={visualState.borderVariant}
  role="article"
  aria-label={ariaLabel}
  tabindex="0"
  onclick={handleCardClick}
  onkeydown={handleKeydown}
>
  <SporkortHeader {sporType} status={trackState.status} />

  <SporkortData
    {sporType}
    grunnlag={sporType === 'grunnlag' ? sakState.grunnlag : undefined}
    vederlag={sporType === 'vederlag' ? sakState.vederlag : undefined}
    frist={sporType === 'frist' ? sakState.frist : undefined}
    teNavn={sakState.entreprenor}
    bhNavn={sakState.byggherre}
  />

  <SporkortHistorikk
    {events}
    expanded={loggExpanded}
    onToggle={handleLoggToggle}
    {onFocusEvent}
    {focusedEvent}
    teNavn={sakState.entreprenor}
    bhNavn={sakState.byggherre}
  />

  <AvventerRad
    {sporType}
    state={sakState}
    href={avventerHref}
    actionLabel={visualState.action?.label}
    urgent={visualState.action?.urgent ?? false}
  />

  {#if !isAwaiting && visualState.action && actionHref}
    <div class="sporkort-action-rad">
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
      <a
        class="sporkort-action"
        href={actionHref}
        class:urgent={visualState.action.urgent}
        onclick={(e: MouseEvent) => e.stopPropagation()}
      >
        {visualState.action.label} →
      </a>
    </div>
  {/if}
</div>

<style>
  .sporkort {
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    padding: 8px 12px;
    cursor: pointer;
    transition:
      background 150ms ease,
      border-color 150ms ease;
    position: relative;
  }

  .sporkort:hover {
    background: var(--color-felt-hover);
    border-color: var(--color-wire-strong);
  }

  .sporkort-expanded {
    background: var(--color-felt-raised);
    border-color: var(--color-wire-strong);
  }

  .sporkort:focus-visible {
    outline: 2px solid var(--color-wire-focus);
    outline-offset: -2px;
  }

  .bg-default {
    background: var(--color-felt);
  }

  .bg-critical {
    background: var(--color-score-low-bg);
  }

  /* Left border variants (Handlingskant / Vektlinjen) */
  .border-critical {
    border-left: 2px solid var(--color-score-low);
    background: var(--color-score-low-bg);
  }

  .border-critical:hover {
    background: var(--color-score-low-bg);
  }

  .border-godkjent {
    border-left: 1px solid var(--color-score-high);
    opacity: 0.7;
  }

  .border-godkjent:hover {
    opacity: 1;
  }

  .border-avslatt {
    border-left: 2px solid var(--color-score-low);
  }

  .border-handling {
    border-left: 2px solid var(--color-vekt);
  }

  .border-venter {
    border-left: 1px solid var(--color-wire-strong);
  }

  .border-bortfalt {
    border-left: 1px dashed var(--color-ink-ghost);
  }

  .sporkort-action-rad {
    display: flex;
    justify-content: flex-end;
    margin-top: 2px;
    padding-top: 4px;
    border-top: 1px solid var(--color-wire);
  }

  .sporkort-action {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 500;
    color: var(--color-vekt);
    text-decoration: none;
    padding: 3px 10px;
    border: 1px solid color-mix(in srgb, var(--color-vekt) 30%, transparent);
    border-radius: var(--radius-sm);
    background: var(--color-vekt-bg);
    transition:
      border-color 150ms ease,
      background 150ms ease;
    cursor: pointer;
  }

  .sporkort-action:hover {
    border-color: var(--color-vekt);
    background: var(--color-vekt-bg-strong);
  }

  .sporkort-action.urgent {
    color: var(--color-score-low);
    border-color: var(--color-score-low);
    font-weight: 600;
  }

  .sporkort-action.urgent:hover {
    background: var(--color-score-low-bg);
  }

  .passivitet-warning {
    font-family: var(--font-ui);
    font-size: 11px;
    color: var(--color-score-low);
    margin-top: 4px;
  }

  @media (max-width: 1023px) {
    .sporkort {
      padding: 12px;
      border-radius: 0;
      overflow: hidden;
    }
  }
</style>
