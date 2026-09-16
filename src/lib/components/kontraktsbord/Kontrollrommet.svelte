<script lang="ts">
  import CatendaSyncNotice from './CatendaSyncNotice.svelte';
  import { readPreferredRole, savePreferredRole } from '$lib/utils/rolePreference';
  import { readDarkMode, saveDarkMode } from '$lib/utils/theme';
  import { assessedGap } from './derive';
  import { getCaseWorkspace } from '$lib/kontraktsbord/context.svelte';
  const store = getCaseWorkspace();
  import { createApprovalWorkspace, setApprovalWorkspace } from '$lib/approval/context.svelte';
  import ApprovalPanel from './ApprovalPanel.svelte';
  import { onMount, untrack } from 'svelte';
  const approval = setApprovalWorkspace(createApprovalWorkspace(store));
  import { createClaimReview, setClaimReview } from '$lib/approval/claimReview.svelte';
  import ClaimLetterDialog from './ClaimLetterDialog.svelte';
  const claimReview = setClaimReview(createClaimReview(store));
  let showApproval = $state(false);
  onMount(() => {
    if (role === 'BH') void approval.load();
  });
  import Header from './Header.svelte';
  import EndringsordreLink from '$lib/components/endringsordre/EndringsordreLink.svelte';
  import LeftSidebar from './LeftSidebar.svelte';
  import CenterRead from './CenterRead.svelte';
  import FristForm from './FristForm.svelte';
  import TeFristForm from './TeFristForm.svelte';
  import VederlagForm from './VederlagForm.svelte';
  import TeVederlagForm from './TeVederlagForm.svelte';
  import GrunnlagForm from './GrunnlagForm.svelte';
  import TeGrunnlagForm from './TeGrunnlagForm.svelte';
  import ActionBar from './ActionBar.svelte';
  import RightSidebar from './RightSidebar.svelte';
  import WithdrawModal from './WithdrawModal.svelte';
  import LetterPreviewModal from './LetterPreviewModal.svelte';
  import NewCaseForm from './NewCaseForm.svelte';
  import NewCaseActionBar from './NewCaseActionBar.svelte';
  import { buildLetterContent } from './letterContentBuilder.js';
  import type { Role, Mode, SporKey, RightTab } from './types.js';
  import type { TimelineEvent } from '$lib/types/timeline';
  import type { WorkspaceView } from '$lib/kontraktsbord/viewState';

  let {
    view,
    onviewchange,
    onnewcase,
    overviewHref,
  }: {
    view?: WorkspaceView;
    onviewchange?: (view: WorkspaceView) => void;
    onnewcase?: () => void;
    overviewHref?: string;
  } = $props();

  type MobileView = 'matrix' | 'detail';

  let role: Role = $state(readPreferredRole());
  let sel: SporKey = $state('vederlag');
  let rTab: RightTab = $state('bestemmelser');
  let mode: Mode = $state('read');
  let dark = $state(readDarkMode());
  let mobileView: MobileView = $state('matrix');
  let rightPanelOpen = $state(false);
  let formActions = $state<{
    canSend: boolean;
    sendLabel?: string;
    send: () => void;
  } | null>(null);
  let activeEvent: TimelineEvent | null = $state(null);
  let showWithdrawModal = $state(false);
  let letterEvent: TimelineEvent | null = $state(null);
  let creatingCase = $state(false);
  let newCaseActions = $state<{
    canSend: boolean;
    sendLabel: string;
    send: () => void;
  } | null>(null);
  const brevInnhold = $derived(letterEvent ? buildLetterContent(letterEvent, store.sak) : null);

  $effect(() => {
    if (view) {
      role = view.role;
      savePreferredRole(view.role);
      sel = view.track;
      mode = view.mode;
      if (view.mode === 'form') mobileView = 'detail';
    }
  });

  $effect(() => {
    const currentMode = mode,
      currentRole = role,
      track = sel;
    untrack(() => {
      if (currentMode === 'form' && currentRole === 'BH')
        approval.beginEdit(track === 'ansvar' ? 'grunnlag' : track);
      else approval.endEdit();
    });
  });

  function notifyView() {
    onviewchange?.({ track: sel, mode, role });
  }

  function changeRole(next: Role) {
    role = next;
    savePreferredRole(next);
    mode = 'read';
    formActions = null;
    if (next === 'BH') void approval.load();
    notifyView();
  }

  const subV = $derived(
    assessedGap(store.display('vederlag').krevdValue!, store.display('vederlag').bhSubsidiaer)
  );
  const prinV = $derived(
    assessedGap(store.display('vederlag').krevdValue!, store.display('vederlag').bhPrinsipal)
  );
  const subF = $derived(
    assessedGap(store.display('frist').krevdValue!, store.display('frist').bhSubsidiaer)
  );
  const prinF = $derived(
    assessedGap(store.display('frist').krevdValue!, store.display('frist').bhPrinsipal)
  );

  function goForm(key: SporKey) {
    if (
      role === 'BH' &&
      approval.state.items.some(
        (i) =>
          i.track === (key === 'ansvar' ? 'grunnlag' : key) &&
          ['ferdigstilt', 'til_godkjenning'].includes(i.status)
      )
    ) {
      showApproval = true;
      return;
    }
    sel = key;
    mode = 'form';
    mobileView = 'detail';
    rTab = 'bestemmelser';
    notifyView();
  }

  function goRead() {
    mode = 'read';
    rTab = 'bestemmelser';
    formActions = null;
    activeEvent = null;
    notifyView();
  }

  function handleSend() {
    if (role === 'BH') showApproval = true;
    goMatrix();
  }

  function selectTrack(key: SporKey) {
    sel = key;
    mode = 'read';
    formActions = null;
    activeEvent = null;
    rTab = 'bestemmelser';
    mobileView = 'detail';
    notifyView();
  }

  function goMatrix() {
    goRead();
    mobileView = 'matrix';
    rightPanelOpen = false;
  }

  function startNewCase() {
    if (onnewcase) {
      onnewcase();
      return;
    }
    role = 'TE';
    creatingCase = true;
    mode = 'read';
    mobileView = 'detail';
    rightPanelOpen = false;
    newCaseActions = null;
  }

  function closeNewCase() {
    creatingCase = false;
    newCaseActions = null;
    goMatrix();
  }

  function handleNewCaseSend() {
    sel = 'ansvar';
    closeNewCase();
  }
</script>

<div class="mockup" class:dark>
  <div class="shell">
    <Header
      {role}
      {mode}
      {dark}
      {mobileView}
      {creatingCase}
      onrolechange={changeRole}
      {overviewHref}
      onback={creatingCase ? closeNewCase : goMatrix}
      onnewcase={startNewCase}
      ondarkchange={(v) => {
        dark = v;
        saveDarkMode(v);
      }}
    />

    {#if !store.isDemo && !creatingCase}
      <CatendaSyncNotice status={store.catendaSyncStatus} />
    {/if}

    {#if !store.isDemo && !creatingCase && mode === 'read'}
      <EndringsordreLink state={store.sak} projectId={store.projectId} {role} />
    {/if}
    <div class="body">
      {#if !creatingCase}
        <div class="left-panel" class:mobile-hidden={mobileView !== 'matrix'}>
          <LeftSidebar {sel} {subV} {prinV} {subF} {prinF} onselect={selectTrack} />
        </div>
      {/if}

      {#key store.demo?.scenario ?? store.sak.sak_id}
        <main
          class="center"
          class:center-new-case={creatingCase}
          class:mobile-hidden={!creatingCase && mode === 'read' && mobileView === 'matrix'}
        >
          {#if role === 'BH' && !creatingCase}
            <div class="approval-entry">
              <div>
                <strong>Brev og intern godkjenning</strong><span
                  >{approval.state.items.filter((i) => i.status === 'ferdigstilt').length} ferdigstilte
                  vurderinger · {approval.state.packages.filter(
                    (p) => p.status === 'til_godkjenning'
                  ).length} til godkjenning</span
                >
              </div>
              <button class="btn btn-secondary" onclick={() => (showApproval = true)}
                >Åpne brev</button
              >
            </div>
          {/if}
          {#if creatingCase}
            <NewCaseForm
              onsend={handleNewCaseSend}
              onactions={(actions) => (newCaseActions = actions)}
            />
          {:else if mode === 'read'}
            <CenterRead
              {sel}
              {activeEvent}
              onform={goForm}
              onbacktonow={() => (activeEvent = null)}
            />
          {:else if role === 'BH' && (!approval.loaded || !approval.canPrepare)}
            <div class="approval-entry">
              <p role={approval.error ? 'alert' : 'status'}>
                {approval.error ||
                  (approval.loaded
                    ? 'Åpne brev for å behandle godkjenningspakken.'
                    : 'Henter intern behandling …')}
              </p>
              <button class="btn btn-secondary" onclick={() => void approval.load()}
                >Prøv igjen</button
              >
            </div>
          {:else if sel === 'frist' && role === 'BH'}
            <FristForm
              domainConfig={approval.fristConfig}
              onsend={handleSend}
              onactions={(a) => (formActions = a)}
            />
          {:else if sel === 'frist' && role === 'TE'}
            <TeFristForm onsend={handleSend} onactions={(a) => (formActions = a)} />
          {:else if sel === 'vederlag' && role === 'BH'}
            <VederlagForm
              domainConfig={approval.vederlagConfig}
              onsend={handleSend}
              onactions={(a) => (formActions = a)}
            />
          {:else if sel === 'vederlag' && role === 'TE'}
            <TeVederlagForm onsend={handleSend} onactions={(a) => (formActions = a)} />
          {:else if sel === 'ansvar' && role === 'BH'}
            <GrunnlagForm
              domainConfig={store.grunnlagDomainConfig}
              onsend={handleSend}
              onactions={(a) => (formActions = a)}
            />
          {:else if sel === 'ansvar' && role === 'TE'}
            <TeGrunnlagForm onsend={handleSend} onactions={(a) => (formActions = a)} />
          {/if}

          {#if creatingCase}
            <NewCaseActionBar
              canSend={newCaseActions?.canSend ?? false}
              sendLabel={newCaseActions?.sendLabel ?? 'Send ansvarsgrunnlag'}
              oncancel={closeNewCase}
              onsend={() => newCaseActions?.send()}
            />
          {:else}
            <ActionBar
              {mode}
              {role}
              {sel}
              hasDraft={store.getUI(sel).draft !== null}
              oncloseform={goRead}
              onform={goForm}
              ontogglecontext={() => (rightPanelOpen = !rightPanelOpen)}
              onsend={() => formActions?.send()}
              canSend={formActions?.canSend ?? false}
              sendLabel={role === 'BH' ? 'Ferdigstill vurdering' : 'Se brev og send'}
              onwithdraw={() => (showWithdrawModal = true)}
            />
          {/if}
        </main>
      {/key}

      {#if claimReview.letter}<ClaimLetterDialog review={claimReview} />{/if}
      {#if showApproval && role === 'BH'}
        <ApprovalPanel
          onclose={() => (showApproval = false)}
          onrevise={async (item) => {
            await approval.revise(item);
            showApproval = false;
            sel = item.track === 'grunnlag' ? 'ansvar' : item.track;
            mode = 'form';
            mobileView = 'detail';
            notifyView();
          }}
        />
      {/if}
      {#if brevInnhold}
        <LetterPreviewModal {brevInnhold} onclose={() => (letterEvent = null)} />
      {/if}

      {#if showWithdrawModal}
        <WithdrawModal
          spor={sel}
          onconfirm={async (begr) => {
            if (store.isDemo) store.withdrawTrack(sel, begr || undefined);
            else
              await store.submit(
                sel === 'ansvar'
                  ? 'grunnlag_trukket'
                  : sel === 'vederlag'
                    ? 'vederlag_krav_trukket'
                    : 'frist_krav_trukket',
                { begrunnelse: begr || undefined }
              );
            showWithdrawModal = false;
          }}
          oncancel={() => (showWithdrawModal = false)}
        />
      {/if}

      {#if !creatingCase}
        <div class="right-panel" class:right-panel-open={rightPanelOpen}>
          {#if rightPanelOpen}
            <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
            <div class="right-panel-backdrop" onclick={() => (rightPanelOpen = false)}></div>
          {/if}
          <div class="right-panel-inner">
            <RightSidebar
              {sel}
              {mode}
              tab={rTab}
              {activeEvent}
              ontabchange={(t) => (rTab = t)}
              onclose={() => (rightPanelOpen = false)}
              oneventclick={(ev) => {
                activeEvent = ev;
                rTab = 'historikk';
              }}
              onletterclick={(ev) => {
                letterEvent = ev;
              }}
            />
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .approval-entry {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 24px;
    border-bottom: var(--rule);
    background: var(--surface);
    font-size: 12px;
  }
  .approval-entry span {
    display: block;
    margin-top: 4px;
    font-size: 11px;
    color: var(--ink-3);
  }
  .shell {
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .body {
    flex: 1;
    display: flex;
    overflow: hidden;
    position: relative;
  }
  .center {
    flex: 1;
    overflow-y: auto;
    background: var(--canvas);
    position: relative;
  }
  .body {
    margin-top: calc(-1 * var(--mockup-topbar-height));
  }
  .center {
    padding-top: var(--mockup-topbar-height);
  }
  .right-panel {
    display: flex;
    flex-direction: column;
    min-width: var(--mockup-drawer-width);
    padding-top: var(--mockup-topbar-height);
  }
  .right-panel-inner {
    display: flex;
    flex: 1;
    min-height: 0;
  }
  .right-panel-inner :global(.right-sidebar) {
    flex: 1;
    width: var(--mockup-drawer-width);
  }
  .left-panel {
    display: contents;
  }
  .right-panel-backdrop {
    display: none;
  }

  /* ── Mobile (≤768px) ── */
  @media (max-width: 768px) {
    .mobile-hidden {
      display: none !important;
    }
    .left-panel {
      display: block;
      width: 100%;
      overflow-y: auto;
    }
    .center {
      width: 100%;
    }
    /* Right panel as slide-up sheet */
    .right-panel {
      position: absolute;
      inset: 0;
      z-index: 40;
      pointer-events: none;
      display: none;
    }
    .body {
      margin-top: 0;
    }
    .center {
      padding-top: 0;
    }
    .right-panel {
      padding-top: 0;
    }
    .right-panel.right-panel-open {
      display: block;
      pointer-events: auto;
    }
    .right-panel-backdrop {
      display: block;
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
    }
    .right-panel-inner {
      display: flex;
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 70%;
      z-index: 1;
    }
  }
</style>
