<script lang="ts">
  import { Check, XSquare, Send, BookOpen, ArrowRight, PencilLine } from 'lucide-svelte';
  import { formatDateShortNorwegian } from '$lib/utils/dateFormatters.js';
  import { fmt } from './utils.js';
  import { store } from './store.svelte.js';
  import type { Mode, Role, SporKey } from './types.js';

  let {
    mode,
    role,
    sel,
    hasDraft,
    subV,
    subF,
    prinV,
    prinF,
    oncloseform,
    onform,
    ontogglecontext,
    onsend,
    canSend = false,
    sendLabel = 'Send svar',
    onwithdraw,
  }: {
    mode: Mode;
    role: Role;
    sel: SporKey;
    hasDraft: boolean;
    subV: number;
    subF: number;
    prinV: number;
    prinF: number;
    oncloseform: () => void;
    onform: (key: SporKey) => void;
    ontogglecontext?: () => void;
    onsend?: () => void;
    canSend?: boolean;
    sendLabel?: string;
    onwithdraw?: () => void;
  } = $props();

  const sisteGrunnlagAktivitet = $derived(
    formatDateShortNorwegian(store.sak.grunnlag.siste_oppdatert)
  );
  const isTeGrunnlagActions = $derived(mode === 'read' && role === 'TE' && sel === 'ansvar');
</script>

<div
  class="action-bar"
  class:action-bar-form={mode === 'form'}
  class:action-bar-te-grunnlag={isTeGrunnlagActions}
>
  <div class="action-inner">
    {#if !isTeGrunnlagActions}
      <div class="status-section">
        <div class="status-dot"></div>
        <div>
          <div class="status-label">
            {mode === 'form'
              ? 'Redigerer kladd'
              : sel === 'ansvar'
                ? 'Sist aktivitet'
                : 'Saksstatus'}
          </div>
          <div class="status-text">
            {#if mode === 'form'}
              <span style="color: var(--ink-2)">Autolagret — lukk eller send</span>
            {:else if sel === 'ansvar'}
              <span style="color: var(--ink-2)">{sisteGrunnlagAktivitet || 'Ikke registrert'}</span>
            {:else}
              <span style="color: var(--green)">Subs. {fmt(subV)},- / {subF} dager</span>
              <span class="status-sep">·</span>
              <span style="color: var(--danger)">Prins. {fmt(prinV)},- / {prinF} dager</span>
            {/if}
          </div>
        </div>
      </div>
    {/if}
    <div class="action-buttons" class:te-grunnlag-actions={isTeGrunnlagActions}>
      {#if ontogglecontext}
        <button class="btn btn-secondary context-btn" onclick={ontogglecontext}>
          <BookOpen size={14} />
          <span class="context-btn-text">Kontekst</span>
        </button>
      {/if}
      {#if mode === 'form'}
        <button class="btn btn-secondary" onclick={oncloseform}>Lukk kladd</button>
        <button class="btn btn-primary" disabled={!canSend} onclick={onsend}
          ><Send size={14} /> {sendLabel}</button
        >
      {:else if role === 'TE'}
        <button class="btn btn-danger" onclick={onwithdraw}><XSquare size={14} /> Trekk</button>
        {#if sel === 'ansvar'}
          <button class="btn btn-secondary" onclick={() => onform(sel)}>
            <PencilLine size={14} /> Oppdater begrunnelse
          </button>
          {#if store.sak.grunnlag.bh_resultat}
            <button class="btn btn-primary">
              <Check size={14} />
              {store.sak.grunnlag.bh_resultat === 'avslatt'
                ? 'Aksepter byggherrens standpunkt'
                : 'Bekreft enighet'}
            </button>
          {/if}
        {:else}
          <button class="btn btn-primary"><Check size={14} /> Godta</button>
        {/if}
      {:else}
        <button class="btn btn-primary" onclick={() => onform(sel)}>
          Fortsett til utfylling
          <ArrowRight size={14} />
        </button>
      {/if}
    </div>
  </div>
</div>

<style>
  .action-bar {
    position: relative;
    margin: 0 20px 20px;
    background: var(--surface);
    border: var(--rule);
    border-radius: 12px;
    padding: 14px 24px;
    z-index: 20;
  }
  .action-bar-form {
    position: sticky;
    bottom: 12px;
    width: calc(100% - 32px);
    max-width: 808px;
    margin: 0 auto 12px;
    padding: 10px 12px 10px 16px;
    border-radius: 12px;
    box-shadow: var(--overlay-shadow-lg);
  }
  .action-bar-form .status-dot {
    background: var(--green);
    box-shadow: 0 0 0 4px var(--green-bg);
  }
  .action-bar-form .btn {
    min-height: 38px;
    padding: 8px 16px;
    font-size: 13px;
  }
  .action-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .status-section {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent);
  }
  .status-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--ink-4);
  }
  .status-text {
    font-size: 14px;
    font-weight: 700;
  }
  .status-sep {
    color: var(--ink-4);
    margin: 0 8px;
  }
  .action-buttons {
    display: flex;
    gap: 8px;
  }
  .te-grunnlag-actions {
    width: 100%;
  }
  .te-grunnlag-actions .btn-danger {
    margin-right: auto;
  }
  .context-btn {
    display: none;
  }

  /* ── Mobile ── */
  @media (max-width: 768px) {
    .action-bar {
      padding: 10px 12px;
    }
    .action-inner {
      gap: 8px;
    }
    .status-section {
      display: none;
    }
    .action-buttons {
      flex: 1;
      justify-content: flex-end;
    }
    .context-btn {
      display: inline-flex;
      margin-right: auto;
    }
    .context-btn-text {
      display: none;
    }
  }
</style>
