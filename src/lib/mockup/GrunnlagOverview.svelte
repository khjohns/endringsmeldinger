<script lang="ts">
  import {
    BookOpen,
    Check,
    ChevronLeft,
    CircleMinus,
    Clock3,
    Paperclip,
    Pencil,
    X,
  } from 'lucide-svelte';
  import { getHjemmelObj, getKontraktsforhold } from '$lib/constants/categories.js';
  import { formatDateShortNorwegian } from '$lib/utils/dateFormatters.js';
  import { store } from './store.svelte.js';
  import Stamp from './Stamp.svelte';

  let { onform }: { onform: () => void } = $props();

  const grunnlag = $derived(store.sak.grunnlag);
  const ui = $derived(store.getUI('ansvar'));
  const kategori = $derived(getKontraktsforhold(grunnlag.hovedkategori));
  const hjemmel = $derived(getHjemmelObj(grunnlag.underkategori));

  let expandedSide: 'te' | 'bh' | null = $state(null);

  const status = $derived.by(() => {
    if (grunnlag.bh_resultat === 'avslatt') {
      return {
        icon: X,
        text: 'Ansvarsgrunnlaget er bestridt',
        variant: 'negative' as const,
      };
    }
    if (grunnlag.bh_resultat === 'godkjent') {
      return {
        icon: Check,
        text: 'Ansvarsgrunnlaget er godkjent',
        variant: 'positive' as const,
      };
    }
    if (grunnlag.bh_resultat === 'frafalt') {
      return {
        icon: CircleMinus,
        text: 'Pålegget er frafalt',
        variant: 'warning' as const,
      };
    }
    return {
      icon: Clock3,
      text: `Avventer standpunkt fra ${store.bhNavn}`,
      variant: 'pending' as const,
    };
  });

  const teText = $derived(grunnlag.beskrivelse ?? '');
  const bhText = $derived(grunnlag.bh_begrunnelse ?? '');
  const grunnlagEvents = $derived(store.timeline.filter((event) => event.spor === 'grunnlag'));
  const teEvents = $derived(grunnlagEvents.filter((event) => event.actorrole === 'TE'));
  const bhEvents = $derived(grunnlagEvents.filter((event) => event.actorrole === 'BH'));
  const teVersionCount = $derived(Math.max(grunnlag.antall_versjoner, teEvents.length, 1));
  const teRevision = $derived(teVersionCount - 1);
  const bhAnsweredVersion = $derived(
    grunnlag.bh_respondert_versjon === undefined ? null : grunnlag.bh_respondert_versjon + 1
  );
  const bhSvarErEldre = $derived(bhAnsweredVersion !== null && teVersionCount > bhAnsweredVersion);
  const teDate = $derived(
    formatDateShortNorwegian(teEvents.at(-1)?.time ?? grunnlag.grunnlag_varsel?.dato_sendt)
  );
  const bhDate = $derived(
    formatDateShortNorwegian(bhEvents.at(-1)?.time ?? grunnlag.siste_oppdatert)
  );
  const attachmentPages = $derived(
    ui.att.reduce((sum, attachment) => sum + (attachment.p ?? 0), 0)
  );

  function wordCount(text: string): number {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }
</script>

{#if expandedSide}
  {@const isTe = expandedSide === 'te'}
  {@const text = isTe ? teText : bhText}
  <article class="reading-view">
    <button class="back-button" onclick={() => (expandedSide = null)}>
      <ChevronLeft size={15} /> Tilbake til oversikten
    </button>
    <div class="reading-header">
      <div>
        <span class="eyebrow"
          >{isTe ? 'Totalentreprenørens standpunkt' : 'Byggherrens standpunkt'}</span
        >
        <h3>{isTe ? store.teNavn : store.bhNavn}</h3>
        {#if isTe}
          <div class="submission-meta">
            {#if teDate}<span>Sendt {teDate}</span>{/if}
            {#if teRevision > 0}<span>Rev. {teRevision}</span>{/if}
          </div>
        {:else if grunnlag.bh_resultat}
          <div class="submission-meta">
            {#if bhDate}<span>Svart {bhDate}</span>{/if}
            {#if bhAnsweredVersion !== null && teVersionCount > 1}
              <span class:stale-version={bhSvarErEldre}>
                {bhSvarErEldre
                  ? `Svar på tidligere versjon (${bhAnsweredVersion})`
                  : `Svar på versjon ${bhAnsweredVersion}`}
              </span>
            {/if}
          </div>
        {/if}
      </div>
    </div>
    <p class="reading-text">{text}</p>
  </article>
{:else}
  <div class="status-card status-{status.variant}">
    <div class="status-icon"><status.icon size={17} strokeWidth={2.25} /></div>
    <div>
      <span class="eyebrow">Status for ansvarsgrunnlaget</span>
      <div class="status-title">{status.text}</div>
    </div>
  </div>

  <section class="basis-card">
    <div class="basis-header">
      <span class="eyebrow">Kontraktsforhold</span>
      {#if hjemmel}
        <span class="font-mono basis-ref">§ {hjemmel.hjemmel_basis}</span>
      {/if}
    </div>
    <div class="basis-body">
      <h3>{hjemmel?.label ?? grunnlag.tittel ?? 'Ikke angitt'}</h3>
      {#if kategori}
        <div class="category-row">
          <span class="category-label">Hovedkategori</span>
          <span class="category-value">{kategori.label}</span>
        </div>
      {/if}
      {#if hjemmel?.beskrivelse}
        <p class="basis-description">{hjemmel.beskrivelse}</p>
      {/if}
    </div>
    {#if kategori}
      <div class="rule-effects">
        <span class="rule-effects-label">Aktuelle kravsspor</span>
        {#if kategori.hjemmel_vederlag}
          <span class="rule-chip">Vederlag § {kategori.hjemmel_vederlag}</span>
        {/if}
        <span class="rule-chip">Frist § {kategori.hjemmel_frist}</span>
        <span class="rule-chip rule-chip-muted">{kategori.type_krav}</span>
      </div>
    {/if}
  </section>

  <div class="positions">
    <article class="position-card">
      <div class="position-header">
        <div>
          <span class="eyebrow">Totalentreprenørens standpunkt</span>
          <h3>{store.teNavn}</h3>
          <div class="submission-meta">
            {#if teDate}<span>Sendt {teDate}</span>{/if}
            {#if teRevision > 0}<span>Rev. {teRevision}</span>{/if}
          </div>
        </div>
      </div>
      {#if teText}
        <p class:clamped={teText.length > 420} class="position-text">{teText}</p>
      {:else}
        <p class="position-text empty-text">Ingen redegjørelse registrert.</p>
      {/if}
      <div class="position-footer">
        <div class="position-meta">
          <span>{wordCount(teText)} ord</span>
          {#if ui.att.length > 0}
            <span class="meta-separator">·</span>
            <span class="attachment-meta">
              <Paperclip size={12} />
              {ui.att.length} vedlegg
              {#if attachmentPages > 0}
                · {attachmentPages} sider{/if}
            </span>
          {/if}
        </div>
        {#if teText.length > 420}
          <button class="read-button" onclick={() => (expandedSide = 'te')}>
            <BookOpen size={13} /> Les hele redegjørelsen
          </button>
        {/if}
      </div>
    </article>

    <article class="position-card">
      <div class="position-header">
        <div>
          <span class="eyebrow">Byggherrens standpunkt</span>
          <h3>{store.bhNavn}</h3>
          {#if grunnlag.bh_resultat}
            <div class="submission-meta">
              {#if bhDate}<span>Svart {bhDate}</span>{/if}
              {#if bhAnsweredVersion !== null && teVersionCount > 1}
                <span class:stale-version={bhSvarErEldre}>
                  {bhSvarErEldre
                    ? `Svar på tidligere versjon (${bhAnsweredVersion})`
                    : `Svar på versjon ${bhAnsweredVersion}`}
                </span>
              {/if}
            </div>
          {/if}
        </div>
      </div>
      {#if bhText}
        <p class:clamped={bhText.length > 420} class="position-text">{bhText}</p>
      {:else}
        <p class="position-text empty-text">Byggherren har ikke registrert et standpunkt.</p>
      {/if}
      <div class="position-footer">
        <div class="position-meta"><span>{wordCount(bhText)} ord</span></div>
        {#if bhText.length > 420}
          <button class="read-button" onclick={() => (expandedSide = 'bh')}>
            <BookOpen size={13} /> Les hele begrunnelsen
          </button>
        {/if}
      </div>
    </article>
  </div>

  {#if ui.draft}
    <button class="draft-card" onclick={onform}>
      <span class="draft-icon"><Pencil size={13} /></span>
      <span class="draft-content">
        <span class="draft-heading">
          <Stamp variant="draft" small flat>Kladd</Stamp>
          <span>Internt — ikke synlig for motpart</span>
        </span>
        <span class="draft-text">{ui.draft.text}</span>
      </span>
    </button>
  {/if}
{/if}

<style>
  .eyebrow {
    display: block;
    font-size: 10px;
    font-weight: 700;
    line-height: 1.3;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--ink-4);
  }

  .status-card {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    padding: 14px 16px;
    background: var(--surface);
    border: var(--rule);
    border-radius: 12px;
  }
  .status-icon {
    display: grid;
    flex: none;
    width: 32px;
    height: 32px;
    place-items: center;
    border-radius: 50%;
    background: var(--surface-inset);
    color: var(--ink-3);
  }
  .status-title {
    margin-top: 2px;
    font-size: 14px;
    font-weight: 700;
    color: var(--ink);
  }
  .status-negative .status-icon,
  .status-negative .status-title {
    color: var(--danger);
  }
  .status-negative .status-icon {
    background: var(--danger-bg);
  }
  .status-positive .status-icon,
  .status-positive .status-title {
    color: var(--success);
  }
  .status-positive .status-icon {
    background: var(--success-bg);
  }
  .status-warning .status-icon,
  .status-warning .status-title {
    color: color-mix(in srgb, var(--warning) 78%, var(--ink));
  }
  .status-warning .status-icon {
    background: var(--warning-bg);
  }

  .basis-card {
    overflow: hidden;
    margin-bottom: 16px;
    background: var(--surface);
    border: var(--rule);
    border-radius: 12px;
    box-shadow: var(--overlay-shadow-sm);
  }
  .basis-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 16px;
    border-bottom: var(--rule);
  }
  .basis-ref {
    font-size: 11px;
    color: var(--ink-4);
  }
  .basis-body {
    padding: 18px 16px;
  }
  .basis-body h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    line-height: 1.35;
    letter-spacing: -0.01em;
    color: var(--ink);
  }
  .category-row {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-top: 12px;
  }
  .category-label {
    flex: none;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-4);
  }
  .category-value {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-2);
  }
  .basis-description {
    max-width: 68ch;
    margin-top: 10px;
    font-size: 13px;
    line-height: 1.6;
    color: var(--ink-3);
  }
  .rule-effects {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 7px;
    padding: 12px 16px;
    background: var(--surface-warm);
    border-top: var(--rule);
  }
  .rule-effects-label {
    margin-right: 3px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-4);
  }
  .rule-chip {
    padding: 4px 8px;
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    color: var(--ink-2);
    background: var(--surface);
    border: var(--rule-strong);
    border-radius: 999px;
  }
  .rule-chip-muted {
    font-family: var(--font-sans);
    color: var(--ink-3);
  }

  .positions {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .position-card {
    padding: 16px;
    background: var(--surface);
    border: var(--rule);
    border-radius: 12px;
  }
  .position-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 12px;
    border-bottom: var(--rule-subtle);
  }
  .position-header h3,
  .reading-header h3 {
    margin: 3px 0 0;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.4;
    color: var(--ink);
  }
  .submission-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px 9px;
    margin-top: 5px;
    font-size: 11px;
    line-height: 1.4;
    color: var(--ink-4);
  }
  .submission-meta span + span::before {
    margin-right: 9px;
    color: var(--line-strong);
    content: '·';
  }
  .submission-meta .stale-version {
    font-weight: 650;
    color: color-mix(in srgb, var(--warning) 76%, var(--ink));
  }
  .position-text {
    margin: 14px 0 0;
    max-width: 74ch;
    white-space: pre-wrap;
    font-size: 14px;
    line-height: 1.65;
    color: var(--ink-2);
  }
  .position-text.clamped {
    display: -webkit-box;
    overflow: hidden;
    line-clamp: 6;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 6;
  }
  .empty-text {
    font-style: italic;
    color: var(--ink-4);
  }
  .position-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-top: 12px;
  }
  .position-meta,
  .attachment-meta {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .position-meta {
    font-size: 11px;
    color: var(--ink-4);
  }
  .meta-separator {
    margin: 0 2px;
  }
  .read-button,
  .back-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0;
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 600;
    color: var(--green);
    background: none;
    border: none;
    cursor: pointer;
  }
  .read-button:hover,
  .back-button:hover {
    color: var(--ink);
  }

  .reading-view {
    max-width: 760px;
    margin: 0 auto;
    padding: 8px 0 40px;
    animation: fadeUp 0.15s ease-out;
  }
  .back-button {
    margin-bottom: 24px;
  }
  .reading-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 14px;
    border-bottom: var(--rule);
  }
  .reading-text {
    max-width: 68ch;
    margin: 24px 0 0;
    white-space: pre-wrap;
    font-size: 16px;
    line-height: 1.75;
    color: var(--ink-2);
  }

  .draft-card {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    width: 100%;
    margin-top: 16px;
    padding: 14px 16px;
    text-align: left;
    font-family: var(--font-sans);
    color: var(--draft);
    background: var(--draft-bg);
    border: 1.5px dashed var(--draft-border);
    border-radius: 12px;
    cursor: pointer;
    transition:
      border-color 120ms,
      background 120ms;
  }
  .draft-card:hover {
    border-color: var(--draft);
    background: var(--surface-warm);
  }
  .draft-icon {
    display: grid;
    flex: none;
    width: 28px;
    height: 28px;
    place-items: center;
    border-radius: 50%;
    background: var(--surface);
  }
  .draft-content {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }
  .draft-heading {
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 12px;
    font-weight: 600;
  }
  .draft-text {
    font-size: 13px;
    line-height: 1.55;
  }

  @media (max-width: 768px) {
    .basis-body h3 {
      font-size: 18px;
    }
    .category-row,
    .position-footer {
      align-items: flex-start;
      flex-direction: column;
    }
    .position-header,
    .reading-header {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
