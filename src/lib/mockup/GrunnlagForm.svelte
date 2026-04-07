<script lang="ts">
  import { Check, X, Undo2 } from 'lucide-svelte';
  import {
    erEndringMed32_2,
    erPrekludert,
    getVerdictOptions,
    getDefaults,
  } from '$lib/domain/grunnlagDomain';
  import type { GrunnlagFormState, GrunnlagDomainConfig } from '$lib/domain/grunnlagDomain';
  import RichTextEditor from '$lib/components/primitives/RichTextEditor.svelte';
  import LockedValueNode from '$lib/editor/LockedValueNode';
  import { store } from './store.svelte.js';
  import { TRACK_ICONS } from './data.js';
  import Stamp from './Stamp.svelte';
  import CaseAnchor from './CaseAnchor.svelte';
  import { toggleChoice } from './utils.js';

  let {
    domainConfig,
    onsend,
    onactions,
  }: {
    domainConfig: GrunnlagDomainConfig;
    onsend: () => void;
    onactions?: (a: { canSend: boolean; send: () => void }) => void;
  } = $props();

  const initialDefaults = getDefaults({ isUpdateMode: false });

  let varsletITide = $state<boolean | undefined>(initialDefaults.varsletITide);
  let resultat = $state<string | undefined>(initialDefaults.resultat);
  let begrunnelseHtml = $state('');
  let charCount = $state(0);

  const formState: GrunnlagFormState = $derived({
    varsletITide,
    resultat,
    resultatError: false,
    begrunnelse: begrunnelseHtml,
    begrunnelseValidationError: undefined,
  });

  const visVarsling = $derived(erEndringMed32_2(domainConfig.grunnlagEvent));
  const prekludert = $derived(erPrekludert(formState, domainConfig));
  const verdictOptions = $derived(getVerdictOptions(domainConfig));

  const allAnswered = $derived.by(() => {
    if (visVarsling && varsletITide === undefined) return false;
    if (!resultat) return false;
    return true;
  });

  const resultatDisplay = $derived.by(() => {
    if (resultat === 'godkjent') return { ikon: Check, label: 'Godkjent', color: 'var(--green)' };
    if (resultat === 'frafalt') return { ikon: Undo2, label: 'Frafalt', color: 'var(--ink-3)' };
    return { ikon: X, label: 'Avslått', color: 'var(--red)' };
  });

  $effect(() => {
    onactions?.({
      canSend: allAnswered,
      send: () => {
        store.sendGrunnlagSvar(resultat as 'godkjent' | 'avslatt' | 'frafalt');
        onsend();
      },
    });
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
  opts?: { alertText?: string }
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
    {#if answer === false && opts?.alertText}
      <p class="font-serif consequence-text">{opts.alertText}</p>
    {/if}
  </div>
{/snippet}

<div class="form-content">
  <CaseAnchor />

  <div class="te-context">
    <div class="context-header">
      <div class="context-label-row">
        <TRACK_ICONS.ansvar size={14} style="color: var(--ink-3)" />
        <span class="context-label">{store.display('ansvar').label} — {store.teNavn}s krav</span>
      </div>
      <span class="font-mono context-ref">{store.display('ansvar').teRef}</span>
    </div>
    <div class="te-position">
      <span class="font-mono position-badge">{store.display('ansvar').tePosition}</span>
      <span class="font-mono position-ref">{store.display('ansvar').teRef}</span>
    </div>
    <p class="font-serif context-text">{store.display('ansvar').teText}</p>
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
        alertText: 'For sent varslet — grunnlaget vurderes subsidiært.',
      }
    )}
    <div class="divider"></div>
  {/if}

  <div class="question-block">
    <div class="question-header">
      <span class="question-label">Resultat</span>
      <span class="font-mono question-ref">{store.display('ansvar').teRef}</span>
    </div>
    <p class="question-text">Vurder om kontraktsforholdet gir grunnlag for krav.</p>
    {#if prekludert}
      <Stamp variant="green" small flat>Subsidiært</Stamp>
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

    <div class="begrunnelse-section">
      <div class="question-header">
        <span class="question-label">Begrunnelse</span>
        <span class="font-mono char-count">{charCount} tegn</span>
      </div>
      <div class="editor-wrapper">
        <RichTextEditor
          body={begrunnelseHtml}
          onchange={(html) => (begrunnelseHtml = html)}
          extensions={[LockedValueNode]}
          maxHeight="none"
          oncharcount={(c) => (charCount = c)}
        />
      </div>
    </div>
  {/if}
</div>

<style>
  /* Form-specific styles (shared styles in mockup.css) */
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
    padding: 4px 8px;
    border-radius: 2px;
  }
  .position-ref {
    font-size: 11px;
    font-weight: 500;
    color: var(--ink-2);
  }
  .pill-row {
    display: flex;
    gap: 8px;
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
    border: 1.5px solid var(--ink-4);
    border-radius: 4px;
    cursor: pointer;
    transition: all 80ms;
    font-family: 'Plus Jakarta Sans', sans-serif;
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
  .result-label {
    font-size: 16px;
  }
</style>
