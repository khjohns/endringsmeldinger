<script lang="ts">
  import { CalendarDays, Check, ChevronDown, ChevronUp, Search, Upload } from 'lucide-svelte';
  import RichTextEditor from '$lib/components/primitives/RichTextEditor.svelte';
  import {
    KRAV_STRUKTUR_NS8407,
    type Kontraktsforhold,
    type Kontraktshjemmel,
  } from '$lib/constants/categories.js';
  import { getKontraktsregel } from '$lib/constants/kontraktsregler.js';
  import type { ValgtHjemmel } from '$lib/types/hjemmel.js';

  let {
    onsend,
    onactions,
  }: {
    onsend: () => void;
    onactions?: (a: { canSend: boolean; sendLabel: string; send: () => void }) => void;
  } = $props();

  let tittel = $state('');
  let datoOppdaget = $state('');
  let valgtHjemmel = $state<ValgtHjemmel | null>(null);
  let hjemmelvelgerApen = $state(true);
  let apenKategori: string | null = $state(null);
  let sok = $state('');
  let begrunnelseHtml = $state('');
  let charCount = $state(0);

  const normalizedSearch = $derived(sok.trim().toLocaleLowerCase('nb-NO'));
  const sendLabel = $derived(
    valgtHjemmel?.kontraktsforhold.kode === 'ENDRING' && valgtHjemmel.hjemmel?.kode !== 'EO'
      ? 'Send varsel'
      : 'Send ansvarsgrunnlag'
  );
  const canSend = $derived(
    tittel.trim().length >= 5 && datoOppdaget.length > 0 && valgtHjemmel !== null && charCount >= 10
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
    onactions?.({ canSend, sendLabel, send: onsend });
  });
</script>

<div class="new-case-form">
  <header class="form-header">
    <span class="eyebrow">Ny sak</span>
    <h1>Nytt ansvarsgrunnlag</h1>
    <p>
      Beskriv forholdet som kan gi grunnlag for krav om vederlagsjustering eller fristforlengelse.
    </p>
  </header>

  <section class="form-section">
    <div class="section-heading">
      <h2>Saksopplysninger</h2>
    </div>
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
      <span class="field-help">Datoen brukes ved vurderingen av kontraktens varslingsfrister.</span>
    </div>
  </section>

  <section class="form-section">
    <div class="section-heading">
      <h2>Kontraktsforhold</h2>
      {#if valgtHjemmel && !hjemmelvelgerApen}
        <button class="change-button" onclick={() => (hjemmelvelgerApen = true)}>Endre valg</button>
      {/if}
    </div>
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
  </section>

  <section class="form-section reasoning-section">
    <div class="section-heading">
      <h2>Redegjørelse</h2>
      <span class="font-mono char-count">{charCount} tegn</span>
    </div>
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
  </section>

  <section class="form-section attachments-section">
    <div class="section-heading"><h2>Vedlegg</h2></div>
    <button class="upload-zone">
      <Upload size={18} aria-hidden="true" />
      <span>Slipp filer her eller velg fra maskinen</span>
      <small>PDF, DOCX, XLSX og bilder</small>
    </button>
  </section>
</div>

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
  .form-section {
    margin-bottom: 32px;
  }
  .section-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 9px;
    border-bottom: 1px solid var(--color-wire);
  }
  .section-heading h2 {
    margin: 0;
    font-size: 13px;
    line-height: 1.4;
    color: var(--ink);
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
    border: var(--rule);
    border-radius: 12px;
    box-shadow: var(--overlay-shadow-sm);
  }
  .search-field {
    display: flex;
    align-items: center;
    gap: 9px;
    margin: 12px;
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
  .reasoning-section .editor-wrapper {
    margin-top: 0;
  }
  .upload-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    min-height: 104px;
    margin-top: 14px;
    padding: 16px;
    font-family: var(--font-sans);
    font-size: 12px;
    color: var(--ink-3);
    background: var(--surface);
    border: 1.5px dashed var(--internal-border);
    border-radius: 12px;
    cursor: pointer;
  }
  .upload-zone:hover {
    color: var(--ink);
    background: var(--surface-warm);
    border-color: var(--green);
  }
  .upload-zone small {
    font-size: 10px;
    color: var(--ink-4);
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
