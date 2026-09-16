<script lang="ts">
  import { CalendarDays, ChevronDown, ChevronUp, Search } from 'lucide-svelte';
  import FormSection from './components/FormSection.svelte';
  import KonsekvensVarsler from './KonsekvensVarsler.svelte';
  import { buildKonsekvensVarsler, type VarselValg } from '$lib/domain/konsekvensVarsler';
  import RichTextEditor from '$lib/components/primitives/RichTextEditor.svelte';
  import {
    KRAV_STRUKTUR_NS8407,
    type Kontraktsforhold,
    type Kontraktshjemmel,
  } from '$lib/constants/categories.js';
  import { getKontraktsregel } from '$lib/constants/kontraktsregler.js';
  import type { ValgtHjemmel } from '$lib/types/hjemmel.js';
  import { onMount } from 'svelte';
  import { submitEvent } from '$lib/api/events';
  import { lastOppVedlegg, MAKS_VEDLEGG_BYTES } from '$lib/api/vedlegg';
  import { draftKey, loadDraft, saveDraft, clearDraft } from '$lib/utils/draft';
  import { createSubmission } from '$lib/kontraktsbord/submission.svelte';
  const submission = createSubmission();
  import { createLetterConfirmation } from '$lib/approval/claimReview.svelte';
  import { letterText } from '$lib/approval/letter';
  import { projectStore } from '$lib/stores/project.svelte';
  import { formatDateNorwegian } from '$lib/utils/dateFormatters';
  import ClaimLetterDialog from './ClaimLetterDialog.svelte';
  const letterConfirmation = createLetterConfirmation();

  let {
    onsend,
    onactions,
    prosjektId,
    oncreated,
  }: {
    onsend: () => void;
    prosjektId?: string;
    oncreated?: (sakId: string) => void;
    onactions?: (a: { canSend: boolean; sendLabel: string; send: () => void }) => void;
  } = $props();

  let varsler = $state<VarselValg>({});
  let tittel = $state('');
  let datoOppdaget = $state('');
  let valgtHjemmel = $state<ValgtHjemmel | null>(null);
  let hjemmelvelgerApen = $state(true);
  let apenKategori: string | null = $state(null);
  let sok = $state('');
  let begrunnelseHtml = $state('');
  let charCount = $state(0);
  let draftReady = $state(false);
  type Filvalg = { navn: string; storrelse: number; id?: string; fil?: File };
  let filer = $state<Filvalg[]>([]);
  let filfeil = $state('');
  const filutkast = () => filer.map(({ navn, storrelse, id }) => ({ navn, storrelse, id }));
  function velgFiler(valgte: FileList | null) {
    filfeil = '';
    for (const fil of Array.from(valgte ?? [])) {
      if (!fil.size || fil.size > MAKS_VEDLEGG_BYTES) {
        filfeil = 'Hver fil må inneholde data og være høyst 15 MB.';
        continue;
      }
      const mangler = filer.findIndex(
        (v) => !v.id && !v.fil && v.navn === fil.name && v.storrelse === fil.size
      );
      if (mangler >= 0) filer[mangler] = { ...filer[mangler], fil };
      else filer = [...filer, { navn: fil.name, storrelse: fil.size, fil }];
    }
  }
  // Keep the case identity between retries if creating the basis fails after case creation.
  let createdCase = $state<{ id: string; version: number } | null>(null);
  const dk = draftKey('kontraktsbord-ny', prosjektId);
  onMount(() => {
    if (prosjektId) {
      const draft = loadDraft<{
        varsler?: VarselValg;
        tittel: string;
        datoOppdaget: string;
        valgtHjemmel: ValgtHjemmel | null;
        begrunnelseHtml: string;
        createdCase: { id: string; version: number } | null;
        filer?: Filvalg[];
      }>(dk);
      if (draft) {
        varsler = draft.varsler ?? {};
        tittel = draft.tittel ?? '';
        datoOppdaget = draft.datoOppdaget ?? '';
        valgtHjemmel = draft.valgtHjemmel ?? null;
        begrunnelseHtml = draft.begrunnelseHtml ?? '';
        charCount = begrunnelseHtml.replace(/<[^>]*>/g, '').trim().length;
        createdCase = draft.createdCase ?? null;
        filer = draft.filer ?? [];
        hjemmelvelgerApen = !valgtHjemmel;
      }
    }
    draftReady = true;
  });
  $effect(() => {
    if (prosjektId && draftReady)
      saveDraft(dk, {
        tittel,
        datoOppdaget,
        valgtHjemmel,
        begrunnelseHtml,
        createdCase,
        varsler,
        filer: filutkast(),
      });
  });

  const normalizedSearch = $derived(sok.trim().toLocaleLowerCase('nb-NO'));
  const sendLabel = $derived(
    valgtHjemmel?.kontraktsforhold.kode === 'ENDRING' && valgtHjemmel.hjemmel?.kode !== 'EO'
      ? 'Send varsel'
      : 'Send ansvarsgrunnlag'
  );
  const canSend = $derived(
    tittel.trim().length >= 5 &&
      datoOppdaget.length > 0 &&
      valgtHjemmel !== null &&
      charCount >= 10 &&
      filer.every((v) => v.id || v.fil)
  );

  function groupMatches(group: Kontraktsforhold): boolean {
    if (!normalizedSearch) return true;
    return groupLabelMatches(group) || group.hjemler.some((hjemmel) => hjemmelMatches(hjemmel));
  }

  function groupLabelMatches(group: Kontraktsforhold): boolean {
    if (!normalizedSearch) return false;
    return `${group.label} ${group.hjemmel_frist}`
      .toLocaleLowerCase('nb-NO')
      .includes(normalizedSearch);
  }

  function visibleHjemler(group: Kontraktsforhold): Kontraktshjemmel[] {
    if (!normalizedSearch || groupLabelMatches(group)) return group.hjemler;
    return group.hjemler.filter(hjemmelMatches);
  }

  function hjemmelMatches(hjemmel: Kontraktshjemmel): boolean {
    if (!normalizedSearch) return true;
    return `${hjemmel.label} ${hjemmel.hjemmel_basis} ${hjemmel.beskrivelse}`
      .toLocaleLowerCase('nb-NO')
      .includes(normalizedSearch);
  }

  function selectHjemmel(kontraktsforhold: Kontraktsforhold, hjemmel: Kontraktshjemmel | null) {
    valgtHjemmel = { kontraktsforhold, hjemmel };
    hjemmelvelgerApen = false;
    sok = '';
  }

  $effect(() => {
    onactions?.({
      canSend: canSend && !submission.pending,
      sendLabel: 'Se brev og send',
      send: () => {
        if (!canSend || !valgtHjemmel) return;
        const project = prosjektId;
        const selection = valgtHjemmel;
        const basisData = {
          tittel: tittel.trim(),
          hovedkategori: selection.kontraktsforhold.kode,
          underkategori: selection.hjemmel?.kode ?? null,
          dato_oppdaget: datoOppdaget,
          beskrivelse: begrunnelseHtml.trim(),
          varsler: buildKonsekvensVarsler(varsler, selection.kontraktsforhold.kode, tittel),
        };
        void submission.run(
          async () => {
            const section = (tittel: string, tekst: string) => ({
              tittel,
              originalTekst: tekst,
              redigertTekst: tekst,
            });
            const sender =
              projectStore.current?.settings.contract?.totalentreprenor_navn ?? 'Totalentreprenør';
            const recipient =
              projectStore.current?.settings.contract?.byggherre_navn ?? 'Byggherre';
            const id = createdCase?.id ?? crypto.randomUUID();
            const brev = await letterConfirmation.show({
              tittel: `${sendLabel === 'Send varsel' ? 'Varsel om endring' : 'Ansvarsgrunnlag'} – ${basisData.tittel}`,
              avsender: { navn: sender, rolle: 'TE' },
              mottaker: { navn: recipient, rolle: 'BH' },
              referanser: {
                sakId: id,
                sakstittel: basisData.tittel,
                eventId: 'utkast',
                sporType: 'grunnlag',
                dato: formatDateNorwegian(new Date().toISOString()),
              },
              seksjoner: {
                innledning: section('Innledning', `Vi varsler med dette om ${basisData.tittel}.`),
                begrunnelse: section(
                  'Begrunnelse',
                  [letterText(basisData.beskrivelse), ...Object.values(basisData.varsler)].join(
                    '\n\n'
                  ) + (filer.length ? `\n\nVedlegg\n${filer.map((v) => v.navn).join('\n')}` : '')
                ),
                avslutning: section('Avslutning', `Med vennlig hilsen\n${sender}`),
              },
            });
            if (!project) return;
            if (!createdCase) {
              const result = await submitEvent(
                id,
                'sak_opprettet',
                {
                  prosjekt_id: project,
                  sakstype: 'standard',
                  sakstittel: basisData.tittel,
                },
                { projectId: project, expectedVersion: 0 }
              );
              if (!result.success) throw new Error(result.message ?? 'Kunne ikke opprette saken.');
              createdCase = { id, version: result.new_version ?? 1 };
              saveDraft(dk, {
                tittel,
                datoOppdaget,
                valgtHjemmel,
                begrunnelseHtml,
                createdCase,
                varsler,
                filer: filutkast(),
              });
            }
            // Upload only after creation, before the basis event. Keep each receipt
            // immediately so a later failed upload or submission can reuse it.
            for (let i = 0; i < filer.length; i++) {
              const valgt = filer[i];
              if (valgt.id) continue;
              if (!valgt.fil)
                throw new Error(`Velg ${valgt.navn} på nytt eller fjern den fra innsendingen.`);
              const uploaded = await lastOppVedlegg(createdCase.id, valgt.fil, project);
              filer[i] = { navn: uploaded.navn, storrelse: uploaded.storrelse, id: uploaded.id };
              saveDraft(dk, {
                tittel,
                datoOppdaget,
                valgtHjemmel,
                begrunnelseHtml,
                createdCase,
                varsler,
                filer: filutkast(),
              });
            }
            const result = await submitEvent(
              createdCase.id,
              'grunnlag_opprettet',
              { ...basisData, brev, vedlegg_ids: filer.map((v) => v.id!) },
              {
                projectId: project,
                expectedVersion: createdCase.version,
              }
            );
            if (!result.success)
              throw new Error(result.message ?? 'Kunne ikke lagre ansvarsgrunnlaget.');
            draftReady = false;
            clearDraft(dk);
          },
          () => {
            if (createdCase) oncreated?.(createdCase.id);
            onsend();
          }
        );
      },
    });
  });
</script>

{#if letterConfirmation.letter}<ClaimLetterDialog review={letterConfirmation} />{/if}

{#if !prosjektId || draftReady}
  <div class="new-case-form">
    {#if submission.pending}<p role="status">Oppretter saken …</p>{/if}
    {#if submission.error}<p role="alert">{submission.error}</p>{/if}
    <header class="form-header">
      <span class="eyebrow">Ny sak</span>
      <h1>Nytt ansvarsgrunnlag</h1>
      <p>
        Beskriv forholdet som kan gi grunnlag for krav om vederlagsjustering eller fristforlengelse.
      </p>
    </header>

    {#if prosjektId}
      <FormSection title="Vedlegg (valgfritt)">
        <label for="new-case-files"
          >Velg filer som skal følge innsendingen (maks 15 MB per fil)</label
        >
        <input
          id="new-case-files"
          type="file"
          multiple
          disabled={submission.pending}
          onchange={(e) => {
            velgFiler(e.currentTarget.files);
            e.currentTarget.value = '';
          }}
        />
        {#each filer as fil, i}
          <p>
            {fil.navn}
            {#if !fil.id && !fil.fil}<span role="alert">
                – velg filen på nytt eller fjern den.</span
              >{/if}
            <button
              class="change-button"
              disabled={submission.pending}
              onclick={() => (filer = filer.filter((_, index) => index !== i))}
              >Fjern {fil.navn}</button
            >
          </p>
        {/each}
        {#if filfeil}<p role="alert">{filfeil}</p>{/if}
      </FormSection>
    {/if}

    <FormSection title="Saksopplysninger">
      <div class="field">
        <label for="new-case-title">Kort tittel på forholdet</label>
        <input
          id="new-case-title"
          class="text-input"
          value={tittel}
          oninput={(event) => (tittel = event.currentTarget.value)}
          placeholder="Eksempel: Uforutsette grunnforhold ved akse C5–C8"
        />
        <span class="field-help">Bruk en tittel som gjør saken lett å kjenne igjen.</span>
      </div>

      <div class="field date-field">
        <label for="new-case-date">Når ble forholdet oppdaget?</label>
        <div class="date-input-wrap">
          <CalendarDays size={16} aria-hidden="true" />
          <input
            id="new-case-date"
            type="date"
            value={datoOppdaget}
            oninput={(event) => (datoOppdaget = event.currentTarget.value)}
          />
        </div>
        <span class="field-help"
          >Datoen brukes ved vurderingen av kontraktens varslingsfrister.</span
        >
      </div>
    </FormSection>

    <FormSection title="Kontraktsforhold">
      {#snippet aside()}
        {#if valgtHjemmel && !hjemmelvelgerApen}
          <button class="change-button" onclick={() => (hjemmelvelgerApen = true)}
            >Endre valg</button
          >
        {/if}
      {/snippet}
      <p class="section-intro">
        Velg forholdet totalentreprenøren mener byggherren har risikoen for.
      </p>

      {#if valgtHjemmel && !hjemmelvelgerApen}
        {@const forhold = valgtHjemmel.kontraktsforhold}
        {@const hjemmel = valgtHjemmel.hjemmel}
        {@const hjemmelRef = hjemmel?.hjemmel_basis ?? forhold.hjemmel_frist}
        {@const kontraktsregel = getKontraktsregel(hjemmelRef)}
        <div class="selected-basis">
          <div class="selected-header">
            <div>
              <span class="selected-category">{forhold.label}</span>
              <h3>{hjemmel?.label ?? forhold.label}</h3>
            </div>
            <span class="font-mono selected-ref">§ {hjemmelRef}</span>
          </div>
          <div class="selected-rule">
            {#if kontraktsregel}
              <p>{kontraktsregel.regel}</p>
              <p class="rule-consequence">{kontraktsregel.konsekvens}</p>
            {:else}
              <p>{hjemmel?.beskrivelse ?? forhold.beskrivelse}</p>
            {/if}
          </div>
        </div>
      {:else}
        <div class="basis-picker">
          <label class="search-field">
            <Search size={15} aria-hidden="true" />
            <input bind:value={sok} placeholder="Søk etter forhold eller paragraf" />
          </label>

          <div class="basis-groups">
            {#each KRAV_STRUKTUR_NS8407 as gruppe (gruppe.kode)}
              {#if groupMatches(gruppe)}
                {@const isStandalone = gruppe.hjemler.length === 0}
                {@const isOpen = apenKategori === gruppe.kode || normalizedSearch.length > 0}
                <div class="basis-group">
                  <button
                    class="group-button"
                    onclick={() => {
                      if (isStandalone) selectHjemmel(gruppe, null);
                      else apenKategori = apenKategori === gruppe.kode ? null : gruppe.kode;
                    }}
                  >
                    <span>
                      <strong>{gruppe.label}</strong>
                      <small>{gruppe.type_krav}</small>
                    </span>
                    <span class="group-end">
                      <span class="font-mono">§ {gruppe.hjemmel_frist}</span>
                      {#if !isStandalone}
                        {#if isOpen}<ChevronUp size={15} />{:else}<ChevronDown size={15} />{/if}
                      {/if}
                    </span>
                  </button>

                  {#if !isStandalone && isOpen}
                    <div class="home-list">
                      {#each visibleHjemler(gruppe) as hjemmel (hjemmel.kode)}
                        <button class="home-button" onclick={() => selectHjemmel(gruppe, hjemmel)}>
                          <span>{hjemmel.label}</span>
                          <span class="font-mono">§ {hjemmel.hjemmel_basis}</span>
                        </button>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/if}
            {/each}
          </div>
        </div>
      {/if}
    </FormSection>

    <FormSection title="Redegjørelse">
      {#snippet aside()}<span class="font-mono char-count">{charCount} tegn</span>{/snippet}
      <p class="section-intro">
        Beskriv hva som har skjedd, hvorfor forholdet omfattes av kontraktshjemmelen og hvilke
        konsekvenser det har.
      </p>
      <div class="editor-wrapper">
        <RichTextEditor
          body={begrunnelseHtml}
          onchange={(html) => (begrunnelseHtml = html)}
          placeholder="Redegjør for ansvarsgrunnlaget..."
          maxHeight="none"
          oncharcount={(count) => (charCount = count)}
        />
      </div>
    </FormSection>

    <KonsekvensVarsler
      bind:value={varsler}
      hovedkategori={valgtHjemmel?.kontraktsforhold.kode ?? ''}
      {tittel}
      disabled={submission.pending}
    />
  </div>
{/if}

<style>
  .new-case-form {
    max-width: 840px;
    margin: 0 auto;
    padding: 36px 40px 120px;
  }
  .form-header {
    margin-bottom: 32px;
  }
  .eyebrow {
    display: block;
    margin-bottom: 5px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--ink-4);
  }
  .form-header h1 {
    margin: 0;
    font-size: 30px;
    line-height: 1.2;
    letter-spacing: -0.02em;
    color: var(--ink);
  }
  .form-header p {
    max-width: 640px;
    margin: 9px 0 0;
    font-size: 14px;
    line-height: 1.6;
    color: var(--ink-3);
  }
  .section-intro {
    margin: 10px 0 16px;
    font-size: 13px;
    line-height: 1.55;
    color: var(--ink-3);
  }
  .field {
    margin-top: 18px;
  }
  .field label {
    display: block;
    margin-bottom: 7px;
    font-size: 12px;
    font-weight: 650;
    color: var(--ink-2);
  }
  .text-input,
  .date-input-wrap {
    width: 100%;
    background: var(--surface);
    border: var(--control-border);
    border-radius: 8px;
  }
  .text-input {
    min-height: 44px;
    padding: 10px 12px;
    font-family: var(--font-sans);
    font-size: 14px;
    color: var(--ink);
    outline: none;
  }
  .text-input:focus,
  .date-input-wrap:focus-within {
    border-color: var(--control-focus);
    box-shadow: var(--control-focus-ring);
  }
  .field-help {
    display: block;
    margin-top: 6px;
    font-size: 11px;
    line-height: 1.45;
    color: var(--ink-4);
  }
  .date-field {
    max-width: 340px;
  }
  .date-input-wrap {
    display: flex;
    align-items: center;
    gap: 9px;
    min-height: 44px;
    padding: 0 12px;
    color: var(--ink-3);
  }
  .date-input-wrap input {
    flex: 1;
    padding: 10px 0;
    font-family: var(--font-sans);
    font-size: 14px;
    color: var(--ink);
    background: transparent;
    border: 0;
    outline: 0;
  }
  .change-button {
    padding: 0;
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 600;
    color: var(--green);
    background: none;
    border: 0;
    cursor: pointer;
  }
  .basis-picker,
  .selected-basis {
    overflow: hidden;
    background: var(--surface);
    border: 0;
    border-radius: 0;
  }
  .search-field {
    display: flex;
    align-items: center;
    gap: 9px;
    margin: 0 0 12px;
    padding: 0 11px;
    min-height: 40px;
    color: var(--ink-4);
    background: var(--surface-inset);
    border: var(--rule-strong);
    border-radius: 999px;
  }
  .search-field:focus-within {
    border-color: var(--control-focus);
  }
  .search-field input {
    flex: 1;
    min-width: 0;
    font-family: var(--font-sans);
    font-size: 13px;
    color: var(--ink);
    background: transparent;
    border: 0;
    outline: 0;
  }
  .basis-groups {
    border-top: var(--rule);
  }
  .basis-group + .basis-group {
    border-top: var(--rule);
  }
  .group-button,
  .home-button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    width: 100%;
    font-family: var(--font-sans);
    text-align: left;
    color: var(--ink-2);
    background: var(--surface);
    border: 0;
    cursor: pointer;
  }
  .group-button {
    min-height: 52px;
    padding: 10px 14px;
  }
  .group-button:hover,
  .home-button:hover {
    color: var(--ink);
    background: var(--surface-warm);
  }
  .group-button > span:first-child {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .group-button strong {
    font-size: 13px;
    font-weight: 650;
  }
  .group-button small {
    font-size: 10px;
    color: var(--ink-4);
  }
  .group-end {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: none;
    font-size: 11px;
    color: var(--ink-4);
  }
  .home-list {
    padding: 4px 8px 8px 20px;
    background: var(--surface-warm);
    border-top: var(--rule-subtle);
  }
  .home-button {
    min-height: 40px;
    padding: 8px 10px;
    font-size: 12px;
    background: transparent;
    border-bottom: var(--rule-subtle);
  }
  .home-button:last-child {
    border-bottom: 0;
  }
  .home-button .font-mono {
    flex: none;
    font-size: 10px;
    color: var(--ink-4);
  }
  .selected-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: 15px 16px;
    border-bottom: var(--rule);
  }
  .selected-category {
    display: block;
    margin-bottom: 3px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-4);
  }
  .selected-header h3 {
    margin: 0;
    font-size: 16px;
    line-height: 1.4;
    color: var(--ink);
  }
  .selected-ref {
    flex: none;
    font-size: 11px;
    color: var(--ink-4);
  }
  .selected-rule {
    margin: 0;
    padding: 15px 16px 16px 19px;
    font-size: 13px;
    line-height: 1.6;
    color: var(--ink-2);
    background: var(--surface-warm);
    box-shadow: inset 3px 0 0 var(--brand);
  }
  .selected-rule p {
    margin: 0;
  }
  .selected-rule .rule-consequence {
    margin-top: 10px;
    color: var(--ink-3);
  }
  .char-count {
    font-size: 11px;
    color: var(--ink-4);
  }
  .editor-wrapper {
    margin-top: 0;
  }
  @media (max-width: 768px) {
    .new-case-form {
      padding: 24px 16px 120px;
    }
    .form-header h1 {
      font-size: 25px;
    }
    .date-field {
      max-width: none;
    }
  }
</style>
