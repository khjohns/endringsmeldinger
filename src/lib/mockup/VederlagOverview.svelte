<script lang="ts">
  import { Clock3, Coins } from 'lucide-svelte';
  import ExpandableReasoning from '$lib/components/patterns/ExpandableReasoning.svelte';
  import StatementCard from '$lib/components/patterns/StatementCard.svelte';
  import { getVederlagsmetodeShortLabel } from '$lib/constants/paymentMethods.js';
  import type { BelopVurdering, ResponsVederlagEventData } from '$lib/types/timeline.js';
  import { formatDateShortNorwegian } from '$lib/utils/dateFormatters.js';
  import { store } from './store.svelte.js';
  import { fmt, sporResultatLabel } from './utils.js';
  import Stamp from './Stamp.svelte';

  let { onform }: { onform: () => void } = $props();

  const vederlag = $derived(store.sak.vederlag);
  const ui = $derived(store.getUI('vederlag'));
  const totalKrevd = $derived(vederlag.krevd_belop ?? vederlag.netto_belop ?? 0);
  const prinsipaltGodkjent = $derived(vederlag.godkjent_belop ?? 0);
  const subsidiaertGodkjent = $derived(vederlag.subsidiaer_godkjent_belop ?? prinsipaltGodkjent);
  const hasBhResponse = $derived(Boolean(vederlag.bh_resultat));
  const hasSubsidiaryPosition = $derived(
    hasBhResponse &&
      (store.sak.er_subsidiaert_vederlag || vederlag.subsidiaer_godkjent_belop !== undefined)
  );
  const hasUsefulPositionOverview = $derived(
    hasBhResponse &&
      (prinsipaltGodkjent !== totalKrevd ||
        (hasSubsidiaryPosition && subsidiaertGodkjent !== prinsipaltGodkjent))
  );
  const godkjentAndel = $derived(
    totalKrevd > 0 ? Math.min(100, Math.max(0, (prinsipaltGodkjent / totalKrevd) * 100)) : 0
  );
  const metodeLabel = $derived(getVederlagsmetodeShortLabel(vederlag.metode));
  const hovedkravBelop = $derived(
    vederlag.metode === 'REGNINGSARBEID' ? vederlag.kostnads_overslag : vederlag.belop_direkte
  );
  const hovedkravLabel = $derived(
    vederlag.metode === 'REGNINGSARBEID'
      ? 'Kostnadsoverslag'
      : vederlag.metode === 'FASTPRIS_TILBUD'
        ? 'Fastpris'
        : 'Hovedkrav'
  );
  const kravlinjer = $derived.by(() => {
    const rows: Array<{ label: string; amount: number }> = [];
    if (hovedkravBelop !== undefined) rows.push({ label: hovedkravLabel, amount: hovedkravBelop });
    if (vederlag.saerskilt_krav?.rigg_drift?.belop) {
      rows.push({ label: 'Rigg og drift', amount: vederlag.saerskilt_krav.rigg_drift.belop });
    }
    if (vederlag.saerskilt_krav?.produktivitet?.belop) {
      rows.push({
        label: 'Produktivitetstap',
        amount: vederlag.saerskilt_krav.produktivitet.belop,
      });
    }
    if (vederlag.fradrag_belop) {
      rows.push({ label: 'Fradrag', amount: -vederlag.fradrag_belop });
    }
    return rows;
  });

  const vederlagEvents = $derived(store.timeline.filter((event) => event.spor === 'vederlag'));
  const teEvents = $derived(vederlagEvents.filter((event) => event.actorrole === 'TE'));
  const bhEvents = $derived(vederlagEvents.filter((event) => event.actorrole === 'BH'));
  type DetailedResponseData = Partial<ResponsVederlagEventData>;
  const latestBhResponseData = $derived.by(() => {
    const event = bhEvents.filter((item) => item.type.endsWith('.respons_vederlag')).at(-1);
    return event?.data as DetailedResponseData | undefined;
  });
  const hasDetailedBhResponse = $derived.by(() => {
    const data = latestBhResponseData;
    return Boolean(
      data &&
      (data.hovedkrav_vurdering !== undefined ||
        data.rigg_vurdering !== undefined ||
        data.produktivitet_vurdering !== undefined)
    );
  });
  const bhResponseRows = $derived.by(() => {
    const data = latestBhResponseData;
    if (!data || !hasDetailedBhResponse) return [];

    const assessedAmount = (
      vurdering: BelopVurdering | undefined,
      krevd: number,
      godkjent: number | undefined
    ) => {
      if (vurdering === 'godkjent') return krevd;
      if (vurdering === 'delvis') return godkjent ?? 0;
      return 0;
    };
    const definitions = [
      {
        key: 'hovedkrav',
        label: 'Hovedkrav',
        ref: '§ 34.1.1–34.1.2',
        claimed: hovedkravBelop ?? 0,
        assessment: data.hovedkrav_vurdering,
        approved: data.hovedkrav_godkjent_belop,
        precluded: data.hovedkrav_varslet_i_tide === false,
        visible: hovedkravBelop !== undefined,
      },
      {
        key: 'rigg',
        label: 'Rigg og drift',
        ref: '§ 34.1.3',
        claimed: vederlag.saerskilt_krav?.rigg_drift?.belop ?? 0,
        assessment: data.rigg_vurdering,
        approved: data.rigg_godkjent_belop,
        precluded: data.rigg_varslet_i_tide === false,
        visible: Boolean(vederlag.saerskilt_krav?.rigg_drift?.belop),
      },
      {
        key: 'produktivitet',
        label: 'Produktivitetstap',
        ref: '§ 34.1.3',
        claimed: vederlag.saerskilt_krav?.produktivitet?.belop ?? 0,
        assessment: data.produktivitet_vurdering,
        approved: data.produktivitet_godkjent_belop,
        precluded: data.produktivitet_varslet_i_tide === false,
        visible: Boolean(vederlag.saerskilt_krav?.produktivitet?.belop),
      },
    ];

    return definitions
      .filter((row) => row.visible)
      .map((row) => {
        const subsidiaert = assessedAmount(row.assessment, row.claimed, row.approved);
        return {
          ...row,
          prinsipalt: store.sak.er_subsidiaert_vederlag || row.precluded ? 0 : subsidiaert,
          subsidiaert,
        };
      });
  });
  const teVersionCount = $derived(Math.max(vederlag.antall_versjoner, teEvents.length, 1));
  const teRevision = $derived(teVersionCount - 1);
  const teDate = $derived(formatDateShortNorwegian(teEvents.at(-1)?.time));
  const bhDate = $derived(
    hasBhResponse ? formatDateShortNorwegian(bhEvents.at(-1)?.time ?? vederlag.siste_oppdatert) : ''
  );
  const bhAnsweredRevision = $derived(vederlag.bh_respondert_versjon);
  const attachmentPages = $derived(
    ui.att.reduce((sum, attachment) => sum + (attachment.p ?? 0), 0)
  );
  const bhResultLabel = $derived(
    vederlag.bh_resultat ? sporResultatLabel(vederlag.bh_resultat) : ''
  );
</script>

<StatementCard
  eyebrow="Totalentreprenørens krav"
  partyName={store.teNavn}
  reference="§ 34.1"
  submittedAt={teDate}
  revisionLabel={teRevision > 0 ? `Rev. ${teRevision}` : undefined}
>
  {#snippet icon()}<Coins size={14} />{/snippet}

  <div class="method-line">
    <span class="eyebrow">Beregningsmetode</span>
    <strong>{metodeLabel || 'Ikke angitt'}</strong>
  </div>

  <div class="claim-summary">
    <div class="primary-amount">
      <span class="eyebrow">Sum krevd</span>
      <strong class="font-mono">{fmt(totalKrevd)},-</strong>
    </div>
  </div>

  {#if kravlinjer.length > 1}
    <div class="amount-breakdown">
      {#each kravlinjer as row}
        <div class="amount-row">
          <span>{row.label}</span>
          <span class="font-mono">{fmt(row.amount)},-</span>
        </div>
      {/each}
    </div>
  {/if}

  <ExpandableReasoning
    label="Entreprenørens begrunnelse"
    html={vederlag.begrunnelse}
    attachmentCount={ui.att.length}
    {attachmentPages}
  />
</StatementCard>

{#if hasBhResponse}
  <StatementCard
    eyebrow="Byggherrens standpunkt"
    partyName={store.bhNavn}
    reference="§ 34.1"
    submittedAt={bhDate}
    submittedLabel="Svart"
    revisionLabel={bhAnsweredRevision === undefined
      ? undefined
      : bhAnsweredRevision === 0
        ? 'Svar på opprinnelig krav'
        : `Svar på rev. ${bhAnsweredRevision}`}
  >
    {#snippet icon()}<Coins size={14} />{/snippet}

    <div
      class="response-summary"
      class:with-subsidiary={hasSubsidiaryPosition && !hasDetailedBhResponse}
      class:detailed={hasDetailedBhResponse}
    >
      <div>
        <span class="eyebrow">Resultat</span>
        <strong>{bhResultLabel}</strong>
      </div>
      {#if !hasDetailedBhResponse}
        <div class="approved-amount">
          <span class="eyebrow">Prinsipalt godkjent</span>
          <strong class="font-mono">{fmt(prinsipaltGodkjent)},-</strong>
        </div>
        {#if hasSubsidiaryPosition}
          <div class="approved-amount">
            <span class="eyebrow">Subsidiært godkjent</span>
            <strong class="font-mono">{fmt(subsidiaertGodkjent)},-</strong>
          </div>
        {/if}
      {/if}
    </div>

    {#if hasDetailedBhResponse}
      <div class="response-lines-scroll">
        <table class="response-lines">
          <thead>
            <tr>
              <th>Krav</th>
              <th class="numeric">Krevd</th>
              <th class="numeric">Prinsipalt godkjent</th>
              {#if hasSubsidiaryPosition}<th class="numeric">Subsidiært godkjent</th>{/if}
            </tr>
          </thead>
          <tbody>
            {#each bhResponseRows as row}
              <tr>
                <td>
                  <span class="response-line-title">
                    {row.label}
                    {#if row.precluded}<span class="precluded-chip">Prekludert</span>{/if}
                  </span>
                  <span class="response-line-ref font-mono">{row.ref}</span>
                </td>
                <td class="numeric font-mono">{fmt(row.claimed)},-</td>
                <td class="numeric font-mono">{fmt(row.prinsipalt)},-</td>
                {#if hasSubsidiaryPosition}
                  <td class="numeric font-mono">{fmt(row.subsidiaert)},-</td>
                {/if}
              </tr>
            {/each}
          </tbody>
          <tfoot>
            <tr>
              <th>Totalt</th>
              <th class="numeric font-mono">{fmt(totalKrevd)},-</th>
              <th class="numeric font-mono">{fmt(prinsipaltGodkjent)},-</th>
              {#if hasSubsidiaryPosition}
                <th class="numeric font-mono">{fmt(subsidiaertGodkjent)},-</th>
              {/if}
            </tr>
          </tfoot>
        </table>
      </div>
    {/if}

    {#if vederlag.bh_begrunnelse}
      <ExpandableReasoning label="Byggherrens begrunnelse" html={vederlag.bh_begrunnelse} />
    {/if}
  </StatementCard>
{:else}
  <section class="pending-card">
    <span class="pending-icon"><Clock3 size={16} /></span>
    <div>
      <span class="eyebrow">Byggherrens standpunkt</span>
      <h3>Avventer svar fra {store.bhNavn}</h3>
      <p>Det er ikke registrert noen beløpsvurdering eller begrunnelse fra byggherren.</p>
    </div>
  </section>
{/if}

{#if hasUsefulPositionOverview}
  <section class="position-card">
    <span class="eyebrow">Posisjonsoversikt</span>
    <div class="position-values" class:has-subsidiary={hasSubsidiaryPosition}>
      <div>
        <span>Krevd</span>
        <strong class="font-mono">{fmt(totalKrevd)},-</strong>
      </div>
      <div>
        <span>Prinsipalt godkjent</span>
        <strong class="font-mono">{fmt(prinsipaltGodkjent)},-</strong>
      </div>
      {#if hasSubsidiaryPosition}
        <div>
          <span>Subsidiært godkjent</span>
          <strong class="font-mono">{fmt(subsidiaertGodkjent)},-</strong>
        </div>
      {/if}
    </div>
    <div class="position-bar" aria-hidden="true">
      <span class="position-approved" style:width="{godkjentAndel}%"></span>
      <span class="position-gap" style:width="{100 - godkjentAndel}%"></span>
    </div>
    <div class="position-caption">
      <span>{Math.round(godkjentAndel)} % prinsipalt godkjent</span>
      <strong class="font-mono">Gap: {fmt(totalKrevd - prinsipaltGodkjent)},-</strong>
    </div>
  </section>
{/if}

{#if ui.draft}
  <button class="draft-card" onclick={onform}>
    <span class="draft-content">
      <span class="draft-heading">
        <Stamp variant="draft" small flat>Kladd</Stamp>
        <span>Internt — ikke synlig for motpart</span>
        {#if ui.draft.value}
          <strong class="font-mono draft-value">{fmt(ui.draft.value)},-</strong>
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
  .method-line {
    display: flex;
    align-items: baseline;
    gap: 12px;
    padding: 12px 24px;
    background: var(--surface-warm);
    border-bottom: var(--rule);
  }
  .method-line strong {
    font-size: 13px;
    color: var(--ink-2);
  }
  .claim-summary {
    padding: 18px 24px;
    background: var(--surface-warm);
  }
  .response-summary {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px;
    padding: 20px 24px;
    background: var(--surface-warm);
  }
  .response-summary.with-subsidiary {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .response-summary.detailed {
    display: block;
    padding-top: 14px;
    padding-bottom: 14px;
  }
  .primary-amount strong {
    display: block;
    margin-top: 7px;
    font-size: 30px;
    line-height: 1.1;
    letter-spacing: 0.02em;
  }
  .approved-amount {
    padding-left: 24px;
    border-left: var(--rule);
  }
  .response-summary strong {
    display: block;
    margin-top: 7px;
    font-size: 15px;
    color: var(--ink-2);
  }
  .response-summary .font-mono {
    font-size: 17px;
  }
  .amount-breakdown {
    padding: 14px 24px;
    border-top: var(--rule);
    background: var(--surface-warm);
  }
  .amount-row {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    padding: 5px 0;
    font-size: 12px;
    color: var(--ink-2);
  }
  .response-lines-scroll {
    overflow-x: auto;
    border-top: var(--rule);
    background: var(--surface-warm);
  }
  .response-lines {
    width: 100%;
    min-width: 650px;
    border-collapse: collapse;
    color: var(--ink-2);
  }
  .response-lines th,
  .response-lines td {
    padding: 12px 24px;
    text-align: left;
    border-bottom: var(--rule);
  }
  .response-lines thead th {
    padding-top: 10px;
    padding-bottom: 10px;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--ink-4);
  }
  .response-lines tbody td {
    font-size: 12px;
  }
  .response-lines .numeric {
    text-align: right;
    white-space: nowrap;
  }
  .response-line-title {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 7px;
    font-weight: 600;
    color: var(--ink-2);
  }
  .response-line-ref {
    display: block;
    margin-top: 2px;
    font-size: 10px;
    color: var(--ink-4);
  }
  .precluded-chip {
    display: inline-flex;
    padding: 1px 7px;
    font-size: 9px;
    font-weight: 700;
    color: var(--danger);
    background: var(--danger-bg);
    border: 1px solid var(--danger-border);
    border-radius: 999px;
  }
  .response-lines tfoot th {
    padding-top: 12px;
    padding-bottom: 12px;
    font-size: 12px;
    color: var(--ink);
    border-bottom: 0;
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
  .position-bar {
    display: flex;
    overflow: hidden;
    height: 9px;
    margin-top: 15px;
    background: var(--green-bg);
    border-radius: 999px;
  }
  .position-approved {
    background: var(--green-border);
  }
  .position-gap {
    background: #d06b60;
  }
  .position-caption {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    margin-top: 7px;
    font-size: 11px;
    color: var(--ink-3);
  }
  .position-caption strong {
    color: var(--danger);
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
    .position-values,
    .position-values.has-subsidiary {
      grid-template-columns: 1fr;
      gap: 15px;
    }
    .approved-amount,
    .position-values > div + div {
      padding-top: 14px;
      padding-left: 0;
      border-top: var(--rule);
      border-left: 0;
    }
    .claim-summary,
    .response-summary,
    .method-line,
    .amount-breakdown {
      padding-right: 18px;
      padding-left: 18px;
    }
    .position-caption,
    .draft-heading {
      align-items: flex-start;
      flex-direction: column;
    }
    .draft-value {
      margin-left: 0;
    }
  }
</style>
