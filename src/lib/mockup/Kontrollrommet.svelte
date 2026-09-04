<script lang="ts">
  import { store } from './store.svelte.js';
  import Header from './Header.svelte';
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

  type MobileView = 'matrix' | 'detail';

  let role: Role = $state('BH');
  let sel: SporKey = $state('vederlag');
  let rTab: RightTab = $state('bestemmelser');
  let mode: Mode = $state('read');
  let dark = $state(false);
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

  const subV = $derived(
    store.display('vederlag').krevdValue! - store.display('vederlag').bhSubsidiaer!
  );
  const prinV = $derived(
    store.display('vederlag').krevdValue! - store.display('vederlag').bhPrinsipal!
  );
  const subF = $derived(store.display('frist').krevdValue! - store.display('frist').bhSubsidiaer!);
  const prinF = $derived(store.display('frist').krevdValue! - store.display('frist').bhPrinsipal!);

  function goForm(key: SporKey) {
    sel = key;
    mode = 'form';
    mobileView = 'detail';
    rTab = 'bestemmelser';
  }

  function goRead() {
    mode = 'read';
    rTab = 'bestemmelser';
    formActions = null;
    activeEvent = null;
  }

  function handleSend() {
    goMatrix();
  }

  function selectTrack(key: SporKey) {
    sel = key;
    rTab = 'bestemmelser';
    mobileView = 'detail';
  }

  function goMatrix() {
    goRead();
    mobileView = 'matrix';
    rightPanelOpen = false;
  }

  function startNewCase() {
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
      onrolechange={(r) => (role = r)}
      onback={creatingCase ? closeNewCase : goMatrix}
      onnewcase={startNewCase}
      ondarkchange={(v) => (dark = v)}
    />

    <div class="body">
      {#if !creatingCase}
        <div class="left-panel" class:mobile-hidden={mobileView !== 'matrix'}>
          <LeftSidebar {sel} {subV} {prinV} {subF} {prinF} onselect={selectTrack} />
        </div>
      {/if}

      <main
        class="center"
        class:center-new-case={creatingCase}
        class:mobile-hidden={!creatingCase && mode === 'read' && mobileView === 'matrix'}
      >
        {#if creatingCase}
          <NewCaseForm
            onsend={handleNewCaseSend}
            onactions={(actions) => (newCaseActions = actions)}
          />
        {:else if mode === 'read'}
          <CenterRead
            {sel}
            {role}
            {activeEvent}
            onform={goForm}
            onbacktonow={() => (activeEvent = null)}
          />
        {:else if sel === 'frist' && role === 'BH'}
          <FristForm
            domainConfig={store.fristDomainConfig}
            onsend={handleSend}
            onactions={(a) => (formActions = a)}
          />
        {:else if sel === 'frist' && role === 'TE'}
          <TeFristForm onsend={handleSend} onactions={(a) => (formActions = a)} />
        {:else if sel === 'vederlag' && role === 'BH'}
          <VederlagForm
            domainConfig={store.vederlagDomainConfig}
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
            {subV}
            {subF}
            {prinV}
            {prinF}
            oncloseform={goRead}
            onform={goForm}
            ontogglecontext={() => (rightPanelOpen = !rightPanelOpen)}
            onsend={() => formActions?.send()}
            canSend={formActions?.canSend ?? false}
            sendLabel={formActions?.sendLabel}
            onwithdraw={() => (showWithdrawModal = true)}
          />
        {/if}
      </main>

      {#if brevInnhold}
        <LetterPreviewModal {brevInnhold} onclose={() => (letterEvent = null)} />
      {/if}

      {#if showWithdrawModal}
        <WithdrawModal
          spor={sel}
          onconfirm={(begr) => {
            store.withdrawTrack(sel, begr || undefined);
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
              begr=""
              {activeEvent}
              ontabchange={(t) => (rTab = t)}
              onbegrchange={() => {}}
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
