<script lang="ts">
  import {
    beregnVisibility,
    beregnCanSubmit,
    beregnTeStatusSummary,
    getDynamicPlaceholder,
    getDefaults,
  } from '$lib/domain/fristSubmissionDomain';
  import type {
    FristSubmissionFormState,
    SubmissionScenario,
  } from '$lib/domain/fristSubmissionDomain';
  import type { FristVarselType } from '$lib/types/timeline';
  import { formatDateShortNorwegian } from '$lib/utils/dateFormatters';
  import { store } from './store.svelte.js';
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
    onactions?: (a: { canSend: boolean; sendLabel?: string; send: () => void }) => void;
  } = $props();

  const existing = store.sak.frist;
  const scenario: SubmissionScenario =
    existing.varsel_type === 'spesifisert' && existing.krevd_dager !== undefined
      ? 'edit'
      : existing.frist_varsel
        ? 'spesifisering'
        : 'new';
  const existingVarselDato = $derived(store.sak.frist.frist_varsel?.dato_sendt);
  const defaults = getDefaults({
    scenario,
    existingVarselDato: existing.frist_varsel?.dato_sendt,
    existing: existing.varsel_type
      ? {
          varsel_type: existing.varsel_type,
          antall_dager: existing.krevd_dager,
          begrunnelse: existing.begrunnelse,
          frist_varsel: existing.frist_varsel?.dato_sendt
            ? {
                dato_sendt: existing.frist_varsel.dato_sendt,
                metode: existing.frist_varsel.metode ?? [],
              }
            : undefined,
          ny_sluttdato: existing.ny_sluttdato,
        }
      : undefined,
  });

  let varselType = $state<FristVarselType | undefined>(defaults.varselType);
  let antallDager = $state<number | undefined>(defaults.antallDager || undefined);
  let begrunnelse = $state(defaults.begrunnelse);
  let charCount = $state(defaults.begrunnelse.replace(/<[^>]*>/g, '').trim().length);

  const visibility = $derived(beregnVisibility({ varselType }, { scenario }));
  const varselDatoLabel = $derived(formatDateShortNorwegian(existingVarselDato));
  const mappedState: FristSubmissionFormState = $derived({
    varselType,
    tidligereVarslet: Boolean(existingVarselDato),
    varselDato: existingVarselDato,
    antallDager: antallDager ?? 0,
    nySluttdato: undefined,
    begrunnelse,
    begrunnelseValidationError: undefined,
    vilkarOppfylt: undefined,
  });
  const kanSende = $derived(
    beregnCanSubmit(mappedState, { scenario }) && (varselType === 'varsel' || charCount >= 10)
  );
  const statusSummary = $derived(beregnTeStatusSummary(mappedState, { scenario }));

  $effect(() => {
    onactions?.({
      canSend: kanSende,
      sendLabel:
        scenario === 'edit'
          ? 'Send oppdatert krav'
          : scenario === 'spesifisering'
            ? 'Send spesifisert krav'
            : varselType === 'varsel'
              ? 'Send varsel'
              : 'Send fristkrav',
      send: () => {
        store.sendTeFrist(antallDager, varselType, begrunnelse);
        onsend();
      },
    });
  });
</script>

<div class="form-content">
  <CaseAnchor />

  <FormPageHeader
    title="Krav om fristforlengelse"
    intro={scenario === 'edit'
      ? 'Oppdater antall dager eller begrunnelsen for det innsendte fristkravet.'
      : 'Angi kravstype, antall dager og hvordan kontraktsforholdet påvirker fremdriften.'}
  />

  {#if existingVarselDato && scenario !== 'edit'}
    <section class="prior-notice">
      <div class="prior-notice-header">
        <div>
          <span class="eyebrow">Tidligere innsending</span>
          <h2>Foreløpig varsel</h2>
        </div>
        <span class="font-mono prior-notice-ref">§ 33.4</span>
      </div>
      <div class="prior-notice-meta">Sendt {varselDatoLabel}</div>
      <p>Kravet kan nå spesifiseres med antall dager og begrunnelse etter § 33.6.</p>
    </section>
  {/if}

  <div class="standpunkt-heading">
    <span class="standpunkt-title">Entreprenørens krav</span>
    <span class="font-mono standpunkt-ref">§ 33.1</span>
  </div>

  {#if scenario !== 'edit'}
    <FormSection title="Kravstype" paragrafRef="§ 33.4 / § 33.6">
      <SegmentedControl
        label="Kravstype"
        options={visibility.segmentOptions}
        value={varselType ?? ''}
        onchange={(value) => (varselType = value as FristVarselType)}
      />
      {#if varselType === 'varsel'}
        <p class="helptext">
          Varselet registreres med dagens dato. Antall dager kan spesifiseres når grunnlaget for å
          beregne omfanget foreligger.
        </p>
      {:else if varselType === 'spesifisert'}
        <p class="helptext">
          Angi det antall dager som kreves, og dokumenter virkningen på fremdriften.
        </p>
      {:else if varselType === 'begrunnelse_utsatt'}
        <p class="helptext">
          Begrunn hvorfor grunnlaget for å beregne kravet ennå ikke foreligger.
        </p>
      {/if}
    </FormSection>
  {/if}

  {#if visibility.showKravSection}
    {#if varselType === 'spesifisert'}
      <FormSection title="Utmåling" paragrafRef="§ 33.5">
        <p class="helptext">
          Fristforlengelsen skal svare til den virkningen kontraktsforholdet har hatt eller vil få
          på fremdriften.
        </p>
        <NumberField
          id="te-frist-antall-dager"
          label="Antall dager"
          suffix="dager"
          value={antallDager}
          onchange={(value) => (antallDager = value)}
        />
      </FormSection>
    {/if}

    <ReasoningEditor
      title={varselType === 'begrunnelse_utsatt'
        ? 'Begrunnelse for utsatt beregning'
        : 'Begrunnelse og årsakssammenheng'}
      paragrafRef={varselType === 'begrunnelse_utsatt' ? '§ 33.6.2' : '§ 33.1 / § 33.5'}
      helptext={varselType === 'begrunnelse_utsatt'
        ? 'Forklar hvorfor kravet ikke kan beregnes nå, og når et spesifisert krav kan forventes.'
        : 'Beskriv fremdriftshindringen, sammenhengen med kontraktsforholdet og hvordan antall dager er beregnet. Oppgi om virkningen ligger på kritisk linje.'}
      body={begrunnelse}
      placeholder={getDynamicPlaceholder(varselType)}
      onchange={(html) => (begrunnelse = html)}
      oncharcount={(count) => (charCount = count)}
    />
  {/if}

  {#if kanSende && statusSummary}
    <div class="status-box">
      <span class="status-label">Klar til sending</span>
      <div class="font-mono status-text">{statusSummary}</div>
    </div>
  {/if}
</div>

<style>
  .prior-notice {
    margin-bottom: 24px;
    padding: 18px 20px;
    background: var(--surface-inset);
    border: var(--rule);
    border-radius: 12px;
  }
  .prior-notice-header,
  .standpunkt-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }
  .eyebrow,
  .standpunkt-title,
  .status-label {
    font-size: 10px;
    font-weight: 700;
    line-height: 1.4;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--ink-4);
  }
  .prior-notice h2 {
    margin-top: 4px;
    font-size: 16px;
    line-height: 1.4;
    color: var(--ink);
  }
  .prior-notice-ref,
  .standpunkt-ref {
    font-size: 11px;
    color: var(--ink-4);
  }
  .prior-notice-meta {
    margin-top: 7px;
    font-size: 11px;
    color: var(--ink-4);
  }
  .prior-notice p {
    margin-top: 10px;
    font-size: 13px;
    line-height: 1.55;
    color: var(--ink-2);
  }
  .standpunkt-heading {
    margin-bottom: 16px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--color-wire);
  }
  .standpunkt-title {
    font-size: 12px;
    color: var(--ink-3);
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
  .form-content .status-text {
    font-size: 13px;
    color: var(--ink);
  }

  @media (max-width: 640px) {
    .form-content .status-box {
      align-items: flex-start;
      flex-direction: column;
      gap: 5px;
    }
  }
</style>
