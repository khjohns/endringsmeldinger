<script lang="ts">
  /**
   * Vedlegg på en sak.
   *
   * Dokumentene ligger i Catendas bibliotek; appen holder ingen egen kopi.
   * Usendte filer vises bare til eget team. Sendte filer deles på saken.
   * Valget til én innsending eies av skjemaet og lagres med dets utkast.
   */
  import { Download, Loader, Paperclip, Trash2, Upload } from 'lucide-svelte';
  import {
    formaterStorrelse,
    hentVedlegg,
    lastNedVedlegg,
    lastOppVedlegg,
    MAKS_VEDLEGG_BYTES,
    slettVedlegg,
    provLevering,
    type Vedlegg,
  } from '$lib/api/vedlegg';

  let {
    sakId,
    kanLasteOpp = true,
    valgbare = false,
    valgte = $bindable<string[]>([]),
    opptatt = $bindable(false),
    disabled = false,
  }: {
    sakId: string;
    kanLasteOpp?: boolean;
    valgbare?: boolean;
    valgte?: string[];
    opptatt?: boolean;
    disabled?: boolean;
  } = $props();
  const inputId = $props.id();
  $effect(() => {
    opptatt = lasterOpp || fjerner !== null;
  });

  let vedlegg = $state<Vedlegg[]>([]);
  let minRolle = $state<'TE' | 'BH' | null>(null);
  let fjerner = $state<string | null>(null);
  let laster = $state(true);
  let lasterOpp = $state(false);
  let henter = $state<string | null>(null);
  let feil = $state<string | null>(null);
  let dragOver = $state(false);
  let filvelger: HTMLInputElement | null = $state(null);
  const utilgjengelige = $derived(valgte.filter((id) => !vedlegg.some((v) => v.id === id)));

  // Datahenting hører hjemme i onMount/last, ikke i $effect.
  import { onMount } from 'svelte';
  onMount(oppdater);

  async function oppdater() {
    laster = true;
    try {
      const liste = await hentVedlegg(sakId);
      vedlegg = liste.vedlegg;
      minRolle = liste.minRolle;
      feil = null;
    } catch (e) {
      feil = e instanceof Error ? e.message : 'Kunne ikke hente vedlegg.';
    } finally {
      laster = false;
    }
  }

  async function lastOpp(filer: FileList | null) {
    if (!filer?.length || lasterOpp || disabled) return;
    lasterOpp = true;
    feil = null;
    try {
      // Én om gangen, slik at en feil midtveis er entydig å rapportere.
      for (const fil of Array.from(filer)) {
        const uploaded = await lastOppVedlegg(sakId, fil);
        vedlegg = [...vedlegg, uploaded];
        if (valgbare) valgte = [...valgte, uploaded.id];
      }
      await oppdater();
    } catch (e) {
      feil = e instanceof Error ? e.message : 'Opplastingen feilet.';
    } finally {
      lasterOpp = false;
      if (filvelger) filvelger.value = '';
    }
  }

  async function fjern(v: Vedlegg) {
    if (fjerner) return;
    fjerner = v.id;
    feil = null;
    try {
      await slettVedlegg(sakId, v.id);
      valgte = valgte.filter((id) => id !== v.id);
      await oppdater();
    } catch (e) {
      // Backend forklarer hvorfor — typisk at vedlegget er brukt i en
      // sendt hendelse og derfor er del av sakens grunnlag.
      feil = e instanceof Error ? e.message : 'Kunne ikke fjerne vedlegget.';
    } finally {
      fjerner = null;
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

  async function retry() {
    try {
      await provLevering(sakId);
      await oppdater();
    } catch (e) {
      feil = e instanceof Error ? e.message : 'Leveringen feilet.';
    }
  }
</script>

<div class="vedlegg-panel">
  {#if valgbare}<p class="hjelp">
      Vedlegg er valgfrie. Merk filene som skal følge denne innsendingen.
    </p>{/if}
  {#if laster}
    <p class="tom">Henter vedlegg …</p>
  {:else if vedlegg.length === 0}
    <p class="tom">Ingen vedlegg på denne saken ennå.</p>
  {:else}
    <ul class="liste">
      {#each vedlegg as v (v.id)}
        <li class="att">
          {#if valgbare}
            <input
              type="checkbox"
              aria-label="Legg ved {v.navn}"
              checked={valgte.includes(v.id)}
              disabled={disabled || lasterOpp}
              onchange={(e) =>
                (valgte = e.currentTarget.checked
                  ? [...valgte, v.id]
                  : valgte.filter((id) => id !== v.id))}
            />
          {/if}
          <Paperclip size={14} aria-hidden="true" />
          <div class="att-info">
            <div class="att-name" title={v.navn}>{v.navn}</div>
            <div class="font-mono att-meta">
              {formaterStorrelse(v.storrelse)} · {v.lastet_opp_rolle} · {v.lastet_opp_av}
              {#if v.status === 'staged'}
                · <span class="usendt">ikke sendt</span>
              {:else if v.status === 'pending'}
                · <span class="usendt">sendt · venter på levering til Catenda</span>
              {/if}
            </div>
          </div>
          <button
            class="ikonknapp"
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
          {#if kanLasteOpp && v.status === 'staged' && minRolle !== null && v.lastet_opp_rolle === minRolle}
            <button
              class="ikonknapp fjern"
              onclick={() => fjern(v)}
              disabled={disabled || fjerner !== null || lasterOpp}
              aria-label="Fjern {v.navn}"
            >
              {#if fjerner === v.id}
                <Loader size={14} class="spinner" aria-hidden="true" />
              {:else}
                <Trash2 size={14} aria-hidden="true" />
              {/if}
            </button>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}

  {#if feil}
    <p class="feil" role="alert">{feil}</p>
  {/if}
  {#if valgbare && !laster && !feil && utilgjengelige.length}
    <p class="feil" role="alert">
      {utilgjengelige.length} valgte vedlegg er ikke tilgjengelige.
      <button
        class="dashed-action-btn"
        {disabled}
        onclick={() => (valgte = valgte.filter((id) => !utilgjengelige.includes(id)))}
        >Fjern utilgjengelige vedlegg fra valget</button
      >
    </p>
  {/if}
  {#if vedlegg.some((v) => v.status === 'pending')}
    <button class="dashed-action-btn" onclick={retry} disabled={disabled || laster}
      >Prøv levering til Catenda igjen</button
    >
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
        id={inputId}
        onchange={(e) => lastOpp(e.currentTarget.files)}
        disabled={disabled || lasterOpp}
      />
      <label for={inputId} class="dashed-action-btn" class:travel={lasterOpp}>
        {#if lasterOpp}
          <Loader size={14} class="spinner" aria-hidden="true" /> Laster opp …
        {:else}
          <Upload size={14} aria-hidden="true" /> Last opp nytt vedlegg
        {/if}
      </label>
      <p class="hjelp">
        Slipp filer her, eller velg. Maks {MAKS_VEDLEGG_BYTES / (1024 * 1024)} MB per fil.
      </p>
      <p class="hjelp">
        Velg vedlegg i skjemaet før innsending. Mellomlagrede filer er bare synlige for ditt team.
      </p>
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
  .ikonknapp {
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
  .ikonknapp:hover:not(:disabled) {
    color: var(--ink);
    background: var(--surface-2, transparent);
  }
  .ikonknapp:disabled {
    cursor: progress;
  }
  .ikonknapp.fjern:hover:not(:disabled) {
    color: var(--avslag, #b3261e);
  }
  .usendt {
    color: var(--draft, var(--ink-3));
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
