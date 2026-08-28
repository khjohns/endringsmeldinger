<script lang="ts">
  import { AlertTriangle, Check, X, CircleMinus } from 'lucide-svelte';
  import { beregnAlt, getDefaults } from '$lib/domain/fristDomain';
  import type { FristFormState, FristDomainConfig } from '$lib/domain/fristDomain';
  import { generateFristResponseBegrunnelse } from '$lib/domain/begrunnelse/fristBegrunnelse';
  import type { FristResponseInput } from '$lib/domain/begrunnelse/fristBegrunnelse';
  import { tokensToHtml } from '$lib/editor/tokenConverter';
  import RichTextEditor from '$lib/components/primitives/RichTextEditor.svelte';
  import SectionHeading from '$lib/components/primitives/SectionHeading.svelte';
  import LockedValueNode from '$lib/editor/LockedValueNode';
  import { RefreshCw } from 'lucide-svelte';
  import { isHtmlEmpty } from '$lib/utils/formatters';
  import { store } from './store.svelte.js';
  import { sporResultatLabel } from './utils.js';
  import Stamp from './Stamp.svelte';
  import SubStripe from './SubStripe.svelte';
  import Diamond from './Diamond.svelte';
  import CaseAnchor from './CaseAnchor.svelte';
  import { toggleChoice } from './utils.js';

  let {
    domainConfig,
    onsend,
    onactions,
  }: {
    domainConfig: FristDomainConfig;
    onsend: () => void;
    onactions?: (a: { canSend: boolean; send: () => void }) => void;
  } = $props();

  const initialDefaults = getDefaults({
    krevdDager: domainConfig.krevdDager,
    isUpdateMode: false,
  });

  let begrunnelseHtml = $state('');
  let userHasEdited = $state(false);
  let editorApi: { setContent: (html: string) => void } | undefined;
  let prevHtml: string | undefined;
  let charCount = $state(0);

  let fristVarselOk = $state<boolean | undefined>(initialDefaults.fristVarselOk);
  let spesifisertKravOk = $state<boolean | undefined>(initialDefaults.spesifisertKravOk);
  let foresporselSvarOk = $state<boolean | undefined>(initialDefaults.foresporselSvarOk);
  let vilkarOppfylt = $state<boolean | undefined>(initialDefaults.vilkarOppfylt);
  let sendForesporsel = $state<boolean>(initialDefaults.sendForesporsel);
  let godkjentDager = $state<number | undefined>(initialDefaults.godkjentDager);

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

  const subsidiærNotice = $derived.by(() => {
    if (domainConfig.erGrunnlagSubsidiaer)
      return 'Grunnlaget er avslått. Vurderingen nedenfor gjelder for det tilfelle at grunnlaget likevel godkjennes.';
    if (domainConfig.erHelFristSubsidiaerPgaGrunnlag)
      return 'Grunnlaget ble varslet for sent (§32.2). Hele fristkravet behandles subsidiært.';
    return '';
  });

  const subsidiærDiamondCount = $derived.by(() => {
    let count = 0;
    if (isHelSubsidiaer) count++;
    if (spesifisertKravOk === false) count++;
    if (fristVarselOk === false) count++;
    if (foresporselSvarOk === false) count++;
    return count;
  });

  const hasPartialSubStripe = $derived(!isHelSubsidiaer && spesifisertKravOk === false);

  const resultat = $derived.by(() => {
    const r = computed.prinsipaltResultat;
    const label = sporResultatLabel(r);
    if (r === 'godkjent') return { ikon: Check, label, variant: 'positive' as const };
    if (r === 'delvis_godkjent') return { ikon: CircleMinus, label, variant: 'mixed' as const };
    return { ikon: X, label, variant: 'negative' as const };
  });

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
    const tokens = generateFristResponseBegrunnelse(input, { useTokens: true });
    return tokensToHtml(tokens);
  });

  $effect(() => {
    if (!userHasEdited && autoBegrunnelseHtml) {
      begrunnelseHtml = autoBegrunnelseHtml;
    }
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
    if (autoBegrunnelseHtml) {
      begrunnelseHtml = autoBegrunnelseHtml;
      userHasEdited = false;
    }
  }

  $effect(() => {
    onactions?.({
      canSend: allAnswered,
      send: () => {
        store.sendFristSvar(godkjentDager ?? 0);
        onsend();
      },
    });
  });
</script>

<div class="form-content">
  <CaseAnchor />

  <div class="sammendrag">
    <SectionHeading title="Fristkrav" paragrafRef="§ 33.1" />

    <div class="sammendrag-kravlinjer">
      <div class="sammendrag-kravlinje">
        <span class="sammendrag-kravlinje-label"
          >{store.display('frist').label} — {store.teNavn}s krav</span
        >
        <span class="font-mono sammendrag-kravlinje-belop"
          >{store.display('frist').krevdValue} dager</span
        >
      </div>
    </div>

    {#if store.display('frist').teText}
      <p class="font-serif sammendrag-begrunnelse">{store.display('frist').teText}</p>
    {/if}
  </div>

  {#snippet yesNoPill(
    label: string,
    ref: string,
    text: string,
    answer: boolean | undefined,
    yesText: string,
    noText: string,
    onset: (v: boolean | undefined) => void,
    opts?: { alertText?: string }
  )}
    <div class="question-block">
      <SectionHeading title={label} paragrafRef={ref} />
      <p class="question-text">{text}</p>
      <div class="segment-row">
        <button
          class="segment-btn"
          class:segment-active={answer === true}
          class:seg-yes={answer === true}
          onclick={() => onset(toggleChoice(answer, true))}>{yesText}</button
        >
        <button
          class="segment-btn"
          class:segment-active={answer === false}
          class:seg-no={answer === false}
          onclick={() => onset(toggleChoice(answer, false))}>{noText}</button
        >
      </div>
      {#if answer === false && opts?.alertText}
        <p class="font-serif consequence-text">{opts.alertText}</p>
      {/if}
    </div>
  {/snippet}

  {#snippet formBodyBelow()}
    {#if computed.visibility.showForesporselSvarOk}
      {@render yesNoPill(
        'Svar på forespørsel',
        '§ 33.6.2',
        'Svarte TE på forespørsel om spesifisering uten ugrunnet opphold?',
        foresporselSvarOk,
        'Ja, i tide',
        'Nei, prekludert',
        (v) => (foresporselSvarOk = v),
        {
          alertText: 'For sent svart — kravet er tapt.',
        }
      )}
    {/if}

    {#if (isHelSubsidiaer || hasPartialSubStripe) && foresporselSvarOk === false}
      <Diamond />
    {/if}

    {@render yesNoPill(
      'Årsakssammenheng',
      '§ 33.1',
      'Foreligger det en hindring på fremdriften som følge av det påberopte kontraktsforholdet?',
      vilkarOppfylt,
      'Ja, hindring',
      'Nei, ingen hindring',
      (v) => (vilkarOppfylt = v),
      {
        alertText: 'Ingen årsakssammenheng — ytterligere betingelse for utmåling nedenfor.',
      }
    )}

    {#if computed.visibility.showSendForesporsel}
      <div class="question-block">
        <label class="checkbox-row">
          <input
            type="checkbox"
            checked={sendForesporsel}
            onchange={(e) => (sendForesporsel = e.currentTarget.checked)}
          />
          <div>
            <span class="checkbox-label">Send forespørsel om spesifisering</span>
            <span class="font-mono question-ref" style="display: inline; margin-left: 8px"
              >§ 33.6.2</span
            >
            <p class="checkbox-desc">Be TE spesifisere kravet med antall dager og begrunnelse.</p>
          </div>
        </label>
      </div>
    {/if}

    {#if computed.showGodkjentDager && !sendForesporsel}
      <div class="question-block">
        <SectionHeading title="Utmåling" paragrafRef="§ 33.5" />
        <p class="question-text">
          Fristforlengelsen skal svare til den virkning kontraktsforholdet har hatt på fremdriften.
        </p>
        <div class="number-field">
          <span class="number-input-label">Godkjent dager</span>
          <div class="number-input-wrap">
            <input
              type="text"
              inputmode="numeric"
              value={godkjentDager ?? ''}
              oninput={(e) => {
                const v = parseInt(e.currentTarget.value.replace(/\D/g, ''));
                godkjentDager = isNaN(v) ? undefined : v;
              }}
              placeholder="0"
              class="font-mono measurement-input"
            />
            <span class="number-input-suffix">dager</span>
          </div>
          <span class="font-mono number-input-ref">av {domainConfig.krevdDager} dager krevd</span>
        </div>
      </div>
    {/if}

    {#if allAnswered}
      <div class="result-box konsekvens-{resultat.variant}">
        <div class="result-header">
          <resultat.ikon size={18} />
          <span class="result-label">{resultat.label}</span>
        </div>
        {#if computed.prinsipaltResultat !== 'avslatt' && godkjentDager !== undefined}
          <div class="result-detail">
            <span class="font-mono result-days"
              >{godkjentDager} av {domainConfig.krevdDager} dager</span
            >
          </div>
        {/if}
        {#if computed.erRedusert}
          <p class="font-serif result-note">Kravet er redusert til det åpenbare (§ 33.6.1).</p>
        {/if}
        {#if computed.visSubsidiaertResultat}
          <div class="sub-result">
            <Stamp variant="green" small flat>Subsidiært</Stamp>
            <span class="font-mono sub-result-text">
              {sporResultatLabel(computed.subsidiaertResultat)}
              {#if computed.subsidiaertResultat !== 'avslatt' && godkjentDager !== undefined}
                — {godkjentDager} dager
              {/if}
            </span>
          </div>
        {/if}
      </div>

      {#if computed.prinsipaltResultat === 'avslatt' && !sendForesporsel}
        <div class="alert-box warning">
          <AlertTriangle size={14} />
          <span
            ><strong>§ 33.8 Forsering-risiko</strong> — Hvis avslaget er uberettiget, kan entreprenøren
            velge å anse det som et pålegg om forsering.</span
          >
        </div>
      {/if}

      <div class="begrunnelse-section">
        <div class="sh-heading">
          <span class="sh-title">Begrunnelse</span>
          <div class="begrunnelse-header-right">
            {#if userHasEdited && autoBegrunnelseHtml}
              <button class="regenerate-btn" onclick={handleRegenerate}>
                <RefreshCw size={12} strokeWidth={2} /> Regenerer
              </button>
            {/if}
            <span class="font-mono char-count">{charCount} tegn</span>
          </div>
        </div>
        <div class="editor-wrapper">
          <RichTextEditor
            body={begrunnelseHtml}
            onchange={handleEditorChange}
            onready={handleEditorReady}
            extensions={[LockedValueNode]}
            maxHeight="none"
            oncharcount={(c) => (charCount = c)}
          />
        </div>
      </div>
    {/if}
  {/snippet}

  {#snippet formContent()}
    <SectionHeading title="Byggherrens standpunkt" />

    {#if computed.visibility.showFristVarselOk}
      {@render yesNoPill(
        'Foreløpig varsel',
        '§ 33.4',
        'Ble varselet om fristforlengelse fremsatt uten ugrunnet opphold?',
        fristVarselOk,
        'Ja, i tide',
        'Nei, prekludert',
        (v) => (fristVarselOk = v),
        {
          alertText: 'For sent varslet — kravet er tapt.',
        }
      )}
    {/if}

    {#if computed.visibility.showSpesifisertKravOk}
      {@render yesNoPill(
        'Fremsatt krav',
        '§ 33.6.1',
        'Ble kravet fremsatt uten ugrunnet opphold?',
        spesifisertKravOk,
        'Ja, i tide',
        'Nei, for sent',
        (v) => (spesifisertKravOk = v),
        {
          alertText: 'For sent fremsatt — ytterligere betingelse for utmåling nedenfor.',
        }
      )}
    {/if}

    <!-- Scenario 2: Delvis sub — spesifisertKravOk = false triggers stripe below -->
    {#if hasPartialSubStripe}
      <SubStripe
        notice="Kravet er for sent fremsatt. Alt nedenfor er subsidiær utmåling — fristforlengelsen reduseres til det åpenbare."
        diamondCount={subsidiærDiamondCount}
      >
        {@render formBodyBelow()}
      </SubStripe>
    {:else}
      <!-- Scenario 3: Additional diamonds when inside hel-sub stripe -->
      {#if isHelSubsidiaer && spesifisertKravOk === false}
        <Diamond />
      {/if}
      {@render formBodyBelow()}
    {/if}
  {/snippet}

  <!-- Scenario 1: Helt subsidiært — wrap everything -->
  {#if isHelSubsidiaer}
    <SubStripe notice={subsidiærNotice} diamondCount={subsidiærDiamondCount}>
      {@render formContent()}
    </SubStripe>
  {:else}
    {@render formContent()}
  {/if}
</div>

<style>
  /* Form-specific styles (shared styles in mockup.css) */

  /* ── TE's fristkrav-sammendrag ── */
  .sammendrag {
    margin-bottom: 40px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .sammendrag-kravlinjer {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .sammendrag-kravlinje {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 2px 0;
  }
  .sammendrag-kravlinje-label {
    font-size: 13px;
    color: var(--ink-2);
  }
  .sammendrag-kravlinje-belop {
    font-size: 13px;
    font-weight: 500;
    color: var(--ink);
  }
  .sammendrag-begrunnelse {
    margin-top: 4px;
    color: var(--ink-3);
  }

  /* ── Lokal overskrift for begrunnelse (har ekstra kontroller; ellers identisk med SectionHeading) ── */
  .sh-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--color-wire);
  }
  .sh-title {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-3);
  }

  /* ── Seksjonsluft: jevnt 20px mellom blokker (matcher produksjons gap) ── */
  .question-block {
    margin-bottom: var(--spacing-5);
    margin-top: var(--spacing-5);
  }

  /* ── Segment buttons ── */
  .segment-row {
    display: inline-flex;
    border: 1px solid #d9d5cc;
    border-radius: 4px;
    overflow: hidden;
    width: fit-content;
  }
  .segment-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    min-height: 32px;
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 600;
    background: var(--surface);
    color: var(--ink-3);
    border: none;
    border-right: 1px solid #d9d5cc;
    cursor: pointer;
    transition: all 80ms;
    white-space: nowrap;
    line-height: 1;
  }
  .segment-btn:last-child {
    border-right: none;
  }
  .segment-btn:hover:not(.segment-active) {
    background: var(--surface-inset);
    color: var(--ink);
  }
  .segment-active {
    background: var(--brand-2);
    color: white;
  }
  .segment-active.seg-yes {
    background: var(--success);
    color: white;
  }
  .segment-active.seg-no {
    background: var(--danger);
    color: white;
  }

  /* ── Utmåling / NumberInput ── */
  .number-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-width: 240px;
  }
  .number-input-label {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .number-input-wrap {
    display: flex;
    align-items: center;
    gap: 0;
  }
  .number-input-wrap .font-mono.measurement-input {
    border-radius: 4px 0 0 4px;
    flex: 1;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .number-input-suffix {
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 500;
    color: var(--ink-3);
    padding: 8px 12px;
    background: var(--surface-inset);
    border: var(--control-border);
    border-left: none;
    border-radius: 0 4px 4px 0;
    white-space: nowrap;
  }
  .number-input-ref {
    font-size: 12px;
    color: var(--ink-4);
    margin-top: 2px;
  }

  /* ── Resultat-boks ── */
  .result-box {
    margin-top: 0;
    padding: 12px 16px;
    background: var(--surface);
    border: none;
    border-left: 3px solid var(--ink-4);
    border-radius: 4px;
  }
  .result-box.konsekvens-positive {
    border-left-color: var(--success);
    background: color-mix(in srgb, var(--success) 6%, var(--surface));
  }
  .result-box.konsekvens-negative {
    border-left-color: var(--danger);
    background: color-mix(in srgb, var(--danger) 6%, var(--surface));
  }
  .result-box.konsekvens-mixed {
    border-left-color: var(--warning);
    background: color-mix(in srgb, var(--warning) 6%, var(--surface));
  }
  .result-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.01em;
    line-height: 1;
  }
  .konsekvens-positive .result-header {
    color: var(--success);
  }
  .konsekvens-negative .result-header {
    color: var(--danger);
  }
  .konsekvens-mixed .result-header {
    color: var(--warning);
  }
  .result-days {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-2);
  }
  .result-note {
    font-style: italic;
    margin-top: 8px;
  }

  .checkbox-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    cursor: pointer;
  }
  .checkbox-row input[type='checkbox'] {
    width: 18px;
    height: 18px;
    margin-top: 2px;
    accent-color: var(--brand);
    flex-shrink: 0;
  }
  .checkbox-label {
    font-size: 13px;
    font-weight: 700;
  }
  .checkbox-desc {
    font-size: 12px;
    color: var(--ink-3);
    margin-top: 4px;
  }
</style>
