<script lang="ts">
  import { AlertTriangle, Check, CircleMinus, Clock3, RefreshCw, X } from 'lucide-svelte';
  import ExpandableReasoning from '$lib/components/patterns/ExpandableReasoning.svelte';
  import StatementCard from '$lib/components/patterns/StatementCard.svelte';
  import { beregnAlt } from '$lib/domain/fristDomain';
  import type { FristDomainConfig, FristFormState } from '$lib/domain/fristDomain';
  import { generateFristResponseBegrunnelse } from '$lib/domain/begrunnelse/fristBegrunnelse';
  import type { FristResponseInput } from '$lib/domain/begrunnelse/fristBegrunnelse';
  import { tokensToHtml } from '$lib/editor/tokenConverter';
  import LockedValueNode from '$lib/editor/LockedValueNode';
  import RichTextEditor from '$lib/components/primitives/RichTextEditor.svelte';
  import QuestionCard from '$lib/components/patterns/QuestionCard.svelte';
  import StandpointHeading from '$lib/components/patterns/StandpointHeading.svelte';
  import { isHtmlEmpty } from '$lib/utils/formatters';
  import { formatDateShortNorwegian } from '$lib/utils/dateFormatters';
  import { store } from './store.svelte.js';
  import { sporResultatLabel, toggleChoice } from './utils.js';
  import CaseAnchor from './CaseAnchor.svelte';
  import FormPageHeader from './components/FormPageHeader.svelte';
  import NumberField from './components/NumberField.svelte';
  import Stamp from './Stamp.svelte';

  let {
    domainConfig,
    onsend,
    onactions,
  }: {
    domainConfig: FristDomainConfig;
    onsend: () => void;
    onactions?: (a: { canSend: boolean; send: () => void }) => void;
  } = $props();

  let fristVarselOk = $state<boolean | undefined>();
  let spesifisertKravOk = $state<boolean | undefined>();
  let foresporselSvarOk = $state<boolean | undefined>();
  let vilkarOppfylt = $state<boolean | undefined>();
  let sendForesporsel = $state(false);
  let godkjentDager = $state<number | undefined>();

  let begrunnelseHtml = $state('');
  let userHasEdited = $state(false);
  let editorApi: { setContent: (html: string) => void } | undefined;
  let prevHtml: string | undefined;
  let charCount = $state(0);

  const formState: FristFormState = $derived({
    fristVarselOk,
    spesifisertKravOk,
    foresporselSvarOk,
    vilkarOppfylt,
    sendForesporsel,
    godkjentDager,
    begrunnelse: begrunnelseHtml,
    begrunnelseValidationError: undefined,
  });

  const computed = $derived(beregnAlt(formState, domainConfig));
  const isHelSubsidiaer = $derived(
    domainConfig.erGrunnlagSubsidiaer || domainConfig.erHelFristSubsidiaerPgaGrunnlag
  );
  const hasPartialSubsidiaer = $derived(!isHelSubsidiaer && spesifisertKravOk === false);
  const hasForesporselSubsidiaer = $derived(!isHelSubsidiaer && foresporselSvarOk === false);
  const isSubsidiaer = $derived(
    isHelSubsidiaer || hasPartialSubsidiaer || hasForesporselSubsidiaer
  );

  const submissionMeta = $derived.by(() => {
    const events = store.timeline.filter(
      (event) =>
        event.spor === 'frist' &&
        event.actorrole === 'TE' &&
        (event.type.endsWith('.frist_krav_sendt') ||
          event.type.endsWith('.frist_krav_oppdatert') ||
          event.type.endsWith('.frist_krav_spesifisert'))
    );
    const latest = events.at(-1);
    const revision = Math.max(0, events.length - 1, store.sak.frist.antall_versjoner - 1);
    return {
      forelopig: store.sak.frist.frist_varsel?.dato_sendt
        ? `Sendt ${formatDateShortNorwegian(store.sak.frist.frist_varsel.dato_sendt)}`
        : undefined,
      spesifisert: store.sak.frist.spesifisert_varsel?.dato_sendt
        ? `Sendt ${formatDateShortNorwegian(store.sak.frist.spesifisert_varsel.dato_sendt)}`
        : undefined,
      latest: latest?.time
        ? `${revision > 0 ? 'Sist oppdatert' : 'Sendt'} ${formatDateShortNorwegian(latest.time)} · ${revision === 0 ? 'opprinnelig krav' : `rev. ${revision}`}`
        : undefined,
    };
  });

  const subsidiærNotice = $derived.by(() => {
    if (domainConfig.erGrunnlagSubsidiaer)
      return 'Grunnlaget er avslått. Vurderingen nedenfor gjelder dersom grunnlaget likevel godkjennes.';
    if (domainConfig.erHelFristSubsidiaerPgaGrunnlag)
      return 'Grunnlaget ble varslet for sent (§ 32.2). Hele fristkravet behandles subsidiært.';
    if (hasForesporselSubsidiaer)
      return 'Svaret på forespørselen er vurdert som for sent. Den videre vurderingen er subsidiær.';
    if (hasPartialSubsidiaer)
      return 'Det spesifiserte kravet er fremsatt for sent. Utmålingen nedenfor gjelder subsidiært og begrenses til det åpenbare.';
    return '';
  });

  const resultat = $derived.by(() => {
    if (sendForesporsel) {
      return {
        ikon: CircleMinus,
        konklusjon: 'Forespørsel om spesifisering',
        variant: 'neutral' as const,
      };
    }
    const r = computed.prinsipaltResultat;
    const konklusjon = `Kravet er ${sporResultatLabel(r).toLocaleLowerCase('nb-NO')}`;
    if (r === 'godkjent') return { ikon: Check, konklusjon, variant: 'positive' as const };
    if (r === 'delvis_godkjent')
      return { ikon: CircleMinus, konklusjon, variant: 'mixed' as const };
    return { ikon: X, konklusjon, variant: 'negative' as const };
  });

  const prinsipaltGodkjent = $derived(
    computed.prinsipaltResultat === 'avslatt' ? 0 : (godkjentDager ?? 0)
  );
  const subsidiaertGodkjent = $derived(
    computed.subsidiaertResultat === 'avslatt' ? 0 : (godkjentDager ?? 0)
  );

  const allAnswered = $derived.by(() => {
    if (sendForesporsel) return true;
    if (computed.visibility.showFristVarselOk && fristVarselOk === undefined) return false;
    if (computed.visibility.showSpesifisertKravOk && spesifisertKravOk === undefined) return false;
    if (computed.visibility.showForesporselSvarOk && foresporselSvarOk === undefined) return false;
    if (vilkarOppfylt === undefined) return false;
    if (computed.showGodkjentDager && godkjentDager === undefined) return false;
    if (isHtmlEmpty(begrunnelseHtml)) return false;
    return true;
  });

  const autoBegrunnelseHtml = $derived.by(() => {
    if (!sendForesporsel && (vilkarOppfylt === undefined || godkjentDager === undefined)) return '';
    const input: FristResponseInput = {
      varselType: domainConfig.varselType,
      krevdDager: domainConfig.krevdDager,
      fristVarselOk,
      spesifisertKravOk,
      foresporselSvarOk,
      sendForesporsel,
      vilkarOppfylt: vilkarOppfylt ?? false,
      godkjentDager: godkjentDager ?? 0,
      erPrekludert: computed.erPrekludert,
      erForesporselSvarForSent: foresporselSvarOk === false,
      erRedusert_33_6_1: computed.erRedusert,
      harTidligereVarselITide: domainConfig.harTidligereVarselITide,
      erGrunnlagSubsidiaer: domainConfig.erGrunnlagSubsidiaer,
      erGrunnlagPrekludert: domainConfig.erHelFristSubsidiaerPgaGrunnlag,
      prinsipaltResultat: computed.prinsipaltResultat,
      subsidiaertResultat: computed.subsidiaertResultat,
      visSubsidiaertResultat: computed.visSubsidiaertResultat,
    };
    return tokensToHtml(generateFristResponseBegrunnelse(input, { useTokens: true }));
  });

  $effect(() => {
    if (!userHasEdited && autoBegrunnelseHtml) begrunnelseHtml = autoBegrunnelseHtml;
  });

  $effect(() => {
    const html = begrunnelseHtml;
    if (editorApi && html !== prevHtml) {
      editorApi.setContent(html);
      prevHtml = html;
    }
  });

  function handleEditorReady(api: { setContent: (html: string) => void }) {
    editorApi = api;
    if (begrunnelseHtml) {
      api.setContent(begrunnelseHtml);
      prevHtml = begrunnelseHtml;
    }
  }

  function handleEditorChange(newHtml: string) {
    prevHtml = newHtml;
    begrunnelseHtml = newHtml;
    userHasEdited = true;
  }

  function handleRegenerate() {
    if (!autoBegrunnelseHtml) return;
    begrunnelseHtml = autoBegrunnelseHtml;
    userHasEdited = false;
  }

  $effect(() => {
    onactions?.({
      canSend: allAnswered,
      send: () => {
        store.sendFristSvar(prinsipaltGodkjent, {
          fristVarselOk,
          spesifisertKravOk,
          foresporselSvarOk,
          sendForesporsel,
          vilkarOppfylt,
          subsidiaerTriggers: computed.subsidiaerTriggers,
          subsidiaerGodkjentDager:
            !sendForesporsel && computed.visSubsidiaertResultat ? subsidiaertGodkjent : undefined,
          begrunnelse: begrunnelseHtml,
        });
        onsend();
      },
    });
  });
</script>

{#snippet answerButtons(
  answer: boolean | undefined,
  yesText: string,
  noText: string,
  onset: (value: boolean | undefined) => void
)}
  <div class="segment-row">
    <button
      type="button"
      class="segment-btn"
      class:segment-active={answer === true}
      class:seg-yes={answer === true}
      onclick={() => onset(toggleChoice(answer, true))}>{yesText}</button
    >
    <button
      type="button"
      class="segment-btn"
      class:segment-active={answer === false}
      class:seg-no={answer === false}
      onclick={() => onset(toggleChoice(answer, false))}>{noText}</button
    >
  </div>
{/snippet}

<div class="form-content">
  <CaseAnchor />

  <FormPageHeader
    title="Svar på krav om fristforlengelse"
    intro="Vurder varsling, årsakssammenheng og hvor mange dager byggherren godkjenner."
  />

  <div class="claim-overview">
    <StatementCard
      eyebrow="Totalentreprenørens krav"
      partyName={store.teNavn}
      reference="§ 33.4 / § 33.6.1"
    >
      {#snippet icon()}<Clock3 size={14} />{/snippet}

      <div class="claim-summary">
        {#if domainConfig.varselType === 'spesifisert'}
          <div class="primary-days">
            <span class="sammendrag-label">Krevd fristforlengelse</span>
            <strong class="font-mono">{domainConfig.krevdDager} dager</strong>
          </div>
        {:else if domainConfig.varselType === 'begrunnelse_utsatt'}
          <div class="notice-hero">
            <span class="sammendrag-label">Foreløpig krav om fristforlengelse</span>
            <strong>Fristvirkningen beregnes senere</strong>
            <p>Entreprenøren har begrunnet hvorfor antall dager ennå ikke kan spesifiseres.</p>
          </div>
        {:else}
          <div class="notice-hero">
            <span class="sammendrag-label">Varsel om fristforlengelse</span>
            <strong>Foreløpig varsel</strong>
            <p>Antall dager er ikke spesifisert ennå.</p>
          </div>
        {/if}
      </div>

      {#if submissionMeta.forelopig || submissionMeta.spesifisert || submissionMeta.latest}
        <div class="sammendrag-datoer">
          {#if submissionMeta.forelopig}
            <span><strong>Foreløpig varsel</strong>{submissionMeta.forelopig}</span>
          {/if}
          {#if submissionMeta.spesifisert}
            <span><strong>Spesifisert krav</strong>{submissionMeta.spesifisert}</span>
          {/if}
          {#if submissionMeta.latest}
            <span><strong>Gjeldende versjon</strong>{submissionMeta.latest}</span>
          {/if}
        </div>
      {/if}

      <ExpandableReasoning
        label="Entreprenørens begrunnelse"
        html={store.display('frist').teText}
      />
    </StatementCard>
  </div>

  {#if isHelSubsidiaer && subsidiærNotice}
    <div class="subsidiaer-notice">
      <span class="subsidiaer-notice-mark" aria-hidden="true"></span>
      <p>{subsidiærNotice}</p>
    </div>
  {/if}

  <StandpointHeading subsidiary={isSubsidiaer} />

  {#if computed.visibility.showFristVarselOk || computed.visibility.showSpesifisertKravOk || computed.visibility.showForesporselSvarOk}
    <QuestionCard
      title="Varsling og frister"
      paragrafRef="§ 33.4 / § 33.6"
      description="Vurder om entreprenørens varsler og krav er fremsatt i tide."
    >
      {#if computed.visibility.showFristVarselOk}
        <div class="preklusjons-rad">
          <span class="preklusjons-copy">
            <span class="preklusjons-label">Foreløpig varsel (§ 33.4)</span>
            {#if submissionMeta.forelopig}
              <span class="preklusjons-meta">{submissionMeta.forelopig}</span>
            {/if}
          </span>
          {@render answerButtons(
            fristVarselOk,
            'Ja, i tide',
            'Nei, for sent',
            (value) => (fristVarselOk = value)
          )}
        </div>
      {/if}

      {#if computed.visibility.showSpesifisertKravOk}
        <div class="preklusjons-rad">
          <span class="preklusjons-copy">
            <span class="preklusjons-label">Spesifisert krav (§ 33.6.1)</span>
            {#if submissionMeta.spesifisert}
              <span class="preklusjons-meta">{submissionMeta.spesifisert}</span>
            {/if}
          </span>
          {@render answerButtons(
            spesifisertKravOk,
            'Ja, i tide',
            'Nei, for sent',
            (value) => (spesifisertKravOk = value)
          )}
        </div>
      {/if}

      {#if computed.visibility.showForesporselSvarOk}
        <div class="preklusjons-rad">
          <span class="preklusjons-copy">
            <span class="preklusjons-label">Svar på forespørsel (§ 33.6.2)</span>
            {#if submissionMeta.latest}
              <span class="preklusjons-meta">{submissionMeta.latest}</span>
            {/if}
          </span>
          {@render answerButtons(
            foresporselSvarOk,
            'Ja, i tide',
            'Nei, prekludert',
            (value) => (foresporselSvarOk = value)
          )}
        </div>
      {/if}
    </QuestionCard>
  {/if}

  {#if (hasPartialSubsidiaer || hasForesporselSubsidiaer) && subsidiærNotice}
    <div class="subsidiaer-notice">
      <span class="subsidiaer-notice-mark" aria-hidden="true"></span>
      <p>{subsidiærNotice}</p>
    </div>
  {/if}

  {#if computed.visibility.showSendForesporsel}
    <QuestionCard
      title="Spesifisering"
      paragrafRef="§ 33.6.2"
      description="Dersom kravet ikke er tilstrekkelig spesifisert, kan byggherren be om antall dager og nærmere begrunnelse."
    >
      <label class="checkbox-row">
        <input
          type="checkbox"
          checked={sendForesporsel}
          onchange={(event) => (sendForesporsel = event.currentTarget.checked)}
        />
        <span>
          <strong>Send forespørsel om spesifisering</strong>
          <small>TE må spesifisere kravet før byggherren tar endelig stilling.</small>
        </span>
      </label>
    </QuestionCard>
  {/if}

  {#if !sendForesporsel}
    <QuestionCard
      title="Årsakssammenheng"
      paragrafRef="§ 33.1"
      description="Foreligger det en hindring på fremdriften som følge av det påberopte kontraktsforholdet?"
      subsidiary={isSubsidiaer}
    >
      {@render answerButtons(
        vilkarOppfylt,
        'Ja, hindring',
        'Nei, ingen hindring',
        (value) => (vilkarOppfylt = value)
      )}
    </QuestionCard>

    {#if computed.showGodkjentDager}
      <QuestionCard
        title="Utmåling"
        paragrafRef="§ 33.5"
        description="Fristforlengelsen skal svare til virkningen kontraktsforholdet har hatt på fremdriften."
        subsidiary={isSubsidiaer}
      >
        <NumberField
          id="bh-frist-godkjent-dager"
          label="Godkjent fristforlengelse"
          suffix="dager"
          value={godkjentDager}
          max={domainConfig.krevdDager}
          hint={`Av ${domainConfig.krevdDager} dager krevd`}
          onchange={(value) => (godkjentDager = value)}
        />
      </QuestionCard>
    {/if}
  {/if}

  {#if allAnswered}
    <section class="result-box konsekvens-{resultat.variant}">
      <div class="result-header">
        <resultat.ikon size={18} />
        <span>{resultat.konklusjon}</span>
      </div>

      {#if sendForesporsel}
        <p class="result-help">
          Endelig vurdering av fristkravet avventes til TE har spesifisert kravet.
        </p>
      {:else}
        <div class="result-tabell">
          <div class="result-cell">
            <span>Krevd</span>
            <strong class="font-mono">{domainConfig.krevdDager} dager</strong>
          </div>
          <div class="result-cell">
            <span>Prinsipalt godkjent</span>
            <strong class="font-mono">{prinsipaltGodkjent} dager</strong>
          </div>
          {#if computed.visSubsidiaertResultat}
            <div class="result-cell">
              <span>Subsidiært godkjent</span>
              <strong class="font-mono">{subsidiaertGodkjent} dager</strong>
            </div>
          {/if}
        </div>
        {#if computed.erRedusert}
          <p class="result-help">
            {computed.erPrekludert
              ? 'Subsidiært begrenses kravet til den fristforlengelsen byggherren måtte forstå (§ 33.6.1).'
              : 'Kravet begrenses til den fristforlengelsen byggherren måtte forstå (§ 33.6.1).'}
          </p>
        {/if}
      {/if}
    </section>

    {#if computed.prinsipaltResultat === 'avslatt' && !sendForesporsel}
      <div class="risk-notice">
        <AlertTriangle size={16} />
        <p>
          <strong>Forseringsrisiko etter § 33.8.</strong> Dersom avslaget er uberettiget, kan TE velge
          å anse det som et pålegg om forsering.
        </p>
      </div>
    {/if}

    <section class="begrunnelse-section">
      <div class="begrunnelse-heading">
        <span class="begrunnelse-title">Begrunnelse</span>
        <div class="begrunnelse-actions">
          {#if userHasEdited && autoBegrunnelseHtml}
            <button type="button" class="regenerate-btn" onclick={handleRegenerate}>
              <RefreshCw size={12} strokeWidth={2} /> Regenerer
            </button>
          {/if}
          <span class="font-mono char-count">{charCount} tegn</span>
        </div>
      </div>
      <p class="begrunnelse-help">
        Begrunnelsen kan utdypes og redigeres. Automatiske konklusjoner beholdes som låste felt.
      </p>
      <div class="editor-wrapper">
        <RichTextEditor
          body={begrunnelseHtml}
          onchange={handleEditorChange}
          onready={handleEditorReady}
          extensions={[LockedValueNode]}
          maxHeight="none"
          oncharcount={(count) => (charCount = count)}
        />
      </div>
    </section>
  {/if}
</div>

<style>
  .claim-overview {
    margin-bottom: 32px;
  }
  .claim-overview :global(.statement-card) {
    margin-bottom: 0;
  }
  .claim-summary {
    padding: 18px 24px;
    background: var(--surface-warm);
  }
  .sammendrag-label {
    font-size: 10px;
    font-weight: 700;
    line-height: 1.3;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--ink-4);
  }
  .primary-days strong {
    display: block;
    margin-top: 7px;
    font-size: 30px;
    line-height: 1.1;
    letter-spacing: 0.02em;
  }
  .notice-hero strong {
    display: block;
    margin-top: 7px;
    font-size: 20px;
    line-height: 1.3;
    color: var(--ink);
  }
  .notice-hero p {
    margin: 6px 0 0;
    font-size: 13px;
    line-height: 1.5;
    color: var(--ink-3);
  }
  .sammendrag-datoer {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 20px;
    padding: 13px 24px;
    background: var(--surface-warm);
    border-top: var(--rule);
  }
  .sammendrag-datoer span {
    display: flex;
    gap: 6px;
    font-size: 11px;
    color: var(--ink-4);
  }
  .sammendrag-datoer strong {
    font-weight: 600;
    color: var(--ink-3);
  }
  .begrunnelse-section {
    margin: 0 0 16px;
    padding: 18px;
    background: var(--surface);
    border: var(--rule);
    border-radius: 12px;
  }
  .preklusjons-rad {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 10px 0;
    border-top: var(--rule-subtle);
  }
  .preklusjons-copy {
    min-width: 0;
  }
  .preklusjons-label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: var(--ink-2);
  }
  .preklusjons-meta {
    display: block;
    margin-top: 3px;
    font-size: 11px;
    color: var(--ink-4);
  }

  .segment-row {
    display: inline-flex;
    flex-wrap: wrap;
    flex: none;
    gap: 3px;
    width: fit-content;
    padding: 3px;
    background: var(--surface-inset);
    border: var(--rule-strong);
    border-radius: 999px;
  }
  .segment-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
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
  }
  .segment-btn:hover:not(.segment-active) {
    color: var(--ink);
    background: var(--surface);
  }
  .segment-active {
    color: white;
    background: var(--brand-2);
    box-shadow: 0 1px 2px rgba(27, 42, 34, 0.12);
  }
  .segment-active.seg-yes {
    background: var(--success);
  }
  .segment-active.seg-no {
    background: var(--danger);
  }

  .subsidiaer-notice {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
    padding: 14px 16px;
    font-size: 13px;
    line-height: 1.6;
    color: var(--ink-2);
    background: var(--info-bg);
    border: var(--rule-strong);
    border-radius: 12px;
  }
  .subsidiaer-notice p {
    margin: 0;
  }
  .subsidiaer-notice-mark {
    flex: none;
    width: 10px;
    height: 10px;
    margin-top: 5px;
    background: var(--brand);
    border-radius: 1px;
    transform: rotate(45deg);
  }

  .checkbox-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
    background: var(--surface-inset);
    border-radius: 8px;
    cursor: pointer;
  }
  .checkbox-row input {
    flex: none;
    width: 18px;
    height: 18px;
    margin-top: 1px;
    accent-color: var(--brand);
  }
  .checkbox-row span {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
    color: var(--ink-2);
  }
  .checkbox-row small {
    font-size: 12px;
    line-height: 1.45;
    color: var(--ink-3);
  }

  .result-box {
    margin: 24px 0 16px;
    padding: 16px;
    background: var(--surface);
    border: var(--rule-strong);
    border-radius: 12px;
  }
  .result-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 700;
  }
  .konsekvens-positive .result-header {
    color: var(--success);
  }
  .konsekvens-negative .result-header {
    color: var(--danger);
  }
  .konsekvens-mixed .result-header {
    color: color-mix(in srgb, var(--warning) 78%, var(--ink));
  }
  .konsekvens-neutral .result-header {
    color: var(--ink-2);
  }
  .result-tabell {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin-top: 14px;
    overflow: hidden;
    background: var(--surface-inset);
    border: var(--rule);
    border-radius: 8px;
  }
  .result-cell {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 12px;
    border-left: var(--rule);
  }
  .result-cell:first-child {
    border-left: none;
  }
  .result-cell span {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--ink-4);
  }
  .result-cell strong {
    font-size: 13px;
    color: var(--ink);
  }
  .result-help {
    margin-top: 12px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--ink-3);
  }
  .risk-notice {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 16px;
    padding: 13px 15px;
    color: color-mix(in srgb, var(--warning) 72%, var(--ink));
    background: color-mix(in srgb, var(--warning) 7%, var(--surface));
    border: 1px solid color-mix(in srgb, var(--warning) 34%, var(--color-wire));
    border-radius: 10px;
  }
  .risk-notice :global(svg) {
    flex: none;
    margin-top: 2px;
  }
  .risk-notice p {
    margin: 0;
    font-size: 12px;
    line-height: 1.55;
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
  .begrunnelse-actions {
    display: flex;
    align-items: center;
    gap: 10px;
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
  .regenerate-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    font-size: 11px;
    color: var(--ink-3);
    background: var(--surface);
    border: var(--control-border);
    border-radius: 999px;
    cursor: pointer;
  }

  @media (max-width: 720px) {
    .sammendrag-datoer {
      flex-direction: column;
    }
    .preklusjons-rad {
      align-items: flex-start;
      flex-direction: column;
    }
    .result-tabell {
      grid-template-columns: 1fr;
    }
    .result-cell {
      border-top: var(--rule);
      border-left: none;
    }
    .result-cell:first-child {
      border-top: none;
    }
  }
</style>
