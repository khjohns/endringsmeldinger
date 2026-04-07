<script lang="ts">
  import { store } from './store.svelte.js';
  import { TRACK_ICONS } from './data.js';
  import Stamp from './Stamp.svelte';
  import CaseAnchor from './CaseAnchor.svelte';

  let {
    onsend,
    onactions,
  }: {
    onsend: () => void;
    onactions?: (a: { canSend: boolean; send: () => void }) => void;
  } = $props();

  const d = $derived(store.display('ansvar'));

  let begrunnelse = $state(d.teText);
  const kanSende = $derived(begrunnelse.length >= 10);

  $effect(() => {
    onactions?.({
      canSend: kanSende,
      send: () => {
        store.sendTeGrunnlag(begrunnelse);
        onsend();
      },
    });
  });
</script>

<div class="form-content">
  <CaseAnchor />

  <div class="te-context">
    <div class="context-header">
      <div class="context-label-row">
        <svelte:component this={TRACK_ICONS.ansvar} size={14} style="color: var(--ink-3)" />
        <span class="context-label">{d.label} — Revider grunnlag</span>
      </div>
      <span class="font-mono context-ref">{d.teRef}</span>
    </div>
    <div class="te-position">
      <span class="font-mono position-badge">{d.tePosition?.toUpperCase()}</span>
      <span class="font-mono position-ref">{d.teRef}</span>
    </div>
  </div>

  <div class="bh-standpunkt">
    <div class="standpunkt-header">
      <span class="standpunkt-label">{store.bhNavn} — standpunkt</span>
      <Stamp variant="red" small>Bestridt</Stamp>
    </div>
    <p class="font-serif standpunkt-text">{d.bhText}</p>
  </div>

  <div class="divider"></div>

  <div class="question-block">
    <div class="question-header">
      <span class="question-label">Din begrunnelse</span>
      <span class="font-mono question-ref">{d.teRef}</span>
    </div>
    <p class="helptext">
      Oppdater din begrunnelse for kontraktsforholdet. Kategori og hjemmel kan ikke endres.
    </p>
    <textarea
      value={begrunnelse}
      oninput={(e) => (begrunnelse = e.currentTarget.value)}
      placeholder="Begrunn kontraktsforholdet..."
      class="font-serif begrunnelse-textarea"
    ></textarea>
    <div class="char-count font-mono">{begrunnelse.length} tegn</div>
  </div>

  {#if kanSende}
    <div class="status-box">
      <div class="font-mono status-text">Klar til å sende revisjon</div>
    </div>
  {/if}
</div>

<style>
  /* Form-specific styles (shared styles in mockup.css) */
  .te-context {
    margin-bottom: 32px;
  }
  .te-position {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .position-badge {
    font-size: 11px;
    font-weight: 700;
    background: var(--plate);
    color: white;
    padding: 4px 8px;
  }
  .position-ref {
    font-size: 11px;
    font-weight: 500;
    color: var(--ink-2);
  }
  .bh-standpunkt {
    margin-bottom: 32px;
    padding: 20px 24px;
    background: var(--red-bg);
    border: 1px solid var(--red-bg);
  }
  .standpunkt-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .standpunkt-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--red);
  }
  .standpunkt-text {
    font-size: 14px;
    line-height: 1.6;
    color: var(--ink-2);
  }
  .question-block {
    margin-bottom: 24px;
  }
  .helptext {
    margin-bottom: 16px;
  }
  .begrunnelse-textarea {
    min-height: 240px;
  }
  .char-count {
    font-size: 10px;
    color: var(--ink-4);
    margin-top: 8px;
    text-align: right;
  }
</style>
