<!--
  TEs innsigelse etter § 5 tredje ledd i TS-saken (S-2a.2, #909): mot byggherrens svar i
  sporet, uten fritekst (VS-U1, VS-U9, VS-U14). Protest og påberopt passivitet tilbys ikke
  (OV-U7). TE ser brevet før det sendes.
-->
<script lang="ts">
  import { ShieldAlert } from 'lucide-svelte';

  let {
    valg,
    onconfirm,
    oncancel,
  }: {
    /** Svarene innsigelsen kan gjelde, det nyeste først, med teksten som vises. */
    valg: { id: string; tekst: string }[];
    onconfirm: (gjelder: string) => void;
    oncancel: () => void;
  } = $props();

  let gjelder = $state(valg[0]?.id ?? '');
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="modal-backdrop" onclick={oncancel}>
  <div
    class="modal-card"
    onclick={(e) => e.stopPropagation()}
    role="dialog"
    aria-modal="true"
    aria-label="Innsigelse etter § 5"
  >
    <div class="modal-header">
      <ShieldAlert size={18} style="color: var(--warning)" />
      <h3 class="modal-title">Innsigelse etter § 5 tredje ledd</h3>
    </div>
    <p class="modal-desc">
      Mener du at byggherrens svar kom for sent, må du gjøre innsigelse skriftlig uten ugrunnet
      opphold etter at du mottok det. Ellers regnes svaret som gitt i tide. Du ser brevet før det
      sendes.
    </p>
    {#if valg.length > 1}
      <fieldset class="valg">
        <legend class="field-label">Svaret innsigelsen gjelder</legend>
        {#each valg as v (v.id)}
          <label
            ><input type="radio" name="gjelder" value={v.id} bind:group={gjelder} />
            {v.tekst}</label
          >
        {/each}
      </fieldset>
    {:else if valg.length}
      <p class="modal-desc">Innsigelsen gjelder {valg[0].tekst.toLowerCase()}.</p>
    {/if}
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick={oncancel}>Avbryt</button>
      <button class="btn btn-primary" disabled={!gjelder} onclick={() => onconfirm(gjelder)}
        >Se brevet</button
      >
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
  .field-label {
    display: block;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: var(--ink-3);
    margin-bottom: 8px;
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  .valg {
    display: flex;
    flex-direction: column;
    gap: 6px;
    border: 0;
    margin: 0 0 16px;
    padding: 0;
  }
</style>
