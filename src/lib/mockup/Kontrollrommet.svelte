<script lang="ts">
  import { DD } from './data.js';
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

  let role: Role = $state('BH');
  let sel: TrackKey = $state('ansvar');
  let rTab: RightTab = $state('bestemmelser');
  let mode: Mode = $state('read');
  let saving = $state(false);

  const d = $derived(DD[sel]);
  const draftCount = $derived(Object.values(DD).filter((x) => x.draftState === 'draft').length);

  const subV = $derived(DD.vederlag.te.value! - DD.vederlag.bh.subsidiaer!);
  const prinV = $derived(DD.vederlag.te.value! - DD.vederlag.bh.prinsipal!);
  const subF = $derived(DD.frist.te.value! - DD.frist.bh.subsidiaer!);
  const prinF = $derived(DD.frist.te.value! - DD.frist.bh.prinsipal!);

  function goForm(key: TrackKey) {
    sel = key;
    mode = 'form';
    rTab = 'begrunnelse';
  }

  function goRead() {
    mode = 'read';
    rTab = 'bestemmelser';
  }
</script>

<div class="mockup">
  <div class="shell">
    <Header {role} {mode} {saving} onrolechange={(r) => (role = r)} onback={goRead} />

    {#if mode === 'form'}
      <ConsistencyStrip
        {sel}
        {draftCount}
        onselect={(key, _draftText) => {
          sel = key;
        }}
      />
    {/if}

    <div class="body">
      {#if mode === 'read'}
        <LeftSidebar
          {sel}
          {role}
          {subV}
          {prinV}
          {subF}
          {prinF}
          onselect={(key) => {
            sel = key;
            rTab = 'bestemmelser';
          }}
          onform={goForm}
        />
      {/if}

      <main class="center">
        {#if mode === 'read'}
          <CenterRead {d} {sel} {role} onform={goForm} />
        {:else if sel === 'frist' && role === 'BH'}
          <FristForm onclose={goRead} />
        {:else if sel === 'frist' && role === 'TE'}
          <TeFristForm onclose={goRead} />
        {:else if sel === 'vederlag' && role === 'BH'}
          <VederlagForm onclose={goRead} />
        {:else if sel === 'vederlag' && role === 'TE'}
          <TeVederlagForm onclose={goRead} />
        {:else if sel === 'ansvar' && role === 'BH'}
          <GrunnlagForm onclose={goRead} />
        {:else if sel === 'ansvar' && role === 'TE'}
          <TeGrunnlagForm onclose={goRead} />
        {/if}

        <ActionBar {mode} {role} {subV} {subF} {prinV} {prinF} oncloseform={goRead} />
      </main>

      <RightSidebar
        {d}
        {mode}
        tab={rTab}
        begr=""
        ontabchange={(t) => (rTab = t)}
        onbegrchange={() => {}}
      />
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
  }
  .center {
    flex: 1;
    overflow-y: auto;
    background: var(--canvas);
    position: relative;
  }
</style>
