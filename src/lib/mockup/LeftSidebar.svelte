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
      <div class="id-number">KOE-047</div>
      <span
        class="case-status"
        class:variant-default={statusStyle.variant === 'default'}
        class:variant-info={statusStyle.variant === 'info'}
        class:variant-success={statusStyle.variant === 'success'}
        class:variant-danger={statusStyle.variant === 'danger'}>{statusStyle.label}</span
      >
      <h2 class="case-title">Uforutsette grunnforhold, Fjell i byggegrop akse 1–3</h2>
    </div>
  </div>

  <div class="sidebar-tracks" style="padding-inline: {S.sm}px">
    {#each trackGroups as group, gi}
      {#if gi > 0}
        <div class="group-sep"></div>
      {/if}
      <div class="group-label">{group.label}</div>
      {#each group.tracks as t}
        {@const display = store.display(t.id)}
        {@const on = sel === t.id}
        {@const hasDraft = store.getUI(t.id).draft !== null}
        {@const contractLabel =
          t.id === 'ansvar' ? getHjemmelLabel(store.sak.grunnlag.underkategori) : null}
        <div
          class="m-row"
          class:on
          style="padding: {S.md}px; margin-bottom: 2px"
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
            {#if hasDraft}
              <Stamp variant="draft" small>Kladd</Stamp>
            {/if}
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
              <DualBar
                te={display.krevdValue!}
                sub={display.bhSubsidiaer!}
                prin={display.bhPrinsipal!}
              />
              <div class="gap-box">
                <span class="font-mono gap-label">GAP</span>
                <div class="gap-values">
                  <span class="font-mono gap-sub"
                    >s. {fmt(display.krevdValue! - display.bhSubsidiaer!)}{display.krevdUnit}</span
                  >
                  <span class="font-mono gap-prin"
                    >p. {fmt(display.krevdValue! - display.bhPrinsipal!)}{display.krevdUnit}</span
                  >
                </div>
              </div>
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
    width: 300px;
    flex-shrink: 0;
    border-right: 1px solid #d9d5cc;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    background: var(--surface);
  }
  .id-plate {
    background: #034b45;
    color: white;
    padding: 18px 20px 20px;
  }
  .sender {
    display: flex;
    align-items: center;
    gap: 9px;
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
    margin-top: 21px;
  }
  .id-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #c8e2dc;
    margin-bottom: 5px;
  }
  .id-number {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.05;
  }
  .case-status {
    display: inline-block;
    margin-top: 10px;
    padding: 3px 6px;
    background: #f5d578;
    color: #473a12;
    font-size: 10px;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: 0.01em;
    border-radius: 1px;
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
    margin-top: 20px;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.4;
    color: #ffffff;
  }
  .sidebar-tracks {
    padding-top: 28px;
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
  .row-name {
    font-size: 16px;
    font-weight: 600;
    line-height: 24px;
  }
  .row-update {
    font-size: 12px;
    line-height: 18px;
    color: var(--ink-3);
    margin-bottom: 8px;
  }
  .claimed {
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 8px;
  }
  .gap-box {
    margin-top: 8px;
    padding: 4px 12px;
    background: var(--surface-inset);
    border: var(--rule-subtle);
    border-radius: 4px;
    display: flex;
    justify-content: space-between;
  }
  .gap-label {
    font-size: 10px;
    font-weight: 700;
    color: var(--ink-4);
  }
  .gap-values {
    display: flex;
    gap: 12px;
  }
  .gap-sub {
    font-size: 11px;
    font-weight: 600;
    color: var(--green);
  }
  .gap-prin {
    font-size: 11px;
    font-weight: 600;
    color: var(--danger);
  }
  .binary-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
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
    width: 52px;
    height: 2px;
    background: #d59b2d;
    margin: 24px 24px 16px;
  }
  .group-label {
    font-size: 12px;
    line-height: 16px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--ink-3);
    padding: 0 8px;
    margin-bottom: 12px;
  }
  .group-sep {
    height: 1px;
    background: var(--rule-subtle);
    margin: 8px 12px 16px;
  }
  .exposure-heading {
    font-size: 12px;
    line-height: 16px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-bottom: 12px;
    color: var(--ink-3);
  }
  .exposure-box {
    padding: 12px;
    background: var(--surface-warm);
    border: var(--rule-subtle);
    border-radius: 4px;
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
