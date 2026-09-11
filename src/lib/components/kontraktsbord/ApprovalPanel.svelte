<script lang="ts">
  import { onMount } from 'svelte';
  import {
    ArrowLeft,
    Check,
    FileText,
    LockKeyhole,
    RotateCcw,
    Send,
    X,
    Pencil,
    RefreshCw,
  } from 'lucide-svelte';
  import { getCaseWorkspace } from '$lib/kontraktsbord/context.svelte';
  import { getApprovalWorkspace } from '$lib/approval/context.svelte';
  import {
    demoUsers,
    packageLabels,
    trackNames,
    type LetterDocument,
    type ReviewItem,
  } from '$lib/approval/types';
  import { decisionSummary, documentToBrev, letterText } from '$lib/approval/letter';
  import AuthoritySummary from './AuthoritySummary.svelte';
  import { authorityMatrix } from '$lib/approval/authority';
  import { projectStore } from '$lib/stores/project.svelte';
  import LetterPreviewModal from './LetterPreviewModal.svelte';
  import { formatDateNorwegian } from '$lib/utils/dateFormatters';

  let {
    onclose,
    onrevise,
  }: { onclose: () => void; onrevise: (item: ReviewItem) => void | Promise<void> } = $props();
  const store = getCaseWorkspace();
  const review = getApprovalWorkspace()!;
  let selectedId = $state('');
  let included = $state<string[]>([]);
  let introduction = $state(
    `Vi viser til deres krav i sak ${store.sak.sak_id} – «${store.sak.grunnlag.tittel ?? store.sak.sakstittel}». Byggherrens vurdering følger nedenfor.`
  );
  let closing = $state(`Med vennlig hilsen\n${store.bhNavn}`);
  let editSection = $state('');
  let preview = $state(false);
  let returnComment = $state('');
  let showReturn = $state(false);
  let showPdf = $state(false);
  let showChanges = $state(false);
  const previousPackage = $derived(
    review.state.packages.find((p) => p.id === selected?.previousId)
  );
  let localError = $state('');
  let draftSaved = $state(false);
  let initialized = $state(false);
  let dialog: HTMLDialogElement;
  const ready = $derived(
    review.state.items.filter((i) => i.status === 'ferdigstilt' && i.owner === review.actor)
  );
  const selected = $derived(review.state.packages.find((p) => p.id === selectedId));
  const previous = $derived(
    [...review.state.packages]
      .reverse()
      .find(
        (p) =>
          p.owner === review.actor &&
          (p.status === 'returnert' || p.status === 'trukket') &&
          ready.some((i) => p.letter.items.some((old) => old.id === i.previousId))
      )
  );
  const draftLetter: LetterDocument = $derived({
    authorityContext: {
      dailyRate:
        store.sak.dagmulktsats ||
        (!store.isDemo && projectStore.current?.id === store.projectId
          ? projectStore.current.settings.contract?.dagmulkt_sats
          : null) ||
        null,
      claimedMoney: store.sak.vederlag.krevd_belop ?? store.sak.vederlag.netto_belop ?? 0,
      claimedDays: store.sak.frist.krevd_dager ?? 0,
      matrixVersion: '2026-01',
    },
    title: 'Svar på endringsmelding',
    caseId: store.sak.sak_id,
    caseTitle: store.sak.grunnlag.tittel ?? store.sak.sakstittel,
    sender: store.bhNavn,
    recipient: store.teNavn,
    date: formatDateNorwegian(new Date().toISOString()),
    introduction,
    closing,
    items: ready.filter((i) => included.includes(i.id)),
  });
  const letter = $derived(selected?.letter ?? draftLetter);
  const outdated = $derived(selected?.status !== 'sendt' && review.outdated(letter.items));
  const active = $derived(selected?.steps.find((s) => s.status === 'aktiv'));
  const lastStep = $derived(selected?.steps.at(-1)?.id === review.actor);
  const canDecide = $derived(selected?.status === 'til_godkjenning' && active?.id === review.actor);
  const omitted = $derived(
    (['grunnlag', 'vederlag', 'frist'] as const).filter(
      (t) => !letter.items.some((i) => i.track === t)
    )
  );

  onMount(() => {
    dialog.showModal();
    void review.load().then(() => {
      const saved = review.state.drafts?.[review.actor];
      if (saved) {
        introduction = saved.introduction;
        closing = saved.closing;
      }
      included = ready.map((i) => i.id);
      initialized = true;
      if (!ready.length) selectedId = review.state.packages.at(-1)?.id ?? '';
    });
  });
  async function run(action: () => Promise<void>) {
    localError = '';
    try {
      await action();
    } catch (cause) {
      localError = cause instanceof Error ? cause.message : 'Handlingen feilet.';
    }
  }
  async function saveLetter() {
    if (selected || !review.canPrepare || !initialized) return;
    await review.command({
      action: 'saveLetter',
      draft: { introduction, closing, included: [...included] },
    });
    draftSaved = true;
  }
  async function closePanel() {
    await run(async () => {
      await saveLetter();
      onclose();
    });
  }
  async function sendPackage() {
    await review.command({
      action: 'package',
      letter: $state.snapshot(draftLetter),
      previousId: previous?.id,
    });
    selectedId = review.state.packages.at(-1)!.id;
  }
  async function approve() {
    if (!selected) return;
    const packageId = selected.id;
    await review.command({ action: 'approve', packageId });
    if (review.state.packages.find((p) => p.id === packageId)?.status === 'godkjent') {
      await review.command({ action: 'publish', packageId });
    }
  }
  function newLetter() {
    selectedId = '';
    included = ready.map((i) => i.id);
  }
</script>

<dialog
  bind:this={dialog}
  class="approval-dialog"
  oncancel={(e) => {
    e.preventDefault();
    void closePanel();
  }}
  aria-labelledby="approval-title"
>
  <header class="approval-header">
    <div class="header-title">
      <span class="eyebrow">{store.sak.sak_id} · Byggherrens interne behandling</span>
      <h2 id="approval-title">Brev og godkjenning</h2>
    </div>
    <div class="header-actions">
      <button
        class="refresh-button"
        disabled={review.busy}
        onclick={() =>
          run(async () => {
            await review.load();
            if (!store.isDemo) await store.refresh();
          })}><RefreshCw size={15} />Oppdater status</button
      >
      <button
        class="icon-button"
        aria-label="Lukk brev og godkjenning"
        onclick={() => void closePanel()}><X size={20} /></button
      >
    </div>
  </header>
  <div class="approval-layout">
    <aside>
      <h3>{selected ? 'Inkludert i brevet' : 'Velg vurderinger'}</h3>
      {#if !selected}
        {#each ready as item (item.id)}
          <label class="include-row"
            ><input type="checkbox" value={item.id} bind:group={included} />
            <span>{trackNames[item.track]}<small>{decisionSummary(item)}</small></span></label
          >
        {/each}
        {#if !ready.length}<p class="muted">Ferdigstill en vurdering for å lage et brev.</p>{/if}
      {:else}
        {#each letter.items as item (item.id)}<p class="included-name">
            <Check size={14} />{trackNames[item.track]}
          </p>{/each}
      {/if}
      {#if omitted.length && letter.items.length}<p class="muted small">
          Ikke med i denne sendingen: {omitted.map((t) => trackNames[t]).join(', ')}.
        </p>{/if}
      <h3>Godkjenningskjede</h3>
      {#if store.isDemo}<p class="muted small">
          Saksbehandler: Kari Hansen · Prosjektleder<br />Fullmakt inntil 200 000 kr
        </p>{/if}
      <ol class="chain">
        {#each selected?.steps ?? review.chain as step (step.id)}
          {@const mandate = authorityMatrix.find((row) => row.role === step.role)}
          <li class:active={'status' in step && step.status === 'aktiv'}>
            <strong>{step.name}</strong><small
              >{step.role}{'status' in step
                ? ` · ${step.status === 'godkjent' ? 'Godkjent' : step.status === 'aktiv' ? 'Behandler nå' : 'Venter'}`
                : ''}</small
            ><small
              >{mandate
                ? mandate.limit === null
                  ? 'Ubegrenset fullmakt'
                  : `Fullmakt inntil ${mandate.limit.toLocaleString('nb-NO')} kr`
                : 'Fullmakt ikke angitt'}</small
            >
          </li>
        {/each}
      </ol>
      {#if !review.chain.length}<p class="muted small">
          Godkjenningskjeden må konfigureres for prosjektet.
        </p>{/if}
      <h3>Sendinger i saken</h3>
      {#if review.canPrepare}<button
          class="package-link"
          class:chosen={!selected}
          onclick={newLetter}
          ><FileText size={16} /> Nytt brev
          <span>{ready.length} {ready.length === 1 ? 'klar' : 'klare'}</span></button
        >{/if}
      {#each [...review.state.packages].reverse() as p, index (p.id)}
        <button
          class="package-link"
          class:chosen={selectedId === p.id}
          onclick={() => {
            selectedId = p.id;
            showReturn = false;
          }}
        >
          <span
            >Brev {review.state.packages.length - index}<small
              >{p.letter.items.map((i) => trackNames[i.track]).join(' · ')}</small
            ></span
          >
          <span>{packageLabels[p.status]}</span>
        </button>
      {/each}
      <details class="attachments">
        <summary>Vedlegg</summary>
        {#each letter.items as item (item.id)}
          {#each Array.isArray(item.data.vedlegg_ids) ? item.data.vedlegg_ids : [] as id (String(id))}<p
              class="muted small"
            >
              {String(id)}
            </p>{/each}
        {/each}
        {#if !letter.items.some((i) => Array.isArray(i.data.vedlegg_ids) && i.data.vedlegg_ids.length)}<p
            class="muted small"
          >
            Ingen vedlegg valgt for denne sendingen.
          </p>{/if}
      </details>
      {#if store.isDemo}
        <div class="demo-tools">
          <span class="demo-badge">Demo</span>
          <label class="demo-label" for="approval-actor">Prøv godkjenningsflyten</label>
          <select
            id="approval-actor"
            value={review.actor}
            onchange={(e) => review.setActor(e.currentTarget.value)}
          >
            {#each demoUsers as user (user.id)}<option value={user.id}
                >{user.name} · {user.role}</option
              >{/each}
          </select>
          <p class="muted small">Bytt person for å prøve behandlingen.</p>
        </div>
      {/if}
    </aside>
    <div class="document-scroll">
      {#if localError || review.error}<p class="notice error" role="alert">
          {localError || review.error}
        </p>{/if}
      {#if outdated}<p class="notice error" role="alert">
          Entreprenøren har endret kravet. Vurderingene må revideres før brevet kan godkjennes og
          sendes.
        </p>{/if}
      {#if selected?.comment}<div class="notice">
          <strong>Returnert med kommentar</strong>
          <p>{selected.comment}</p>
        </div>{/if}
      {#if selected?.status === 'sendt' && selected.notificationStatus === 'not_configured'}<p
          class="notice"
        >
          Brevet er publisert i saken. Ekstern varsling er ikke konfigurert.
        </p>{/if}
      {#if selected?.status === 'sendt' && selected.notificationStatus === 'failed'}<div
          class="notice error"
        >
          <p>Brevet er publisert i saken, men ekstern varsling feilet.</p>
          <button
            class="btn btn-secondary"
            disabled={review.busy}
            onclick={() =>
              run(() => review.command({ action: 'publish', packageId: selected!.id }))}
            >Prøv ekstern varsling igjen</button
          >
        </div>{/if}
      {#if selected?.error}<p class="notice error" role="alert">{selected.error}</p>{/if}
      {#if previousPackage}
        <div class="notice">
          <button class="edit-section" onclick={() => (showChanges = !showChanges)}
            >{showChanges ? 'Skjul endringer' : 'Se endringer siden forrige behandling'}</button
          >
          {#if showChanges}
            {#if previousPackage.letter.introduction !== letter.introduction}<p>
                Innledningen er endret.
              </p>{/if}
            {#each letter.items as item (item.id)}
              {@const old = previousPackage.letter.items.find((i) => i.track === item.track)}
              <h3>{trackNames[item.track]}</h3>
              {#if old && JSON.stringify(old.data) === JSON.stringify(item.data)}<p>
                  Vurderingen er uendret.
                </p>{:else}
                <p><strong>Tidligere:</strong> {old ? decisionSummary(old) : 'Ikke inkludert'}</p>
                {#if old}<p class="prose">{letterText(old.data.begrunnelse)}</p>{/if}
                <p><strong>Nå:</strong> {decisionSummary(item)}</p>
                <p class="prose">{letterText(item.data.begrunnelse)}</p>
              {/if}
            {/each}
            {#if previousPackage.letter.closing !== letter.closing}<p>
                Avslutningen er endret.
              </p>{/if}
          {/if}
        </div>
      {/if}
      {#if !preview && letter.authorityContext}
        <AuthoritySummary
          items={letter.items}
          dailyRate={letter.authorityContext.dailyRate}
          claimedMoney={letter.authorityContext.claimedMoney}
          claimedDays={letter.authorityContext.claimedDays}
          chain={selected?.steps ?? review.chain}
        />
      {/if}
      <div class="document-toolbar">
        <div class="view-switch" aria-label="Brevvisning">
          <button class:current={!preview} aria-pressed={!preview} onclick={() => (preview = false)}
            >Rediger</button
          >
          <button
            class:current={preview}
            aria-pressed={preview}
            onclick={() => {
              preview = true;
              editSection = '';
            }}>Forhåndsvis</button
          >
        </div>
        <div class="document-status">
          <span class="status-chip" class:sent={selected?.status === 'sendt'}
            >{selected ? packageLabels[selected.status] : 'Utkast'}</span
          ><span
            >{selected
              ? 'Brevinnholdet er låst'
              : `${letter.items.length} ${letter.items.length === 1 ? 'vurdering' : 'vurderinger'} inkludert`}</span
          >
        </div>
      </div>
      {#if !selected && !letter.items.length}
        <div class="empty-state">
          <div class="empty-icon"><FileText size={28} strokeWidth={1.5} /></div>
          <h2>{ready.length ? 'Velg innhold til brevet' : 'Start med en vurdering'}</h2>
          <p>
            {ready.length
              ? 'Velg vurderingene som skal inngå. Deretter kan du tilpasse innledning og avslutning før godkjenning.'
              : 'Ferdigstill ansvarsgrunnlag, økonomi eller frist i saken. Vurderingene blir grunnlaget for brevet til entreprenøren.'}
          </p>
          {#if !ready.length}<button class="btn btn-secondary" onclick={() => void closePanel()}
              ><ArrowLeft size={16} />Til vurderingen</button
            >{/if}
          <div class="empty-flow">
            <span>1. Vurdering</span><span>2. Brev</span><span>3. Godkjenning</span>
          </div>
        </div>
      {:else}
        <article class="letter-paper" class:preview>
          <div class="letter-meta">
            <strong>{letter.sender}</strong><span>{letter.date}<br />Sak {letter.caseId}</span>
          </div>
          <p class="recipient"><span class="eyebrow">Til</span><br />{letter.recipient}</p>
          <h1>{letter.title}</h1>
          <p class="case-title">{letter.caseTitle}</p>
          <section>
            {#if !selected && !preview}<button
                class="edit-section"
                onclick={() => (editSection = editSection === 'intro' ? '' : 'intro')}
                ><Pencil size={13} />Rediger innledning</button
              >{/if}
            {#if !selected && !preview && editSection === 'intro'}<textarea
                aria-label="Innledning"
                bind:value={introduction}
                oninput={() => (draftSaved = false)}
                onblur={() => run(saveLetter)}
                rows="4"
              ></textarea>{:else}<p class="prose">{letter.introduction}</p>{/if}
          </section>
          {#each letter.items as item (item.id)}
            <section class="assessment">
              <div class="section-heading">
                <h2>{trackNames[item.track]}</h2>
                {#if !preview && (!selected || selected.status === 'returnert' || selected.status === 'trukket')}{#if review.canPrepare && item.owner === review.actor}<button
                      class="edit-section"
                      onclick={() =>
                        run(async () => {
                          await onrevise(item);
                        })}>Revider vurdering</button
                    >{/if}{/if}
              </div>
              <p class="decision">
                {#if !preview}<LockKeyhole size={14} />{/if}<span>{decisionSummary(item)}</span>
              </p>
              <p class="prose">
                {letterText(item.data.begrunnelse ?? item.data.beskrivelse) ||
                  'Ingen utdypende begrunnelse.'}
              </p>
            </section>
          {/each}
          <section>
            {#if !selected && !preview}<button
                class="edit-section"
                onclick={() => (editSection = editSection === 'closing' ? '' : 'closing')}
                ><Pencil size={13} />Rediger avslutning</button
              >{/if}
            {#if !selected && !preview && editSection === 'closing'}<textarea
                aria-label="Avslutning"
                bind:value={closing}
                oninput={() => (draftSaved = false)}
                onblur={() => run(saveLetter)}
                rows="3"
              ></textarea>{:else}<p class="prose">{letter.closing}</p>{/if}
          </section>
        </article>
      {/if}
      {#if showReturn && selected}
        <div class="return-box">
          <label for="return-comment">Hva må saksbehandler endre?</label><textarea
            id="return-comment"
            bind:value={returnComment}
            rows="3"
            required
          ></textarea>
          <button
            class="btn btn-primary"
            disabled={!returnComment.trim() || review.busy}
            onclick={() =>
              run(async () => {
                await review.command({
                  action: 'return',
                  packageId: selected!.id,
                  comment: returnComment,
                });
                showReturn = false;
              })}>Returner til saksbehandler</button
          >
        </div>
      {/if}
    </div>
  </div>
  <footer>
    <div class="footer-note">
      {draftSaved && !selected ? 'Brevutkast lagret. ' : ''}{selected?.status === 'sendt'
        ? `Sendt ${formatDateNorwegian(selected.sentAt)}`
        : canDecide && lastStep
          ? 'Siste godkjenning sender brevet til entreprenøren.'
          : 'Entreprenøren får tilgang først etter siste godkjenning.'}
    </div>
    <button class="btn btn-secondary" onclick={() => void closePanel()}
      ><ArrowLeft size={14} /> Til saken</button
    >
    {#if letter.items.length}<button class="btn btn-secondary" onclick={() => (showPdf = true)}
        >Se PDF</button
      >{/if}
    {#if !selected && review.canPrepare}
      <button
        class="btn btn-primary"
        disabled={!letter.items.length || outdated || review.busy || !review.chain.length}
        onclick={() => run(sendPackage)}><Send size={14} />Send til godkjenning</button
      >
    {:else if canDecide}
      <button
        class="btn btn-secondary"
        disabled={review.busy}
        onclick={() => (showReturn = !showReturn)}><RotateCcw size={14} />Returner</button
      >
      <button
        class="btn btn-primary"
        disabled={outdated || review.busy}
        onclick={() => run(approve)}
        ><Check size={14} />{lastStep ? 'Godkjenn og send' : 'Godkjenn'}</button
      >
    {:else if selected?.status === 'til_godkjenning' && selected.owner === review.actor && !selected.steps.some((s) => s.status === 'godkjent')}
      <button
        class="btn btn-secondary"
        disabled={review.busy}
        onclick={() => run(() => review.command({ action: 'withdraw', packageId: selected!.id }))}
        >Trekk fra godkjenning</button
      >
    {:else if selected && ['godkjent', 'publisering_feilet'].includes(selected.status)}
      <button
        class="btn btn-primary"
        disabled={review.busy || outdated}
        onclick={() => run(() => review.command({ action: 'publish', packageId: selected!.id }))}
        >Prøv sending igjen</button
      >
    {/if}
  </footer>
  {#if showPdf}<LetterPreviewModal
      brevInnhold={documentToBrev(letter, selected?.id ?? 'utkast')}
      draft={!selected || selected.status !== 'sendt'}
      onclose={() => (showPdf = false)}
    />{/if}
</dialog>

<style>
  .approval-dialog {
    position: fixed;
    inset: 0;
    margin: auto;
    width: min(1360px, 96vw);
    max-width: 96vw;
    height: 92dvh;
    max-height: 92dvh;
    padding: 0;
    border: var(--rule);
    border-radius: 16px;
    background: var(--canvas);
    color: var(--ink);
  }
  .approval-dialog[open] {
    display: flex;
    flex-direction: column;
  }
  .approval-dialog::backdrop {
    background: rgb(20 30 24 / 55%);
  }
  .approval-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 22px 28px;
    gap: 24px;
    background: var(--surface);
    border-bottom: var(--rule);
  }
  .approval-header h2 {
    margin: 4px 0 0;
    font-size: 24px;
    font-weight: 650;
    letter-spacing: -0.025em;
  }
  .eyebrow {
    font-size: 11px;
    color: var(--ink-3);
  }
  .icon-button {
    border: 0;
    background: transparent;
    color: inherit;
    padding: 10px;
    cursor: pointer;
  }
  .approval-layout {
    display: grid;
    grid-template-columns: 280px minmax(0, 1fr);
    flex: 1;
    min-height: 0;
  }
  aside {
    padding: 4px 20px 24px;
    background: var(--surface-warm);
    overflow-y: auto;
    border-right: var(--rule);
  }
  aside h3 {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-3);
    margin: 26px 0 12px;
  }
  .demo-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 8px;
  }
  select {
    width: 100%;
    padding: 10px;
    color: var(--ink);
    background: var(--surface);
    border: var(--control-border);
    border-radius: 6px;
    font-size: 12px;
  }
  .muted {
    color: var(--ink-3);
    line-height: 1.6;
  }
  .small,
  small {
    font-size: 11px;
  }
  small {
    display: block;
    color: var(--ink-3);
    margin-top: 4px;
  }
  .package-link {
    display: flex;
    gap: 8px;
    align-items: center;
    width: 100%;
    padding: 12px 10px;
    text-align: left;
    border: 1px solid transparent;
    background: transparent;
    color: var(--ink);
    border-radius: 12px;
    cursor: pointer;
  }
  .package-link > span:last-child {
    margin-left: auto;
    font-size: 10px;
    max-width: 95px;
  }
  .chosen {
    background: var(--surface);
    border: var(--control-border);
    box-shadow: inset 3px 0 var(--brand);
  }
  .include-row {
    display: flex;
    gap: 10px;
    align-items: start;
    margin: 14px 0;
    font-size: 13px;
  }
  input {
    accent-color: var(--brand);
  }
  .included-name {
    display: flex;
    gap: 8px;
    font-size: 13px;
  }
  .chain {
    list-style: none;
    padding: 0 0 0 10px;
    border-left: 2px solid var(--felt-border, #d7ded8);
  }
  .chain li {
    padding: 8px 12px;
    font-size: 12px;
  }
  .chain .active {
    background: var(--surface);
    border-radius: 6px;
  }
  .document-scroll {
    overflow-y: auto;
    padding: 28px 36px 40px;
  }
  .document-status {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0;
    max-width: 760px;
    font-size: 11px;
    color: var(--ink-3);
  }
  .status-chip {
    border: var(--rule);
    border-radius: 20px;
    padding: 5px 10px;
    background: var(--surface);
    font-weight: 600;
  }
  .letter-paper {
    max-width: 760px;
    margin: auto;
    background: var(--surface);
    border: var(--rule);
    border-radius: 14px;
    padding: 36px 44px;
    box-shadow: 0 3px 12px rgb(0 0 0 / 3%);
  }
  .letter-meta {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    font-size: 12px;
    line-height: 1.7;
  }
  .letter-meta span {
    text-align: right;
    color: var(--ink-3);
  }
  .recipient {
    margin: 18px 0;
    font-size: 14px;
  }
  h1 {
    font-size: 26px;
    font-weight: 650;
    letter-spacing: -0.025em;
    line-height: 1.3;
    margin-bottom: 8px;
  }
  .case-title {
    font-size: 14px;
    color: var(--ink-3);
    margin: 0 0 20px;
  }
  section {
    margin: 18px 0;
  }
  .section-heading {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
  }
  .section-heading h2 {
    font-size: 17px;
  }
  .decision {
    display: flex;
    gap: 8px;
    align-items: baseline;
    font-size: 13px;
    font-weight: 600;
    padding: 12px 0;
    border-block: var(--rule);
  }
  .decision :global(svg) {
    flex-shrink: 0;
  }
  .prose {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-size: 14px;
    line-height: 1.55;
  }
  .edit-section {
    border: 0;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    border-radius: 6px;
    background: var(--surface-inset);
    color: var(--ink-2);
    cursor: pointer;
    font-size: 11px;
  }
  textarea {
    width: 100%;
    padding: 12px;
    border: var(--control-border);
    border-radius: 6px;
    color: var(--ink);
    background: var(--surface);
    font: inherit;
    line-height: 1.6;
    resize: vertical;
  }
  .notice {
    padding: 16px;
    background: var(--surface);
    border: var(--rule);
    border-radius: 8px;
    margin-bottom: 20px;
    font-size: 13px;
    line-height: 1.6;
  }
  .notice p {
    white-space: pre-wrap;
  }
  .error {
    color: var(--danger);
  }
  .return-box {
    max-width: 760px;
    margin: 24px auto 0;
  }
  .return-box label {
    display: block;
    margin-bottom: 10px;
    font-weight: 600;
  }
  footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    padding: 16px 24px;
    border-top: var(--rule);
    background: var(--surface);
  }
  .footer-note {
    margin-right: auto;
    max-width: 270px;
    font-size: 11px;
    line-height: 1.5;
    color: var(--ink-3);
  }
  .document-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    max-width: 760px;
    margin: 0 auto 20px;
  }
  .view-switch {
    display: flex;
    gap: 4px;
    padding: 4px;
    border: var(--rule);
    border-radius: 10px;
    background: var(--surface-inset);
  }
  .view-switch button {
    border: 0;
    border-radius: 7px;
    padding: 8px 14px;
    background: transparent;
    color: var(--ink-3);
    font: inherit;
    font-size: 12px;
    cursor: pointer;
  }
  .view-switch button.current {
    background: var(--surface);
    color: var(--ink);
    box-shadow: 0 1px 3px rgb(0 0 0 / 8%);
    font-weight: 600;
  }
  .attachments {
    margin-top: 24px;
    border-top: var(--rule);
    padding-top: 16px;
  }
  .attachments summary {
    cursor: pointer;
    color: var(--ink-3);
    font-size: 12px;
  }
  .preview .decision {
    border: 0;
    padding: 6px 0;
  }
  .preview {
    box-shadow: 0 2px 8px rgb(0 0 0 / 5%);
  }
  .header-actions {
    display: flex;
    align-items: center;
    gap: 18px;
  }
  .header-title {
    min-width: 0;
  }
  .refresh-button {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 0;
    background: transparent;
    color: var(--ink-3);
    padding: 8px;
    font: inherit;
    font-size: 12px;
    cursor: pointer;
    border-radius: 8px;
  }
  .refresh-button:disabled {
    opacity: 0.5;
    cursor: wait;
  }
  .icon-button {
    border-radius: 50%;
    display: flex;
  }
  .refresh-button:hover:not(:disabled),
  .icon-button:hover,
  .edit-section:hover {
    background: var(--surface-inset);
    color: var(--ink);
  }
  .package-link:hover:not(.chosen) {
    background: var(--surface-inset);
  }
  .demo-tools {
    margin-top: 28px;
    padding: 16px 0 0;
    border-top: var(--rule);
  }
  .demo-badge {
    display: inline-block;
    padding: 3px 7px;
    border: var(--rule-strong);
    border-radius: 5px;
    color: var(--ink-3);
    font-size: 10px;
    margin-bottom: 8px;
  }
  .demo-tools select {
    min-height: 38px;
  }
  .demo-tools p {
    margin-top: 6px;
  }
  .empty-state {
    max-width: 760px;
    margin: auto;
    padding: 64px 40px 32px;
    text-align: center;
    border: var(--rule);
    border-radius: 14px;
    background: var(--surface);
    box-shadow: 0 2px 4px rgb(0 0 0 / 4%);
  }
  .empty-icon {
    display: grid;
    place-items: center;
    width: 60px;
    height: 60px;
    margin: 0 auto 20px;
    background: var(--surface-inset);
    border-radius: 50%;
    color: var(--ink-3);
  }
  .empty-state h2 {
    font-size: 24px;
    font-weight: 650;
    letter-spacing: -0.02em;
    margin: 0 0 12px;
  }
  .empty-state p {
    max-width: 430px;
    margin: 0 auto 24px;
    color: var(--ink-3);
    font-size: 14px;
    line-height: 1.7;
  }
  .empty-flow {
    display: flex;
    justify-content: center;
    gap: 24px;
    flex-wrap: wrap;
    margin-top: 40px;
    padding-top: 24px;
    border-top: var(--rule);
    font-size: 12px;
    color: var(--ink-3);
  }
  .status-chip.sent {
    background: var(--surface-inset);
    color: var(--ink);
  }
  .edit-section:focus-visible,
  .refresh-button:focus-visible,
  .icon-button:focus-visible,
  .package-link:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 3px;
  }
  @media (max-width: 800px) {
    .approval-header {
      padding: 16px;
      gap: 12px;
    }
    .approval-header h2 {
      font-size: 20px;
    }
    .header-actions {
      gap: 4px;
    }
    .refresh-button {
      font-size: 11px;
    }
    .empty-state {
      padding: 32px 20px 24px;
    }
    .empty-flow {
      gap: 12px;
    }
    .approval-dialog {
      width: 100vw;
      max-width: 100vw;
      height: 100dvh;
      max-height: 100dvh;
      border-radius: 0;
    }
    .approval-layout {
      display: block;
      overflow-y: auto;
    }
    aside {
      border-right: 0;
      border-bottom: var(--rule);
      overflow: visible;
      padding: 16px;
    }
    .document-scroll {
      padding: 20px 12px;
      overflow: visible;
    }
    .letter-paper {
      padding: 24px 20px;
    }
    footer {
      flex-wrap: wrap;
      padding: 12px;
    }
    .footer-note {
      max-width: none;
      width: 100%;
    }
  }
</style>
