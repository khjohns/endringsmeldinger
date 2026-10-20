<script lang="ts">
  import SkjemaStatus from './SkjemaStatus.svelte';
  import FormPageHeader from './components/FormPageHeader.svelte';
  import FormSection from './components/FormSection.svelte';
  import ReasoningEditor from './components/ReasoningEditor.svelte';
  import SegmentedControl from './components/SegmentedControl.svelte';
  import { getCaseWorkspace } from '$lib/kontraktsbord/context.svelte';
  import {
    createSubmission,
    submissionRefs,
    requireEventId,
  } from '$lib/kontraktsbord/submission.svelte';
  import { getClaimReview } from '$lib/approval/claimReview.svelte';
  import {
    buildEventData,
    eventTypeFor,
    foresporselTekst,
    innsigelseTekst,
    tilgjengeligeHandlinger,
    type FristVarselHandling,
  } from '$lib/domain/fristVarselDomain';
  import { formatDateNorwegian, formatDateShortNorwegian } from '$lib/utils/dateFormatters';

  let {
    onsend,
    onactions,
  }: {
    onsend: () => void;
    onactions?: (a: { canSend: boolean; sendLabel?: string; send: () => void }) => void;
  } = $props();

  const store = getCaseWorkspace();
  const claimReview = getClaimReview();
  const submission = createSubmission();

  const tilgjengelig = $derived(tilgjengeligeHandlinger(store.sak.frist));
  let handling = $state<FristVarselHandling | undefined>(undefined);
  let tillegg = $state('');
  let svarfrist = $state('');

  const varselDato = $derived(store.sak.frist.frist_varsel?.dato_sendt);
  const fastTekst = $derived(
    handling === 'innsigelse'
      ? innsigelseTekst(varselDato ? formatDateNorwegian(varselDato) : undefined)
      : handling === 'foresporsel'
        ? foresporselTekst(svarfrist ? formatDateNorwegian(svarfrist) : undefined)
        : ''
  );
  const kanSende = $derived(
    handling !== undefined && tilgjengelig[handling] && !submission.pending
  );

  $effect(() => {
    onactions?.({
      canSend: kanSende,
      send: () => {
        if (!kanSende || !handling) return;
        const valgt = handling;
        void submission.run(async () => {
          const data = buildEventData(valgt, {
            fristKravId: requireEventId(submissionRefs(store.timeline, 'frist').claimId),
            tillegg,
            varselDato: varselDato ? formatDateNorwegian(varselDato) : undefined,
            svarfrist: svarfrist || undefined,
            svarfristVist: svarfrist ? formatDateNorwegian(svarfrist) : undefined,
          });
          await claimReview!.submit(
            'frist',
            eventTypeFor(valgt),
            data,
            (demo) =>
              demo.sendFristVarselHandling(valgt, {
                begrunnelse: String(data.begrunnelse),
                svarfrist: svarfrist || undefined,
              }),
            'BH'
          );
        }, onsend);
      },
    });
  });
</script>

<div class="form-content">
  <SkjemaStatus sender={submission.pending} feil={submission.error} />

  <FormPageHeader
    title="Varsel om fristforlengelse"
    intro="Entreprenøren har ikke angitt antall dager. Byggherren svarer på kravet når det er spesifisert (§ 33.7). Før det kan byggherren gjøre innsigelse mot at varselet kom for sent, eller be om et spesifisert krav."
  />

  <section class="notice">
    <span class="eyebrow">Entreprenørens varsel</span>
    <strong>Antall dager er ikke spesifisert</strong>
    {#if varselDato}
      <span class="meta">Varslet {formatDateShortNorwegian(varselDato)}</span>
    {/if}
    {#if store.sak.frist.har_bh_foresporsel && store.sak.frist.dato_bh_foresporsel}
      <span class="meta">
        Forespørsel sendt {formatDateShortNorwegian(store.sak.frist.dato_bh_foresporsel)}
        {#if store.sak.frist.frist_for_spesifisering}
          · svarfrist {formatDateShortNorwegian(store.sak.frist.frist_for_spesifisering)}
        {/if}
      </span>
    {/if}
    {#if store.sak.frist.frist_varsel_ok === false}
      <span class="meta">Innsigelse mot sen varsling er sendt</span>
    {/if}
  </section>

  <FormSection title="Handling" paragrafRef="§ 5 / § 33.6.2">
    <SegmentedControl
      label="Handling"
      options={[
        ...(tilgjengelig.innsigelse
          ? [{ value: 'innsigelse', label: 'Innsigelse mot sen varsling' }]
          : []),
        ...(tilgjengelig.foresporsel
          ? [{ value: 'foresporsel', label: 'Be om spesifisert krav' }]
          : []),
      ]}
      value={handling ?? ''}
      onchange={(value) => (handling = value as FristVarselHandling)}
    />
    {#if !tilgjengelig.innsigelse && !tilgjengelig.foresporsel}
      <p class="helptext">
        Innsigelsen er sendt, og forespørselen venter på svar fra entreprenøren.
      </p>
    {:else if handling === 'innsigelse'}
      <p class="helptext">
        Innsigelsen må fremsettes skriftlig uten ugrunnet opphold etter at varselet er mottatt.
        Ellers anses varselet gitt i tide (§ 5 tredje ledd).
      </p>
    {:else if handling === 'foresporsel'}
      <p class="helptext">
        Forespørselen sendes per brev. Svarer ikke entreprenøren uten ugrunnet opphold, tapes kravet
        (§ 33.6.2 tredje ledd).
      </p>
    {/if}
  </FormSection>

  {#if handling === 'foresporsel'}
    <FormSection title="Svarfrist" paragrafRef="§ 33.6.2">
      <label class="date-field">
        <span>Be om svar innen (valgfritt)</span>
        <input type="date" bind:value={svarfrist} />
      </label>
    </FormSection>
  {/if}

  {#if handling}
    <section class="fixed-text">
      <span class="eyebrow">Fast tekst i brevet</span>
      <p>{fastTekst}</p>
    </section>

    <ReasoningEditor
      title="Utdypende begrunnelse"
      paragrafRef={handling === 'innsigelse' ? '§ 5' : '§ 33.6.2'}
      helptext="Valgfritt. Teksten kommer etter den faste teksten i brevet."
      body={tillegg}
      placeholder={handling === 'innsigelse'
        ? 'For eksempel når hindringen inntraff og når varselet kom.'
        : 'For eksempel hvilket underlag byggherren trenger.'}
      onchange={(html) => (tillegg = html)}
      oncharcount={() => {}}
    />
  {/if}
</div>

<style>
  .notice,
  .fixed-text {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 16px;
    padding: 18px 20px;
    background: var(--surface-inset);
    border: var(--rule);
    border-radius: 12px;
  }
  .eyebrow {
    font-size: 10px;
    font-weight: 700;
    line-height: 1.4;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--ink-4);
  }
  .notice strong {
    font-size: 16px;
    color: var(--ink);
  }
  .meta {
    font-size: 11px;
    color: var(--ink-4);
  }
  .fixed-text p {
    margin: 0;
    font-size: 13px;
    line-height: 1.55;
    color: var(--ink-2);
  }
  .date-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 12px;
    font-size: 13px;
    color: var(--ink-2);
  }
  .date-field input {
    max-width: 220px;
    padding: 8px 10px;
    font: inherit;
    background: var(--surface);
    border: var(--rule-strong);
    border-radius: 8px;
  }
</style>
