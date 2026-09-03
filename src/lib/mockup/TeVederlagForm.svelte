<script lang="ts">
  import { getDefaults, beregnCanSubmit } from '$lib/domain/vederlagSubmissionDomain';
  import type { VederlagSubmissionFormState } from '$lib/domain/vederlagSubmissionDomain';
  import type { VederlagsMetode } from '$lib/constants/paymentMethods';
  import {
    VEDERLAGSMETODER_OPTIONS,
    VEDERLAGSMETODE_DESCRIPTIONS,
    getVederlagsmetodeShortLabel,
  } from '$lib/constants/paymentMethods';
  import RichTextEditor from '$lib/components/primitives/RichTextEditor.svelte';
  import SectionHeading from '$lib/components/primitives/SectionHeading.svelte';
  import { store } from './store.svelte.js';
  import { fmt } from './utils.js';
  import CaseAnchor from './CaseAnchor.svelte';

  let {
    onsend,
    onactions,
  }: {
    onsend: () => void;
    onactions?: (a: { canSend: boolean; send: () => void }) => void;
  } = $props();

  const scenario = 'new' as const;
  const defaults = getDefaults({ scenario });

  let metode = $state<VederlagsMetode>(defaults.metode ?? 'REGNINGSARBEID');
  let belopDirekte = $state<number | undefined>(defaults.belopDirekte);
  let kostnadsOverslag = $state<number | undefined>(defaults.kostnadsOverslag);
  let belopRigg = $state<number | undefined>(defaults.belopRigg);
  let belopProduktivitet = $state<number | undefined>(defaults.belopProduktivitet);
  let begrunnelse = $state('');
  let charCount = $state(0);

  const harRiggKrav = $derived((belopRigg ?? 0) > 0);
  const harProduktivitetKrav = $derived((belopProduktivitet ?? 0) > 0);

  const hovedkravValue = $derived(metode === 'REGNINGSARBEID' ? kostnadsOverslag : belopDirekte);
  const hovedkravLabel = $derived.by(() => {
    if (metode === 'ENHETSPRISER') return 'Anslått beløp';
    if (metode === 'REGNINGSARBEID') return 'Kostnadsoverslag';
    if (metode === 'FASTPRIS_TILBUD') return 'Fast pris';
    return 'Beløp';
  });

  function handleHovedkravChange(v: number | undefined) {
    if (metode === 'REGNINGSARBEID') kostnadsOverslag = v;
    else belopDirekte = v;
  }

  const mappedState: VederlagSubmissionFormState = $derived({
    metode,
    belopDirekte,
    kostnadsOverslag,
    kreverJustertEp: false,
    varsletForOppstart: true,
    harRiggKrav,
    belopRigg,
    datoKlarOverRigg: undefined,
    harProduktivitetKrav,
    belopProduktivitet,
    datoKlarOverProduktivitet: undefined,
    begrunnelse,
    begrunnelseValidationError: undefined,
  });

  const kanSende = $derived(beregnCanSubmit(mappedState) && charCount >= 10);

  $effect(() => {
    onactions?.({
      canSend: kanSende,
      send: () => {
        store.sendTeVederlag(hovedkravValue ?? 0);
        onsend();
      },
    });
  });
  const metodeDescription = $derived(metode ? VEDERLAGSMETODE_DESCRIPTIONS[metode] : undefined);

  const METODE_OPTIONS: { value: VederlagsMetode; label: string }[] =
    VEDERLAGSMETODER_OPTIONS.filter((o) => o.value !== '').map((o) => ({
      value: o.value as VederlagsMetode,
      label: getVederlagsmetodeShortLabel(o.value),
    }));
</script>

<div class="form-content">
  <CaseAnchor />

  <div class="form-title-row">
    <h1>Krav om vederlagsjustering</h1>
  </div>
  <p class="form-intro">
    Spesifiser kravet med beregningsmetode, beløp og entreprenørens begrunnelse.
  </p>

  <div class="standpunkt-heading">
    <span class="standpunkt-title">Entreprenørens krav</span>
    <span class="font-mono standpunkt-ref">§ 34.1</span>
  </div>

  <div class="form-section">
    <SectionHeading title="Beregningsmetode" paragrafRef="§ 34.2" />
    <div class="segment-row">
      {#each METODE_OPTIONS as opt}
        <button
          class="segment-btn"
          class:active={metode === opt.value}
          onclick={() => (metode = opt.value)}>{opt.label}</button
        >
      {/each}
    </div>
    {#if metodeDescription}
      <p class="helptext">{metodeDescription}</p>
    {/if}
  </div>

  <div class="form-section">
    <SectionHeading title="Hovedkrav" paragrafRef="§ 34.1.1–34.1.2" />
    <div class="number-field">
      <label class="number-input-label" for="te-hovedkrav">{hovedkravLabel}</label>
      <div class="number-input-wrap">
        <input
          id="te-hovedkrav"
          type="number"
          min="0"
          value={hovedkravValue ?? ''}
          oninput={(e) => {
            const v = parseInt(e.currentTarget.value);
            handleHovedkravChange(isNaN(v) ? undefined : v);
          }}
          placeholder="0"
          class="font-mono measurement-input"
        />
        <span class="number-input-suffix">kr</span>
      </div>
    </div>
  </div>

  <div class="form-section">
    <SectionHeading title="Særskilte krav" paragrafRef="§ 34.1.3" />
    <p class="helptext">
      Eventuelle tilleggskrav for rigg- og driftskostnader eller produktivitetstap.
    </p>
    <div class="saerskilt-grid">
      <div class="number-field">
        <label class="number-input-label" for="te-rigg">Rigg og drift</label>
        <div class="number-input-wrap">
          <input
            id="te-rigg"
            type="number"
            min="0"
            value={belopRigg ?? ''}
            oninput={(e) => {
              const v = parseInt(e.currentTarget.value);
              belopRigg = isNaN(v) ? undefined : v;
            }}
            placeholder="0"
            class="font-mono measurement-input"
          />
          <span class="number-input-suffix">kr</span>
        </div>
      </div>
      <div class="number-field">
        <label class="number-input-label" for="te-produktivitet">Produktivitetstap</label>
        <div class="number-input-wrap">
          <input
            id="te-produktivitet"
            type="number"
            min="0"
            value={belopProduktivitet ?? ''}
            oninput={(e) => {
              const v = parseInt(e.currentTarget.value);
              belopProduktivitet = isNaN(v) ? undefined : v;
            }}
            placeholder="0"
            class="font-mono measurement-input"
          />
          <span class="number-input-suffix">kr</span>
        </div>
      </div>
    </div>
  </div>

  <div class="begrunnelse-section">
    <div class="begrunnelse-heading">
      <span class="begrunnelse-title">Begrunnelse</span>
      <div class="begrunnelse-heading-right">
        <span class="font-mono char-count">{charCount} tegn</span>
        <span class="font-mono begrunnelse-ref">§ 34.2</span>
      </div>
    </div>
    <p class="helptext begrunnelse-help">
      Beskriv grunnlaget for kravet, omfanget og hvorfor den valgte beregningsmetoden passer.
    </p>
    <div class="editor-wrapper">
      <RichTextEditor
        body={begrunnelse}
        onchange={(html) => (begrunnelse = html)}
        placeholder="Begrunn kravets omfang og den valgte beregningsmetoden..."
        maxHeight="none"
        oncharcount={(count) => (charCount = count)}
      />
    </div>
  </div>

  {#if kanSende}
    <div class="status-box">
      <span class="status-label">Klar til sending</span>
      <div class="font-mono status-text">
        {#if hovedkravValue && hovedkravValue > 0}
          Krav om {fmt(hovedkravValue)},-
        {:else}
          Sender vederlagskrav
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .form-title-row {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
  }
  .form-title-row h1 {
    font-size: 30px;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.02em;
    color: var(--ink);
  }
  .form-intro {
    margin-bottom: 28px;
    max-width: 620px;
    font-size: 14px;
    line-height: 1.6;
    color: var(--ink-3);
  }
  .standpunkt-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--color-wire);
  }
  .standpunkt-title {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-3);
  }
  .standpunkt-ref,
  .begrunnelse-ref {
    font-size: 11px;
    color: var(--ink-4);
  }

  .form-section,
  .begrunnelse-section {
    margin-bottom: 16px;
    padding: 18px;
    background: var(--surface);
    border: var(--rule);
    border-radius: 12px;
  }
  .form-section .helptext {
    margin: 12px 0 0;
    font-size: 13px;
    line-height: 1.55;
    color: var(--ink-3);
  }

  .segment-row {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 3px;
    width: fit-content;
    margin-top: 14px;
    padding: 3px;
    overflow: visible;
    background: var(--surface-inset);
    border: var(--rule-strong);
    border-radius: 999px;
  }
  .segment-btn {
    flex: none;
    min-height: 34px;
    padding: 7px 14px;
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
    color: var(--ink-3);
    background: transparent;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    transition:
      background 120ms,
      color 120ms,
      box-shadow 120ms;
  }
  .segment-btn:hover:not(.active) {
    color: var(--ink);
    background: var(--surface);
  }
  .segment-btn.active {
    color: white;
    background: var(--brand-2);
    box-shadow: 0 1px 2px rgba(27, 42, 34, 0.12);
  }

  .number-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-width: 260px;
    margin-top: 14px;
  }
  .number-input-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .number-input-wrap {
    display: flex;
    align-items: stretch;
  }
  .number-input-wrap .measurement-input {
    min-width: 0;
    flex: 1;
    width: auto;
    text-align: right;
    border-radius: 8px 0 0 8px;
  }
  .number-input-suffix {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    color: var(--ink-3);
    background: var(--surface-inset);
    border: var(--control-border);
    border-left: none;
    border-radius: 0 8px 8px 0;
  }
  .saerskilt-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 260px));
    gap: 16px;
  }

  .begrunnelse-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--color-wire);
  }
  .begrunnelse-title {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-3);
  }
  .begrunnelse-heading-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .char-count {
    font-size: 11px;
    color: var(--ink-4);
  }
  .begrunnelse-help {
    margin: 12px 0;
    font-size: 13px;
    line-height: 1.55;
    color: var(--ink-3);
  }
  .editor-wrapper {
    overflow: hidden;
    border: var(--rule-strong);
    border-radius: 8px;
  }
  .editor-wrapper:focus-within {
    border-color: var(--control-focus);
    box-shadow: var(--control-focus-ring);
  }

  .form-content .status-box {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    margin-top: 16px;
    padding: 14px 16px;
    background: var(--surface-warm);
    border: var(--rule-strong);
    border-radius: 12px;
  }
  .status-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-4);
  }
  .form-content .status-text {
    font-size: 13px;
    color: var(--ink);
  }

  @media (max-width: 768px) {
    .saerskilt-grid {
      grid-template-columns: 1fr;
    }
    .number-field {
      max-width: none;
    }
    .segment-row {
      border-radius: 12px;
    }
  }
</style>
