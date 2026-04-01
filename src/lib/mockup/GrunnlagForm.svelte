<script lang="ts">
  import { AlertTriangle, Check, X, Undo2 } from 'lucide-svelte';
  import {
    erEndringMed32_2,
    erPrekludert,
    getVerdictOptions,
    getDefaults,
  } from '$lib/domain/grunnlagDomain';
  import type { GrunnlagFormState, GrunnlagDomainConfig } from '$lib/domain/grunnlagDomain';
  import { DD, TE, BH } from './data.js';
  import Stamp from './Stamp.svelte';
  import CaseAnchor from './CaseAnchor.svelte';

  let { onclose }: { onclose: () => void } = $props();

  const d = DD.ansvar;

  /**
   * Mock domain config for KOE-104:
   * TE claims svikt (§23.1) — not ENDRING, so no §32.2 varsling check.
   */
  const domainConfig: GrunnlagDomainConfig = {
    grunnlagEvent: {
      hovedkategori: 'SVIKT',
      underkategori: undefined,
      dato_varslet: '2025-04-12',
    },
    isUpdateMode: false,
    harSubsidiaereSvar: false,
  };

  const initialDefaults = getDefaults({ isUpdateMode: false });

  let varsletITide = $state<boolean | undefined>(initialDefaults.varsletITide);
  let resultat = $state<string | undefined>(initialDefaults.resultat);

  const formState: GrunnlagFormState = $derived({
    varsletITide,
    resultat,
    resultatError: false,
    begrunnelse: '',
    begrunnelseValidationError: undefined,
  });

  const visVarsling = $derived(erEndringMed32_2(domainConfig.grunnlagEvent));
  const prekludert = $derived(erPrekludert(formState, domainConfig));
  const verdictOptions = $derived(getVerdictOptions(domainConfig));

  function toggleChoice(current: boolean | undefined, value: boolean): boolean | undefined {
    return current === value ? undefined : value;
  }

  const allAnswered = $derived.by(() => {
    if (visVarsling && varsletITide === undefined) return false;
    if (!resultat) return false;
    return true;
  });

  const resultatDisplay = $derived.by(() => {
    if (resultat === 'godkjent')
      return {
        ikon: Check,
        label: 'Godkjent',
        color: 'var(--green)',
        stampVariant: 'ochre' as const,
      };
    if (resultat === 'frafalt')
      return {
        ikon: Undo2,
        label: 'Frafalt',
        color: 'var(--ink-3)',
        stampVariant: 'draft' as const,
      };
    return { ikon: X, label: 'Avslått', color: 'var(--red)', stampVariant: 'red' as const };
  });
</script>

{#snippet yesNoPill(
  label: string,
  ref: string,
  text: string,
  answer: boolean | undefined,
  yesText: string,
  noText: string,
  onset: (v: boolean | undefined) => void,
  opts?: { alertHtml?: string }
)}
  <div class="question-block">
    <div class="question-header">
      <span class="question-label">{label}</span>
      <span class="font-mono question-ref">{ref}</span>
    </div>
    <p class="question-text">{text}</p>
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
      <span class="font-mono context-ref">{d.te.ref}</span>
    </div>
    <div class="te-position">
      <span class="font-mono position-badge">{d.te.position?.toUpperCase()}</span>
      <span class="font-mono position-ref">{d.te.ref}</span>
    </div>
    <p class="font-serif context-text">{d.teT}</p>
  </div>

  <div class="bh-heading">Byggherrens standpunkt</div>

  {#if visVarsling}
    {@render yesNoPill(
      'Varsling',
      '§ 32.2',
      'Ble varselet sendt uten ugrunnet opphold?',
      varsletITide,
      'Ja, i tide',
      'Nei, prekludert',
      (v) => (varsletITide = v),
      {
        alertHtml:
          '<strong>Preklusjon</strong> — Varselet vurderes som for sent. Grunnlaget kan fortsatt vurderes subsidiært.',
      }
    )}
    <div class="divider"></div>
  {/if}

  <div class="question-block">
    <div class="question-header">
      <span class="question-label">Resultat</span>
      <span class="font-mono question-ref">{d.te.ref}</span>
    </div>
    <p class="question-text">Vurder om kontraktsforholdet gir grunnlag for krav.</p>
    {#if prekludert}
      <Stamp variant="ochre" small flat>Subsidiært</Stamp>
    {/if}
    <div class="verdict-row">
      {#each verdictOptions as opt}
        <button
          class="verdict-btn"
          class:active={resultat === opt.value}
          class:green={opt.colorScheme === 'green' && resultat === opt.value}
          class:red={opt.colorScheme === 'red' && resultat === opt.value}
          class:gray={opt.colorScheme === 'gray' && resultat === opt.value}
          onclick={() => (resultat = resultat === opt.value ? undefined : opt.value)}
        >
          {#if opt.icon === 'check'}<Check size={14} />
          {:else if opt.icon === 'cross'}<X size={14} />
          {:else}<Undo2 size={14} />
          {/if}
          <span>{opt.label}</span>
          <span class="verdict-desc">{opt.description}</span>
        </button>
      {/each}
    </div>
  </div>

  {#if allAnswered}
    <div class="divider"></div>
    <div class="result-box" style:border-color={resultatDisplay.color}>
      <div class="result-header" style:color={resultatDisplay.color}>
        <resultatDisplay.ikon size={18} />
        <span class="result-label">{resultatDisplay.label}</span>
      </div>
      {#if prekludert}
        <p class="font-serif result-note">
          Grunnlaget er prekludert (§ 32.2). Vurderingen ovenfor gjelder subsidiært.
        </p>
      {/if}
      {#if resultat === 'avslatt'}
        <p class="font-serif result-note">
          Grunnlaget avvises. Vederlag og frist behandles subsidiært.
        </p>
      {/if}
      {#if resultat === 'godkjent'}
        <p class="font-serif result-note">
          Grunnlag anerkjent. Vederlag og frist behandles prinsipalt.
        </p>
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
  .te-position {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }
  .position-badge {
    font-size: 11px;
    font-weight: 700;
    background: var(--plate);
    color: white;
    padding: 3px 8px;
  }
  .position-ref {
    font-size: 11px;
    font-weight: 500;
    color: var(--ink-2);
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
  .pill-row {
    display: flex;
    gap: 8px;
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
  .verdict-row {
    display: flex;
    gap: 8px;
  }
  .verdict-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 16px 12px;
    background: var(--paper);
    border: 2px solid var(--ink-4);
    cursor: pointer;
    transition: all 80ms;
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--ink-3);
  }
  .verdict-btn:hover {
    border-color: var(--ink);
    color: var(--ink);
  }
  .verdict-btn.active {
    color: white;
  }
  .verdict-btn.green {
    background: var(--green);
    border-color: var(--green);
  }
  .verdict-btn.red {
    background: var(--red);
    border-color: var(--red);
  }
  .verdict-btn.gray {
    background: var(--ink-3);
    border-color: var(--ink-3);
  }
  .verdict-desc {
    font-size: 9px;
    font-weight: 500;
    text-transform: none;
    letter-spacing: 0;
    opacity: 0.8;
  }
  .result-box {
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
  .result-label {
    font-size: 16px;
  }
  .result-note {
    font-size: 13px;
    line-height: 1.5;
    color: var(--ink-3);
    margin-top: 12px;
  }
</style>
