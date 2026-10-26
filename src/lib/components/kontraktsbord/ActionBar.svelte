<script lang="ts">
  import {
    XSquare,
    Send,
    BookOpen,
    ArrowRight,
    PencilLine,
    Check,
    ShieldAlert,
  } from 'lucide-svelte';
  import { formatDateShortNorwegian } from '$lib/utils/dateFormatters.js';
  import { fmt } from './utils.js';
  import { sporResultatLabel } from './derive.js';
  import { getCaseWorkspace } from '$lib/kontraktsbord/context.svelte';
  import { SPOR_FOR } from '$lib/kjernesak/sakstilstand';
  import { etiketterVedSvaret } from '$lib/kjernesak/svaretsEtiketter';
  const store = getCaseWorkspace();
  import type { Mode, Role, SporKey } from './types.js';
  import { foresporselVenterSvar, kravetErSpesifisert } from '$lib/domain/fristVarselDomain';

  let {
    mode,
    role,
    sel,
    hasDraft,
    oncloseform,
    onform,
    ontogglecontext,
    onsend,
    canSend = false,
    sendLabel,
    onwithdraw,
    ongodta,
    oninnsigelse,
  }: {
    mode: Mode;
    role: Role | null;
    sel: SporKey;
    hasDraft: boolean;
    oncloseform: () => void;
    onform: (key: SporKey) => void;
    ontogglecontext?: () => void;
    onsend?: () => void;
    canSend?: boolean;
    sendLabel: string;
    onwithdraw?: () => void;
    /** TS-saken: TE godtar byggherrens gjeldende svar i sporet, med svarets ID. */
    ongodta?: (svar: string) => void;
    /** TS-saken: TE gjør innsigelse etter § 5 tredje ledd mot byggherrens svar i sporet. */
    oninnsigelse?: () => void;
  } = $props();

  const sisteGrunnlagAktivitet = $derived(
    formatDateShortNorwegian(store.sak.grunnlag.siste_oppdatert)
  );
  const isTeGrunnlagActions = $derived(mode === 'read' && role === 'TE' && sel === 'ansvar');
  const hasBhVederlagResponse = $derived(Boolean(store.sak.vederlag.bh_resultat));
  const hasBhFristResponse = $derived(Boolean(store.sak.frist.bh_resultat));
  const isVederlagPending = $derived(sel === 'vederlag' && !hasBhVederlagResponse);
  const isFristPending = $derived(sel === 'frist' && !hasBhFristResponse);
  const vederlagResultat = $derived(
    store.sak.vederlag.bh_resultat ? sporResultatLabel(store.sak.vederlag.bh_resultat) : ''
  );
  const fristResultat = $derived(
    store.sak.frist.bh_resultat ? sporResultatLabel(store.sak.frist.bh_resultat) : ''
  );
  const hasFristSubmission = $derived(
    Boolean(
      store.sak.frist.varsel_type ||
      store.sak.frist.frist_varsel ||
      store.sak.frist.krevd_dager !== undefined
    )
  );
  const hasSpecifiedFristClaim = $derived(kravetErSpesifisert(store.sak.frist));
  const teFristActionLabel = $derived(
    !hasFristSubmission
      ? 'Send fristvarsel'
      : hasSpecifiedFristClaim
        ? 'Oppdater krav'
        : 'Spesifiser krav'
  );
  const kjernesak = store.erKjernesak ? store : null;
  const isTeTrackActions = $derived(
    !kjernesak && mode === 'read' && role === 'TE' && (sel === 'ansvar' || sel === 'frist')
  );
  // TS-saken (#718, #909, #1047): bare handlingene kjernen tilbyr leseren, i sporet som vises.
  const kjernekrav = $derived(kjernesak?.skjema(sel) ?? null);
  const svarSomKanGodtas = $derived(kjernesak?.godtar(sel) ?? null);
  const tilbyrInnsigelse = $derived(Boolean(kjernesak?.innsigelser(sel).length));
  const tilbyrKjernetrekk = $derived(kjernesak?.tilbyrTe(`trekke:${SPOR_FOR[sel]}`) === true);
  const kjernesakStatus = $derived(kjernesak ? kjernesak.statustekst(sel) : '');
  const svaretsEtiketter = $derived(
    kjernesak
      ? etiketterVedSvaret(kjernesak.saksbilde, kjernesak.kjernesak.utledning, SPOR_FOR[sel])
      : []
  );
</script>

<div
  class="action-bar"
  class:action-bar-form={mode === 'form'}
  class:action-bar-te-grunnlag={isTeGrunnlagActions}
>
  <div class="action-inner">
    <!-- MM-U30: et spor der ingenting er sendt, har ingen statustekst i TS-saken. -->
    {#if !isTeTrackActions && !(kjernesak && !kjernesakStatus)}
      <div class="status-section">
        <div class="status-dot"></div>
        <div>
          <div class="status-label">
            {kjernesak
              ? 'Status i sporet'
              : mode === 'form'
                ? 'Redigerer kladd'
                : sel === 'ansvar'
                  ? 'Sist aktivitet'
                  : (isVederlagPending || isFristPending) && hasDraft
                    ? 'Kladd'
                    : 'Saksstatus'}
          </div>
          <div class="status-text">
            {#if kjernesak}
              <span style="color: var(--ink-2)">{kjernesakStatus}</span>
              {#if svaretsEtiketter.length}
                <span class="status-etiketter">
                  {svaretsEtiketter.map((e) => e.tekst).join(' · ')}
                </span>
              {/if}
            {:else if mode === 'form'}
              <span style="color: var(--ink-2)"
                >Autolagret — {role === 'BH' ? 'klar til ferdigstilling' : 'ikke sendt'}</span
              >
            {:else if sel === 'ansvar'}
              <span style="color: var(--ink-2)">{sisteGrunnlagAktivitet || 'Ikke registrert'}</span>
            {:else if isVederlagPending}
              <span style="color: var(--ink-2)">
                {hasDraft
                  ? 'Autolagret — ikke sendt'
                  : !store.sak.vederlag.metode
                    ? store.sak.vederlag.varsler?.length
                      ? 'Varslet – ikke spesifisert'
                      : 'Ikke varslet'
                    : role === 'BH'
                      ? 'Kravet er ikke besvart'
                      : `Avventer svar fra ${store.bhNavn}`}
              </span>
            {:else if isFristPending}
              <span style="color: var(--ink-2)">
                {hasDraft
                  ? 'Autolagret — ikke sendt'
                  : !hasSpecifiedFristClaim
                    ? hasFristSubmission
                      ? foresporselVenterSvar(store.sak.frist)
                        ? 'Forespørsel om spesifisert krav sendt'
                        : 'Varslet – ikke spesifisert'
                      : 'Ikke varslet'
                    : role === 'BH'
                      ? 'Kravet er ikke besvart'
                      : `Avventer svar fra ${store.bhNavn}`}
              </span>
            {:else if sel === 'vederlag'}
              <span style="color: var(--ink-2)">
                {vederlagResultat} · {fmt(store.sak.vederlag.godkjent_belop ?? 0)},- godkjent
              </span>
            {:else if sel === 'frist'}
              <span style="color: var(--ink-2)">
                {fristResultat} · {store.sak.frist.godkjent_dager ?? 0} dager godkjent
              </span>
            {/if}
          </div>
        </div>
      </div>
    {/if}
    <div
      class="action-buttons"
      class:te-grunnlag-actions={isTeGrunnlagActions}
      class:te-track-actions={isTeTrackActions}
    >
      {#if ontogglecontext}
        <button class="btn btn-secondary context-btn" onclick={ontogglecontext}>
          <BookOpen size={14} />
          <span class="context-btn-text">Kontekst</span>
        </button>
      {/if}
      {#if kjernesak && mode === 'read'}
        {#if tilbyrKjernetrekk}
          <button class="btn btn-danger" onclick={onwithdraw}><XSquare size={14} /> Trekk</button>
        {/if}
        {#if tilbyrInnsigelse}
          <button class="btn btn-secondary" onclick={oninnsigelse}
            ><ShieldAlert size={14} /> Gjør innsigelse</button
          >
        {/if}
        {#if svarSomKanGodtas}
          {@const svar = svarSomKanGodtas}
          <button class="btn btn-secondary" onclick={() => ongodta?.(svar)}
            ><Check size={14} /> Godta svaret</button
          >
        {/if}
        {#if kjernekrav}
          <button class="btn btn-primary" onclick={() => onform(sel)}>
            <PencilLine size={14} />
            {kjernekrav}
          </button>
        {/if}
      {:else if mode === 'form'}
        <!-- Utkast er av for en TS-sak (oppdragsgiver 17.10, #718), så det er ingen kladd å lukke. -->
        <button class="btn btn-secondary" onclick={oncloseform}
          >{kjernesak ? 'Avbryt' : 'Lukk kladd'}</button
        >
        <button class="btn btn-primary" disabled={!canSend} onclick={onsend}
          ><Send size={14} /> {sendLabel}</button
        >
      {:else if role === 'TE'}
        {#if (sel !== 'frist' || hasFristSubmission) && (sel !== 'vederlag' || store.sak.vederlag.metode || store.sak.vederlag.varsler?.length)}
          <button class="btn btn-danger" onclick={onwithdraw}><XSquare size={14} /> Trekk</button>
        {/if}
        {#if sel === 'ansvar'}
          <button class="btn btn-secondary" onclick={() => onform(sel)}>
            <PencilLine size={14} /> Oppdater begrunnelse
          </button>
        {:else if sel === 'frist'}
          <button
            class:btn-secondary={hasBhFristResponse}
            class:btn-primary={!hasBhFristResponse}
            class="btn"
            onclick={() => onform(sel)}
          >
            <PencilLine size={14} />
            {teFristActionLabel}
          </button>
        {:else if sel === 'vederlag'}
          <button class="btn btn-primary" onclick={() => onform(sel)}>
            <PencilLine size={14} />
            {store.sak.vederlag.metode
              ? 'Oppdater krav'
              : store.sak.vederlag.varsler?.length
                ? 'Spesifiser krav'
                : 'Varsle eller spesifiser krav'}
          </button>
        {/if}
      {:else}
        <button
          class="btn btn-primary"
          disabled={sel === 'vederlag' && !store.sak.vederlag.metode}
          onclick={() => onform(sel)}
        >
          {sel === 'vederlag'
            ? hasBhVederlagResponse
              ? 'Oppdater svar'
              : hasDraft
                ? 'Fortsett utfylling'
                : 'Svar på kravet'
            : sel === 'frist'
              ? hasFristSubmission && !hasSpecifiedFristClaim
                ? 'Svar på varselet'
                : hasBhFristResponse
                  ? 'Oppdater svar'
                  : hasDraft
                    ? 'Fortsett utfylling'
                    : 'Svar på kravet'
              : 'Fortsett til utfylling'}
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
    gap: 16px;
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
  .status-etiketter {
    display: block;
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-3);
  }
  .action-buttons {
    display: flex;
    gap: 8px;
    margin-left: auto;
  }
  /* Knappene fyller resten av raden, så statusfeltet i TS-saken beholder bredden (#1146). */
  .te-grunnlag-actions,
  .te-track-actions {
    flex: 1;
  }
  .te-grunnlag-actions .btn-danger,
  .te-track-actions .btn-danger {
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
