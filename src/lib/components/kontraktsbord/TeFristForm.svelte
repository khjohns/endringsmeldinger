<script lang="ts">
  import SkjemaStatus from './SkjemaStatus.svelte';
  let vedleggIds = $state<string[]>([]);
  let vedleggOpptatt = $state(false);
  function buildEventData(...args: Parameters<typeof buildDomainData>) {
    return { ...buildDomainData(...args), vedlegg_ids: [...vedleggIds] };
  }
  import {
    beregnVisibility,
    beregnCanSubmit,
    beregnTeStatusSummary,
    getDynamicPlaceholder,
    getDefaults,
    buildEventData as buildDomainData,
    getEventType,
  } from '$lib/domain/fristSubmissionDomain';
  import type {
    FristSubmissionFormState,
    SubmissionScenario,
  } from '$lib/domain/fristSubmissionDomain';
  import type { FristVarselType, EventType } from '$lib/types/timeline';
  import {
    createSubmission,
    createFormDraft,
    submissionRefs,
    requireEventId,
  } from '$lib/kontraktsbord/submission.svelte';
  const submission = createSubmission(() => draft.clear());
  import { formatDateShortNorwegian } from '$lib/utils/dateFormatters';
  import { getCaseWorkspace } from '$lib/kontraktsbord/context.svelte';
  const store = getCaseWorkspace();
  // TS-saken (#909): foreløpig varsel uten fritekst (VS-U15), registrering av et varsel
  // sendt utenfor appen med datoen og brevet som vedlegg (MM-U1, OV-U4), og spesifisert
  // krav med begrunnelse (KA-U33), uten utsatt beregning og utkast. Kravversjonen og
  // varselet kommer fra kjernen.
  const kjernesak = store.erKjernesak ? store : null;
  import { letterText } from '$lib/approval/letter';
  import type { Kjernevedlegg } from '$lib/api/kjerne';
  const kanRegistrere = kjernesak?.tilbyrTe('varsle:frist') ?? false;
  const idag = new Date().toLocaleDateString('sv-SE');
  let varselSendt = $state('');
  let registrerteVedlegg = $state<Kjernevedlegg[]>([]);
  let opplastingsfeil = $state<string | null>(null);
  async function lastOppTilKjernen(filer: FileList | null) {
    if (!filer?.length || !kjernesak) return;
    vedleggOpptatt = true;
    opplastingsfeil = null;
    try {
      for (const fil of Array.from(filer))
        registrerteVedlegg = [...registrerteVedlegg, await kjernesak.kjernesak.lastOppVedlegg(fil)];
    } catch (e) {
      opplastingsfeil = e instanceof Error ? e.message : 'Filen ble ikke lastet opp.';
    } finally {
      vedleggOpptatt = false;
    }
  }
  import { getClaimReview } from '$lib/approval/claimReview.svelte';
  const claimReview = getClaimReview();
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
    onactions?: (a: {
      canSend: boolean;
      sendLabel?: string;
      send: () => void;
      utenBrev?: boolean;
    }) => void;
  } = $props();

  const existing = store.sak.frist;
  const scenario: SubmissionScenario = kjernesak
    ? kjernesak.kravversjon('frist') > 0
      ? 'edit'
      : kjernesak.tilbyrTe('sende_varsel:frist')
        ? 'new'
        : 'spesifisering'
    : existing.har_bh_foresporsel && existing.varsel_type !== 'spesifisert'
      ? 'foresporsel'
      : existing.varsel_type === 'spesifisert' && existing.krevd_dager !== undefined
        ? 'edit'
        : existing.frist_varsel
          ? 'spesifisering'
          : 'new';
  const existingVarselType =
    scenario === 'edit' && kjernesak ? 'spesifisert' : existing.varsel_type;
  const existingVarselDato = $derived(store.sak.frist.frist_varsel?.dato_sendt);
  const defaults = getDefaults({
    scenario,
    existingVarselDato: existing.frist_varsel?.dato_sendt,
    existing: existingVarselType
      ? {
          varsel_type: existingVarselType,
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

  let varselType = $state<FristVarselType | 'registrert' | undefined>(defaults.varselType);
  const registrerer = $derived(varselType === 'registrert');
  let antallDager = $state<number | undefined>(defaults.antallDager || undefined);
  let begrunnelse = $state(defaults.begrunnelse);
  let charCount = $state(defaults.begrunnelse.replace(/<[^>]*>/g, '').trim().length);

  const visibility = $derived(
    beregnVisibility(
      { varselType: registrerer ? 'varsel' : (varselType as FristVarselType) },
      { scenario }
    )
  );
  // Kjernen tilbyr valgene. Utsatt beregning etter § 33.6.2 har ingen kommando ennå.
  const segmentOptions = $derived(
    kjernesak
      ? [
          ...(kjernesak.tilbyrTe('sende_varsel:frist')
            ? [{ value: 'varsel', label: 'Foreløpig varsel' }]
            : []),
          ...(kjernesak.tilbyrTe('krav:frist')
            ? [{ value: 'spesifisert', label: 'Spesifisert krav' }]
            : []),
          ...(kanRegistrere ? [{ value: 'registrert', label: 'Varsel sendt utenfor appen' }] : []),
        ]
      : visibility.segmentOptions
  );
  // KA-U33: kjernen avviser et fristkrav uten begrunnelse (BEGRUNNELSE_MANGLER). Blanke
  // tegn teller ikke, som i adapteren (#943).
  const begrunnelseMangler = $derived(
    Boolean(kjernesak) && varselType === 'spesifisert' && !letterText(begrunnelse).trim()
  );
  const varselDatoLabel = $derived(formatDateShortNorwegian(existingVarselDato));
  const mappedState: FristSubmissionFormState = $derived({
    varselType: registrerer ? 'varsel' : (varselType as FristVarselType | undefined),
    tidligereVarslet: Boolean(existingVarselDato),
    varselDato: existingVarselDato,
    antallDager: antallDager ?? 0,
    nySluttdato: undefined,
    // Varselet fra appen har ingen fritekst i TS-saken (VS-U15).
    begrunnelse: kjernesak && (varselType === 'varsel' || registrerer) ? '' : begrunnelse,
    begrunnelseValidationError: undefined,
    vilkarOppfylt: undefined,
  });
  // Kjernen krever hele dager og en tekst, men vurderer ikke om teksten er nok (KA-U19).
  const kanSende = $derived(
    kjernesak
      ? varselType === 'varsel' ||
          (registrerer &&
            varselSendt !== '' &&
            varselSendt <= idag &&
            registrerteVedlegg.length > 0) ||
          (varselType === 'spesifisert' &&
            Number.isInteger(antallDager) &&
            (antallDager ?? 0) > 0 &&
            !begrunnelseMangler)
      : beregnCanSubmit(mappedState, { scenario }) && (varselType === 'varsel' || charCount >= 10)
  );
  const statusSummary = $derived(beregnTeStatusSummary(mappedState, { scenario }));
  const draft = createFormDraft(
    !store.isDemo && !kjernesak,
    {
      sakId: store.sak.sak_id,
      spor: 'frist',
      revisjon: kjernesak ? kjernesak.kravversjon('frist') : store.sak.frist.antall_versjoner,
    },
    () => ({ vedleggIds, varselType, antallDager, begrunnelse }),
    (saved) => {
      vedleggIds = saved.vedleggIds ?? [];
      varselType = saved.varselType as FristVarselType | undefined;
      antallDager = saved.antallDager;
      begrunnelse = saved.begrunnelse ?? '';
    }
  );

  $effect(() => {
    onactions?.({
      canSend: kanSende && !submission.pending && !vedleggOpptatt,
      utenBrev: registrerer,
      sendLabel: registrerer
        ? 'Registrer varselet'
        : scenario === 'edit'
          ? 'Send oppdatert krav'
          : scenario === 'spesifisering'
            ? 'Send spesifisert krav'
            : varselType === 'varsel'
              ? 'Send varsel'
              : 'Send fristkrav',
      send: () => {
        if (vedleggOpptatt) return;
        if (kanSende)
          void submission.run(async () => {
            if (claimReview) {
              await claimReview.submit(
                'frist',
                getEventType({ scenario }) as EventType,
                {
                  ...(registrerer
                    ? { registrert: { sendt: varselSendt, vedlegg: registrerteVedlegg } }
                    : {}),
                  ...buildEventData(mappedState, {
                    scenario,
                    grunnlagEventId:
                      submissionRefs(store.timeline, 'grunnlag').claimId ?? 'demo-grunnlag',
                    originalEventId:
                      scenario !== 'new'
                        ? (submissionRefs(store.timeline, 'frist').claimId ??
                          existing.varsler?.find((v) => v.type === 'frist')?.event_id)
                        : undefined,
                    erSvarPaForesporsel: scenario === 'foresporsel',
                  }),
                },
                () => {
                  if (store.isDemo)
                    store.sendTeFrist(antallDager, varselType as FristVarselType, begrunnelse);
                }
              );
              return;
            }
            if (store.isDemo)
              store.sendTeFrist(antallDager, varselType as FristVarselType, begrunnelse);
            else
              await store.submit(getEventType({ scenario }) as EventType, {
                ...buildEventData(mappedState, {
                  scenario,
                  grunnlagEventId: requireEventId(
                    submissionRefs(store.timeline, 'grunnlag').claimId
                  ),
                  originalEventId:
                    scenario !== 'new'
                      ? requireEventId(
                          submissionRefs(store.timeline, 'frist').claimId ??
                            existing.varsler?.find((v) => v.type === 'frist')?.event_id
                        )
                      : undefined,
                  erSvarPaForesporsel: scenario === 'foresporsel',
                }),
              });
          }, onsend);
      },
    });
  });
</script>

{#if draft.ready}
  <div class="form-content">
    <SkjemaStatus
      sender={submission.pending}
      feil={submission.error}
      utkastStatus={draft.status}
      konflikt={draft.konflikt}
      sistEndretAv={draft.sistEndretAv}
      behold={draft.behold}
      hentInn={draft.hentInn}
      sakId={store.sak.sak_id}
      visVedlegg={!store.isDemo && !kjernesak}
      bind:vedleggIds
      bind:vedleggOpptatt
    />

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

    {#if scenario !== 'edit' || segmentOptions.length > 1}
      <FormSection title="Kravstype" paragrafRef="§ 33.4 / § 33.6">
        <SegmentedControl
          label="Kravstype"
          options={segmentOptions}
          value={varselType ?? ''}
          onchange={(value) => (varselType = value as FristVarselType)}
        />
        {#if registrerer}
          <p class="helptext">
            Registrer et varsel etter § 33.4 som er sendt utenfor appen, med datoen det ble sendt og
            brevet som vedlegg. Appen lager ikke noe brev, og datoen kan ikke endres etterpå.
          </p>
        {:else if varselType === 'varsel' && kjernesak}
          <p class="helptext">
            Varselet etter § 33.4 sendes med dagens dato, uten dager og uten fritekst. Antall dager
            kreves senere i et spesifisert krav.
          </p>
        {:else if varselType === 'varsel'}
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

    {#if registrerer}
      <FormSection title="Varselet som er sendt" paragrafRef="§ 33.4">
        <label class="field-label" for="te-frist-varsel-sendt">Datoen varselet ble sendt</label>
        <input
          id="te-frist-varsel-sendt"
          class="field-input"
          type="date"
          max={idag}
          bind:value={varselSendt}
        />
        {#if varselSendt > idag}
          <p class="helptext" role="status">Datoen er etter dagens dato.</p>
        {/if}
        <label class="field-label" for="te-frist-varsel-brev">Brevet med varselet</label>
        <input
          id="te-frist-varsel-brev"
          type="file"
          multiple
          disabled={vedleggOpptatt}
          onchange={(e) => {
            const felt = e.currentTarget;
            void lastOppTilKjernen(felt.files).then(() => (felt.value = ''));
          }}
        />
        {#if vedleggOpptatt}<p class="helptext" role="status">Laster opp …</p>{/if}
        {#if opplastingsfeil}<p role="alert">{opplastingsfeil}</p>{/if}
        {#if registrerteVedlegg.length}
          <ul class="vedleggsliste">
            {#each registrerteVedlegg as v (v.vedlegg_id)}
              <li>
                {v.filnavn}
                <button
                  type="button"
                  class="btn btn-secondary"
                  onclick={() => (registrerteVedlegg = registrerteVedlegg.filter((x) => x !== v))}
                  >Fjern</button
                >
              </li>
            {/each}
          </ul>
        {:else}
          <p class="helptext">Brevet som ble sendt, må ligge ved.</p>
        {/if}
      </FormSection>
    {:else if visibility.showKravSection}
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
        placeholder={getDynamicPlaceholder(mappedState.varselType)}
        onchange={(html) => (begrunnelse = html)}
        oncharcount={(count) => (charCount = count)}
      />
      {#if begrunnelseMangler}
        <p class="helptext" role="status">Begrunnelsen for antallet dager mangler.</p>
      {/if}
    {/if}

    {#if kanSende && statusSummary}
      <div class="status-box">
        <span class="status-label">Klar til sending</span>
        <div class="font-mono status-text">{statusSummary}</div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .field-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    margin: 12px 0 6px;
  }
  .field-input {
    padding: 6px 8px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    color: var(--ink);
  }
  .vedleggsliste {
    list-style: none;
    padding: 0;
    margin: 8px 0 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .vedleggsliste li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
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
