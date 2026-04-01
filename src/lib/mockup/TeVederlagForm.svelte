<script lang="ts">
  import {
    getDefaults,
    beregnVisibility,
    beregnCanSubmit,
  } from '$lib/domain/vederlagSubmissionDomain';
  import type { VederlagSubmissionFormState } from '$lib/domain/vederlagSubmissionDomain';
  import type { VederlagsMetode } from '$lib/constants/paymentMethods';
  import { VEDERLAGSMETODE_DESCRIPTIONS } from '$lib/constants/paymentMethods';
  import { store } from './store.svelte.js';
  import { TE } from './data.js';
  import { fmt } from './utils.js';
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

  const d = store.tracks.vederlag;

  const scenario = 'new' as const;
  const defaults = getDefaults({ scenario });

  let metode = $state<VederlagsMetode | undefined>(defaults.metode);
  let belopDirekte = $state<number | undefined>(defaults.belopDirekte);
  let kostnadsOverslag = $state<number | undefined>(defaults.kostnadsOverslag);
  let belopRigg = $state<number | undefined>(defaults.belopRigg);
  let belopProduktivitet = $state<number | undefined>(defaults.belopProduktivitet);
  let begrunnelse = $state('');

  const visibility = $derived(beregnVisibility({ metode }));
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

  const kanSende = $derived(beregnCanSubmit(mappedState));

  $effect(() => {
    onactions?.({
      canSend: kanSende,
      send: () => {
        store.sendTeVederlag(hovedkravValue ?? 0, metode ?? 'REGNINGSARBEID');
        onsend();
      },
    });
  });
  const metodeDescription = $derived(metode ? VEDERLAGSMETODE_DESCRIPTIONS[metode] : undefined);

  const METODE_OPTIONS: { value: VederlagsMetode; label: string }[] = [
    { value: 'ENHETSPRISER', label: 'Enhetspriser' },
    { value: 'REGNINGSARBEID', label: 'Regningsarbeid' },
    { value: 'FASTPRIS_TILBUD', label: 'Fastpris' },
  ];
</script>

<div class="form-content">
  <CaseAnchor />

  <div class="te-context">
    <div class="context-header">
      <div class="context-label-row">
        <d.icon size={14} style="color: var(--ink-3)" />
        <span class="context-label">{d.label} — {TE}s krav</span>
      </div>
      <span class="font-mono context-ref">§ 34.1</span>
    </div>
    <p class="font-serif context-text">
      Spesifiser vederlagskravet med beregningsmetode, beløp og begrunnelse.
    </p>
  </div>

  <div class="bh-heading">{TE}s standpunkt</div>

  <div class="question-block">
    <div class="question-header">
      <span class="question-label">Beregningsmetode</span>
      <span class="font-mono question-ref">§ 34.2</span>
    </div>
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

  {#if metode}
    <div class="divider"></div>

    <div class="question-block">
      <div class="question-header">
        <span class="question-label">Hovedkrav</span>
        <span class="font-mono question-ref">§ 34.1.1–34.1.2</span>
      </div>
      <div class="measurement-row">
        <div>
          <div class="measurement-input-label">{hovedkravLabel}</div>
          <input
            type="number"
            min="0"
            value={hovedkravValue ?? ''}
            oninput={(e) => {
              const v = parseInt(e.currentTarget.value);
              handleHovedkravChange(isNaN(v) ? undefined : v);
            }}
            placeholder="kr"
            class="font-mono measurement-input"
          />
        </div>
      </div>
    </div>

    <div class="divider"></div>

    <div class="question-block">
      <div class="question-header">
        <span class="question-label">Særskilte krav</span>
        <span class="font-mono question-ref">§ 34.1.3</span>
      </div>
      <p class="helptext">
        Eventuelle tilleggskrav for rigg/drift-kostnader eller produktivitetstap.
      </p>
      <div class="saerskilt-grid">
        <div>
          <div class="measurement-input-label">Rigg og drift</div>
          <input
            type="number"
            min="0"
            value={belopRigg ?? ''}
            oninput={(e) => {
              const v = parseInt(e.currentTarget.value);
              belopRigg = isNaN(v) ? undefined : v;
            }}
            placeholder="kr"
            class="font-mono measurement-input"
          />
        </div>
        <div>
          <div class="measurement-input-label">Produktivitetstap</div>
          <input
            type="number"
            min="0"
            value={belopProduktivitet ?? ''}
            oninput={(e) => {
              const v = parseInt(e.currentTarget.value);
              belopProduktivitet = isNaN(v) ? undefined : v;
            }}
            placeholder="kr"
            class="font-mono measurement-input"
          />
        </div>
      </div>
    </div>

    <div class="divider"></div>

    <div class="question-block">
      <div class="question-header">
        <span class="question-label">Begrunnelse</span>
        <span class="font-mono question-ref">§ 34.2</span>
      </div>
      <textarea
        value={begrunnelse}
        oninput={(e) => (begrunnelse = e.currentTarget.value)}
        placeholder="Begrunn kravets omfang og den valgte beregningsmetoden..."
        class="font-serif begrunnelse-textarea"
      ></textarea>
    </div>
  {/if}

  {#if kanSende}
    <div class="status-box">
      <div class="font-mono status-text">
        {#if hovedkravValue && hovedkravValue > 0}
          Krav om {fmt(hovedkravValue)},- i vederlag
        {:else}
          Sender vederlagskrav
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  /* Form-specific overrides (shared styles in mockup.css) */
  .question-block {
    margin-bottom: 24px;
  }
  .helptext {
    margin-top: 8px;
    margin-bottom: 16px;
  }
  .divider {
    margin-bottom: 24px;
  }
  .measurement-row {
    margin-top: 16px;
  }
  .saerskilt-grid {
    display: flex;
    gap: 24px;
    margin-top: 16px;
  }
  .begrunnelse-textarea {
    margin-top: 8px;
  }
</style>
