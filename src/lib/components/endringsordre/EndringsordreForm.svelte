<script lang="ts">
  import { resolve } from '$app/paths';
  import { onMount, untrack } from 'svelte';
  import { ArrowRight, Search } from 'lucide-svelte';
  import FormSection from '$lib/components/kontraktsbord/components/FormSection.svelte';
  import EndringsordreDocument from './EndringsordreDocument.svelte';
  import EOApprovalPanel from './EOApprovalPanel.svelte';
  import { ApiError } from '$lib/api/client';
  import {
    apiEOApprovals,
    createEOApprovalWorkspace,
    type EOApprovalSource,
  } from '$lib/approval/eoApproval.svelte';
  import {
    createEndringsordre,
    fetchEOCandidates,
    fetchNextEONumber,
    type EOCandidate,
    type CreateEORequest,
  } from '$lib/api/endringsordre';
  import {
    newEODraft,
    validateEODraft,
    buildEORequest,
    requestToDocument,
    selectedEOCandidates,
    settlementLabels,
    snapshotEOEffects,
    type EODraft,
  } from '$lib/domain/endringsordre';
  import type { EndringsordreData } from '$lib/types/timeline';
  import { loadDraft, saveDraft, clearDraft, draftKey } from '$lib/utils/draft';
  import { formatCurrency } from '$lib/utils/formatters';

  let {
    projectId,
    projectName,
    userId = '',
    initialKoe = '',
    oncreated,
    demo,
    caseHref,
    approvalSource,
    approvalsHref,
  }: {
    projectId: string;
    projectName: string;
    userId?: string;
    initialKoe?: string;
    oncreated: (sakId: string) => Promise<void> | void;
    demo?: {
      getCandidates: () => EOCandidate[];
      getNextNumber: () => string;
      issue: (payload: CreateEORequest) => {
        success: boolean;
        sak_id: string;
        catenda_synced: boolean;
      };
    };
    caseHref?: (sakId: string) => `/${string}`;
    /** Internal approval before issuance; the demo supplies a local source */
    approvalSource?: EOApprovalSource;
    /** Where approvers and the handler follow orders in approval */
    approvalsHref?: string;
  } = $props();

  // A demo without an approval source issues directly, like projects without a policy.
  // The route keys the form by project, so the source is fixed for its lifetime.
  const approvals = createEOApprovalWorkspace(
    untrack(
      () =>
        approvalSource ??
        (demo
          ? {
              load: () =>
                Promise.reject(new ApiError(403, 'Intern godkjenning er ikke konfigurert.')),
              command: () => Promise.reject(new Error('Ikke tilgjengelig.')),
            }
          : apiEOApprovals(projectId))
    )
  );

  let draft = $state<EODraft>(newEODraft());
  let ready = $state(false);
  let candidates = $state<EOCandidate[]>([]);
  let loading = $state(true);
  let loadError = $state('');
  let error = $state('');
  let search = $state('');
  let reviewing = $state(false);
  let sending = $state(false);
  let createdId = $state('');
  const storageKey = $derived(
    draftKey(demo ? 'endringsordre-demo' : 'endringsordre', `${projectId}:${userId}`)
  );
  const selected = $derived(selectedEOCandidates(draft, candidates));
  const unavailable = $derived(
    draft.selectedIds.filter((id) => !candidates.some((c) => c.sak_id === id))
  );
  const filtered = $derived(
    candidates.filter((c) =>
      `${c.sak_id} ${c.tittel}`
        .toLocaleLowerCase('nb-NO')
        .includes(search.toLocaleLowerCase('nb-NO'))
    )
  );
  const errors = $derived(validateEODraft(draft, candidates));
  const total = $derived(selected.reduce((sum, c) => sum + c.sum_godkjent, 0));
  const net = $derived(
    draft.price === 'ingen'
      ? 'Ingen justering'
      : draft.price === 'uavklart'
        ? 'Uavklart'
        : formatCurrency((draft.addition ?? 0) - (draft.deduction ?? 0))
  );
  const sources = $derived(
    selected.map((c) => ({
      id: c.sak_id,
      title: c.tittel,
      amount: c.sum_godkjent,
      days: c.godkjent_dager,
    }))
  );
  const request = $derived(buildEORequest(draft));
  const document = $derived<EndringsordreData>(requestToDocument(request));
  /** The latest approval package for this order number, if it has been sent. */
  const pkg = $derived(
    [...approvals.packages]
      .reverse()
      .find((p) => p.owner === approvals.actor && p.request.eo_nummer === request.eo_nummer)
  );
  $effect(() => {
    // Issued after approval, possibly by someone else: the local draft is spent.
    if (pkg?.status === 'utstedt' && pkg.sakId && !createdId) {
      createdId = pkg.sakId;
      clearDraft(storageKey);
    }
  });
  const issuedHref = (sakId: string) =>
    resolve(
      `/${demo ? 'mockup/endringsordre' : encodeURIComponent(projectId)}/${encodeURIComponent(sakId)}`
    );

  onMount(() => {
    const stored = loadDraft<{ version: number; draft: EODraft }>(storageKey);
    if (stored?.version === 1 && Array.isArray(stored.draft?.selectedIds))
      draft = { ...newEODraft(), ...stored.draft };
    let selectionChanged = false;
    if (initialKoe) {
      if (draft.mode === 'direkte') draft.directEffects = snapshotEOEffects(draft);
      draft.mode = 'avtale';
      if (!draft.selectedIds.includes(initialKoe)) {
        draft.selectedIds.push(initialKoe);
        selectionChanged = true;
      }
    }
    ready = true;
    void load(selectionChanged);
  });

  $effect(() => {
    if (ready && !createdId) saveDraft(storageKey, { version: 1, draft: $state.snapshot(draft) });
  });

  async function load(prefill = false) {
    loading = true;
    loadError = '';
    if (demo) {
      try {
        candidates = demo.getCandidates();
        if (!draft.number) draft.number = demo.getNextNumber();
        if (prefill) updateAmounts();
      } catch (e) {
        loadError = e instanceof Error ? e.message : 'Kunne ikke hente eksempelsakene.';
      } finally {
        loading = false;
      }
      return;
    }
    const results = await Promise.allSettled([
      fetchEOCandidates(projectId),
      fetchNextEONumber(projectId),
    ]);
    if (results[0].status === 'fulfilled') {
      candidates = results[0].value.kandidat_saker;
      if (prefill) updateAmounts();
    } else
      loadError =
        results[0].reason instanceof Error
          ? results[0].reason.message
          : 'Kunne ikke hente avtalte KOE-krav.';
    if (results[1].status === 'fulfilled' && !draft.number)
      draft.number = results[1].value.neste_nummer;
    loading = false;
  }

  function updateAmounts() {
    const rows = selectedEOCandidates(draft, candidates);
    const agreed = rows.reduce((sum, c) => sum + Math.round(c.sum_godkjent * 100), 0) / 100;
    draft.addition = Math.max(agreed, 0);
    draft.deduction = Math.max(-agreed, 0);
    draft.price = rows.some((c) => c.har_vederlagskrav || c.sum_godkjent !== 0)
      ? 'avklart'
      : 'ingen';
    draft.time = rows.some((c) => c.har_fristkrav || (c.godkjent_dager ?? 0) > 0)
      ? 'avklart'
      : 'ingen';
    draft.days = undefined;
    draft.endDate = '';
    draft.estimate = false;
  }

  function toggleCase(id: string) {
    draft.selectedIds = draft.selectedIds.includes(id)
      ? draft.selectedIds.filter((v) => v !== id)
      : [...draft.selectedIds, id];
    updateAmounts();
  }

  function chooseMode(mode: EODraft['mode']) {
    if (draft.mode === mode) return;
    if (draft.mode === 'direkte') draft.directEffects = snapshotEOEffects(draft);
    else draft.agreementEffects = snapshotEOEffects(draft);
    draft.mode = mode;
    if (mode === 'direkte')
      Object.assign(draft, snapshotEOEffects(newEODraft()), draft.directEffects);
    else if (draft.agreementEffects)
      Object.assign(draft, snapshotEOEffects(newEODraft()), draft.agreementEffects);
    else updateAmounts();
  }

  function review(event: SubmitEvent) {
    event.preventDefault();
    if (errors.length || (draft.mode === 'avtale' && (loading || loadError))) return;
    error = '';
    reviewing = true;
    void approvals.load();
  }

  async function issue() {
    if (sending || createdId || errors.length) return;
    sending = true;
    error = '';
    try {
      const payload = buildEORequest($state.snapshot(draft));
      const result = demo ? demo.issue(payload) : await createEndringsordre(projectId, payload);
      if (!result.success || !result.sak_id)
        throw new Error('Utstedelsen kunne ikke bekreftes. Kontroller saksoversikten.');
      createdId = result.sak_id;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Kunne ikke utstede endringsordren.';
    } finally {
      sending = false;
    }
    if (createdId) await finish(createdId);
  }

  async function finish(sakId: string) {
    createdId = sakId;
    clearDraft(storageKey);
    try {
      await oncreated(sakId);
    } catch {
      error = 'Endringsordren er utstedt. Åpne den med lenken i panelet.';
    }
  }
</script>

<div class="eo-form-shell">
  <header class="page-heading">
    <p class="eyebrow">Byggherrens endringsordre</p>
    <h1>{reviewing ? 'Kontroller endringsordren' : 'Ny endringsordre'}</h1>
    <p>
      {reviewing
        ? 'Les gjennom grunnlaget, vederlaget og fristen før utstedelse.'
        : 'Pålegg en endring eller formaliser enigheten i ett eller flere KOE-krav.'}
    </p>
  </header>
  <nav class="steps" aria-label="Fremdrift">
    <span class:current={!reviewing}>1 <span>Fyll ut</span></span><ArrowRight size={14} /><span
      class:current={reviewing}>2 <span>Kontroller og utsted</span></span
    >
  </nav>
  {#if reviewing}
    <div class="review-layout">
      <EndringsordreDocument
        data={document}
        {projectId}
        {projectName}
        {sources}
        {caseHref}
        preview
      />
      <aside class="review-actions">
        <EOApprovalPanel
          {approvals}
          {request}
          {pkg}
          {issuedHref}
          onedit={pkg?.status === 'til_godkjenning' ? undefined : () => (reviewing = false)}
          onissued={(sakId) => void finish(sakId)}
          legacy={{ issue, sending, createdId }}
        />
        {#if error}<p class="error" role="alert">{error}</p>{/if}
        {#if pkg && pkg.status !== 'utstedt' && approvalsHref}
          <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- the route passes a resolved path -->
          <a class="approvals-link" href={`${approvalsHref}?pakke=${encodeURIComponent(pkg.id)}`}
            >Følg godkjenningen</a
          >{/if}
      </aside>
    </div>
  {:else}
    <form onsubmit={review}>
      <div class="edit-layout">
        <div>
          <FormSection title="Grunnlag for endringsordren">
            <div class="mode-options" role="group" aria-label="Grunnlag for endringsordren">
              <button
                type="button"
                class:chosen={draft.mode === 'direkte'}
                aria-pressed={draft.mode === 'direkte'}
                onclick={() => chooseMode('direkte')}
                ><strong>Pålegg om endring</strong><span
                  >En ny endring fra byggherren. Pris og frist kan avklares senere.</span
                ></button
              >
              <button
                type="button"
                class:chosen={draft.mode === 'avtale'}
                aria-pressed={draft.mode === 'avtale'}
                onclick={() => chooseMode('avtale')}
                ><strong>Formaliser avtalte KOE-krav</strong><span
                  >Samle ett eller flere krav det er oppnådd enighet om.</span
                ></button
              >
            </div>
          </FormSection>
          {#if draft.mode === 'avtale'}
            <FormSection title="KOE-krav som inngår">
              <p class="helptext">
                Velg avtalte krav som ennå ikke er formalisert i en endringsordre.
              </p>
              {#if loading}<p class="helptext" role="status">Henter avtalte KOE-krav …</p>
              {:else if loadError}<p class="error" role="alert">{loadError}</p>
                <button type="button" class="secondary" onclick={() => load()}>Prøv igjen</button>
              {:else}
                <label class="search"
                  ><Search size={16} /><input
                    type="search"
                    bind:value={search}
                    placeholder="Søk etter saksnummer eller tittel"
                    aria-label="Søk i avtalte KOE-krav"
                  /></label
                >
                {#if !candidates.length}<p class="empty">
                    Ingen KOE-krav er klare for formalisering. Vederlag og frist må være avklart i
                    KOE-saken først.
                  </p>{/if}
                {#if candidates.length && !filtered.length}<p class="empty">
                    Ingen KOE-krav samsvarer med søket.
                  </p>{/if}
                <div class="candidate-list">
                  {#each filtered as c (c.sak_id)}<label
                      class="candidate"
                      class:selected={draft.selectedIds.includes(c.sak_id)}
                      ><input
                        type="checkbox"
                        checked={draft.selectedIds.includes(c.sak_id)}
                        onchange={() => toggleCase(c.sak_id)}
                      /><span><small>{c.sak_id}</small><strong>{c.tittel}</strong></span><span
                        class="candidate-values"
                        >{formatCurrency(c.sum_godkjent)}<small
                          >{c.godkjent_dager != null
                            ? `${c.godkjent_dager} dager`
                            : 'Ingen fristkrav'}</small
                        ></span
                      ></label
                    >{/each}
                </div>
                {#each unavailable as id (id)}<div class="unavailable" role="alert">
                    <span>{id} er ikke tilgjengelig for formalisering.</span><button
                      type="button"
                      onclick={() => toggleCase(id)}>Fjern</button
                    >
                  </div>{/each}
                <button type="button" class="secondary" onclick={() => load(true)}
                  >Oppdater KOE-utvalget</button
                >
                <p class="selection-total">
                  {selected.length} valgt
                  <strong>{formatCurrency(total)} avtalt i KOE-sakene</strong>
                </p>
              {/if}
            </FormSection>
          {/if}
          <FormSection title="Endringen">
            <label class="field"
              >Endringsordrenummer<input
                required
                maxlength="80"
                bind:value={draft.number}
                placeholder="EO-001"
              /></label
            >
            <label class="field"
              >{draft.mode === 'avtale'
                ? 'Beskriv avtalen som formaliseres'
                : 'Beskriv endringen som pålegges'}<textarea
                required
                rows="6"
                bind:value={draft.description}
                placeholder="Beskriv arbeidet, omfanget og hvilke forutsetninger som gjelder."
              ></textarea></label
            >
          </FormSection>
          <FormSection title="Vederlag">
            <label class="field"
              >Vederlagskonsekvens<select bind:value={draft.price}
                ><option value="uavklart" disabled={draft.mode === 'avtale'}
                  >Uavklart – avklares senere</option
                ><option value="ingen">Ingen vederlagsjustering</option><option value="avklart"
                  >Angi vederlagsjustering</option
                ></select
              ></label
            >
            {#if draft.price === 'avklart'}
              <label class="field"
                >Oppgjørsform<select bind:value={draft.method} required
                  ><option value="" disabled>Velg oppgjørsform</option
                  >{#each Object.entries(settlementLabels) as [value, label] (value)}<option {value}
                      >{label}</option
                    >{/each}</select
                ></label
              >
              <div class="field-pair">
                <label class="field"
                  >Tillegg (kr ekskl. mva.)<input
                    type="number"
                    min="0"
                    step="0.01"
                    bind:value={draft.addition}
                    readonly={draft.mode === 'avtale'}
                  /></label
                ><label class="field"
                  >Fradrag (kr ekskl. mva.)<input
                    type="number"
                    min="0"
                    step="0.01"
                    bind:value={draft.deduction}
                    readonly={draft.mode === 'avtale'}
                  /></label
                >
              </div>
              {#if draft.mode === 'direkte'}<label class="checkbox"
                  ><input type="checkbox" bind:checked={draft.estimate} />Beløpet er et estimat</label
                >{/if}
            {/if}
            {#if draft.price === 'uavklart'}<p class="helptext">
                Ordren utstedes med uavklart vederlag. Det registreres ikke et avtalt nullbeløp.
              </p>{/if}
          </FormSection>
          <FormSection title="Frist">
            <label class="field"
              >Fristkonsekvens<select bind:value={draft.time}
                ><option value="uavklart" disabled={draft.mode === 'avtale'}
                  >Uavklart – avklares senere</option
                ><option value="ingen">Ingen fristforlengelse</option><option value="avklart"
                  >Angi fristforlengelse</option
                ></select
              ></label
            >
            {#if draft.time === 'avklart'}
              {#if draft.mode === 'avtale'}<p class="helptext">
                  Fristene fra KOE-sakene summeres ikke automatisk. Angi samlet avtalt forlengelse
                  og ta hensyn til overlapp.
                </p>{/if}
              <div class="field-pair">
                <label class="field"
                  >Samlet fristforlengelse (dager)<input
                    required
                    type="number"
                    min="0"
                    step="1"
                    bind:value={draft.days}
                  /></label
                ><label class="field"
                  >Ny sluttdato (valgfritt)<input type="date" bind:value={draft.endDate} /></label
                >
              </div>
            {/if}
          </FormSection>
          <FormSection title="Konsekvenser og forutsetninger">
            <div class="checks">
              <label class="checkbox"><input type="checkbox" bind:checked={draft.sha} />SHA</label
              ><label class="checkbox"
                ><input type="checkbox" bind:checked={draft.quality} />Kvalitet</label
              ><label class="checkbox"
                ><input type="checkbox" bind:checked={draft.other} />Annet</label
              >
            </div>
            <label class="field"
              >Beskrivelse (valgfritt)<textarea
                rows="4"
                bind:value={draft.consequences}
                placeholder="Beskriv konsekvenser og forutsetninger for gjennomføringen."
              ></textarea></label
            >
          </FormSection>
        </div>
        <aside class="summary" aria-label="Oppsummering av endringsordre">
          <p class="eyebrow">Endringsordren</p>
          <h2>{draft.number || 'Nytt utkast'}</h2>
          <dl>
            <div>
              <dt>Grunnlag</dt>
              <dd>
                {draft.mode === 'direkte'
                  ? 'Pålegg om endring'
                  : `${selected.length} avtalte KOE-krav`}
              </dd>
            </div>
            <div>
              <dt>Netto vederlag</dt>
              <dd>
                {net}{#if draft.price === 'avklart' && draft.estimate}<small>Estimat</small>{/if}
              </dd>
            </div>
            <div>
              <dt>Fristforlengelse</dt>
              <dd>
                {draft.time === 'ingen'
                  ? 'Ingen forlengelse'
                  : draft.time === 'uavklart'
                    ? 'Uavklart'
                    : draft.days == null
                      ? 'Må fylles ut'
                      : `${draft.days} dager`}
              </dd>
            </div>
          </dl>
          <p class="helptext">
            Utkastet lagres i denne nettleseren. Endringsordren utstedes først etter at du har
            kontrollert dokumentet.
          </p>
          {#if errors.length}<p class="helptext">Gjenstår før kontroll:</p>
            <ul class="remaining">
              {#each errors as e (e)}<li>{e}</li>{/each}
            </ul>{/if}
        </aside>
      </div>
      <footer class="form-footer">
        <a
          class="secondary"
          href={resolve(demo ? '/mockup/oversikt' : `/${encodeURIComponent(projectId)}`)}
          >Til saksoversikten</a
        ><button
          type="submit"
          class="primary"
          disabled={!ready ||
            errors.length > 0 ||
            (draft.mode === 'avtale' && (loading || !!loadError))}
          >Kontroller endringsordre<ArrowRight size={16} /></button
        >
      </footer>
    </form>
  {/if}
</div>

<style>
  .eo-form-shell {
    max-width: 1160px;
    margin: 0 auto;
    padding: 36px 32px 64px;
    color: var(--ink);
    font-family: var(--font-sans);
  }
  .page-heading {
    margin-bottom: 24px;
  }
  .eyebrow {
    font-size: 10px;
    color: var(--ink-3);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 600;
  }
  h1 {
    font-size: 30px;
    font-weight: 650;
    letter-spacing: -0.8px;
    margin: 8px 0 10px;
  }
  .page-heading > p:last-child {
    font-size: 14px;
    color: var(--ink-3);
    line-height: 1.6;
  }
  .steps {
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 0 0 24px;
    color: var(--ink-4);
    font-size: 12px;
  }
  .steps > span {
    display: flex;
    gap: 9px;
  }
  .steps .current {
    color: var(--brand);
    font-weight: 650;
  }
  .edit-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 288px;
    gap: 24px;
    align-items: start;
  }
  .review-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 28px;
    align-items: start;
  }
  .mode-options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 16px;
  }
  .mode-options button {
    padding: 16px;
    text-align: left;
    border: var(--rule-strong);
    border-radius: 6px;
    background: var(--surface);
    color: var(--ink-2);
    cursor: pointer;
  }
  .mode-options button.chosen {
    border-color: var(--brand);
    background: var(--info-bg);
  }
  .mode-options strong {
    display: block;
    font-size: 13px;
    margin-bottom: 8px;
  }
  .mode-options span {
    font-size: 12px;
    line-height: 1.6;
    color: var(--ink-3);
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 18px;
    color: var(--ink-2);
    font-size: 12px;
    font-weight: 600;
  }
  input:not([type='checkbox']),
  select,
  textarea {
    min-width: 0;
    width: 100%;
    border: var(--control-border);
    border-radius: 6px;
    background: var(--surface);
    padding: 11px 12px;
    color: var(--ink);
    font: inherit;
    font-weight: 400;
    font-size: 14px;
  }
  textarea {
    resize: vertical;
    line-height: 1.65;
    font-family: var(--font-legal);
  }
  input[type='number'] {
    font-family: var(--font-mono);
  }
  .field-pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .checkbox {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 13px;
    line-height: 1.65;
    margin-top: 16px;
    cursor: pointer;
  }
  input[type='checkbox'] {
    accent-color: var(--brand);
    width: 16px;
    height: 16px;
    margin-top: 3px;
    flex-shrink: 0;
  }
  .checks {
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
  }
  .review-actions {
    position: sticky;
    top: 24px;
  }
  .approvals-link {
    display: block;
    margin-top: 12px;
    font-size: 12px;
    color: var(--brand);
  }
  .summary {
    position: sticky;
    top: 24px;
    padding: 24px;
    background: var(--surface);
    border: var(--rule);
    border-radius: 12px;
  }
  h2 {
    font-size: 18px;
    font-weight: 600;
    margin-top: 8px;
  }
  dl > div {
    border-bottom: var(--rule);
    padding: 18px 0;
  }
  dt {
    color: var(--ink-3);
    font-size: 12px;
  }
  dd {
    margin-top: 8px;
    font-size: 14px;
    overflow-wrap: anywhere;
  }
  dd small {
    display: block;
    color: var(--ink-3);
    margin-top: 6px;
  }
  .helptext {
    color: var(--ink-3);
    font-size: 12px;
    line-height: 1.7;
    margin-top: 16px;
  }
  .remaining {
    padding-left: 16px;
    color: var(--ink-3);
    font-size: 12px;
    line-height: 1.7;
  }
  .remaining li {
    margin-top: 8px;
  }
  .primary,
  .secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 6px;
    padding: 12px 16px;
    font-size: 12px;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
  }
  .primary {
    border: 1px solid var(--brand);
    background: var(--brand);
    color: #fff;
  }
  .secondary {
    border: var(--rule-strong);
    background: var(--surface);
    color: var(--ink-2);
  }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .form-footer {
    position: sticky;
    bottom: 0;
    background: var(--canvas);
    border-top: var(--rule);
    padding: 16px 0;
    display: flex;
    justify-content: space-between;
    gap: 16px;
  }
  .search {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 16px 0;
  }
  .candidate-list {
    max-height: 340px;
    overflow: auto;
  }
  .candidate {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 10px;
    border-bottom: var(--rule);
    cursor: pointer;
  }
  .candidate.selected {
    background: var(--info-bg);
  }
  .candidate > span:nth-child(2) {
    min-width: 0;
    flex: 1;
  }
  .candidate strong {
    display: block;
    font-size: 13px;
    font-weight: 500;
    margin-top: 5px;
  }
  .candidate small {
    display: block;
    font-size: 10px;
    color: var(--ink-3);
    overflow-wrap: anywhere;
  }
  .candidate-values {
    font-size: 12px;
    font-family: var(--font-mono);
    text-align: right;
    white-space: nowrap;
  }
  .candidate-values small {
    margin-top: 6px;
  }
  .selection-total {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 12px;
    padding-top: 16px;
  }
  .error,
  .unavailable {
    color: var(--danger) !important;
    font-size: 13px;
    line-height: 1.6;
    margin-top: 16px;
  }
  .unavailable {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }
  .unavailable button {
    text-decoration: underline;
    cursor: pointer;
  }
  .empty {
    padding: 16px 0;
    font-size: 13px;
    line-height: 1.7;
    color: var(--ink-3);
  }
  :is(input, button, a, select, textarea):focus-visible {
    outline: 2px solid var(--brand);
    outline-offset: 3px;
  }
  @media (max-width: 900px) {
    .edit-layout,
    .review-layout {
      grid-template-columns: 1fr;
    }
    .summary,
    .review-actions,
    .review-actions :global(.approval-panel) {
      position: static;
    }
  }
  @media (max-width: 600px) {
    .eo-form-shell {
      padding: 24px 12px 48px;
    }
    h1 {
      font-size: 26px;
    }
    .mode-options,
    .field-pair {
      grid-template-columns: 1fr;
    }
    .selection-total {
      flex-direction: column;
    }
    .form-footer {
      gap: 8px;
    }
    .form-footer a,
    .form-footer button {
      padding: 12px;
      font-size: 11px;
    }
    .candidate {
      flex-wrap: wrap;
    }
  }
</style>
