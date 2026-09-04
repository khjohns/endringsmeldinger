<script lang="ts">
  import { store } from './store.svelte.js';
  import { S } from './data.js';
  import { fmt } from './utils.js';
  import { formatDateMedium } from '$lib/utils/formatters.js';
  import DualBar from './DualBar.svelte';
  import Stamp from './Stamp.svelte';
  import type { SporKey } from './types.js';
  import osloLogo from '../../../public/logos/Oslo-logo-hvit-RGB.png?inline';
  import { getHjemmelLabel } from '$lib/constants/categories.js';
  import { getOverordnetStatusStyle } from '$lib/constants/statusStyles.js';
  import { ChevronRight } from 'lucide-svelte';

  let {
    sel,
    subV,
    prinV,
    subF,
    prinF,
    onselect,
  }: {
    sel: SporKey;
    subV: number;
    prinV: number;
    subF: number;
    prinF: number;
    onselect: (key: SporKey) => void;
  } = $props();

  const trackGroups: { label: string; tracks: { id: SporKey; label: string }[] }[] = [
    {
      label: 'Kontraktsforhold',
      tracks: [{ id: 'ansvar', label: 'Ansvarsgrunnlag' }],
    },
    {
      label: 'Krav',
      tracks: [
        { id: 'vederlag', label: 'Vederlag' },
        { id: 'frist', label: 'Fristforlengelse' },
      ],
    },
  ];

  const statusStyle = $derived(getOverordnetStatusStyle(store.sak.overordnet_status));
</script>

<aside class="sidebar">
  <div class="id-plate">
    <div class="sender">
      <div class="oslo-logo" style:background-image={`url(${osloLogo})`} aria-hidden="true"></div>
      <div class="sender-name">
        <div>Oslo kommune</div>
        <div>Oslobygg</div>
      </div>
    </div>

    <div class="case-identity">
      <div class="id-label">Sak</div>
      <div class="case-topline">
        <div class="id-number">KOE-047</div>
        <span
          class="case-status"
          class:variant-default={statusStyle.variant === 'default'}
          class:variant-info={statusStyle.variant === 'info'}
          class:variant-success={statusStyle.variant === 'success'}
          class:variant-danger={statusStyle.variant === 'danger'}>{statusStyle.label}</span
        >
      </div>
      <h2 class="case-title">Uforutsette grunnforhold, Fjell i byggegrop akse 1–3</h2>
    </div>
  </div>

  <div class="sidebar-tracks">
    {#each trackGroups as group, gi}
      {#if gi > 0}
        <div class="group-sep"></div>
      {/if}
      <div class="group-label">{group.label}</div>
      {#each group.tracks as t}
        {@const display = store.display(t.id)}
        {@const on = sel === t.id}
        {@const hasDraft = store.getUI(t.id).draft !== null}
        {@const isUnansweredVederlag = t.id === 'vederlag' && !store.sak.vederlag.bh_resultat}
        {@const contractLabel =
          t.id === 'ansvar' ? getHjemmelLabel(store.sak.grunnlag.underkategori) : null}
        <div
          class="m-row"
          class:on
          onclick={() => onselect(t.id)}
          role="button"
          tabindex="0"
          onkeydown={(e) => {
            if (e.key === 'Enter') onselect(t.id);
          }}
        >
          <div class="row-header">
            <div class="row-label">
              <span class="row-name">{contractLabel || t.label}</span>
            </div>
            <div class="row-actions">
              {#if hasDraft}
                <Stamp variant="draft" small>Kladd</Stamp>
              {/if}
              {#if on}
                <ChevronRight
                  class="active-chevron"
                  size={15}
                  strokeWidth={2.25}
                  aria-hidden="true"
                />
              {/if}
            </div>
          </div>
          <div class="row-update">
            {#if display.antallVersjoner > 0 && display.sisteOppdatert}
              Oppdatert {formatDateMedium(display.sisteOppdatert)}
            {:else}
              Ikke påbegynt
            {/if}
          </div>

          {#if !display.isBinary}
            <div style="margin-bottom: {S.sm}px">
              <div class="font-mono claimed">
                Krevd: {fmt(display.krevdValue!)}{display.krevdUnit}
              </div>
              {#if isUnansweredVederlag}
                <div class="awaiting-response">Avventer byggherrens svar</div>
              {:else}
                <DualBar
                  te={display.krevdValue!}
                  sub={display.bhSubsidiaer!}
                  prin={display.bhPrinsipal!}
                />
                <div class="gap-box">
                  <span class="font-mono gap-label">GAP</span>
                  <div class="gap-values">
                    <span class="font-mono gap-sub"
                      >s. {fmt(
                        display.krevdValue! - display.bhSubsidiaer!
                      )}{display.krevdUnit}</span
                    >
                    <span class="font-mono gap-prin"
                      >p. {fmt(display.krevdValue! - display.bhPrinsipal!)}{display.krevdUnit}</span
                    >
                  </div>
                </div>
              {/if}
            </div>
          {:else}
            <div class="binary-row">
              <span class="font-mono binary-te"
                >{contractLabel ? display.teRef : display.tePosition}</span
              >
              <span class="font-mono binary-bh">{display.bhPosition}</span>
            </div>
          {/if}
        </div>
      {/each}
    {/each}
  </div>

  <div class="gold-sep"></div>

  <div style="padding: 0 {S.xxl}px {S.xxl}px">
    <div class="exposure-heading">Samlet eksponering</div>
    <div class="exposure-box">
      <div class="exposure-row">
        <span class="exposure-label" style="color: var(--green)">Subsidiært</span>
        <span class="font-mono exposure-value">{fmt(subV)},- + {subF} dager</span>
      </div>
      <div class="exposure-row">
        <span class="exposure-label" style="color: var(--danger)">Prinsipalt</span>
        <span class="font-mono exposure-value">{fmt(prinV)},- + {prinF} dager</span>
      </div>
    </div>
  </div>
</aside>

<style>
  .sidebar {
    width: var(--mockup-sidebar-width);
    flex-shrink: 0;
    border-right: 1px solid var(--sidebar-border);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    background: var(--sidebar-bg);
    color: var(--sidebar-text);
    /* Keep all shared component tokens legible when rendered in the dark rail. */
    --ink: var(--sidebar-text);
    --ink-2: var(--sidebar-text);
    --ink-3: var(--sidebar-muted);
    --ink-4: var(--sidebar-muted);
    --surface: var(--sidebar-raised);
    --surface-inset: rgba(255, 255, 255, 0.09);
  }
  .id-plate {
    background: var(--sidebar-bg);
    color: var(--sidebar-text);
    padding: 16px 16px 18px;
  }
  .sender {
    display: flex;
    align-items: center;
    gap: 9px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(24, 35, 29, 0.55);
  }
  .oslo-logo {
    width: 27px;
    height: 35px;
    flex: 0 0 27px;
    background-position: -22px -19px;
    background-repeat: no-repeat;
    background-size: 114px auto;
  }
  .sender-name {
    font-size: 11px;
    font-weight: 600;
    line-height: 1.35;
    letter-spacing: 0.01em;
  }
  .sender-name div + div {
    font-weight: 700;
  }
  .case-identity {
    margin-top: 24px;
  }
  .id-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--sidebar-muted);
    margin-bottom: 5px;
  }
  .id-number {
    font-size: 24px;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.05;
  }
  .case-topline {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .case-status {
    display: inline-block;
    padding: 3px 9px;
    background: #fff0a6;
    color: #5a4715;
    font-size: 10px;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: 0.01em;
    border-radius: 6px;
  }
  .case-status.variant-default {
    background: #d6d3cb;
    color: #2e2c28;
  }
  .case-status.variant-info {
    background: #bcd7e8;
    color: #0e2a3a;
  }
  .case-status.variant-success {
    background: #bfe3c4;
    color: #12351a;
  }
  .case-status.variant-danger {
    background: #f2b8b0;
    color: #48150e;
  }
  .case-title {
    margin-top: 8px;
    font-size: 12px;
    font-weight: 400;
    line-height: 1.4;
    color: var(--sidebar-muted);
  }
  .sidebar-tracks {
    padding: 10px 16px 16px;
  }
  .row-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .row-label {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .row-actions {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .active-chevron {
    color: var(--sidebar-accent-text);
    flex-shrink: 0;
  }
  .row-name {
    font-size: 12px;
    font-weight: 700;
    line-height: 18px;
  }
  .row-update {
    font-size: 12px;
    line-height: 16px;
    color: var(--sidebar-muted);
    margin-bottom: 6px;
  }
  .claimed {
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 8px;
  }
  .awaiting-response {
    padding: 7px 9px;
    font-size: 11px;
    line-height: 1.4;
    color: var(--sidebar-muted);
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(242, 247, 244, 0.08);
    border-radius: 6px;
  }
  .m-row {
    padding: 10px;
    margin-bottom: 8px;
    background: rgba(255, 255, 255, 0.035);
    border: 1px solid rgba(242, 247, 244, 0.07);
  }
  .m-row:not(.on) {
    opacity: 0.76;
  }
  .m-row:not(.on):hover {
    opacity: 1;
    background: rgba(255, 255, 255, 0.05);
  }
  .m-row.on {
    opacity: 1;
    background: var(--sidebar-raised);
    border-color: var(--sidebar-accent-text);
    box-shadow: inset 3px 0 0 var(--sidebar-accent-text);
  }
  .m-row.on .row-name {
    color: var(--sidebar-accent-text);
  }
  .gap-box {
    margin-top: 8px;
    padding: 4px 12px;
    background: rgba(255, 255, 255, 0.09);
    border: 1px solid rgba(242, 247, 244, 0.08);
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
  }
  .gap-label {
    font-size: 10px;
    font-weight: 700;
    color: var(--sidebar-muted);
  }
  .gap-values {
    display: flex;
    gap: 12px;
  }
  .gap-sub {
    font-size: 11px;
    font-weight: 600;
    color: #e79a94;
  }
  .gap-prin {
    font-size: 11px;
    font-weight: 600;
    color: #e79a94;
  }
  .binary-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0;
  }
  .binary-te {
    font-size: 12px;
    font-weight: 600;
  }
  .binary-bh {
    font-size: 12px;
    font-weight: 600;
    color: var(--danger);
  }
  .gold-sep {
    display: none;
  }
  .group-label {
    font-size: 10px;
    line-height: 16px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--sidebar-muted);
    padding: 0;
    margin-bottom: 10px;
  }
  .group-sep {
    height: 14px;
  }
  .exposure-heading {
    font-size: 12px;
    line-height: 16px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-bottom: 12px;
    color: var(--sidebar-muted);
  }
  .exposure-box {
    padding: 12px;
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(242, 247, 244, 0.1);
    border-radius: 10px;
  }
  .exposure-row {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }
  .exposure-row + .exposure-row {
    margin-top: 12px;
  }
  .exposure-label {
    font-size: 12px;
    font-weight: 700;
  }
  .exposure-value {
    font-size: 15px;
    font-weight: 700;
  }

  .sidebar :global(.stamp-draft) {
    color: var(--sidebar-text);
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(242, 247, 244, 0.18);
  }

  /* ── Mobile ── */
  @media (max-width: 768px) {
    .sidebar {
      width: 100%;
      border-right: none;
      overflow-y: auto;
    }
    .id-plate {
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .id-number {
      font-size: 24px;
    }
    .case-title {
      font-size: 16px;
    }
    .gap-values {
      gap: 8px;
    }
  }
</style>
