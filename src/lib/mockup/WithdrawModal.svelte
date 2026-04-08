<script lang="ts">
  import { AlertTriangle, XSquare } from 'lucide-svelte';
  import { store } from './store.svelte.js';
  import type { SporKey } from './types.js';

  let {
    spor,
    onconfirm,
    oncancel,
  }: {
    spor: SporKey;
    onconfirm: (begrunnelse: string) => void;
    oncancel: () => void;
  } = $props();

  let begrunnelse = $state('');

  const sporLabels: Record<SporKey, string> = {
    ansvar: 'ansvarsgrunnlaget',
    vederlag: 'vederlagskravet',
    frist: 'fristkravet',
  };

  // Cascade warning: withdrawing grunnlag also withdraws vederlag + frist
  const cascadeDown = $derived(spor === 'ansvar');

  // Reverse cascade: if this is the last active claim, grunnlag auto-withdraws
  const reverseCascade = $derived.by(() => {
    if (spor === 'ansvar') return false;
    const otherSpor = spor === 'vederlag' ? 'frist' : 'vederlag';
    const otherDisplay = store.display(otherSpor);
    const otherInactive = otherDisplay.isBinary ? false : (otherDisplay.krevdValue ?? 0) === 0;
    return otherInactive;
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
<div class="modal-backdrop" onclick={oncancel}>
  <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
  <div class="modal-card" onclick={(e) => e.stopPropagation()}>
    <div class="modal-header">
      <XSquare size={18} style="color: var(--red)" />
      <h3 class="modal-title">Trekk tilbake {sporLabels[spor]}</h3>
    </div>

    <p class="modal-desc font-serif">
      Du er i ferd med å trekke tilbake {sporLabels[spor]}. Denne handlingen kan ikke angres uten å
      sende et nytt krav.
    </p>

    {#if cascadeDown}
      <div class="cascade-warning">
        <AlertTriangle size={16} style="color: var(--red); flex-shrink: 0" />
        <div>
          <div class="cascade-title">Kaskadeeffekt</div>
          <p class="cascade-text font-serif">
            Trekking av ansvarsgrunnlaget vil automatisk trekke tilbake vederlagskravet og
            fristkravet. Ansvarsgrunnlaget er fundamentet for hele saken.
          </p>
        </div>
      </div>
    {/if}

    {#if reverseCascade}
      <div class="cascade-info">
        <AlertTriangle size={16} style="color: var(--gold); flex-shrink: 0" />
        <div>
          <div class="cascade-title">Siste aktive krav</div>
          <p class="cascade-text font-serif">
            Dette er det siste aktive kravet. Trekking vil automatisk trekke ansvarsgrunnlaget, da
            det ikke har praktisk effekt uten aktive krav.
          </p>
        </div>
      </div>
    {/if}

    <div class="field">
      <label class="font-mono field-label" for="withdraw-reason">Begrunnelse (valgfritt)</label>
      <textarea
        id="withdraw-reason"
        class="font-serif field-textarea"
        bind:value={begrunnelse}
        placeholder="Hvorfor trekkes kravet tilbake?"
        rows="3"
      ></textarea>
    </div>

    <div class="modal-actions">
      <button class="btn btn-secondary" onclick={oncancel}>Avbryt</button>
      <button class="btn btn-danger" onclick={() => onconfirm(begrunnelse)}>
        <XSquare size={14} /> Trekk tilbake
      </button>
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(28, 25, 23, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    animation: fadeUp 0.1s ease-out;
  }
  .modal-card {
    width: 480px;
    max-width: 90vw;
    background: var(--canvas);
    border: var(--rule);
    border-radius: 4px;
    padding: 28px;
    box-shadow: var(--overlay-shadow-lg);
  }
  .modal-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
  }
  .modal-title {
    font-size: 16px;
    font-weight: 700;
  }
  .modal-desc {
    font-size: 14px;
    line-height: 1.6;
    color: var(--ink-2);
    margin-bottom: 20px;
  }
  .cascade-warning {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
    background: var(--red-bg);
    border: 1px solid var(--red);
    border-radius: 4px;
    margin-bottom: 16px;
  }
  .cascade-info {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
    background: var(--gold-bg);
    border: 1px solid var(--gold-border);
    border-radius: 4px;
    margin-bottom: 16px;
  }
  .cascade-title {
    font-size: 12px;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .cascade-text {
    font-size: 13px;
    line-height: 1.5;
    color: var(--ink-2);
  }
  .field {
    margin-bottom: 20px;
  }
  .field-label {
    display: block;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink-3);
    margin-bottom: 8px;
  }
  .field-textarea {
    width: 100%;
    padding: 12px;
    font-size: 14px;
    line-height: 1.6;
    background: var(--paper);
    border: var(--control-border);
    border-radius: 4px;
    color: var(--ink);
    outline: none;
    resize: vertical;
  }
  .field-textarea:focus {
    border-color: var(--control-focus);
    box-shadow: var(--control-focus-ring);
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
</style>
