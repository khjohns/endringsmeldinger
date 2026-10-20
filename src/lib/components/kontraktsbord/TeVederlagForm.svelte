<script lang="ts">
  import SkjemaStatus from './SkjemaStatus.svelte';
  import KonsekvensVarsler from './KonsekvensVarsler.svelte';
  import { buildKonsekvensVarsler, type VarselValg } from '$lib/domain/konsekvensVarsler';
  import {
    getDefaults,
    beregnCanSubmit,
    buildEventData,
    getEventType,
  } from '$lib/domain/vederlagSubmissionDomain';
  import type { EventType } from '$lib/types/timeline';
  import { createSubmission, submissionRefs } from '$lib/kontraktsbord/submission.svelte';
  const submission = createSubmission();
  import type { VederlagSubmissionFormState } from '$lib/domain/vederlagSubmissionDomain';
  import type { VederlagsMetode } from '$lib/constants/paymentMethods';
  import {
    VEDERLAGSMETODER_OPTIONS,
    VEDERLAGSMETODE_DESCRIPTIONS,
    getVederlagsmetodeShortLabel,
  } from '$lib/constants/paymentMethods';
  import { getCaseWorkspace } from '$lib/kontraktsbord/context.svelte';
  const store = getCaseWorkspace();
  // TS-saken (#718): bare tilbud, uten varsler, særskilte krav, vedlegg og utkast (OV-U1),
  // og begrunnelsen er valgfri (#667). Kravversjonen kommer fra utledningen (krav E).
  const kjernesak = store.erKjernesak ? store : null;
  import { metodeKanSendesTilKjernen } from '$lib/kjernesak/vederlagskrav';
  import { getClaimReview } from '$lib/approval/claimReview.svelte';
  const claimReview = getClaimReview();
  import { fmt } from './utils.js';
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
    onactions?: (a: { canSend: boolean; sendLabel?: string; send: () => void }) => void;
  } = $props();

  let mode = $state<'varsel' | 'spesifisert'>(
    kjernesak || store.sak.vederlag.varsler?.length || store.sak.vederlag.metode
      ? 'spesifisert'
      : 'varsel'
  );
  let varsler = $state<VarselValg>({});
  const noticeData = $derived(
    buildKonsekvensVarsler(
      varsler,
      store.sak.grunnlag.hovedkategori ?? '',
      store.sak.grunnlag.tittel ?? store.sak.sakstittel ?? '',
      false
    )
  );
  const scenario = (kjernesak ? kjernesak.kravversjon('vederlag') : store.sak.vederlag.metode)
    ? 'edit'
    : 'new';
  const defaults = getDefaults({ scenario, existing: store.sak.vederlag });

  let metode = $state<VederlagsMetode>(
    defaults.metode ?? (kjernesak ? 'FASTPRIS_TILBUD' : 'REGNINGSARBEID')
  );
  let belopDirekte = $state<number | undefined>(defaults.belopDirekte);
  let kostnadsOverslag = $state<number | undefined>(defaults.kostnadsOverslag);
  let belopRigg = $state<number | undefined>(defaults.belopRigg);
  let belopProduktivitet = $state<number | undefined>(defaults.belopProduktivitet);
  let begrunnelse = $state(defaults.begrunnelse);
  let charCount = $state(defaults.begrunnelse.replace(/<[^>]*>/g, '').trim().length);

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
    kreverJustertEp: defaults.kreverJustertEp,
    varsletForOppstart: defaults.varsletForOppstart,
    harRiggKrav,
    belopRigg,
    datoKlarOverRigg: defaults.datoKlarOverRigg,
    harProduktivitetKrav,
    belopProduktivitet,
    datoKlarOverProduktivitet: defaults.datoKlarOverProduktivitet,
    begrunnelse,
    begrunnelseValidationError: undefined,
  });

  const kanSende = $derived(
    mode === 'varsel'
      ? Object.keys(noticeData).length > 0
      : kjernesak
        ? metodeKanSendesTilKjernen(metode) && (belopDirekte ?? 0) > 0
        : beregnCanSubmit(mappedState) && charCount >= 10
  );

  $effect(() => {
    onactions?.({
      canSend: kanSende && !submission.pending,
      sendLabel: mode === 'varsel' ? 'Send varsel' : 'Send spesifisert krav',
      send: () => {
        if (kanSende)
          void submission.run(async () => {
            if (claimReview) {
              const data =
                mode === 'varsel'
                  ? {
                      varsel_type: 'varsel',
                      varsler: noticeData,
                      begrunnelse: Object.values(noticeData).join('\n\n'),
                    }
                  : buildEventData(mappedState, {
                      scenario,
                      grunnlagEventId:
                        submissionRefs(store.timeline, 'grunnlag').claimId ?? 'demo-grunnlag',
                      originalEventId:
                        scenario === 'edit'
                          ? submissionRefs(store.timeline, 'vederlag').claimId
                          : undefined,
                    });
              await claimReview.submit(
                'vederlag',
                mode === 'varsel'
                  ? 'vederlag_krav_sendt'
                  : (getEventType({ scenario }) as EventType),
                data,
                (demo) => {
                  if (mode === 'varsel') demo.sendTeVederlagVarsel(noticeData);
                  else demo.sendTeVederlag(hovedkravValue ?? 0, metode);
                }
              );
              return;
            }
            throw new Error('Skjemaet har ingen brevkontroll, så kravet kan ikke sendes.');
          }, onsend);
      },
    });
  });
  const metodeDescription = $derived(metode ? VEDERLAGSMETODE_DESCRIPTIONS[metode] : undefined);

  const METODE_OPTIONS: { value: VederlagsMetode; label: string }[] =
    VEDERLAGSMETODER_OPTIONS.filter((o) => o.value !== '')
      .map((o) => ({
        value: o.value as VederlagsMetode,
        label: getVederlagsmetodeShortLabel(o.value),
      }))
      .filter((o) => !kjernesak || metodeKanSendesTilKjernen(o.value));
</script>

<div class="form-content">
  <SkjemaStatus sender={submission.pending} feil={submission.error} />

  <FormPageHeader
    title="Krav om vederlagsjustering"
    intro={kjernesak
      ? 'Oppgi den faste prisen du tilbyr for endringen.'
      : 'Varsle kravet nå, eller spesifiser det når beregningsgrunnlaget foreligger.'}
  />

  {#if !kjernesak}
    <FormSection title="Innsending">
      <p class="submission-question">Hva vil du sende?</p>
      <SegmentedControl
        label="Hva vil du sende?"
        value={mode}
        options={[
          { value: 'varsel', label: 'Varsel' },
          { value: 'spesifisert', label: 'Spesifisert krav' },
        ]}
        onchange={(value) => (mode = value as typeof mode)}
      />
      <p class="helptext">
        {mode === 'varsel' ? 'Varsle uten å oppgi beløp.' : 'Oppgi beregningsmetode og beløp.'}
      </p>
    </FormSection>
  {/if}
  {#if mode === 'varsel'}
    <KonsekvensVarsler
      bind:value={varsler}
      hovedkategori={store.sak.grunnlag.hovedkategori ?? ''}
      tittel={store.sak.grunnlag.tittel ?? ''}
      includeFrist={false}
      disabled={submission.pending}
    />
  {:else}
    <FormSection title="Beregningsmetode" paragrafRef="§ 34.2">
      <SegmentedControl
        label="Beregningsmetode"
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

    {#if !kjernesak}
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
    {/if}

    <ReasoningEditor
      paragrafRef="§ 34.2"
      helptext={kjernesak
        ? 'Valgfri. Begrunnelsen følger kravet som utdypning under den låste teksten.'
        : 'Beskriv grunnlaget for kravet, omfanget og hvorfor den valgte beregningsmetoden passer.'}
      body={begrunnelse}
      placeholder={kjernesak
        ? 'Utdyp kravet om du vil...'
        : 'Begrunn kravets omfang og den valgte beregningsmetoden...'}
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
  {/if}
</div>

<style>
  .submission-question {
    margin: 14px 0;
    font-size: 14px;
    line-height: 1.55;
    color: var(--ink-2);
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
