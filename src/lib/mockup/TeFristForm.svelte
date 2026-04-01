<script lang="ts">
  import {
    getDefaults,
    beregnVisibility,
    beregnCanSubmit,
  } from '$lib/domain/fristSubmissionDomain';
  import type { FristSubmissionFormState } from '$lib/domain/fristSubmissionDomain';
  import { store } from './store.svelte.js';
  import { TE } from './data.js';
  import CaseAnchor from './CaseAnchor.svelte';

  let {
    onclose,
    onsend,
    onactions,
  }: {
    onclose: () => void;
    onsend: () => void;
    onactions?: (a: { canSend: boolean; send: () => void }) => void;
  } = $props();

  const d = store.tracks.frist;

  /**
   * Mock scenario: TE spesifiserer fristkrav for KOE-104.
   * Foreløpig varsel allerede sendt, nå angis antall dager + begrunnelse.
   */
  const scenario = 'spesifisering' as const;
  const defaults = getDefaults({ scenario, existingVarselDato: '2025-04-12' });

  let varselType = $state<string | undefined>(defaults.varselType);
  let antallDager = $state<number | undefined>(defaults.antallDager || undefined);
  let begrunnelse = $state('');

  const visibility = $derived(
    beregnVisibility(
      { varselType: varselType as FristSubmissionFormState['varselType'] },
      { scenario }
    )
  );

  const mappedState: FristSubmissionFormState = $derived({
    varselType: varselType as FristSubmissionFormState['varselType'],
    tidligereVarslet: true,
    varselDato: '2025-04-12',
    antallDager: antallDager ?? 0,
    nySluttdato: undefined,
    begrunnelse,
    begrunnelseValidationError: undefined,
    vilkarOppfylt: undefined,
  });

  const kanSende = $derived(beregnCanSubmit(mappedState, { scenario }));

  $effect(() => {
    onactions?.({
      canSend: kanSende,
      send: () => {
        store.sendTeFrist(antallDager ?? 0);
        onsend();
      },
    });
  });
</script>

<div class="form-content">
  <CaseAnchor />

  <div class="te-context">
    <div class="context-header">
      <div class="context-label-row">
        <d.icon size={14} style="color: var(--ink-3)" />
        <span class="context-label">{d.label} — {TE}s krav</span>
      </div>
      <span class="font-mono context-ref">§ 33.4 / § 33.6</span>
    </div>
    <p class="font-serif context-text">
      Spesifiser kravet om fristforlengelse. Foreløpig varsel ble sendt 12.04.
    </p>
  </div>

  <div class="bh-heading">{TE}s standpunkt</div>

  <div class="question-block">
    <div class="question-header">
      <span class="question-label">Varsling</span>
      <span class="font-mono question-ref">§ 33.4 / § 33.6</span>
    </div>
    <div class="segment-row">
      {#each visibility.segmentOptions as opt}
        <button
          class="segment-btn"
          class:active={varselType === opt.value}
          onclick={() => (varselType = opt.value)}>{opt.label}</button
        >
      {/each}
    </div>
    {#if varselType === 'varsel'}
      <p class="helptext">
        Varselet registreres med dagens dato. Antall dager kan spesifiseres når grunnlaget for å
        beregne omfanget foreligger (§ 33.6.1).
      </p>
    {:else if varselType === 'spesifisert'}
      <p class="helptext">
        Angi og begrunn det antall dager du krever som fristforlengelse (§ 33.6.1).
      </p>
    {:else if varselType === 'begrunnelse_utsatt'}
      <p class="helptext">
        Begrunn hvorfor grunnlaget for å beregne kravet ikke foreligger (§ 33.6.2 b).
      </p>
    {/if}
  </div>

  {#if visibility.showKravSection}
    <div class="divider"></div>

    <div class="question-block">
      <div class="question-header">
        <span class="question-label">Årsakssammenheng</span>
        <span class="font-mono question-ref">§ 33.1</span>
      </div>
      <p class="helptext">
        Begrunnelsen må vise at det foreligger (1) en hindring på fremdriften og (2) at hindringen
        er forårsaket av det påberopte kontraktsforholdet.
      </p>
    </div>

    <div class="divider"></div>

    <div class="question-block">
      <div class="question-header">
        <span class="question-label">Utmåling</span>
        <span class="font-mono question-ref">§ 33.5</span>
      </div>
      <p class="helptext">
        Fristforlengelsen skal svare til den virkning kontraktsforholdet har hatt på fremdriften.
      </p>
      <div class="measurement-row">
        <div>
          <div class="measurement-input-label">Antall dager</div>
          <input
            type="number"
            min="0"
            value={antallDager ?? ''}
            oninput={(e) => {
              const v = parseInt(e.currentTarget.value);
              antallDager = isNaN(v) ? undefined : v;
            }}
            placeholder="dager"
            class="font-mono measurement-input"
          />
        </div>
      </div>
    </div>

    <div class="divider"></div>

    <div class="question-block">
      <div class="question-header">
        <span class="question-label">Begrunnelse</span>
        <span class="font-mono question-ref">§ 33.5</span>
      </div>
      <textarea
        value={begrunnelse}
        oninput={(e) => (begrunnelse = e.currentTarget.value)}
        placeholder="Begrunn antall dager krevd og den virkning kontraktsforholdet har hatt på fremdriften..."
        class="font-serif begrunnelse-textarea"
      ></textarea>
    </div>
  {/if}

  {#if kanSende}
    <div class="status-box">
      <div class="font-mono status-text">
        {#if varselType === 'varsel'}
          Sender foreløpig varsel om fristforlengelse
        {:else if antallDager && antallDager > 0}
          Krav om {antallDager} dagers fristforlengelse
        {:else}
          Spesifiserer fristkrav
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  /* Form-specific styles (shared styles in mockup.css) */
  .question-block {
    margin-bottom: 24px;
  }
  .helptext {
    margin-top: 8px;
  }
  .divider {
    margin-bottom: 24px;
  }
  .measurement-row {
    display: flex;
    align-items: flex-end;
    gap: 32px;
    margin-top: 16px;
  }
  .measurement-input {
    width: 140px;
  }
  .begrunnelse-textarea {
    margin-top: 8px;
  }
</style>
