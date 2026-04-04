<script lang="ts">
  import { store } from './store.svelte.js';
  import Header from './Header.svelte';
  import ConsistencyStrip from './ConsistencyStrip.svelte';
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
  import type { Role, Mode, TrackKey, RightTab } from './types.js';

  type MobileView = 'matrix' | 'detail';

  let role: Role = $state('BH');
  let sel: TrackKey = $state('ansvar');
  let rTab: RightTab = $state('bestemmelser');
  let mode: Mode = $state('read');
  let dark = $state(false);
  let mobileView: MobileView = $state('matrix');
  let rightPanelOpen = $state(false);
  let formActions = $state<{ canSend: boolean; send: () => void } | null>(null);

  const d = $derived(store.tracks[sel]);

  const subV = $derived(store.tracks.vederlag.te.value! - store.tracks.vederlag.bh.subsidiaer!);
  const prinV = $derived(store.tracks.vederlag.te.value! - store.tracks.vederlag.bh.prinsipal!);
  const subF = $derived(store.tracks.frist.te.value! - store.tracks.frist.bh.subsidiaer!);
  const prinF = $derived(store.tracks.frist.te.value! - store.tracks.frist.bh.prinsipal!);

  function goForm(key: TrackKey) {
    sel = key;
    mode = 'form';
    mobileView = 'detail';
    rTab = 'bestemmelser';
  }

  function goRead() {
    mode = 'read';
    rTab = 'bestemmelser';
    formActions = null;
  }

  function handleSend() {
    goMatrix();
  }

  function selectTrack(key: TrackKey) {
    sel = key;
    rTab = 'bestemmelser';
    mobileView = 'detail';
  }

  function goMatrix() {
    goRead();
    mobileView = 'matrix';
    rightPanelOpen = false;
  }
</script>

<div class="mockup" class:dark>
  <div class="shell">
    <Header
      {role}
      {mode}
      {dark}
      {mobileView}
      onrolechange={(r) => (role = r)}
      onback={goMatrix}
      ondarkchange={(v) => (dark = v)}
    />

    {#if mode === 'form'}
      <ConsistencyStrip
        {sel}
        draftCount={store.draftCount}
        onselect={(key, _draftText) => {
          sel = key;
        }}
      />
    {/if}

    <div class="body">
      {#if mode === 'read'}
        <div class="left-panel" class:mobile-hidden={mobileView !== 'matrix'}>
          <LeftSidebar {sel} {role} {subV} {prinV} {subF} {prinF} onselect={selectTrack} />
        </div>
      {/if}

      <main class="center" class:mobile-hidden={mode === 'read' && mobileView === 'matrix'}>
        {#if mode === 'read'}
          <CenterRead {d} {sel} {role} onform={goForm} />
        {:else if sel === 'frist' && role === 'BH'}
          <FristForm onsend={handleSend} onactions={(a) => (formActions = a)} />
        {:else if sel === 'frist' && role === 'TE'}
          <TeFristForm onsend={handleSend} onactions={(a) => (formActions = a)} />
        {:else if sel === 'vederlag' && role === 'BH'}
          <VederlagForm onsend={handleSend} onactions={(a) => (formActions = a)} />
        {:else if sel === 'vederlag' && role === 'TE'}
          <TeVederlagForm onsend={handleSend} onactions={(a) => (formActions = a)} />
        {:else if sel === 'ansvar' && role === 'BH'}
          <GrunnlagForm onsend={handleSend} onactions={(a) => (formActions = a)} />
        {:else if sel === 'ansvar' && role === 'TE'}
          <TeGrunnlagForm onsend={handleSend} onactions={(a) => (formActions = a)} />
        {/if}

        <ActionBar
          {mode}
          {role}
          {sel}
          draftState={d.draftState}
          {subV}
          {subF}
          {prinV}
          {prinF}
          oncloseform={goRead}
          onform={goForm}
          ontogglecontext={() => (rightPanelOpen = !rightPanelOpen)}
          onsend={() => formActions?.send()}
          canSend={formActions?.canSend ?? false}
        />
      </main>

      <div class="right-panel" class:right-panel-open={rightPanelOpen}>
        {#if rightPanelOpen}
          <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
          <div class="right-panel-backdrop" onclick={() => (rightPanelOpen = false)}></div>
        {/if}
        <div class="right-panel-inner">
          <RightSidebar
            {d}
            {mode}
            tab={rTab}
            begr=""
            ontabchange={(t) => (rTab = t)}
            onbegrchange={() => {}}
            onclose={() => (rightPanelOpen = false)}
          />
        </div>
      </div>
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
  .left-panel {
    display: contents;
  }
  .right-panel-inner {
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
    .right-panel.right-panel-open {
      display: block;
      pointer-events: auto;
    }
    .right-panel-backdrop {
      display: block;
      position: absolute;
      inset: 0;
      background: rgba(28, 25, 23, 0.4);
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
