<script lang="ts">
  import SegmentedControl from '$lib/components/primitives/SegmentedControl.svelte';
  import YesNoControl from './components/YesNoControl.svelte';
  import { BookOpen, Check, ChevronUp, X, Undo2 } from 'lucide-svelte';
  import {
    erEndringMed32_2,
    erPrekludert,
    getVerdictOptions,
    getDefaults,
  } from '$lib/domain/grunnlagDomain';
  import type { GrunnlagFormState, GrunnlagDomainConfig } from '$lib/domain/grunnlagDomain';
  import RichTextEditor from '$lib/components/primitives/RichTextEditor.svelte';
  import LockedValueNode from '$lib/editor/LockedValueNode';
  import { formatDateShortNorwegian } from '$lib/utils/dateFormatters.js';
  import { store } from './store.svelte.js';
  import { TRACK_ICONS } from './data.js';
  import CaseAnchor from './CaseAnchor.svelte';

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
  let teContextExpanded = $state(false);

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
  const teDisplay = $derived(store.display('ansvar'));
  const teEvents = $derived(
    store.timeline.filter((event) => event.spor === 'grunnlag' && event.actorrole === 'TE')
  );
  const teVersionCount = $derived(
    Math.max(store.sak.grunnlag.antall_versjoner, teEvents.length, 1)
  );
  const teRevision = $derived(teVersionCount - 1);
  const teDate = $derived(
    formatDateShortNorwegian(
      teEvents.at(-1)?.time ?? store.sak.grunnlag.grunnlag_varsel?.dato_sendt
    )
  );

  const allAnswered = $derived.by(() => {
    if (visVarsling && varsletITide === undefined) return false;
    if (!resultat) return false;
    return true;
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
  onset: (v: boolean | undefined) => void
)}
  <div class="question-block">
    <div class="question-header">
      <span class="question-label">{label}</span>
      <span class="font-mono question-ref">{ref}</span>
    </div>
    <p class="question-text">{text}</p>
    <YesNoControl value={answer} {yesText} {noText} {label} onchange={onset} />
  </div>
{/snippet}

<div class="form-content">
  <CaseAnchor />

  <div class="form-title-row">
    <h1>Svar på ansvarsgrunnlag</h1>
  </div>
  <p class="form-intro">Ta stilling til kontraktsforholdet og begrunn byggherrens vurdering.</p>

  <section class="te-context">
    <div class="context-header">
      <div class="context-party">
        <div class="context-label-row">
          <TRACK_ICONS.ansvar size={14} />
          <span class="context-label">Totalentreprenørens standpunkt</span>
        </div>
        <h2>{store.teNavn}</h2>
        <div class="submission-meta">
          {#if teDate}<span>Sendt {teDate}</span>{/if}
          {#if teRevision > 0}<span>Rev. {teRevision}</span>{/if}
        </div>
      </div>
      <span class="font-mono context-ref">{teDisplay.teRef}</span>
    </div>
    <div class="context-body">
      <h3>{teDisplay.tePosition}</h3>
      <p class:clamped={!teContextExpanded && teDisplay.teText.length > 420} class="context-text">
        {teDisplay.teText}
      </p>
      {#if teDisplay.teText.length > 420}
        <button
          class="read-context-button"
          onclick={() => (teContextExpanded = !teContextExpanded)}
        >
          {#if teContextExpanded}<ChevronUp size={13} /> Vis mindre
          {:else}<BookOpen size={13} /> Les hele redegjørelsen{/if}
        </button>
      {/if}
    </div>
  </section>

  <div class="bh-heading">Byggherrens vurdering</div>

  {#if visVarsling}
    {@render yesNoPill(
      'Varsling',
      '§ 32.2',
      'Ble varselet sendt uten ugrunnet opphold?',
      varsletITide,
      'Ja, i tide',
      'Nei, prekludert',
      (v) => (varsletITide = v)
    )}
    <div class="divider"></div>
  {/if}

  <div class="question-block">
    <div class="question-header">
      <span class="question-label">Kontraktsmessig grunnlag</span>
      <span class="font-mono question-ref">{teDisplay.teRef}</span>
    </div>
    <p class="question-text">Vurder om kontraktsforholdet gir grunnlag for krav.</p>
    {#if prekludert}
      <span class="subsidiaer-chip">Subsidiært</span>
    {/if}
    <SegmentedControl
      variant="mockup"
      label="Kontraktsmessig grunnlag"
      value={resultat}
      options={verdictOptions.map((opt) => ({
        id: opt.value,
        label:
          opt.value === 'godkjent' ? 'Anerkjent' : opt.value === 'avslatt' ? 'Bestridt' : opt.label,
        icon: opt.icon === 'check' ? Check : opt.icon === 'cross' ? X : Undo2,
        tone:
          opt.colorScheme === 'green'
            ? 'success'
            : opt.colorScheme === 'red'
              ? 'danger'
              : 'neutral',
      }))}
      onchange={(value) => (resultat = value)}
      onclear={() => (resultat = undefined)}
    />
  </div>

  {#if allAnswered}
    {#if prekludert || resultat === 'avslatt'}
      <div class="consequence-notice">
        <span class="notice-mark" aria-hidden="true"></span>
        <p>
          {prekludert
            ? 'Varselet er vurdert som for sent. Vurderingen av ansvarsgrunnlaget gjelder subsidiært.'
            : 'Vederlags- og fristkravet behandles subsidiært.'}
        </p>
      </div>
    {/if}
  {/if}

  <div class="begrunnelse-section">
    <div class="question-header begrunnelse-header">
      <span class="question-label">Begrunnelse</span>
      <span class="font-mono char-count">{charCount} tegn</span>
    </div>
    <p class="helptext begrunnelse-help">
      Redegjør for den kontraktsmessige vurderingen og eventuelle forbehold.
    </p>
    <div class="editor-wrapper">
      <RichTextEditor
        body={begrunnelseHtml}
        onchange={(html) => (begrunnelseHtml = html)}
        extensions={[LockedValueNode]}
        placeholder="Begrunn byggherrens vurdering..."
        maxHeight="none"
        oncharcount={(c) => (charCount = c)}
      />
    </div>
  </div>
</div>

<style>
  /* Form-specific styles (shared styles in mockup.css) */
  .form-title-row {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
  }
  .form-title-row h1 {
    margin: 0;
    font-size: 30px;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.02em;
    color: var(--ink);
  }
  .form-intro {
    max-width: 620px;
    margin: 0 0 28px;
    font-size: 14px;
    line-height: 1.6;
    color: var(--ink-3);
  }

  .te-context {
    overflow: hidden;
    padding: 0;
    background: var(--surface);
    border-radius: 12px;
    box-shadow: var(--overlay-shadow-sm);
  }
  .context-header {
    align-items: flex-start;
    margin: 0;
    padding: 14px 16px;
    border-bottom: var(--rule);
  }
  .context-party {
    min-width: 0;
  }
  .context-label-row {
    color: var(--ink-4);
  }
  .context-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-4);
  }
  .context-party h2 {
    margin: 4px 0 0;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.35;
    color: var(--ink);
  }
  .submission-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px 9px;
    margin-top: 4px;
    font-size: 11px;
    line-height: 1.4;
    color: var(--ink-4);
  }
  .submission-meta span + span::before {
    margin-right: 9px;
    color: var(--line-strong);
    content: '·';
  }
  .context-ref {
    flex: none;
    padding: 0;
    background: transparent;
    border: 0;
    color: var(--ink-4);
  }
  .context-body {
    padding: 16px;
    background: var(--surface-warm);
  }
  .context-body h3 {
    margin: 0 0 9px;
    font-size: 15px;
    font-weight: 700;
    line-height: 1.4;
    color: var(--ink);
  }
  .context-text {
    max-width: 70ch;
    margin: 0;
    white-space: pre-wrap;
    font-size: 14px;
    line-height: 1.65;
  }
  .context-text.clamped {
    display: -webkit-box;
    overflow: hidden;
    line-clamp: 6;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 6;
  }
  .read-context-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 11px;
    padding: 0;
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 600;
    color: var(--green);
    background: transparent;
    border: 0;
    cursor: pointer;
  }
  .read-context-button:hover {
    color: var(--ink);
  }

  .bh-heading {
    margin: 0 0 24px;
    padding-bottom: 10px;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-3);
    border-bottom: 1px solid var(--color-wire);
  }
  .subsidiaer-chip {
    display: inline-flex;
    width: fit-content;
    margin: 0 0 2px;
    padding: 5px 8px;
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--green);
    background: color-mix(in srgb, var(--green-bg) 55%, transparent);
    border: 1px dashed var(--green);
    border-radius: 6px;
  }
  .consequence-notice {
    display: flex;
    align-items: flex-start;
    gap: 11px;
    margin: -8px 0 28px;
    padding: 13px 15px;
    font-size: 13px;
    line-height: 1.55;
    color: var(--ink-2);
    background: var(--info-bg);
    border: var(--rule-strong);
    border-radius: 12px;
  }
  .consequence-notice p {
    margin: 0;
  }
  .notice-mark {
    flex: none;
    width: 9px;
    height: 9px;
    margin-top: 5px;
    background: var(--brand);
    border-radius: 1px;
    transform: rotate(45deg);
  }

  .begrunnelse-section {
    margin-top: 0;
    padding-top: 24px;
    border-top: 1px solid var(--color-wire);
  }
  .begrunnelse-header {
    margin-bottom: 0;
  }
  .begrunnelse-help {
    margin: 8px 0 0;
  }

  @media (max-width: 768px) {
    .form-title-row h1 {
      font-size: 25px;
    }
  }
</style>
