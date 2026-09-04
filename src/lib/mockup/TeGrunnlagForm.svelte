<script lang="ts">
  import { BookOpen, ChevronUp, LockKeyhole } from 'lucide-svelte';
  import RichTextEditor from '$lib/components/primitives/RichTextEditor.svelte';
  import LockedValueNode from '$lib/editor/LockedValueNode';
  import { getHjemmelObj, getKontraktsforhold } from '$lib/constants/categories.js';
  import { formatDateShortNorwegian } from '$lib/utils/dateFormatters.js';
  import { store } from './store.svelte.js';
  import { TRACK_ICONS } from './data.js';
  import CaseAnchor from './CaseAnchor.svelte';

  let {
    onsend,
    onactions,
  }: {
    onsend: () => void;
    onactions?: (a: { canSend: boolean; sendLabel?: string; send: () => void }) => void;
  } = $props();

  const d = $derived(store.display('ansvar'));
  const grunnlag = $derived(store.sak.grunnlag);
  const kontraktsforhold = $derived(getKontraktsforhold(grunnlag.hovedkategori));
  const hjemmel = $derived(getHjemmelObj(grunnlag.underkategori));
  const teEvents = $derived(
    store.timeline.filter((event) => event.spor === 'grunnlag' && event.actorrole === 'TE')
  );
  const bhEvents = $derived(
    store.timeline.filter((event) => event.spor === 'grunnlag' && event.actorrole === 'BH')
  );
  const teVersionCount = $derived(Math.max(grunnlag.antall_versjoner, teEvents.length, 1));
  const teRevision = $derived(teVersionCount - 1);
  const teDate = $derived(
    formatDateShortNorwegian(teEvents.at(-1)?.time ?? grunnlag.grunnlag_varsel?.dato_sendt)
  );
  const bhDate = $derived(formatDateShortNorwegian(bhEvents.at(-1)?.time));
  const bhAnsweredRevision = $derived(grunnlag.bh_respondert_versjon);
  const oppdagetDato = $derived(formatDateShortNorwegian(grunnlag.dato_oppdaget));
  const hasBhResponse = $derived(Boolean(grunnlag.bh_resultat));
  const originalBegrunnelse = store.display('ansvar').teText;

  let begrunnelseHtml = $state(originalBegrunnelse);
  let charCount = $state(0);
  let bhContextExpanded = $state(false);

  const erEndret = $derived(begrunnelseHtml.trim() !== originalBegrunnelse.trim());
  const kanSende = $derived(charCount >= 10 && erEndret);

  $effect(() => {
    onactions?.({
      canSend: kanSende,
      sendLabel: 'Send oppdatering',
      send: () => {
        store.sendTeGrunnlag(begrunnelseHtml);
        onsend();
      },
    });
  });
</script>

<div class="form-content">
  <CaseAnchor />

  <div class="form-title-row">
    <h1>Oppdater ansvarsgrunnlag</h1>
  </div>
  <p class="form-intro">
    Oppdater totalentreprenørens redegjørelse. Kontraktsforhold, hjemmel og dato kan ikke endres.
  </p>

  <section class="locked-context">
    <div class="locked-header">
      <div>
        <span class="eyebrow">Kontraktsforhold</span>
        <h2>{hjemmel?.label ?? d.tePosition}</h2>
      </div>
      <div class="locked-mark"><LockKeyhole size={13} /> Låst</div>
    </div>

    <div class="contract-details">
      {#if kontraktsforhold?.label}
        <span>{kontraktsforhold.label}</span>
      {/if}
      <span class="font-mono contract-ref">{d.teRef}</span>
    </div>

    <div class="submission-meta">
      {#if oppdagetDato}<span>Oppdaget {oppdagetDato}</span>{/if}
      {#if teDate}<span>Sist sendt {teDate}</span>{/if}
      {#if teRevision > 0}<span>Rev. {teRevision}</span>{/if}
    </div>
  </section>

  {#if hasBhResponse}
    <section class="bh-context">
      <div class="bh-context-header">
        <div class="bh-party">
          <div class="context-label-row">
            <TRACK_ICONS.ansvar size={14} />
            <span class="eyebrow">Byggherrens standpunkt</span>
          </div>
          <h2>{store.bhNavn}</h2>
          <div class="response-meta">
            {#if bhDate}<span>Svart {bhDate}</span>{/if}
            {#if bhAnsweredRevision !== undefined}
              <span>
                {bhAnsweredRevision === 0
                  ? 'Svar på opprinnelig innsending'
                  : `Svar på rev. ${bhAnsweredRevision}`}
              </span>
            {/if}
          </div>
        </div>
        <span class="font-mono context-ref">{d.teRef}</span>
      </div>
      <div class="bh-context-body">
        <p class:clamped={!bhContextExpanded && d.bhText.length > 420} class="bh-text">
          {d.bhText}
        </p>
        {#if d.bhText.length > 420}
          <button
            class="read-context-button"
            onclick={() => (bhContextExpanded = !bhContextExpanded)}
          >
            {#if bhContextExpanded}<ChevronUp size={13} /> Vis mindre
            {:else}<BookOpen size={13} /> Les hele vurderingen{/if}
          </button>
        {/if}
      </div>
    </section>

    <div class="revision-notice">
      <span class="notice-mark" aria-hidden="true"></span>
      <p>Oppdateringen sendes som en ny revisjon etter byggherrens svar.</p>
    </div>
  {/if}

  <section class="begrunnelse-section">
    <div class="question-header begrunnelse-header">
      <span class="question-label">Oppdatert begrunnelse</span>
      <span class="font-mono char-count">{charCount} tegn</span>
    </div>
    <p class="helptext begrunnelse-help">
      Endre eller suppler redegjørelsen. Forrige versjon beholdes i historikken.
    </p>
    <div class="editor-wrapper">
      <RichTextEditor
        body={begrunnelseHtml}
        onchange={(html) => (begrunnelseHtml = html)}
        extensions={[LockedValueNode]}
        placeholder="Oppdater begrunnelsen for ansvarsgrunnlaget..."
        maxHeight="none"
        oncharcount={(count) => (charCount = count)}
      />
    </div>
    {#if charCount >= 10 && !erEndret}
      <p class="unchanged-hint">Gjør en endring i begrunnelsen for å sende en ny revisjon.</p>
    {/if}
  </section>
</div>

<style>
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
    max-width: 650px;
    margin: 0 0 28px;
    font-size: 14px;
    line-height: 1.6;
    color: var(--ink-3);
  }
  .locked-context,
  .bh-context {
    overflow: hidden;
    margin-bottom: 24px;
    padding: 22px 24px;
    background: var(--surface);
    border: var(--rule);
    border-radius: 12px;
    box-shadow: var(--overlay-shadow-sm);
  }
  .locked-context {
    background: var(--surface-inset);
    box-shadow: none;
  }
  .locked-header,
  .bh-context-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
  }
  .eyebrow {
    display: block;
    margin-bottom: 5px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--ink-4);
  }
  h2 {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: var(--ink);
  }
  .locked-mark {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex: 0 0 auto;
    font-size: 11px;
    font-weight: 600;
    color: var(--ink-3);
  }
  .contract-details {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 14px;
    font-size: 13px;
    color: var(--ink-2);
  }
  .contract-ref {
    padding-left: 8px;
    border-left: var(--rule);
    color: var(--ink-3);
  }
  .submission-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0;
    margin-top: 16px;
    font-size: 11px;
    color: var(--ink-4);
  }
  .submission-meta span + span::before {
    content: '\00b7';
    margin: 0 8px;
  }
  .bh-context {
    padding: 0;
  }
  .bh-context-header {
    margin: 0;
    padding: 14px 16px;
    border-bottom: var(--rule);
  }
  .bh-party {
    min-width: 0;
  }
  .context-label-row {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--ink-4);
  }
  .context-label-row .eyebrow {
    margin-bottom: 0;
    font-size: 10px;
  }
  .bh-party h2 {
    margin-top: 4px;
    font-size: 13px;
  }
  .response-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px 9px;
    margin-top: 4px;
    font-size: 11px;
    line-height: 1.4;
    color: var(--ink-4);
  }
  .response-meta span + span::before {
    margin-right: 9px;
    content: '\00b7';
  }
  .context-ref {
    flex: none;
    color: var(--ink-4);
  }
  .bh-context-body {
    padding: 16px;
    background: var(--surface-warm);
  }
  .bh-text {
    max-width: 70ch;
    margin: 0;
    font-size: 14px;
    line-height: 1.65;
    color: var(--ink-2);
    white-space: pre-wrap;
  }
  .bh-text.clamped {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 5;
    line-clamp: 5;
  }
  .read-context-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 12px;
    padding: 0;
    background: transparent;
    border: 0;
    color: var(--brand);
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  .revision-notice {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: -4px 0 28px;
    padding: 12px 14px;
    background: var(--info-bg);
    border: var(--rule-strong);
    border-radius: 10px;
    color: var(--ink-2);
  }
  .revision-notice p {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
  }
  .notice-mark {
    width: 8px;
    height: 8px;
    flex: 0 0 auto;
    transform: rotate(45deg);
    background: var(--brand);
  }
  .begrunnelse-section {
    margin-bottom: 28px;
  }
  .begrunnelse-header {
    margin-bottom: 6px;
  }
  .begrunnelse-help {
    margin: 0 0 14px;
  }
  .char-count {
    font-size: 10px;
    font-weight: 500;
    color: var(--ink-4);
  }
  .editor-wrapper {
    min-height: 300px;
  }
  .editor-wrapper :global(.rte-container) {
    min-height: 300px;
    background: var(--surface);
    border: var(--rule-strong);
    border-radius: 10px;
  }
  .unchanged-hint {
    margin: 9px 0 0;
    font-size: 11px;
    color: var(--ink-4);
  }

  @media (max-width: 640px) {
    .locked-context {
      padding: 18px;
    }
    .bh-context {
      padding: 0;
    }
    .locked-header,
    .bh-context-header {
      gap: 12px;
    }
    .contract-details {
      align-items: flex-start;
      flex-direction: column;
    }
    .contract-ref {
      padding-left: 0;
      border-left: 0;
    }
  }
</style>
