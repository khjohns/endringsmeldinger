<script lang="ts">
  import { Clock3 } from 'lucide-svelte';
  import ExpandableReasoning from '$lib/components/patterns/ExpandableReasoning.svelte';
  import StatementCard from '$lib/components/patterns/StatementCard.svelte';
  import type { ResponsFristEventData } from '$lib/types/timeline.js';
  import { formatDateShortNorwegian } from '$lib/utils/dateFormatters.js';
  import { store } from './store.svelte.js';
  import { fmt, sporResultatLabel } from './utils.js';
  import Stamp from './Stamp.svelte';

  let { onform }: { onform: () => void } = $props();

  const frist = $derived(store.sak.frist);
  const ui = $derived(store.getUI('frist'));
  const krevdDager = $derived(frist.krevd_dager ?? 0);
  const prinsipaltGodkjent = $derived(frist.godkjent_dager ?? 0);
  const subsidiaertGodkjent = $derived(frist.subsidiaer_godkjent_dager ?? prinsipaltGodkjent);
  const hasBhResponse = $derived(Boolean(frist.bh_resultat));
  const hasSubsidiaryPosition = $derived(
    hasBhResponse &&
      (frist.har_subsidiaert_standpunkt || frist.subsidiaer_godkjent_dager !== undefined)
  );

  const fristEvents = $derived(store.timeline.filter((event) => event.spor === 'frist'));
  const teEvents = $derived(
    fristEvents.filter(
      (event) =>
        event.actorrole === 'TE' &&
        (event.type.endsWith('.frist_krav_sendt') ||
          event.type.endsWith('.frist_krav_oppdatert') ||
          event.type.endsWith('.frist_krav_spesifisert'))
    )
  );
  const bhEvents = $derived(
    fristEvents.filter((event) => event.actorrole === 'BH' && event.type.endsWith('.respons_frist'))
  );
  const latestBhResponseData = $derived.by(() => {
    return bhEvents.at(-1)?.data as Partial<ResponsFristEventData> | undefined;
  });

  const teVersionCount = $derived(Math.max(frist.antall_versjoner, teEvents.length, 1));
  const teRevision = $derived(teVersionCount - 1);
  const teDate = $derived(formatDateShortNorwegian(teEvents.at(-1)?.time ?? frist.siste_oppdatert));
  const bhDate = $derived(
    hasBhResponse ? formatDateShortNorwegian(bhEvents.at(-1)?.time ?? frist.siste_oppdatert) : ''
  );
  const bhAnsweredRevision = $derived(
    latestBhResponseData?.respondert_versjon ?? frist.bh_respondert_versjon
  );
  const attachmentPages = $derived(
    ui.att.reduce((sum, attachment) => sum + (attachment.p ?? 0), 0)
  );

  const bhResultLabel = $derived(frist.bh_resultat ? sporResultatLabel(frist.bh_resultat) : '');
  const responseData = $derived(latestBhResponseData ?? {});
  const fristVarselOk = $derived(responseData.frist_varsel_ok ?? frist.frist_varsel_ok);
  const spesifisertKravOk = $derived(responseData.spesifisert_krav_ok ?? frist.spesifisert_krav_ok);
  const vilkarOppfylt = $derived(responseData.vilkar_oppfylt ?? frist.vilkar_oppfylt);
  const assessmentRows = $derived.by(() => {
    const rows: Array<{
      label: string;
      ref: string;
      value: string;
      tone: 'positive' | 'warning' | 'negative';
    }> = [];

    if (fristVarselOk !== undefined) {
      rows.push({
        label: 'Foreløpig varsel',
        ref: '§ 33.4',
        value: fristVarselOk ? 'Varslet i tide' : 'For sent — prekludert',
        tone: fristVarselOk ? 'positive' : 'negative',
      });
    }
    if (spesifisertKravOk !== undefined) {
      rows.push({
        label: 'Spesifisert krav',
        ref: '§ 33.6.1',
        value: spesifisertKravOk ? 'Fremsatt i tide' : 'For sent — kravet begrenses',
        tone: spesifisertKravOk ? 'positive' : 'warning',
      });
    }
    if (vilkarOppfylt !== undefined) {
      rows.push({
        label: 'Årsakssammenheng',
        ref: '§ 33.1',
        value: vilkarOppfylt ? 'Anerkjent' : 'Bestridt',
        tone: vilkarOppfylt ? 'positive' : 'negative',
      });
    }
    return rows;
  });

  const hasUsefulPositionOverview = $derived(
    hasBhResponse &&
      krevdDager > 0 &&
      (prinsipaltGodkjent !== krevdDager ||
        (hasSubsidiaryPosition && subsidiaertGodkjent !== prinsipaltGodkjent))
  );
  const prinsipaltPct = $derived(
    krevdDager > 0 ? Math.min(100, Math.max(0, (prinsipaltGodkjent / krevdDager) * 100)) : 0
  );
  const subsidiaertPct = $derived(
    krevdDager > 0 ? Math.min(100, Math.max(0, (subsidiaertGodkjent / krevdDager) * 100)) : 0
  );
</script>

<StatementCard
  eyebrow="Totalentreprenørens krav"
  partyName={store.teNavn}
  reference="§ 33.4 / § 33.6.1"
  submittedAt={teDate}
  revisionLabel={teRevision > 0 ? `Rev. ${teRevision}` : undefined}
>
  {#snippet icon()}<Clock3 size={14} />{/snippet}

  <div class="claim-summary">
    {#if frist.varsel_type === 'spesifisert' && frist.krevd_dager !== undefined}
      <div class="primary-days">
        <span class="eyebrow">Krevd fristforlengelse</span>
        <strong class="font-mono">{fmt(krevdDager)} dager</strong>
      </div>
    {:else if frist.varsel_type === 'begrunnelse_utsatt'}
      <div class="notice-hero">
        <span class="eyebrow">Foreløpig krav om fristforlengelse</span>
        <strong>Fristvirkningen beregnes senere</strong>
        <p>Entreprenøren har begrunnet hvorfor antall dager ennå ikke kan spesifiseres.</p>
      </div>
    {:else}
      <div class="notice-hero">
        <span class="eyebrow">Varsel om fristforlengelse</span>
        <strong>Foreløpig varsel</strong>
        <p>Antall dager er ikke spesifisert ennå.</p>
      </div>
    {/if}
  </div>

  <div class="notice-dates">
    {#if frist.frist_varsel?.dato_sendt}
      <div>
        <span class="eyebrow">Foreløpig varsel · § 33.4</span>
        <strong>{formatDateShortNorwegian(frist.frist_varsel.dato_sendt)}</strong>
      </div>
    {/if}
    {#if frist.spesifisert_varsel?.dato_sendt}
      <div>
        <span class="eyebrow">Spesifisert krav · § 33.6.1</span>
        <strong>{formatDateShortNorwegian(frist.spesifisert_varsel.dato_sendt)}</strong>
      </div>
    {/if}
    {#if teRevision > 0 && teDate}
      <div>
        <span class="eyebrow">Sist revidert</span>
        <strong>{teDate}</strong>
      </div>
    {/if}
  </div>

  <ExpandableReasoning
    label="Entreprenørens begrunnelse"
    html={frist.begrunnelse}
    attachmentCount={ui.att.length}
    {attachmentPages}
  />
</StatementCard>

{#if hasBhResponse}
  <StatementCard
    eyebrow="Byggherrens standpunkt"
    partyName={store.bhNavn}
    reference="§ 33"
    submittedAt={bhDate}
    submittedLabel="Svart"
    revisionLabel={bhAnsweredRevision === undefined
      ? undefined
      : bhAnsweredRevision === 0
        ? 'Svar på opprinnelig krav'
        : `Svar på rev. ${bhAnsweredRevision}`}
  >
    {#snippet icon()}<Clock3 size={14} />{/snippet}

    <div class="response-summary" class:with-subsidiary={hasSubsidiaryPosition}>
      <div>
        <span class="eyebrow">Resultat</span>
        <strong>{bhResultLabel}</strong>
      </div>
      <div class="approved-days">
        <span class="eyebrow">Prinsipalt godkjent</span>
        <strong class="font-mono">{fmt(prinsipaltGodkjent)} dager</strong>
      </div>
      {#if hasSubsidiaryPosition}
        <div class="approved-days">
          <span class="eyebrow">Subsidiært godkjent</span>
          <strong class="font-mono">{fmt(subsidiaertGodkjent)} dager</strong>
        </div>
      {/if}
    </div>

    {#if assessmentRows.length > 0}
      <div class="assessment-list">
        {#each assessmentRows as row}
          <div class="assessment-row">
            <div>
              <strong>{row.label}</strong>
              <span class="font-mono">{row.ref}</span>
            </div>
            <span class="assessment-value {row.tone}">{row.value}</span>
          </div>
        {/each}
      </div>
    {/if}

    {#if frist.bh_begrunnelse}
      <ExpandableReasoning label="Byggherrens begrunnelse" html={frist.bh_begrunnelse} />
    {/if}
  </StatementCard>
{:else}
  <section class="pending-card">
    <span class="pending-icon"><Clock3 size={16} /></span>
    <div>
      <span class="eyebrow">Byggherrens standpunkt</span>
      <h3>Avventer svar fra {store.bhNavn}</h3>
      <p>Det er ikke registrert noen vurdering av dagkravet eller begrunnelse fra byggherren.</p>
    </div>
  </section>
{/if}

{#if hasUsefulPositionOverview}
  <section class="position-card">
    <span class="eyebrow">Posisjonsoversikt</span>
    <div class="position-values" class:has-subsidiary={hasSubsidiaryPosition}>
      <div>
        <span>Krevd</span>
        <strong class="font-mono">{fmt(krevdDager)} dager</strong>
      </div>
      <div>
        <span>Prinsipalt godkjent</span>
        <strong class="font-mono">{fmt(prinsipaltGodkjent)} dager</strong>
      </div>
      {#if hasSubsidiaryPosition}
        <div>
          <span>Subsidiært godkjent</span>
          <strong class="font-mono">{fmt(subsidiaertGodkjent)} dager</strong>
        </div>
      {/if}
    </div>

    <div class="position-row">
      <div class="position-row-label">
        <span>Prinsipalt</span>
        <span>{fmt(prinsipaltGodkjent)} av {fmt(krevdDager)} dager godkjent</span>
      </div>
      <div class="position-bar" aria-hidden="true">
        <span class="position-approved" style:width="{prinsipaltPct}%"></span>
        <span class="position-gap" style:width="{100 - prinsipaltPct}%"></span>
      </div>
    </div>

    {#if hasSubsidiaryPosition && subsidiaertGodkjent !== prinsipaltGodkjent}
      <div class="position-row subsidiary-row">
        <div class="position-row-label">
          <span>Subsidiært</span>
          <span>{fmt(subsidiaertGodkjent)} av {fmt(krevdDager)} dager godkjent</span>
        </div>
        <div class="position-bar" aria-hidden="true">
          <span class="position-approved subsidiary" style:width="{subsidiaertPct}%"></span>
          <span class="position-gap" style:width="{100 - subsidiaertPct}%"></span>
        </div>
      </div>
    {/if}
  </section>
{/if}

{#if ui.draft}
  <button class="draft-card" onclick={onform}>
    <span class="draft-content">
      <span class="draft-heading">
        <Stamp variant="draft" small flat>Kladd</Stamp>
        <span>Internt — ikke synlig for motpart</span>
        {#if ui.draft.value}
          <strong class="font-mono draft-value">{fmt(ui.draft.value)} dager</strong>
        {/if}
      </span>
      <span class="draft-text">{ui.draft.text}</span>
    </span>
  </button>
{/if}

<style>
  .eyebrow {
    display: block;
    font-size: 10px;
    font-weight: 700;
    line-height: 1.35;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--ink-4);
  }
  h3 {
    margin: 4px 0 0;
    font-size: 14px;
    line-height: 1.4;
    color: var(--ink);
  }
  .claim-summary,
  .response-summary {
    display: grid;
    gap: 24px;
    padding: 18px 24px;
    background: var(--surface-warm);
  }
  .response-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .response-summary.with-subsidiary {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .response-summary strong {
    display: block;
    margin-top: 7px;
    font-size: 15px;
    color: var(--ink-2);
  }
  .approved-days {
    padding-left: 24px;
    border-left: var(--rule);
  }
  .primary-days strong {
    display: block;
    margin-top: 7px;
    font-size: 30px;
    line-height: 1.1;
    letter-spacing: 0.02em;
  }
  .notice-hero strong {
    display: block;
    margin-top: 7px;
    font-size: 20px;
    line-height: 1.3;
    color: var(--ink);
  }
  .notice-hero p {
    margin: 6px 0 0;
    font-size: 13px;
    line-height: 1.5;
    color: var(--ink-3);
  }
  .approved-days strong {
    font-size: 17px;
  }
  .notice-dates {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 24px;
    padding: 13px 24px;
    background: var(--surface-warm);
    border-top: var(--rule);
  }
  .notice-dates > div + div {
    padding-left: 20px;
    border-left: var(--rule);
  }
  .notice-dates strong {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: var(--ink-2);
  }
  .assessment-list {
    background: var(--surface-warm);
    border-top: var(--rule);
  }
  .assessment-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    padding: 11px 24px;
    border-bottom: var(--rule);
  }
  .assessment-row:last-child {
    border-bottom: 0;
  }
  .assessment-row > div {
    display: flex;
    align-items: baseline;
    gap: 9px;
  }
  .assessment-row strong {
    font-size: 12px;
    color: var(--ink-2);
  }
  .assessment-row .font-mono {
    font-size: 10px;
    color: var(--ink-4);
  }
  .assessment-value {
    padding: 3px 9px;
    white-space: nowrap;
    font-size: 10px;
    font-weight: 700;
    border: 1px solid;
    border-radius: 999px;
  }
  .assessment-value.positive {
    color: var(--green);
    background: var(--green-bg);
    border-color: var(--green-border);
  }
  .assessment-value.warning {
    color: var(--warning);
    background: var(--warning-bg);
    border-color: var(--warning-border);
  }
  .assessment-value.negative {
    color: var(--danger);
    background: var(--danger-bg);
    border-color: var(--danger-border);
  }
  .pending-card {
    display: flex;
    align-items: flex-start;
    gap: 13px;
    margin-bottom: 20px;
    padding: 18px 20px;
    background: var(--surface);
    border: var(--rule);
    border-radius: 12px;
  }
  .pending-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    flex: none;
    color: var(--ink-3);
    background: var(--surface-inset);
    border-radius: 999px;
  }
  .pending-card h3 {
    margin-top: 3px;
  }
  .pending-card p {
    margin: 4px 0 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--ink-3);
  }
  .position-card {
    margin-bottom: 20px;
    padding: 17px 20px;
    background: var(--surface-inset);
    border: var(--rule);
    border-radius: 12px;
  }
  .position-values {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px;
    margin-top: 13px;
  }
  .position-values.has-subsidiary {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .position-values > div + div {
    padding-left: 20px;
    border-left: var(--rule);
  }
  .position-values span {
    display: block;
    margin-bottom: 4px;
    font-size: 11px;
    color: var(--ink-3);
  }
  .position-values strong {
    font-size: 14px;
    color: var(--ink-2);
  }
  .position-row {
    margin-top: 15px;
  }
  .position-row + .position-row {
    padding-top: 13px;
    border-top: 1px dashed var(--green-border);
  }
  .position-row-label {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 6px;
    font-size: 10px;
    color: var(--ink-3);
  }
  .position-row-label span:first-child {
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .position-bar {
    display: flex;
    overflow: hidden;
    height: 9px;
    background: var(--green-bg);
    border-radius: 999px;
  }
  .position-approved {
    background: var(--green-border);
  }
  .position-approved.subsidiary {
    background: var(--green);
  }
  .position-gap {
    background: #d06b60;
  }
  .draft-card {
    display: flex;
    width: 100%;
    margin-bottom: 20px;
    padding: 15px 16px;
    text-align: left;
    font-family: var(--font-sans);
    color: var(--draft);
    background: var(--draft-bg);
    border: 1.5px dashed var(--draft-border);
    border-radius: 12px;
    cursor: pointer;
  }
  .draft-card:hover {
    border-color: var(--draft);
  }
  .draft-content {
    min-width: 0;
    width: 100%;
  }
  .draft-heading {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    font-weight: 600;
  }
  .draft-value {
    margin-left: auto;
    font-size: 13px;
  }
  .draft-text {
    display: block;
    margin-top: 9px;
    font-size: 13px;
    line-height: 1.55;
  }

  @media (max-width: 640px) {
    .claim-summary,
    .response-summary,
    .response-summary.with-subsidiary,
    .notice-dates,
    .position-values,
    .position-values.has-subsidiary {
      grid-template-columns: 1fr;
      gap: 15px;
    }
    .approved-days,
    .notice-dates > div + div,
    .position-values > div + div {
      padding-top: 14px;
      padding-left: 0;
      border-top: var(--rule);
      border-left: 0;
    }
    .assessment-row {
      align-items: flex-start;
      flex-direction: column;
      gap: 7px;
    }
  }
</style>
