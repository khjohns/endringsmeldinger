<script lang="ts">
  import { AlertTriangle, XSquare } from 'lucide-svelte';
  import { getCaseWorkspace } from '$lib/kontraktsbord/context.svelte';
  const store = getCaseWorkspace();
  import type { SporKey } from './types.js';
  import { createSubmission } from '$lib/kontraktsbord/submission.svelte';
  const submission = createSubmission();

  let {
    spor,
    kjernesak = false,
    onconfirm,
    oncancel,
  }: {
    spor: SporKey;
    /** TS-saken: trekket har ingen fritekst og trekker ikke grunnlaget (KA-U22). */
    kjernesak?: boolean;
    onconfirm: (begrunnelse: string) => void | Promise<void>;
    oncancel: () => void;
  } = $props();

  let begrunnelse = $state('');

  const sporLabels: Record<SporKey, string> = {
    ansvar: 'grunnlaget',
    vederlag: 'vederlagskravet',
    frist: 'fristkravet',
  };

  const cascadeDown = $derived(spor === 'ansvar');

  const reverseCascade = $derived.by(() => {
    if (spor === 'ansvar' || kjernesak) return false;
    const otherSpor = spor === 'vederlag' ? 'frist' : 'vederlag';
    const otherDisplay = store.display(otherSpor);
    const otherInactive = otherDisplay.isBinary ? false : (otherDisplay.krevdValue ?? 0) === 0;
    return otherInactive;
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
  class="modal-backdrop"
  onclick={() => {
    if (!submission.pending) oncancel();
  }}
>
  <div
    class="modal-card"
    onclick={(e) => e.stopPropagation()}
    role="dialog"
    aria-modal="true"
    aria-label="Trekk tilbake krav"
  >
    <div class="modal-header">
      <XSquare size={18} style="color: var(--danger)" />
      <h3 class="modal-title">Trekk tilbake {sporLabels[spor]}</h3>
    </div>

    {#if kjernesak}
      <!-- KA-U22: at kravet ikke kan tas opp igjen, står her og ikke i brevet (GR-U5). -->
      <p class="modal-desc">
        {spor === 'ansvar'
          ? 'Trekket er avkall på alle krav i saken, også vederlag og fristforlengelse byggherren har godkjent. Kravene kan ikke tas opp igjen i saken.'
          : 'Trekket er avkall på kravet, også det byggherren har godkjent. Kravet kan ikke tas opp igjen i saken.'}
        Du ser brevet før det sendes.
      </p>
    {:else}
      <p class="modal-desc">
        Du er i ferd med å trekke tilbake {sporLabels[spor]}. Denne handlingen kan ikke angres uten
        å sende et nytt krav.
      </p>
    {/if}

    {#if cascadeDown}
      <div class="cascade-warning">
        <AlertTriangle size={16} style="color: var(--danger); flex-shrink: 0" />
        <div>
          <div class="cascade-title">Kaskadeeffekt</div>
          <p class="cascade-text">
            Trekking av grunnlaget vil automatisk trekke tilbake vederlagskravet og fristkravet.
            Grunnlaget er fundamentet for hele saken.
          </p>
        </div>
      </div>
    {/if}

    {#if reverseCascade}
      <div class="cascade-info">
        <AlertTriangle size={16} style="color: var(--warning); flex-shrink: 0" />
        <div>
          <div class="cascade-title">Siste aktive krav</div>
          <p class="cascade-text">
            Dette er det siste aktive kravet. Trekking vil automatisk trekke grunnlaget, da det ikke
            har praktisk effekt uten aktive krav.
          </p>
        </div>
      </div>
    {/if}

    {#if !kjernesak}<div class="field">
        <label class="field-label" for="withdraw-reason">Begrunnelse (valgfritt)</label>
        <textarea
          id="withdraw-reason"
          class="field-textarea"
          bind:value={begrunnelse}
          placeholder="Hvorfor trekkes kravet tilbake?"
          rows="3"
        ></textarea>
      </div>{/if}

    {#if submission.error}<p role="alert">{submission.error}</p>{/if}
    <div class="modal-actions">
      <button class="btn btn-secondary" disabled={submission.pending} onclick={oncancel}
        >Avbryt</button
      >
      <button
        class="btn btn-danger"
        disabled={submission.pending}
        onclick={() => submission.run(() => onconfirm(begrunnelse))}
      >
        <XSquare size={14} />
        {submission.pending ? 'Trekker tilbake …' : kjernesak ? 'Se brevet' : 'Trekk tilbake'}
      </button>
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    animation: fadeUp 0.1s ease-out;
  }
  .modal-card {
    width: 480px;
    max-width: 90vw;
    background: var(--surface);
    border: 1px solid #d9d5cc;
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
    font-size: 18px;
    font-weight: 700;
  }
  .modal-desc {
    font-size: 16px;
    line-height: 1.6;
    color: var(--ink-2);
    margin-bottom: 20px;
  }
  .cascade-warning {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
    background: var(--danger-bg);
    border: 1px solid var(--danger-border);
    border-radius: 4px;
    margin-bottom: 16px;
  }
  .cascade-info {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
    background: var(--warning-bg);
    border: 1px solid var(--warning);
    border-radius: 4px;
    margin-bottom: 16px;
  }
  .cascade-title {
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .cascade-text {
    font-size: 14px;
    line-height: 1.5;
    color: var(--ink-2);
  }
  .field {
    margin-bottom: 20px;
  }
  .field-label {
    display: block;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: var(--ink-3);
    margin-bottom: 8px;
  }
  .field-textarea {
    width: 100%;
    padding: 12px;
    font-family: var(--font-sans);
    font-size: 16px;
    line-height: 1.6;
    background: var(--surface-inset);
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
