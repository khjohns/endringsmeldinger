<script lang="ts">
  import CatendaSyncNotice from './CatendaSyncNotice.svelte';
  import { readPreferredRole, savePreferredRole } from '$lib/utils/rolePreference';
  import { readDarkMode, saveDarkMode } from '$lib/utils/theme';
  import { assessedGap, fristErSendt } from './derive';
  import { getCaseWorkspace } from '$lib/kontraktsbord/context.svelte';
  const store = getCaseWorkspace();
  // TS-saken (#718): det kjernen ennå ikke kan, vises ikke (OV-U1).
  const kjernesak = store.erKjernesak ? store : null;
  const pythonsak = store.erKjernesak ? null : store;
  import { createApprovalWorkspace, setApprovalWorkspace } from '$lib/approval/context.svelte';
  import ClaimApprovalView from './ClaimApprovalView.svelte';
  import { onMount, untrack } from 'svelte';
  const approval = setApprovalWorkspace(createApprovalWorkspace(store));
  import { createClaimReview, setClaimReview } from '$lib/approval/claimReview.svelte';
  import { lagKravkontroll } from '$lib/kjernesak/kravkontroll.svelte';
  import ClaimLetterView from './ClaimLetterView.svelte';
  import Brevkontroll from '$lib/components/kjernesak/Brevkontroll.svelte';
  const claimReview = createClaimReview(store);
  // TS-saken sendes med kommandoen til kjernen og den låste teksten (#718, LV-U2).
  const kravkontroll = kjernesak ? lagKravkontroll(kjernesak.kjernesak) : null;
  setClaimReview(kravkontroll ?? claimReview);
  const brevApent = $derived(Boolean(kravkontroll?.letter ?? claimReview.letter));
  let showApproval = $state(false);
  onMount(() => {
    if (role === 'BH' && !kjernesak) void approval.load();
  });
  import Header from './Header.svelte';
  import EndringsordreLink from '$lib/components/endringsordre/EndringsordreLink.svelte';
  import LeftSidebar from './LeftSidebar.svelte';
  import CenterRead from './CenterRead.svelte';
  import FristForm from './FristForm.svelte';
  import FristVarselForm from './FristVarselForm.svelte';
  import { kravetErSpesifisert } from '$lib/domain/fristVarselDomain';
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

  // Rollen i en TS-sak er leserens side fra serveren, ikke rollebryteren (#705, #718).
  let role: Role = $state(kjernesak?.part ?? readPreferredRole());
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
    reviewing: boolean;
  } | null>(null);
  const bhSvarerPaaFristvarsel = $derived.by(
    () =>
      !kjernesak &&
      sel === 'frist' &&
      role === 'BH' &&
      fristErSendt(store.sak) &&
      !kravetErSpesifisert(store.sak.frist)
  );
  // Skjemaene for en TS-sak følger bare handlingene kjernen tilbyr leseren (krav G i #718).
  const kjerneskjema = $derived(
    kjernesak !== null && sel === 'vederlag' && kjernesak.tilbyrVederlagskrav
  );
  // Skjemaet står til Kontrollrommet går ut av skjemamodus. Etter sendingen tilbyr
  // ikke kjernen lenger det første kravet, men skjemaet skal fullføre sendingen (#737 p4).
  let kjerneskjemaAapent = $state(false);
  $effect(() => {
    if (mode !== 'form' || sel !== 'vederlag') kjerneskjemaAapent = false;
    else if (kjerneskjema) kjerneskjemaAapent = true;
  });
  const visKjerneskjema = $derived(kjerneskjema || (sel === 'vederlag' && kjerneskjemaAapent));
  const brevInnhold = $derived(letterEvent ? buildLetterContent(letterEvent, store.sak) : null);

  $effect(() => {
    if (kjernesak) {
      if (kjernesak.part) role = kjernesak.part;
    } else if (view) {
      role = view.role;
      savePreferredRole(view.role);
    }
    if (view) {
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
      if (!kjernesak && currentMode === 'form' && currentRole === 'BH')
        approval.beginEdit(track === 'ansvar' ? 'grunnlag' : track);
      else approval.endEdit();
    });
  });

  function notifyView() {
    onviewchange?.({ track: sel, mode, role });
  }

  function changeRole(next: Role) {
    if (kjernesak) return;
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

  async function goForm(key: SporKey) {
    const track = key === 'ansvar' ? 'grunnlag' : key;
    if (role === 'BH' && !kjernesak) {
      const items = approval.state.items.filter((i) => i.track === track);
      if (items.some((i) => i.status === 'til_godkjenning')) {
        showApproval = true;
        return;
      }
      // Back to step 1: a finished assessment reopens as an editable revision.
      const finished = items.find((i) => i.status === 'ferdigstilt' && i.owner === approval.actor);
      if (finished)
        try {
          await approval.revise(finished);
        } catch {
          showApproval = true; // the view shows the reason
          return;
        }
    }
    showApproval = false;
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
    <!-- En TS-sak viser leserens side fra serveren, og ingen side uten den (#732 p6). -->
    <Header
      role={kjernesak ? kjernesak.part : role}
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

    {#if !store.isDemo && !kjernesak && !creatingCase}
      <CatendaSyncNotice status={store.catendaSyncStatus} />
    {/if}

    {#if !store.isDemo && !kjernesak && !creatingCase && mode === 'read'}
      <EndringsordreLink state={store.sak} projectId={store.projectId} {role} />
    {/if}
    <!-- Over panelene, så varselet også vises i matrisen på mobil (#719 p10). -->
    {#if kjernesak?.submissionError && mode === 'read'}
      <div class="approval-entry innsendingsvarsel">
        <p role="alert">{kjernesak.submissionError}</p>
      </div>
    {/if}
    <div class="body">
      {#if !creatingCase}
        <div
          class="left-panel"
          class:mobile-hidden={mobileView !== 'matrix' || (showApproval && role === 'BH')}
        >
          <LeftSidebar {sel} {subV} {prinV} {subF} {prinF} onselect={selectTrack} />
        </div>
      {/if}

      {#key store.demo?.scenario ?? store.sak.sak_id}
        <main
          class="center"
          class:center-new-case={creatingCase}
          class:mobile-hidden={!creatingCase &&
            !(showApproval && role === 'BH') &&
            mode === 'read' &&
            mobileView === 'matrix'}
        >
          {#if role === 'BH' && !kjernesak && !creatingCase && !showApproval}
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
          {#if kravkontroll?.letter}
            {#key kravkontroll.letter}
              <Brevkontroll
                tekst={kravkontroll.letter.tekst}
                utdypning={kravkontroll.letter.utdypning}
                tittel={kravkontroll.letter.tittel}
                beskrivelse="Kravet sendes først når du bekrefter."
                onbekreft={kravkontroll.confirm}
                onavbryt={kravkontroll.cancel}
              />
            {/key}
          {/if}
          <ClaimLetterView review={claimReview} />
          <!-- Hidden, not unmounted, while the letter is checked: the form's submission resumes on confirm. -->
          <div class="work" hidden={brevApent}>
            {#if showApproval && role === 'BH' && !creatingCase}
              <ClaimApprovalView
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
            {:else if creatingCase}
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
            {:else if visKjerneskjema}
              <TeVederlagForm onsend={handleSend} onactions={(a) => (formActions = a)} />
            {:else if kjernesak}
              <div class="approval-entry">
                <p role="status">Dette skjemaet finnes ikke for saken ennå.</p>
                <button class="btn btn-secondary" onclick={goRead}>Tilbake</button>
              </div>
            {:else if bhSvarerPaaFristvarsel}
              <FristVarselForm onsend={goMatrix} onactions={(a) => (formActions = a)} />
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
            {:else if sel === 'ansvar' && role === 'BH' && pythonsak}
              <GrunnlagForm
                domainConfig={pythonsak.grunnlagDomainConfig}
                onsend={handleSend}
                onactions={(a) => (formActions = a)}
              />
            {:else if sel === 'ansvar' && role === 'TE'}
              <TeGrunnlagForm onsend={handleSend} onactions={(a) => (formActions = a)} />
            {/if}

            {#if kjernesak && mode === 'form' && !visKjerneskjema}
              <!-- Uten skjema har saken bare «Tilbake». -->
            {:else if showApproval && role === 'BH' && !creatingCase}
              <!-- The approval panel carries the actions in this step. -->
            {:else if creatingCase}
              {#if !newCaseActions?.reviewing}<NewCaseActionBar
                  canSend={newCaseActions?.canSend ?? false}
                  sendLabel={newCaseActions?.sendLabel ?? 'Send grunnlag'}
                  oncancel={closeNewCase}
                  onsend={() => newCaseActions?.send()}
                />{/if}
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
                sendLabel={role === 'BH' && !bhSvarerPaaFristvarsel
                  ? 'Ferdigstill vurdering'
                  : 'Se brev og send'}
                onwithdraw={() => (showWithdrawModal = true)}
              />
            {/if}
          </div>
        </main>
      {/key}

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

      {#if !creatingCase && !(showApproval && role === 'BH') && !claimReview.letter}
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
  .work {
    display: contents;
  }
  .work[hidden] {
    display: none;
  }
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
  /* Står ved siden av venstrekolonnen og over `.body`, som trekkes opp under hodet. */
  .innsendingsvarsel {
    width: calc(100% - var(--mockup-sidebar-width));
    margin-left: var(--mockup-sidebar-width);
    position: relative;
    z-index: 30;
    flex-shrink: 0;
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
    .innsendingsvarsel {
      width: 100%;
      margin-left: 0;
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
