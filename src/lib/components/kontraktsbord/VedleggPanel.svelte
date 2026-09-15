<script lang="ts">
  /**
   * Vedlegg på en sak.
   *
   * Dokumentene ligger i Catendas bibliotek; appen holder ingen egen kopi.
   * Begge kontraktsparter ser de samme vedleggene — det er hele poenget med at
   * de deles — så panelet merker tydelig hvilken side som lastet opp hvert av dem.
   */
  import { Download, Loader, Paperclip, Upload } from 'lucide-svelte';
  import {
    formaterStorrelse,
    hentVedlegg,
    lastNedVedlegg,
    lastOppVedlegg,
    MAKS_VEDLEGG_BYTES,
    type Vedlegg,
  } from '$lib/api/vedlegg';

  const { sakId, kanLasteOpp = true }: { sakId: string; kanLasteOpp?: boolean } = $props();

  let vedlegg = $state<Vedlegg[]>([]);
  let laster = $state(true);
  let lasterOpp = $state(false);
  let henter = $state<string | null>(null);
  let feil = $state<string | null>(null);
  let dragOver = $state(false);
  let filvelger: HTMLInputElement | null = $state(null);

  // Datahenting hører hjemme i onMount/last, ikke i $effect.
  import { onMount } from 'svelte';
  onMount(oppdater);

  async function oppdater() {
    laster = true;
    try {
      vedlegg = await hentVedlegg(sakId);
      feil = null;
    } catch (e) {
      feil = e instanceof Error ? e.message : 'Kunne ikke hente vedlegg.';
    } finally {
      laster = false;
    }
  }

  async function lastOpp(filer: FileList | null) {
    if (!filer?.length || lasterOpp) return;
    lasterOpp = true;
    feil = null;
    try {
      // Én om gangen, slik at en feil midtveis er entydig å rapportere.
      for (const fil of Array.from(filer)) {
        await lastOppVedlegg(sakId, fil);
      }
      await oppdater();
    } catch (e) {
      feil = e instanceof Error ? e.message : 'Opplastingen feilet.';
    } finally {
      lasterOpp = false;
      if (filvelger) filvelger.value = '';
    }
  }

  async function lastNed(v: Vedlegg) {
    henter = v.id;
    feil = null;
    try {
      await lastNedVedlegg(sakId, v);
    } catch (e) {
      feil = e instanceof Error ? e.message : 'Kunne ikke laste ned vedlegget.';
    } finally {
      henter = null;
    }
  }

  function slipp(event: DragEvent) {
    event.preventDefault();
    dragOver = false;
    lastOpp(event.dataTransfer?.files ?? null);
  }
</script>

<div class="vedlegg-panel">
  {#if laster}
    <p class="tom">Henter vedlegg …</p>
  {:else if vedlegg.length === 0}
    <p class="tom">Ingen vedlegg på denne saken ennå.</p>
  {:else}
    <ul class="liste">
      {#each vedlegg as v (v.id)}
        <li class="att">
          <Paperclip size={14} aria-hidden="true" />
          <div class="att-info">
            <div class="att-name" title={v.navn}>{v.navn}</div>
            <div class="font-mono att-meta">
              {formaterStorrelse(v.storrelse)} · {v.lastet_opp_rolle} · {v.lastet_opp_av}
            </div>
          </div>
          <button
            class="last-ned"
            onclick={() => lastNed(v)}
            disabled={henter === v.id}
            aria-label="Last ned {v.navn}"
          >
            {#if henter === v.id}
              <Loader size={14} class="spinner" aria-hidden="true" />
            {:else}
              <Download size={14} aria-hidden="true" />
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  {#if feil}
    <p class="feil" role="alert">{feil}</p>
  {/if}

  {#if kanLasteOpp}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="slippsone"
      class:over={dragOver}
      ondragover={(e) => {
        e.preventDefault();
        dragOver = true;
      }}
      ondragleave={() => (dragOver = false)}
      ondrop={slipp}
    >
      <input
        bind:this={filvelger}
        type="file"
        multiple
        class="skjult-input"
        id="vedlegg-{sakId}"
        onchange={(e) => lastOpp(e.currentTarget.files)}
        disabled={lasterOpp}
      />
      <label for="vedlegg-{sakId}" class="dashed-action-btn" class:travel={lasterOpp}>
        {#if lasterOpp}
          <Loader size={14} class="spinner" aria-hidden="true" /> Laster opp …
        {:else}
          <Upload size={14} aria-hidden="true" /> Last opp nytt vedlegg
        {/if}
      </label>
      <p class="hjelp">
        Slipp filer her, eller velg. Maks {MAKS_VEDLEGG_BYTES / (1024 * 1024)} MB per fil.
      </p>
      <p class="hjelp">Vedlegg deles med motparten i prosjektets dokumentbibliotek.</p>
    </div>
  {/if}
</div>

<style>
  .vedlegg-panel {
    display: flex;
    flex-direction: column;
  }
  .liste {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .att {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    color: var(--ink-4);
  }
  .att-info {
    flex: 1;
    min-width: 0;
  }
  .att-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .att-meta {
    font-size: 11px;
    color: var(--ink-4);
  }
  .last-ned {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    padding: 4px;
    color: var(--ink-4);
    background: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 80ms;
  }
  .last-ned:hover:not(:disabled) {
    color: var(--ink);
    background: var(--surface-2, transparent);
  }
  .last-ned:disabled {
    cursor: progress;
  }
  .tom {
    margin: 0;
    font-size: 12px;
    color: var(--ink-4);
  }
  .feil {
    margin: 8px 0 0;
    font-size: 12px;
    color: var(--avslag, #b3261e);
  }
  .slippsone {
    margin-top: 12px;
    border-radius: 4px;
    transition: background 80ms;
  }
  .slippsone.over {
    background: var(--surface-2, rgba(0, 0, 0, 0.04));
  }
  .skjult-input {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  /* Matcher knappestilen ellers i panelet, men er en label rundt filvelgeren. */
  .dashed-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px 12px;
    width: 100%;
    font-size: 13px;
    font-weight: 600;
    font-family: var(--font-sans);
    color: var(--ink-3);
    background: var(--surface);
    border: 1.5px dashed var(--ink-4);
    border-radius: 4px;
    cursor: pointer;
    transition: all 80ms;
  }
  .dashed-action-btn:hover {
    border-color: var(--ink);
    color: var(--ink);
  }
  .dashed-action-btn.travel {
    cursor: progress;
  }
  .skjult-input:focus-visible + .dashed-action-btn {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
  .hjelp {
    margin: 8px 0 0;
    font-size: 11px;
    color: var(--ink-4);
  }
  :global(.spinner) {
    animation: snurr 900ms linear infinite;
  }
  @keyframes snurr {
    to {
      transform: rotate(360deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    :global(.spinner) {
      animation: none;
    }
  }
</style>
