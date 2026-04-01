<script lang="ts">
  import { AlertTriangle, Check, X, CircleMinus } from 'lucide-svelte';
  import {
    beregnAlt,
    getDefaults,
    erSubsidiaer as erSubsidiaerFn,
    erKravlinjeGyldig,
  } from '$lib/domain/vederlagDomain';
  import type {
    VederlagFormState,
    VederlagDomainConfig,
    BelopVurdering,
  } from '$lib/domain/vederlagDomain';
  import { DD, TE, BH } from './data.js';
  import { fmt } from './utils.js';
  import Stamp from './Stamp.svelte';
  import CaseAnchor from './CaseAnchor.svelte';

  let { onclose }: { onclose: () => void } = $props();

  const d = DD.vederlag;

  /**
   * Mock domain config for KOE-104:
   * TE claims 450.000,- via regningsarbeid. Grunnlag is disputed (subsidiaer).
   */
  const domainConfig: VederlagDomainConfig = {
    metode: 'REGNINGSARBEID',
    hovedkravBelop: d.te.value!,
    riggBelop: undefined,
    produktivitetBelop: undefined,
    harRiggKrav: false,
    harProduktivitetKrav: false,
    kreverJustertEp: false,
    hovedkategori: 'SVIKT',
    grunnlagVarsletForSent: false,
    grunnlagStatus: 'avslatt',
  };

  const initialDefaults = getDefaults({ isUpdateMode: false });

  // Port 1: Preklusjon
  let hovedkravVarsletITide = $state<boolean | undefined>(initialDefaults.hovedkravVarsletITide);

  // Port 2: Metode
  let akseptererMetode = $state<boolean | undefined>(initialDefaults.akseptererMetode);

  // Port 3: Beløp
  let hovedkravVurdering = $state<BelopVurdering | undefined>(initialDefaults.hovedkravVurdering);
  let hovedkravGodkjentBelop = $state<number | undefined>(initialDefaults.hovedkravGodkjentBelop);

  const formState: VederlagFormState = $derived({
    hovedkravVarsletITide,
    riggVarsletITide: undefined,
    produktivitetVarsletITide: undefined,
    akseptererMetode,
    holdTilbake: false,
    hovedkravVurdering,
    hovedkravGodkjentBelop,
    begrunnelse: '',
  });

  const computed = $derived(beregnAlt(formState, domainConfig));
  const isSubsidiaer = $derived(erSubsidiaerFn(domainConfig));

  function toggleChoice(current: boolean | undefined, value: boolean): boolean | undefined {
    return current === value ? undefined : value;
  }

  const resultat = $derived.by(() => {
    const r = computed.prinsipaltResultat;
    if (r === 'godkjent') return { ikon: Check, label: 'Godkjent', color: 'var(--green)' };
    if (r === 'delvis_godkjent')
      return { ikon: CircleMinus, label: 'Delvis godkjent', color: 'var(--ochre)' };
    return { ikon: X, label: 'Avslått', color: 'var(--red)' };
  });

  const allAnswered = $derived.by(() => {
    if (computed.harPreklusjonsSteg && hovedkravVarsletITide === undefined) return false;
    if (akseptererMetode === undefined) return false;
    if (!erKravlinjeGyldig(hovedkravVurdering, hovedkravGodkjentBelop)) return false;
    return true;
  });

  const vurderingOptions: { value: BelopVurdering; label: string; cls: string }[] = [
    { value: 'godkjent', label: 'Godkjent', cls: 'yes' },
    { value: 'delvis', label: 'Delvis', cls: 'partial' },
    { value: 'avslatt', label: 'Avvist', cls: 'no' },
  ];
</script>

{#snippet yesNoPill(
  label: string,
  ref: string,
  text: string,
  answer: boolean | undefined,
  yesText: string,
  noText: string,
  onset: (v: boolean | undefined) => void,
  opts?: { subsidiaer?: boolean; alertHtml?: string }
)}
  <div class="question-block">
    <div class="question-header">
      <span class="question-label">{label}</span>
      <span class="font-mono question-ref">{ref}</span>
    </div>
    <p class="question-text">{text}</p>
    {#if opts?.subsidiaer}
      <Stamp variant="ochre" small flat>Subsidiært</Stamp>
    {/if}
    <div class="pill-row">
      <button
        class="pill"
        class:yes={answer === true}
        onclick={() => onset(toggleChoice(answer, true))}>{yesText}</button
      >
      <button
        class="pill"
        class:no={answer === false}
        onclick={() => onset(toggleChoice(answer, false))}>{noText}</button
      >
    </div>
    {#if answer === false && opts?.alertHtml}
      <div class="alert-box warning">
        <AlertTriangle size={14} />
        <span>{@html opts.alertHtml}</span>
      </div>
    {/if}
  </div>
{/snippet}

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
    <div class="font-mono context-value">{fmt(d.te.value!)},-</div>
    <div class="context-meta">
      <span class="font-mono context-metode">Regningsarbeid (§ 34.4)</span>
    </div>
    <p class="font-serif context-text">{d.teT}</p>
  </div>

  <div class="bh-heading">Byggherrens standpunkt</div>

  {#if isSubsidiaer}
    <div class="sub-banner">
      <Stamp variant="ochre" small flat>Subsidiært</Stamp>
      <p class="font-serif sub-banner-text">
        Grunnlaget er avslått. Vurderingen nedenfor gjelder for det tilfelle at grunnlaget likevel
        godkjennes.
      </p>
    </div>
  {/if}

  {#if computed.harPreklusjonsSteg}
    {@render yesNoPill(
      'Varsling hovedkrav',
      '§ 34.1.2',
      'Ble vederlagskravet varslet uten ugrunnet opphold?',
      hovedkravVarsletITide,
      'Ja, i tide',
      'Nei, prekludert',
      (v) => (hovedkravVarsletITide = v),
      {
        alertHtml:
          '<strong>Preklusjon</strong> — Vederlagskravet vurderes som for sent varslet. Kravet er tapt (§ 34.1.2).',
      }
    )}
    <div class="divider"></div>
  {/if}

  {@render yesNoPill(
    'Beregningsmetode',
    '§ 34.2',
    'Aksepterer du TE sin beregningsmetode (regningsarbeid)?',
    akseptererMetode,
    'Ja, akseptert',
    'Nei, bestrides',
    (v) => (akseptererMetode = v)
  )}

  <div class="divider"></div>

  <div class="question-block">
    <div class="question-header">
      <span class="question-label">Hovedkrav</span>
      <span class="font-mono question-ref">§ 34.1.1–34.1.2</span>
    </div>
    {#if computed.hovedkravPrekludert}
      <Stamp variant="red" small flat>Prekludert</Stamp>
    {:else}
      <div class="kravlinje-header">
        <span class="font-mono kravlinje-krevd">Krevd: {fmt(domainConfig.hovedkravBelop)},-</span>
      </div>
      <div class="vurdering-row">
        {#each vurderingOptions as opt}
          <button
            class="pill"
            class:yes={opt.cls === 'yes' && hovedkravVurdering === opt.value}
            class:partial={opt.cls === 'partial' && hovedkravVurdering === opt.value}
            class:no={opt.cls === 'no' && hovedkravVurdering === opt.value}
            onclick={() =>
              (hovedkravVurdering = hovedkravVurdering === opt.value ? undefined : opt.value)}
            >{opt.label}</button
          >
        {/each}
      </div>
      {#if hovedkravVurdering === 'delvis'}
        <div class="measurement-row">
          <div>
            <div class="measurement-input-label">Godkjent beløp</div>
            <input
              type="number"
              min="0"
              max={domainConfig.hovedkravBelop}
              value={hovedkravGodkjentBelop ?? ''}
              oninput={(e) => {
                const v = parseInt(e.currentTarget.value);
                hovedkravGodkjentBelop = isNaN(v) ? undefined : v;
              }}
              placeholder="beløp"
              class="font-mono measurement-input"
            />
          </div>
        </div>
      {/if}
    {/if}
  </div>

  {#if allAnswered}
    <div class="divider"></div>
    <div class="result-box" style:border-color={resultat.color}>
      <div class="result-header" style:color={resultat.color}>
        <resultat.ikon size={18} />
        <span class="result-label">{resultat.label}</span>
      </div>
      {#if computed.prinsipaltResultat !== 'avslatt'}
        <div class="result-detail">
          <span class="font-mono result-amount">
            {fmt(computed.totalGodkjent)},- av {fmt(computed.totalKrevdInklPrekludert)},-
          </span>
        </div>
      {/if}
      {#if computed.visSubsidiaertResultat}
        <div class="sub-result">
          <Stamp variant="ochre" small flat>Subsidiært</Stamp>
          <span class="font-mono sub-result-text">
            {computed.subsidiaertResultat === 'godkjent'
              ? 'Godkjent'
              : computed.subsidiaertResultat === 'delvis_godkjent'
                ? 'Delvis godkjent'
                : 'Avslått'}
            {#if computed.subsidiaertResultat !== 'avslatt'}
              — {fmt(computed.totalGodkjentInklPrekludert)},-
            {/if}
          </span>
        </div>
      {/if}
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
  .context-value {
    font-size: 22px;
    font-weight: 700;
    margin-bottom: 8px;
    letter-spacing: -0.02em;
  }
  .context-meta {
    margin-bottom: 12px;
  }
  .context-metode {
    font-size: 11px;
    font-weight: 500;
    color: var(--ink-3);
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
  .sub-banner {
    margin-bottom: 32px;
    padding: 16px 20px;
    background: var(--ochre-bg);
    border-left: 2px dashed var(--ochre-border);
  }
  .sub-banner-text {
    font-size: 14px;
    line-height: 1.55;
    color: var(--ink-2);
    font-style: italic;
    margin-top: 8px;
  }
  .question-block {
    margin-bottom: 32px;
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
  .question-text {
    font-size: 14px;
    color: var(--ink-2);
    margin-bottom: 16px;
  }
  .pill-row,
  .vurdering-row {
    display: flex;
    gap: 8px;
  }
  .pill.partial {
    background: var(--ochre);
    color: white;
    border-color: var(--ochre);
  }
  .divider {
    height: 1px;
    background: rgba(28, 25, 23, 0.08);
    margin-bottom: 32px;
  }
  .alert-box {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    margin-top: 16px;
    font-size: 13px;
    line-height: 1.5;
  }
  .alert-box.warning {
    background: var(--ochre-bg);
    border: 1px solid var(--ochre-border);
    color: var(--ink);
  }
  .kravlinje-header {
    margin-bottom: 12px;
  }
  .kravlinje-krevd {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-2);
  }
  .measurement-row {
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
    width: 180px;
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
  .result-box {
    margin-top: 8px;
    padding: 20px 24px;
    background: var(--paper);
    border: 2px solid var(--ink-4);
  }
  .result-header {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 16px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .result-detail {
    margin-top: 12px;
  }
  .result-amount {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-2);
  }
  .sub-result {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px dashed var(--ochre-border);
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .sub-result-text {
    font-size: 12px;
    font-weight: 600;
    color: var(--ochre);
  }
</style>
