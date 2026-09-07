<script lang="ts">
  import { Check, ChevronDown, ChevronUp } from 'lucide-svelte';
  import FormSection from './components/FormSection.svelte';
  import {
    VARSEL_LABELS,
    buildKonsekvensVarsler,
    type VarselValg,
    type VarselKind,
  } from '$lib/domain/konsekvensVarsler';
  let {
    value = $bindable({}),
    hovedkategori = '',
    tittel = '',
    includeFrist = true,
    disabled = false,
  }: {
    value?: VarselValg;
    hovedkategori?: string;
    tittel?: string;
    includeFrist?: boolean;
    disabled?: boolean;
  } = $props();
  const id = $props.id();
  const preview = $derived(buildKonsekvensVarsler(value, hovedkategori, tittel, includeFrist));
  let explanations = $state<Partial<Record<VarselKind, boolean>>>({});
  let previews = $state<Partial<Record<VarselKind, boolean>>>({});
  const rows: { kind: VarselKind; label: string; ref: string; confirmation: string }[] = [
    {
      kind: 'vederlag',
      label: 'Vederlagsjustering',
      ref: '34.1',
      confirmation: 'Varsel om vederlagsjustering tas med',
    },
    {
      kind: 'rigg_drift',
      label: 'Kapitalytelser, rigg og drift',
      ref: '34.1.3',
      confirmation: 'Særskilt varsel om rigg og drift tas med',
    },
    {
      kind: 'produktivitet',
      label: 'Produktivitetstap / forstyrrelser',
      ref: '34.1.3',
      confirmation: 'Særskilt varsel om produktivitetstap / forstyrrelser tas med',
    },
    {
      kind: 'frist',
      label: 'Fristforlengelse',
      ref: '33.4',
      confirmation: 'Varsel om fristforlengelse tas med',
    },
  ];
</script>

<FormSection title="Varsler">
  <fieldset {disabled} aria-labelledby={`${id}-question`}>
    <p class="question" id={`${id}-question`}>
      Hvilke varsler vil du sende {includeFrist
        ? 'sammen med grunnlaget'
        : 'med denne innsendingen'}?
    </p>
    <p class="intro">{includeFrist ? 'Beløp og antall dager' : 'Beløp'} spesifiseres senere.</p>
    <div class="notice-list">
      {#each rows.filter((row) => includeFrist || row.kind !== 'frist') as row}
        {@const kind = row.kind}
        <div class="notice" class:selected={value[kind]?.valgt}>
          <label class="notice-choice">
            <span class="check-box">
              <input
                type="checkbox"
                aria-label={VARSEL_LABELS[kind]}
                checked={value[kind]?.valgt ?? false}
                onchange={(event) =>
                  (value = {
                    ...value,
                    [kind]: {
                      valgt: event.currentTarget.checked,
                      forklaring: value[kind]?.forklaring ?? '',
                    },
                  })}
              />
              <Check size={13} strokeWidth={2.5} aria-hidden="true" />
            </span>
            <span class="notice-name">{row.label}</span>
            <span class="notice-ref">§ {row.ref}</span>
          </label>
          {#if value[kind]?.valgt}
            <div class="notice-content">
              <p class="confirmation">{row.confirmation}</p>
              <div class="notice-actions">
                <button
                  type="button"
                  aria-label={`Forklaring: ${row.label}`}
                  aria-expanded={explanations[kind] ?? false}
                  aria-controls={`${id}-${kind}-explanation`}
                  onclick={() => (explanations[kind] = !explanations[kind])}
                >
                  {explanations[kind]
                    ? 'Skjul forklaring'
                    : value[kind]?.forklaring
                      ? 'Rediger forklaring'
                      : 'Legg til forklaring'}
                  {#if explanations[kind]}<ChevronUp size={13} />{:else}<ChevronDown
                      size={13}
                    />{/if}
                </button>
                <button
                  type="button"
                  aria-label={`Varseltekst: ${row.label}`}
                  aria-expanded={previews[kind] ?? false}
                  aria-controls={`${id}-${kind}-preview`}
                  onclick={() => (previews[kind] = !previews[kind])}
                >
                  {previews[kind] ? 'Skjul varseltekst' : 'Vis varseltekst'}
                  {#if previews[kind]}<ChevronUp size={13} />{:else}<ChevronDown size={13} />{/if}
                </button>
              </div>
              <div id={`${id}-${kind}-explanation`} hidden={!explanations[kind]}>
                <textarea
                  aria-label={`Supplerende forklaring: ${VARSEL_LABELS[kind]}`}
                  placeholder="Forklar følgen nærmere (valgfritt)"
                  value={value[kind]?.forklaring ?? ''}
                  oninput={(event) =>
                    (value = {
                      ...value,
                      [kind]: { valgt: true, forklaring: event.currentTarget.value },
                    })}
                ></textarea>
              </div>
              <div id={`${id}-${kind}-preview`} hidden={!previews[kind]}>
                <p class="preview">{preview[kind]}</p>
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
    {#if hovedkategori === 'FORCE_MAJEURE'}
      <p class="guidance">
        Force majeure gir ikke i seg selv rett til vederlagsjustering (pkt. 33.3). Du kan likevel
        varsle dersom du mener forholdet også gir et annet grunnlag for kravet.
      </p>
    {/if}
    <p class="footer">
      Du kan varsle flere krav senere. Et uavkrysset valg innebærer ikke at kravet er frafalt.
    </p>
    <p class="deadline">Varslingsfristene løper uavhengig av byggherrens svar.</p>
  </fieldset>
</FormSection>

<style>
  fieldset {
    border: 0;
    padding: 0;
    margin: 0;
    min-width: 0;
  }
  .question {
    margin: 14px 0 5px;
    font-size: 14px;
    line-height: 1.55;
    color: var(--ink-2);
  }
  .intro,
  .footer,
  .guidance {
    font-size: 12px;
    line-height: 1.6;
    color: var(--ink-3);
  }
  .intro {
    margin: 0 0 14px;
  }
  .notice-list {
    border-bottom: var(--rule);
  }
  .notice {
    border-top: var(--rule);
    transition: background 120ms ease;
  }
  .notice.selected {
    background: var(--green-bg);
  }
  .notice-choice {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 15px 10px;
    cursor: pointer;
  }
  .notice-choice:hover {
    background: var(--surface-warm);
  }
  .notice-name {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    line-height: 1.5;
    color: var(--ink-2);
    font-weight: 550;
  }
  .notice-ref {
    flex: none;
    font-size: 11px;
    color: var(--ink-4);
  }
  .check-box {
    position: relative;
    display: flex;
    flex: none;
    width: 18px;
    height: 18px;
  }
  input {
    appearance: none;
    width: 18px;
    height: 18px;
    margin: 0;
    border: 1.5px solid var(--ink-4);
    border-radius: 5px;
    background: var(--surface);
    cursor: pointer;
  }
  input:checked {
    background: var(--green);
    border-color: var(--green);
  }
  .check-box :global(svg) {
    position: absolute;
    top: 2.5px;
    left: 2.5px;
    color: white;
    pointer-events: none;
    opacity: 0;
  }
  .check-box:has(input:checked) :global(svg) {
    opacity: 1;
  }
  input:focus-visible,
  button:focus-visible,
  textarea:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 3px;
  }
  .notice-content {
    padding: 0 12px 14px 40px;
  }
  .confirmation {
    margin: 0 0 8px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--green);
  }
  .notice-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 18px;
  }
  button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 0;
    background: none;
    border: 0;
    font: inherit;
    font-size: 12px;
    color: var(--ink-3);
    cursor: pointer;
  }
  button:hover {
    color: var(--green);
  }
  textarea {
    box-sizing: border-box;
    width: 100%;
    min-height: 80px;
    margin-top: 12px;
    padding: 10px 12px;
    border: var(--control-border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--ink);
    font: inherit;
    font-size: 13px;
    line-height: 1.6;
    resize: vertical;
  }
  .preview {
    margin: 12px 0 0;
    padding: 12px;
    background: var(--surface);
    border: var(--rule);
    border-radius: 8px;
    font-size: 12px;
    line-height: 1.65;
    color: var(--ink-2);
    white-space: pre-wrap;
  }
  .footer {
    margin: 14px 0 4px;
  }
  .deadline {
    margin: 0;
    font-size: 11px;
    line-height: 1.6;
    color: var(--ink-4);
  }
  .guidance {
    margin: 14px 0;
  }
  fieldset:disabled {
    opacity: 0.65;
  }
  fieldset:disabled label,
  input:disabled,
  button:disabled {
    cursor: default;
  }
  @media (max-width: 480px) {
    .notice-choice {
      gap: 9px;
      padding-inline: 4px;
    }
    .notice-content {
      padding-left: 31px;
      padding-right: 4px;
    }
  }
</style>
