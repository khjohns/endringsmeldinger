<script lang="ts">
  import { S, TE } from './data.js';
  import { fmt } from './utils.js';
  import Stamp from './Stamp.svelte';
  import CaseAnchor from './CaseAnchor.svelte';
  import type { Track, TrackKey } from './types.js';

  let {
    d,
    sel,
    choices,
    ontoggle,
  }: {
    d: Track;
    sel: TrackKey;
    choices: Record<string, string | null>;
    ontoggle: (key: string, value: string) => void;
  } = $props();
</script>

<div class="form-content">
  <CaseAnchor />

  <div class="te-context">
    <div class="context-header">
      <div class="context-label-row">
        <d.icon size={14} style="color: var(--ink-3)" />
        <span class="context-label">{d.label} — {TE}s krav</span>
      </div>
      <span class="font-mono context-ref">{d.best[0].ref}</span>
    </div>
    {#if d.type === 'numeric'}
      <div class="font-mono context-value">
        {fmt(d.te.value!)}{d.te.unit === ' dgr' ? ' dager' : d.te.unit}
      </div>
    {/if}
    <p class="font-serif context-text">{d.teT}</p>
  </div>

  <div class="bh-heading">Byggherrens standpunkt</div>

  <div class="question-block">
    <div class="question-header">
      <span class="question-label">Fremsatt krav</span>
      <span class="font-mono question-ref">§ 33.6.1</span>
    </div>
    <p class="question-text">Ble kravet fremsatt uten ugrunnet opphold?</p>
    <div class="pill-row">
      <button class="pill" class:yes={choices.q1 === 'ja'} onclick={() => ontoggle('q1', 'ja')}
        >Ja, i tide</button
      >
      <button class="pill" class:no={choices.q1 === 'nei'} onclick={() => ontoggle('q1', 'nei')}
        >Nei, for sent</button
      >
    </div>
  </div>

  <div class="divider"></div>

  <div class="question-block">
    <div class="question-header">
      <span class="question-label">Årsakssammenheng</span>
      <span class="font-mono question-ref">{d.best[0].ref}</span>
    </div>
    <p class="question-text">
      {#if sel === 'frist'}Foreligger det en hindring på fremdriften?
      {:else if sel === 'vederlag'}Har forholdet medført nødvendige merkostnader?
      {:else}Foreligger det en svikt ved byggherrens ytelse?
      {/if}
    </p>
    <div class="pill-row">
      <button class="pill" class:yes={choices.q2 === 'ja'} onclick={() => ontoggle('q2', 'ja')}>
        {#if sel === 'frist'}Ja, hindring{:else if sel === 'vederlag'}Ja, merkostnad{:else}Ja, svikt{/if}
      </button>
      <button class="pill" class:no={choices.q2 === 'nei'} onclick={() => ontoggle('q2', 'nei')}>
        {#if sel === 'ansvar'}Nei, TE-risiko{:else}Nei{/if}
      </button>
    </div>
  </div>

  {#if d.type === 'numeric'}
    <div class="divider"></div>
    <div class="question-block">
      <div class="question-header">
        <span class="question-label">Utmåling</span>
        <span class="font-mono question-ref">{d.best[1]?.ref || d.best[0].ref}</span>
      </div>
      <div style="margin-bottom: {S.lg}px; display: inline-block">
        <Stamp variant="ochre" small flat>Subsidiært</Stamp>
      </div>
      <div class="measurement-row">
        <div>
          <div class="measurement-label">Krevd</div>
          <div class="font-mono measurement-value">
            {fmt(d.te.value!)}{d.te.unit === ' dgr' ? ' dager' : d.te.unit}
          </div>
        </div>
        <div>
          <div class="measurement-input-label">
            {sel === 'frist' ? 'Godkjent dager' : 'Godkjent beløp'}
          </div>
          <input
            type="text"
            placeholder={sel === 'frist' ? 'dager' : 'beløp'}
            class="font-mono measurement-input"
          />
        </div>
      </div>
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
    margin-bottom: 12px;
    letter-spacing: -0.02em;
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
    margin-bottom: 40px;
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
    margin-bottom: 40px;
  }
  .measurement-row {
    display: flex;
    align-items: flex-end;
    gap: 32px;
  }
  .measurement-label {
    font-size: 12px;
    color: var(--ink-4);
    margin-bottom: 4px;
  }
  .measurement-value {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.02em;
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
</style>
