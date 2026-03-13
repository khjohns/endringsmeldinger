<script lang="ts">
  import type { SporType, SakState } from '$lib/types/timeline';
  import { getPartsNavn } from '$lib/utils/partsNavn';
  import { isAwaitingResponse } from '$lib/utils/sporStatus';

  interface Props {
    sporType: SporType;
    state: SakState;
    href?: string | null;
    actionLabel?: string;
    urgent?: boolean;
  }

  let {
    sporType,
    state,
    href = null,
    actionLabel: overrideLabel,
    urgent = false,
  }: Props = $props();

  const trackState = $derived(state[sporType]);

  // Show when the track is awaiting a response (BH must act)
  const isAwaiting = $derived(isAwaitingResponse(trackState.status));

  const expectedActorName = $derived(getPartsNavn('BH', state.entreprenor, state.byggherre));

  // Revision label
  const revLabel = $derived.by(() => {
    const v = trackState.antall_versjoner;
    if (v <= 1) return '';
    return ` (Rev ${v - 1})`;
  });

  // Document reference
  const docRef = $derived.by(() => {
    if (sporType === 'grunnlag') return `grunnlag${revLabel}`;
    if (sporType === 'vederlag') return `vederlagskrav${revLabel}`;
    if (sporType === 'frist') return `fristkrav${revLabel}`;
    return '';
  });

  // Action label
  const actionLabel = $derived.by(() => {
    if (sporType === 'grunnlag') return 'Svar på grunnlag';
    if (sporType === 'vederlag') return 'Svar på krav';
    if (sporType === 'frist') return 'Svar på fristkrav';
    return 'Svar';
  });

  function handleClick(e: MouseEvent) {
    e.stopPropagation();
  }
</script>

{#if isAwaiting}
  <div class="avventer-rad" data-spor={sporType}>
    <div class="avventer-tekst">
      <span class="avventer-ikon" aria-hidden="true">◇</span>
      <span class="avventer-label">Forventet: {expectedActorName} svarer på {docRef}</span>
    </div>
    {#if href}
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
      <a class="avventer-pill" class:urgent {href} onclick={handleClick}>
        {overrideLabel ?? actionLabel} →
      </a>
    {/if}
  </div>
{/if}

<style>
  .avventer-rad {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
    padding-top: 8px;
    border-top: 1px dashed var(--color-wire);
  }

  .avventer-tekst {
    display: flex;
    align-items: baseline;
    gap: 6px;
    min-width: 0;
  }

  .avventer-ikon {
    color: var(--color-ink-muted);
    font-size: 10px;
    flex-shrink: 0;
    line-height: 1;
  }

  .avventer-label {
    font-family: var(--font-ui);
    font-size: 11px;
    color: var(--color-ink-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .avventer-pill {
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 500;
    color: var(--color-ink-secondary);
    text-decoration: none;
    padding: 3px 10px;
    border: 1px solid var(--color-wire-strong);
    border-radius: var(--radius-sm);
    background: var(--color-canvas);
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    transition:
      color 150ms ease,
      border-color 150ms ease,
      background 150ms ease;
  }

  .avventer-pill:hover {
    color: var(--color-vekt);
    border-color: var(--color-vekt);
    background: var(--color-felt-hover);
  }

  .avventer-pill.urgent {
    color: var(--color-score-low);
    border-color: var(--color-score-low);
    font-weight: 600;
  }

  .avventer-pill.urgent:hover {
    background: var(--color-score-low-bg);
  }
</style>
