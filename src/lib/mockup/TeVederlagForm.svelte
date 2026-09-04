<script lang="ts">
  import { getDefaults, beregnCanSubmit } from '$lib/domain/vederlagSubmissionDomain';
  import type { VederlagSubmissionFormState } from '$lib/domain/vederlagSubmissionDomain';
  import type { VederlagsMetode } from '$lib/constants/paymentMethods';
  import {
    VEDERLAGSMETODER_OPTIONS,
    VEDERLAGSMETODE_DESCRIPTIONS,
    getVederlagsmetodeShortLabel,
  } from '$lib/constants/paymentMethods';
  import { store } from './store.svelte.js';
  import { fmt } from './utils.js';
  import CaseAnchor from './CaseAnchor.svelte';
  import FormPageHeader from './components/FormPageHeader.svelte';
  import FormSection from './components/FormSection.svelte';
  import NumberField from './components/NumberField.svelte';
  import ReasoningEditor from './components/ReasoningEditor.svelte';
  import SegmentedControl from './components/SegmentedControl.svelte';

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

  <FormPageHeader
    title="Krav om vederlagsjustering"
    intro="Spesifiser kravet med beregningsmetode, beløp og entreprenørens begrunnelse."
  />

  <div class="standpunkt-heading">
    <span class="standpunkt-title">Entreprenørens krav</span>
    <span class="font-mono standpunkt-ref">§ 34.1</span>
  </div>

  <FormSection title="Beregningsmetode" paragrafRef="§ 34.2">
    <SegmentedControl
      options={METODE_OPTIONS}
      value={metode}
      onchange={(value) => (metode = value as VederlagsMetode)}
    />
    {#if metodeDescription}
      <p class="helptext">{metodeDescription}</p>
    {/if}
  </FormSection>

  <FormSection title="Hovedkrav" paragrafRef="§ 34.1.1–34.1.2">
    <NumberField
      id="te-hovedkrav"
      label={hovedkravLabel}
      suffix="kr"
      value={hovedkravValue}
      onchange={handleHovedkravChange}
    />
  </FormSection>

  <FormSection title="Særskilte krav" paragrafRef="§ 34.1.3">
    <p class="helptext">
      Eventuelle tilleggskrav for rigg- og driftskostnader eller produktivitetstap.
    </p>
    <div class="saerskilt-grid">
      <NumberField
        id="te-rigg"
        label="Rigg og drift"
        suffix="kr"
        value={belopRigg}
        onchange={(value) => (belopRigg = value)}
      />
      <NumberField
        id="te-produktivitet"
        label="Produktivitetstap"
        suffix="kr"
        value={belopProduktivitet}
        onchange={(value) => (belopProduktivitet = value)}
      />
    </div>
  </FormSection>

  <ReasoningEditor
    paragrafRef="§ 34.2"
    helptext="Beskriv grunnlaget for kravet, omfanget og hvorfor den valgte beregningsmetoden passer."
    body={begrunnelse}
    placeholder="Begrunn kravets omfang og den valgte beregningsmetoden..."
    onchange={(html) => (begrunnelse = html)}
    oncharcount={(count) => (charCount = count)}
  />

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
  .standpunkt-ref {
    font-size: 11px;
    color: var(--ink-4);
  }

  .saerskilt-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 260px));
    gap: 16px;
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
  }
</style>
