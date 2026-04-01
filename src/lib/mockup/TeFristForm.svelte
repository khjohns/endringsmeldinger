<script lang="ts">
  import {
    getDefaults,
    beregnVisibility,
    beregnCanSubmit,
  } from '$lib/domain/fristSubmissionDomain';
  import type { FristSubmissionFormState } from '$lib/domain/fristSubmissionDomain';
  import { DD, TE } from './data.js';
  import CaseAnchor from './CaseAnchor.svelte';

  let { onclose }: { onclose: () => void } = $props();

  const d = DD.frist;

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
  .form-content {
    max-width: 840px;
    margin: 0 auto;
    padding: 32px 40px 120px;
  }
  .te-context {
    margin-bottom: 40px;
    padding: 24px;
    background: var(--paper-sub);
    border-top: var(--edge);
    border-left: var(--rule);
    border-right: var(--rule);
    border-bottom: var(--rule);
  }
  .context-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .context-label-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .context-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .context-ref {
    font-size: 11px;
    font-weight: 500;
    background: var(--paper-inset);
    border: var(--rule-subtle);
    padding: 2px 8px;
    color: var(--ink-2);
  }
  .context-text {
    font-size: 15px;
    line-height: 1.65;
    color: var(--ink-3);
  }
  .bh-heading {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 32px;
  }
  .question-block {
    margin-bottom: 24px;
  }
  .question-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .question-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink-2);
  }
  .question-ref {
    font-size: 11px;
    background: var(--paper-inset);
    border: var(--rule-subtle);
    padding: 2px 8px;
    color: var(--ink-3);
  }
  .helptext {
    font-size: 13px;
    color: var(--ink-3);
    line-height: 1.5;
    margin-top: 8px;
  }
  .segment-row {
    display: flex;
    border: var(--edge);
  }
  .segment-btn {
    flex: 1;
    padding: 10px 16px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: var(--paper);
    color: var(--ink-3);
    border: none;
    border-right: var(--edge);
    cursor: pointer;
    transition: all 80ms;
  }
  .segment-btn:last-child {
    border-right: none;
  }
  .segment-btn.active {
    background: var(--plate);
    color: white;
  }
  .divider {
    height: 1px;
    background: rgba(28, 25, 23, 0.08);
    margin-bottom: 24px;
  }
  .measurement-row {
    display: flex;
    align-items: flex-end;
    gap: 32px;
    margin-top: 16px;
  }
  .measurement-input-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink-2);
    margin-bottom: 8px;
  }
  .measurement-input {
    width: 140px;
    font-size: 18px;
    font-weight: 700;
    padding: 8px 16px;
    background: var(--paper-inset);
    border: var(--edge);
    color: var(--ink);
    outline: none;
  }
  .measurement-input:focus {
    border-color: var(--ochre);
  }
  .begrunnelse-textarea {
    width: 100%;
    min-height: 160px;
    padding: 16px;
    font-size: 15px;
    line-height: 1.65;
    resize: vertical;
    background: var(--paper);
    border: var(--rule);
    color: var(--ink);
    outline: none;
    margin-top: 8px;
  }
  .begrunnelse-textarea:focus {
    border-color: rgba(28, 25, 23, 0.3);
  }
  .status-box {
    margin-top: 32px;
    padding: 16px 20px;
    background: var(--paper);
    border: 2px solid var(--ochre);
  }
  .status-text {
    font-size: 12px;
    font-weight: 700;
    color: var(--ochre);
    letter-spacing: 0.02em;
  }
</style>
