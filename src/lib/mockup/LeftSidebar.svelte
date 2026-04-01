<script lang="ts">
  import { ArrowRight } from 'lucide-svelte';
  import { DD, S } from './data.js';
  import { fmt, act } from './utils.js';
  import DualBar from './DualBar.svelte';
  import Stamp from './Stamp.svelte';
  import type { TrackKey, Role } from './types.js';

  let {
    sel,
    role,
    subV,
    prinV,
    subF,
    prinF,
    onselect,
    onform,
  }: {
    sel: TrackKey;
    role: Role;
    subV: number;
    prinV: number;
    subF: number;
    prinF: number;
    onselect: (key: TrackKey) => void;
    onform: (key: TrackKey) => void;
  } = $props();
</script>

<aside class="sidebar">
  <div class="id-plate">
    <div class="font-mono id-label">IDENTIFIKATOR</div>
    <div class="id-number">KOE-104</div>
    <div style="margin-top: {S.md}px">
      <Stamp variant="ochre" small flat>Venter</Stamp>
    </div>
  </div>

  <div style="padding: {S.xl}px {S.xxl}px {S.lg}px">
    <h2 class="font-serif case-title">Uforutsette grunnforhold: Fjell i byggegrop akse 1–3</h2>
  </div>

  <div style="padding: 0 {S.sm}px">
    {#each Object.entries(DD) as [k, dd]}
      {@const on = sel === k}
      <div
        class="m-row"
        class:on
        style="padding: {S.md}px; margin-bottom: 2px"
        onclick={() => onselect(k as TrackKey)}
        role="button"
        tabindex="0"
        onkeydown={(e) => {
          if (e.key === 'Enter') onselect(k as TrackKey);
        }}
      >
        <div class="row-header">
          <div class="row-label">
            <dd.icon size={14} style="color: var(--ink-3)" />
            <span class="row-name">{dd.num}. {dd.label}</span>
          </div>
          {#if dd.draftState === 'draft'}
            <Stamp variant="draft" small>Kladd</Stamp>
          {/if}
        </div>

        {#if dd.type === 'numeric'}
          <div style="margin-bottom: {S.sm}px">
            <div class="font-mono claimed">Krevd: {fmt(dd.te.value!)}{dd.te.unit}</div>
            <DualBar te={dd.te.value!} sub={dd.bh.subsidiaer!} prin={dd.bh.prinsipal!} />
            <div class="gap-box">
              <span class="font-mono gap-label">GAP</span>
              <div class="gap-values">
                <span class="font-mono gap-sub"
                  >s. {fmt(dd.te.value! - dd.bh.subsidiaer!)}{dd.te.unit}</span
                >
                <span class="font-mono gap-prin"
                  >p. {fmt(dd.te.value! - dd.bh.prinsipal!)}{dd.te.unit}</span
                >
              </div>
            </div>
          </div>
        {:else}
          <div class="binary-row">
            <span class="font-mono binary-te">{dd.te.position}</span>
            <span class="font-mono binary-bh">{dd.bh.position}</span>
          </div>
        {/if}

        <button
          class="btn btn-secondary btn-sm"
          style="width: 100%"
          onclick={(e) => {
            e.stopPropagation();
            onform(k as TrackKey);
          }}
        >
          {act(dd.draftState, role)}
          <ArrowRight size={12} />
        </button>
      </div>
    {/each}
  </div>

  <div class="ochre-sep"></div>

  <div style="padding: 0 {S.xxl}px {S.xxl}px">
    <div class="exposure-heading">Samlet eksponering</div>
    <div class="exposure-box">
      <div class="exposure-row">
        <span class="font-mono exposure-label" style="color: var(--ochre)">Subsidiært</span>
        <span class="font-mono exposure-value" style="color: var(--ochre)"
          >{fmt(subV)},- + {subF}d</span
        >
      </div>
      <div class="exposure-row">
        <span class="font-mono exposure-label" style="color: var(--red)">Prinsipalt</span>
        <span class="font-mono exposure-value" style="color: var(--red)"
          >{fmt(prinV)},- + {prinF}d</span
        >
      </div>
    </div>
  </div>
</aside>

<style>
  .sidebar {
    width: 300px;
    flex-shrink: 0;
    border-right: var(--edge);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    background: var(--canvas);
  }
  .id-plate {
    background: var(--plate);
    color: white;
    padding: 20px 24px;
    border-bottom: var(--edge);
  }
  .id-label {
    font-size: 9px;
    color: var(--ink-4);
    font-weight: 600;
    letter-spacing: 0.1em;
    margin-bottom: 4px;
  }
  .id-number {
    font-size: 32px;
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1;
  }
  .case-title {
    font-size: 16px;
    font-weight: 500;
    line-height: 1.4;
  }
  .row-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .row-label {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .row-name {
    font-size: 13px;
    font-weight: 600;
  }
  .claimed {
    font-size: 11px;
    font-weight: 600;
    margin-bottom: 8px;
  }
  .gap-box {
    margin-top: 8px;
    padding: 4px 12px;
    background: var(--paper);
    border: var(--rule-subtle);
    display: flex;
    justify-content: space-between;
  }
  .gap-label {
    font-size: 9px;
    font-weight: 600;
    color: var(--ink-4);
  }
  .gap-values {
    display: flex;
    gap: 12px;
  }
  .gap-sub {
    font-size: 10px;
    font-weight: 600;
    color: var(--ochre);
  }
  .gap-prin {
    font-size: 10px;
    font-weight: 600;
    color: var(--red);
  }
  .binary-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .binary-te {
    font-size: 11px;
    font-weight: 600;
  }
  .binary-bh {
    font-size: 11px;
    font-weight: 600;
    color: var(--red);
  }
  .ochre-sep {
    height: 1px;
    background: var(--ochre-border);
    margin: 16px 24px;
  }
  .exposure-heading {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 12px;
  }
  .exposure-box {
    padding: 12px;
    background: var(--paper);
    border: var(--rule-subtle);
  }
  .exposure-row {
    display: flex;
    justify-content: space-between;
  }
  .exposure-row + .exposure-row {
    margin-top: 8px;
  }
  .exposure-label {
    font-size: 10px;
    font-weight: 600;
  }
  .exposure-value {
    font-size: 11px;
    font-weight: 700;
  }
</style>
