<script lang="ts">
  import { getCaseWorkspace } from '$lib/kontraktsbord/context.svelte';
  const store = getCaseWorkspace();
  import { fmt } from './utils.js';
  import type { SporKey } from './types.js';
  import osloLogo from '../../../../public/logos/Oslo-logo-hvit-RGB.png?inline';
  import { getOverordnetStatusStyle } from '$lib/constants/statusStyles.js';
  import { Building2, ChevronRight } from 'lucide-svelte';

  let {
    sel,
    subV,
    prinV,
    subF,
    prinF,
    onselect,
  }: {
    sel: SporKey;
    subV: number | undefined;
    prinV: number | undefined;
    subF: number | undefined;
    prinF: number | undefined;
    onselect: (key: SporKey) => void;
  } = $props();

  const trackGroups: { label: string; tracks: { id: SporKey; label: string }[] }[] = [
    {
      label: 'Kontraktsforhold',
      tracks: [{ id: 'ansvar', label: 'Grunnlag' }],
    },
    {
      label: 'Krav',
      tracks: [
        { id: 'vederlag', label: 'Vederlag' },
        { id: 'frist', label: 'Fristforlengelse' },
      ],
    },
  ];

  const projectNumber = $derived(
    store.isDemo
      ? store.timeline.map((event) => event.source.match(/\/projects\/([^/]+)/)?.[1]).find(Boolean)
      : store.projectId
  );

  const statusStyle = $derived(getOverordnetStatusStyle(store.sak.overordnet_status));
  const exposureGroups = $derived(
    [
      {
        label: 'Uavklart',
        values: [
          prinV === undefined && !store.display('vederlag').isWithdrawn
            ? store.display('vederlag').unspecified
              ? store.display('vederlag').hasNotice
                ? 'Vederlag ikke spesifisert'
                : null
              : `${fmt(store.display('vederlag').krevdValue!)} kr`
            : null,
          prinF === undefined && !store.display('frist').isWithdrawn
            ? store.display('frist').unspecified
              ? store.display('frist').hasNotice
                ? 'Frist ikke spesifisert'
                : null
              : `${fmt(store.display('frist').krevdValue!)} kalenderdager`
            : null,
        ].filter(Boolean),
      },
      {
        label: 'Bestridt prinsipalt',
        values: [
          prinV !== undefined && !store.display('vederlag').isWithdrawn ? `${fmt(prinV)} kr` : null,
          prinF !== undefined && !store.display('frist').isWithdrawn
            ? `${fmt(prinF)} kalenderdager`
            : null,
        ].filter(Boolean),
      },
      {
        label: 'Bestridt subsidiært',
        values: [
          subV !== undefined &&
          !store.display('vederlag').isWithdrawn &&
          (store.display('vederlag').isSubsidiary || subV !== prinV)
            ? `${fmt(subV)} kr`
            : null,
          subF !== undefined &&
          !store.display('frist').isWithdrawn &&
          (store.display('frist').isSubsidiary || subF !== prinF)
            ? `${fmt(subF)} kalenderdager`
            : null,
        ].filter(Boolean),
      },
    ].filter((group) => group.values.length)
  );
</script>

<aside class="sidebar">
  <div class="id-plate">
    <div class="sender">
      <div class="oslo-logo" style:background-image={`url(${osloLogo})`} aria-hidden="true"></div>
      <div class="sender-name">
        <span class="municipality">Oslo kommune</span>
        <span class="agency">Oslobygg KF</span>
      </div>
    </div>
    <div class="case-identity">
      <div class="id-number">{store.sak.sak_id}</div>
      <h2 class="case-title">{store.sak.sakstittel}</h2>
      <span
        class="case-status"
        class:variant-sent={store.sak.overordnet_status === 'SENDT'}
        class:variant-default={statusStyle.variant === 'default'}
        class:variant-info={statusStyle.variant === 'info'}
        class:variant-success={statusStyle.variant === 'success'}
        class:variant-danger={statusStyle.variant === 'danger'}
        >Saksstatus: {statusStyle.label}</span
      >
    </div>
  </div>

  <nav class="sidebar-tracks" aria-label="Sakens spor">
    {#each trackGroups as group, gi (group.label)}
      {#if gi > 0}<div class="group-sep"></div>{/if}
      <div class="group-label">{group.label}</div>
      {#each group.tracks as t (t.id)}
        {@const display = store.display(t.id)}
        {@const on = sel === t.id}
        {@const track = t.id === 'ansvar' ? store.sak.grunnlag : store.sak[t.id]}
        {@const hasDraft = store.getUI(t.id).draft !== null}
        {@const hasNewRevision =
          !display.isWithdrawn &&
          track.bh_respondert_versjon !== undefined &&
          display.antallVersjoner - 1 > track.bh_respondert_versjon}
        {@const unit = t.id === 'frist' ? ' dager' : ' kr'}
        <button
          type="button"
          class="m-row"
          class:on
          aria-current={on ? 'page' : undefined}
          onclick={() => onselect(t.id)}
        >
          <span class="row-header">
            <span class="row-name">{t.label}</span>
            <span class="row-actions">
              {#if hasDraft}<span
                  class="draft-chip"
                  title="Nytt BH-svar: Kladd under arbeid · ikke sendt">BH-kladd</span
                >{/if}
              {#if on}<ChevronRight size={15} strokeWidth={2.25} aria-hidden="true" />{/if}
            </span>
          </span>
          {#if !display.isBinary && !display.unspecified}
            <span class="font-mono claimed">Krevd: {fmt(display.krevdValue!)}{unit}</span>
          {/if}
          <span class="row-status">
            {#if display.isWithdrawn}
              Kravet er trukket
            {:else if display.isBinary}
              {display.isDisputed
                ? 'BH bestrider grunnlaget'
                : track.bh_resultat
                  ? `BH: ${display.bhPosition}`
                  : display.antallVersjoner > 0
                    ? 'Ikke vurdert'
                    : 'Ikke påbegynt'}
            {:else if display.unspecified}
              {display.hasNotice ? 'Varslet – ikke spesifisert' : 'Ikke varslet'}
            {:else if display.bhPrinsipal === undefined}
              Ikke vurdert
            {:else}
              {#if display.isDisputed}Prinsipalt avslått{:else}BH: {fmt(
                  display.bhPrinsipal
                )}{unit}{/if}{#if display.bhSubsidiaer !== undefined && (display.isSubsidiary || display.bhSubsidiaer !== display.bhPrinsipal)}
                <!-- Mustachen bevarer mellomrommene; .position-separator har white-space: pre. -->
                <!-- eslint-disable-next-line svelte/no-useless-mustaches -->
                <span class="position-separator">{' · '}</span>subsidiært {fmt(
                  display.bhSubsidiaer
                )}{unit}{/if}
            {/if}
          </span>
          {#if hasNewRevision}<span class="new-revision">Nytt fra TE · ubesvart revisjon</span>{/if}
        </button>
      {/each}
    {/each}
  </nav>

  <section class="exposure" aria-labelledby="exposure-heading">
    <h3 id="exposure-heading" class="exposure-heading">Uavklart og bestridt</h3>
    <div class="exposure-box">
      {#each exposureGroups as group (group.label)}
        <div class="exposure-row">
          <span class="exposure-label">{group.label}</span>
          {#each group.values as value, vi (vi)}<span class="font-mono exposure-value">{value}</span
            >{/each}
        </div>
      {:else}
        <span class="row-status">Ingen aktive, spesifiserte krav</span>
      {/each}
    </div>
  </section>
  <footer class="project-footer" aria-label="Prosjektinformasjon">
    <Building2 size={18} strokeWidth={1.5} aria-hidden="true" />
    <div class="project-details">
      <div class="project-name">{store.sak.prosjekt_navn ?? 'Prosjekt'}</div>
      {#if projectNumber}<div class="project-number">Prosjekt {projectNumber}</div>{/if}
    </div>
  </footer>
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
    padding: 20px 20px 18px;
  }
  .sender {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 2px 4px;
  }
  .oslo-logo {
    width: 36px;
    height: 43px;
    flex: 0 0 36px;
    background-position: -22px -22px;
    background-repeat: no-repeat;
    background-size: 128px auto;
  }
  .sender-name {
    display: flex;
    flex-direction: column;
    gap: 3px;
    line-height: 1.3;
  }
  .municipality {
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .agency {
    font-size: 13px;
    color: var(--sidebar-muted);
    font-weight: 500;
  }
  .project-footer {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    gap: 10px;
    margin: auto 20px 0;
    padding: 16px 0 20px;
    border-top: 1px solid var(--sidebar-border);
    color: var(--sidebar-muted);
  }
  .project-footer :global(svg) {
    flex-shrink: 0;
  }
  .project-details {
    min-width: 0;
  }
  .project-name {
    color: var(--sidebar-muted);
    font-size: 12px;
    font-weight: 600;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }
  .project-number {
    margin-top: 3px;
    font-size: 11px;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }
  .case-identity {
    margin-top: 24px;
  }
  .id-number {
    font-size: 11px;
    font-weight: 500;
    line-height: 1.5;
    color: var(--sidebar-muted);
    overflow-wrap: anywhere;
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
  .case-status.variant-sent {
    background: rgba(242, 247, 244, 0.08);
    color: #c5d4cb;
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
    margin: 6px 0 12px;
    font-size: 20px;
    font-weight: 700;
    line-height: 1.25;
    letter-spacing: -0.015em;
    color: var(--sidebar-text);
  }
  .sidebar-tracks {
    padding: 10px 16px 16px;
  }
  .row-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .row-actions {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .row-name {
    font-size: 12px;
    font-weight: 700;
    line-height: 18px;
  }
  .claimed {
    font-size: 12px;
    font-weight: 600;
    margin: 6px 0 3px;
    display: block;
  }
  .m-row {
    display: block;
    width: 100%;
    text-align: left;
    font: inherit;
    color: inherit;
    cursor: pointer;
    padding: 12px;
    margin-bottom: 8px;
    background: rgba(255, 255, 255, 0.035);
    border: 1px solid rgba(242, 247, 244, 0.07);
  }
  .m-row:not(.on) {
    opacity: 1;
  }
  .m-row:not(.on):hover {
    opacity: 1;
    background: rgba(255, 255, 255, 0.05);
  }
  .m-row.on {
    opacity: 1;
    background: var(--sidebar-raised);
    border-color: rgba(242, 247, 244, 0.14);
    box-shadow: inset 3px 0 0 var(--sidebar-accent-text);
  }
  .m-row.on .row-name {
    color: var(--sidebar-text);
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
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(242, 247, 244, 0.07);
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
    font-size: 13px;
    font-weight: 700;
  }

  .position-separator {
    white-space: pre;
  }
  .row-status {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    line-height: 1.5;
    color: #c5d4cb;
  }
  .draft-chip {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 6px;
    border: 1px dashed var(--sidebar-muted);
    border-radius: 5px;
    color: var(--sidebar-text);
    white-space: nowrap;
  }
  .new-revision {
    display: block;
    font-size: 11px;
    margin-top: 6px;
    color: #fff0a6;
  }
  .m-row:focus-visible {
    outline: 2px solid var(--sidebar-accent-text);
    outline-offset: 3px;
  }
  .exposure {
    padding: 0 16px 24px;
  }
  @media (max-width: 768px) {
    .sidebar {
      width: 100%;
      border-right: none;
    }
  }
</style>
