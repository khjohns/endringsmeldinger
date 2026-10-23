<script lang="ts">
  import { readPreferredRole, savePreferredRole } from '$lib/utils/rolePreference';
  import { readDarkMode, saveDarkMode } from '$lib/utils/theme';
  import { assessedGap, fristErSendt } from './derive';
  import { getCaseWorkspace } from '$lib/kontraktsbord/context.svelte';
  const store = getCaseWorkspace();
  // TS-saken (#718): det kjernen ennå ikke kan, vises ikke (OV-U1).
  const kjernesak = store.erKjernesak ? store : null;
  const demosak = store.erKjernesak ? null : store;
  import { createApprovalWorkspace, setApprovalWorkspace } from '$lib/approval/context.svelte';
  import ClaimApprovalView from './ClaimApprovalView.svelte';
  import { untrack } from 'svelte';
  // BHs interne godkjenning finnes bare i demoen til den er bygget i TS (#818, #732 p9).
  const approval = demosak ? setApprovalWorkspace(createApprovalWorkspace(demosak)) : null;
  import { createClaimReview, setClaimReview } from '$lib/approval/claimReview.svelte';
  import { lagKravkontroll } from '$lib/kjernesak/kravkontroll.svelte';
  import ClaimLetterView from './ClaimLetterView.svelte';
  import Brevkontroll from '$lib/components/kjernesak/Brevkontroll.svelte';
  import InnsigelseModal from '$lib/components/kjernesak/InnsigelseModal.svelte';
  import { SPOR_FOR } from '$lib/kjernesak/sakstilstand';
  import { SVARET_SPERRET } from '$lib/kjernesak/arbeidsflate.svelte';
  import { formatDateShortNorwegian } from '$lib/utils/dateFormatters';
  const claimReview = demosak ? createClaimReview(demosak) : null;
  // TS-saken sendes med kommandoen til kjernen og den låste teksten (#718, LV-U2).
  const kravkontroll = kjernesak ? lagKravkontroll(kjernesak.kjernesak) : null;
  setClaimReview(kravkontroll ?? claimReview!);
  const brevApent = $derived(Boolean(kravkontroll?.letter ?? claimReview?.letter));
  let showApproval = $state(false);
  import Header from './Header.svelte';
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

  let valgtRolle: Role = $state(readPreferredRole());
  // Rollen i en TS-sak er leserens side fra serveren, og ingen uten side (#705, #872).
  const role: Role | null = $derived(kjernesak ? kjernesak.part : valgtRolle);
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
    /** Et registrert brev har ingen brevkontroll (MM-U17), så knappen har skjemaets tekst. */
    utenBrev?: boolean;
  } | null>(null);
  let activeEvent: TimelineEvent | null = $state(null);
  let showWithdrawModal = $state(false);
  let letterEvent: TimelineEvent | null = $state(null);
  let creatingCase = $state(false);
  // #881: feltet for en sending som venter eller en sak som ikke er lastet på nytt, står
  // i hodet som varselet, så skallet beholder høyden.
  const kjernestatus = $derived(
    kjernesak?.kjernesak.ventende
      ? 'ventende'
      : kjernesak?.kjernesak.utdatert
        ? 'utdatert'
        : (kjernesak?.submissionError || kravkontroll?.feil) && mode === 'read'
          ? 'feil'
          : null
  );
  const visVarsel = $derived(kjernestatus !== null);
  let varselhoeyde = $state(0);
  // Høyden følger teksten og bredden. Uten ResizeObserver (jsdom) måles den én gang.
  const maalVarsel = (node: HTMLElement) => {
    const maal = () => (varselhoeyde = node.offsetHeight);
    maal();
    if (typeof ResizeObserver === 'undefined') return;
    const observator = new ResizeObserver(maal);
    observator.observe(node);
    return { destroy: () => observator.disconnect() };
  };
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
    Boolean(kjernesak && (kjernesak.teSkjema(sel) ?? kjernesak.bhSkjema(sel)))
  );
  // Skjemaet står til Kontrollrommet går ut av skjemamodus. Etter sendingen tilbyr
  // ikke kjernen nødvendigvis det samme, men skjemaet skal fullføre sendingen (#737 p4).
  // Mens brevet kontrolleres eller sendes, står skjemaet også når visningen bytter spor
  // (#872), og venstrekolonnen kan ikke bytte, så innholdet ikke går tapt (#877).
  // `goRead` og `selectTrack` lukker skjemaet med det samme, uten etterslep fra effekten.
  let kjerneskjemaSpor = $state<SporKey | null>(null);
  const brevetSendes = $derived(Boolean(kravkontroll?.letter || kravkontroll?.sender));
  $effect(() => {
    if (mode === 'form' && kjerneskjema) kjerneskjemaSpor = sel;
    else if ((mode !== 'form' || sel !== kjerneskjemaSpor) && !brevetSendes)
      kjerneskjemaSpor = null;
  });
  const visKjerneskjema = $derived.by(
    () => (mode === 'form' && kjerneskjema) || kjerneskjemaSpor !== null
  );
  // Et trekk i en TS-sak har ingen fritekst og sendes med den låste teksten (KA-U22, LV-U2).
  // Avviser kjernen trekket, står meldingen i dialogen. En feil ved sendingen står i
  // varselet i hodet (#719, #943).
  function trekkKjernesporet() {
    const trekk = kravkontroll!.trekk(SPOR_FOR[sel]);
    showWithdrawModal = false;
    void trekk.send();
  }
  // Aksepten og innsigelsen har ingen fritekst (KA-U10, VS-U1). En avvisning står i hodet.
  let innsigelseApen = $state(false);
  const innsigelsesvalg = $derived.by(() => {
    if (!kjernesak) return [];
    const u = kjernesak.kjernesak.utledning;
    const journal = kjernesak.saksbilde?.journal ?? [];
    return kjernesak.innsigelser(sel).map((id) => {
      const post = journal.find((j) => j.hendelse === u?.elementer[id]?.hendelse);
      return {
        id,
        tekst: post
          ? `Svaret sendt ${formatDateShortNorwegian(post.tidsstempel)}`
          : 'Byggherrens svar',
      };
    });
  });
  const brevInnhold = $derived(letterEvent ? buildLetterContent(letterEvent, store.sak) : null);

  $effect(() => {
    if (!kjernesak && view) {
      valgtRolle = view.role;
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
      if (currentMode === 'form' && currentRole === 'BH')
        approval?.beginEdit(track === 'ansvar' ? 'grunnlag' : track);
      else approval?.endEdit();
    });
  });

  // En TS-sak leser ikke rollen fra visningen; uten side står den lagrede i URL-en.
  function notifyView() {
    onviewchange?.({ track: sel, mode, role: role ?? valgtRolle });
  }

  function changeRole(next: Role) {
    if (kjernesak) return;
    valgtRolle = next;
    savePreferredRole(next);
    mode = 'read';
    formActions = null;
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
    if (role === 'BH' && approval) {
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

  /** Avbryt i skjemaet. Feilen fra en avvist sending står ikke etterpå (#719). */
  function avbrytSkjema() {
    kjernesak?.kjernesak.fjernFeil();
    goRead();
  }

  function tilbake() {
    if (brevetSendes) return;
    if (mode === 'form') kjernesak?.kjernesak.fjernFeil();
    goMatrix();
  }

  function goRead() {
    if (!brevetSendes) kjerneskjemaSpor = null;
    mode = 'read';
    rTab = 'bestemmelser';
    formActions = null;
    activeEvent = null;
    notifyView();
  }

  function handleSend() {
    if (role === 'BH' && approval) showApproval = true;
    goMatrix();
  }

  function selectTrack(key: SporKey) {
    if (brevetSendes) return;
    kjerneskjemaSpor = null;
    if (mode === 'form') kjernesak?.kjernesak.fjernFeil();
    kravkontroll?.fjernFeil();
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
    valgtRolle = 'TE';
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
  <div class="shell" style:--varselhoeyde="{visVarsel ? varselhoeyde : 0}px">
    <!-- En TS-sak viser leserens side fra serveren, og ingen side uten den (#732 p6). -->
    <Header
      {role}
      {mode}
      {dark}
      {mobileView}
      {creatingCase}
      onrolechange={changeRole}
      {overviewHref}
      onback={creatingCase ? closeNewCase : tilbake}
      onnewcase={startNewCase}
      ondarkchange={(v) => {
        dark = v;
        saveDarkMode(v);
      }}
      varsel={visVarsel ? innsendingsvarsel : undefined}
    />
    <!-- I hodet, så varselet også vises i matrisen på mobil (#719 p10), og med hodets forskyvning (#872). -->
    {#snippet innsendingsvarsel()}
      <div class="approval-entry" use:maalVarsel>
        {#if kjernestatus === 'ventende'}
          <!-- I skjemaet varsler SkjemaStatus den samme feilen (#877). -->
          <p role={mode === 'form' ? 'status' : 'alert'}>{kjernesak?.submissionError}</p>
          <button
            type="button"
            class="btn btn-secondary"
            disabled={kjernesak?.submitting}
            onclick={() => void kjernesak?.kjernesak.provIgjen()}>Prøv igjen</button
          >
        {:else if kjernestatus === 'utdatert'}
          <!-- #719: brevet er lagret, men saken som vises, er lastet før det. -->
          <div>
            {#if kjernesak?.submissionError}<p role="alert">{kjernesak.submissionError}</p>{/if}
            <p role="status">Saken som vises, er ikke oppdatert etter det siste brevet.</p>
          </div>
          <button
            type="button"
            class="btn btn-secondary"
            onclick={() => void kjernesak?.kjernesak.last()}>Last saken på nytt</button
          >
        {:else}
          <p role="alert">{kjernesak?.submissionError || kravkontroll?.feil}</p>
        {/if}
      </div>
    {/snippet}

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
          {#if role === 'BH' && approval && !creatingCase && !showApproval}
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
            <Brevkontroll
              brev={kravkontroll.letter}
              beskrivelse="Brevet sendes først når du bekrefter."
              onbekreft={kravkontroll.confirm}
              onavbryt={kravkontroll.cancel}
            />
          {/if}
          {#if claimReview}<ClaimLetterView review={claimReview} />{/if}
          <!-- Hidden, not unmounted, while the letter is checked: the form's submission resumes on confirm. -->
          <div class="work" hidden={brevApent}>
            {#if showApproval && role === 'BH' && approval && !creatingCase}
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
            {:else if visKjerneskjema}
              {#if (kjerneskjemaSpor ?? sel) === 'frist'}
                <TeFristForm onsend={handleSend} onactions={(a) => (formActions = a)} />
              {:else if (kjerneskjemaSpor ?? sel) === 'ansvar'}
                <TeGrunnlagForm onsend={handleSend} onactions={(a) => (formActions = a)} />
              {:else if kjernesak?.part === 'BH' && kjernesak.vederlagConfig}
                <VederlagForm
                  domainConfig={kjernesak.vederlagConfig}
                  kjernesvar={{ brev: kjernesak.vederlagssvarbrev, sperret: SVARET_SPERRET }}
                  onsend={handleSend}
                  onactions={(a) => (formActions = a)}
                />
              {:else}
                <TeVederlagForm onsend={handleSend} onactions={(a) => (formActions = a)} />
              {/if}
            {:else if mode === 'read'}
              <CenterRead
                {sel}
                {activeEvent}
                onform={goForm}
                onbacktonow={() => (activeEvent = null)}
              />
            {:else if !approval}
              <!-- TS-saken har ingen BH-skjemaer eller godkjenning ennå (#818). -->
              <div class="approval-entry">
                <p role="status">Dette skjemaet finnes ikke for saken ennå.</p>
                <button class="btn btn-secondary" onclick={goRead}>Tilbake</button>
              </div>
            {:else if bhSvarerPaaFristvarsel}
              <FristVarselForm onsend={goMatrix} onactions={(a) => (formActions = a)} />
            {:else if role === 'BH' && !approval.canPrepare}
              <div class="approval-entry">
                <p role={approval.error ? 'alert' : 'status'}>
                  {approval.error || 'Åpne brev for å behandle godkjenningspakken.'}
                </p>
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
            {:else if sel === 'ansvar' && role === 'BH' && demosak}
              <GrunnlagForm
                domainConfig={demosak.grunnlagDomainConfig}
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
                oncloseform={avbrytSkjema}
                onform={goForm}
                ontogglecontext={() => (rightPanelOpen = !rightPanelOpen)}
                onsend={() => formActions?.send()}
                canSend={formActions?.canSend ?? false}
                sendLabel={formActions?.utenBrev && formActions.sendLabel
                  ? formActions.sendLabel
                  : role === 'BH' && !bhSvarerPaaFristvarsel
                    ? 'Ferdigstill vurdering'
                    : 'Se brev og send'}
                onwithdraw={() => {
                  kjernesak?.kjernesak.fjernFeil();
                  showWithdrawModal = true;
                }}
                ongodta={(svar) => {
                  kjernesak?.kjernesak.fjernFeil();
                  void kravkontroll?.aksept(SPOR_FOR[sel], svar);
                }}
                oninnsigelse={() => {
                  kjernesak?.kjernesak.fjernFeil();
                  innsigelseApen = true;
                }}
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
          kjernesak={Boolean(kjernesak)}
          onconfirm={async (begr) => {
            if (kjernesak) trekkKjernesporet();
            else if (store.isDemo) store.withdrawTrack(sel, begr || undefined);
            showWithdrawModal = false;
          }}
          oncancel={() => (showWithdrawModal = false)}
        />
      {/if}

      {#if innsigelseApen && kravkontroll}
        <InnsigelseModal
          valg={innsigelsesvalg}
          onconfirm={(gjelder) => {
            innsigelseApen = false;
            void kravkontroll.innsigelse(gjelder, SPOR_FOR[sel]);
          }}
          oncancel={() => (innsigelseApen = false)}
        />
      {/if}

      {#if !creatingCase && !(showApproval && role === 'BH') && !brevApent}
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
              harBrev={(ev) => buildLetterContent(ev, store.sak) !== null}
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
  /* Venstrekolonnen går opp ved siden av hodet, som er topplinjen og varselet. */
  .body {
    margin-top: calc(-1 * (var(--mockup-topbar-height) + var(--varselhoeyde)));
  }
  .center {
    padding-top: calc(var(--mockup-topbar-height) + var(--varselhoeyde));
  }
  .right-panel {
    display: flex;
    flex-direction: column;
    min-width: var(--mockup-drawer-width);
    padding-top: calc(var(--mockup-topbar-height) + var(--varselhoeyde));
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
