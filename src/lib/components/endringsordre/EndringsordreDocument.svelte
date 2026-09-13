<script lang="ts">
  import { resolve } from '$app/paths';
  import type { EndringsordreData } from '$lib/types/timeline';
  import { eoAmount, settlementLabels } from '$lib/domain/endringsordre';
  import { formatCurrency, formatDateShort } from '$lib/utils/formatters';

  let {
    data,
    projectName,
    projectId,
    sources = [],
    preview = false,
    caseHref,
  }: {
    data: EndringsordreData;
    projectName: string;
    projectId: string;
    sources?: { id: string; title: string; amount?: number; days?: number | null }[];
    preview?: boolean;
    caseHref?: (sakId: string) => `/${string}`;
  } = $props();
  const amount = $derived(eoAmount(data));
  const statusLabels = {
    utkast: 'Utkast',
    utstedt: 'Utstedt',
    akseptert: 'Akseptert',
    bestridt: 'Bestridt',
    revidert: 'Revidert',
  };
  const otherConsequences = $derived(
    [
      data.konsekvenser.sha && 'SHA',
      data.konsekvenser.kvalitet && 'Kvalitet',
      data.konsekvenser.annet && 'Annet',
    ].filter(Boolean)
  );
</script>

<article
  class="eo-document"
  aria-label={preview ? 'Forhåndsvisning av endringsordre' : 'Utstedt endringsordre'}
>
  <header>
    <div>
      <p class="eyebrow">{projectName}</p>
      <h1>Endringsordre</h1>
    </div>
    <div class="document-reference">
      <strong>{data.eo_nummer}</strong><span
        >{preview ? 'Til kontroll' : statusLabels[data.status]}</span
      >
    </div>
  </header>
  <dl class="document-meta">
    <div>
      <dt>Grunnlag</dt>
      <dd>{data.relaterte_koe_saker.length ? 'Avtalte KOE-krav' : 'Pålegg om endring'}</dd>
    </div>
    <div>
      <dt>Utstedt av</dt>
      <dd>{data.utstedt_av || 'Byggherren'}</dd>
    </div>
    <div>
      <dt>Dato</dt>
      <dd>{data.dato_utstedt ? formatDateShort(data.dato_utstedt) : 'Settes ved utstedelse'}</dd>
    </div>
    <div>
      <dt>Revisjon</dt>
      <dd>{data.revisjon_nummer}</dd>
    </div>
  </dl>
  <section>
    <h2>
      {data.relaterte_koe_saker.length ? 'Avtalen som formaliseres' : 'Endringen som pålegges'}
    </h2>
    <p class="prose">{data.beskrivelse}</p>
  </section>
  {#if data.relaterte_koe_saker.length}
    <section>
      <h2>KOE-krav som inngår <span class="count">{data.relaterte_koe_saker.length}</span></h2>
      <p class="muted">
        Endringsordren formaliserer enigheten i disse sakene. Saksgrunnlag og historikk er bevart i
        hver KOE-sak.
      </p>
      <ul class="source-list">
        {#each data.relaterte_koe_saker as id (id)}
          {@const source = sources.find((s) => s.id === id)}
          <li>
            <a
              href={resolve(
                caseHref
                  ? caseHref(id)
                  : `/${encodeURIComponent(projectId)}/${encodeURIComponent(id)}`
              )}><span class="mono">{id}</span><span>{source?.title ?? 'Åpne KOE-sak'}</span></a
            >
          </li>
        {/each}
      </ul>
    </section>
  {/if}
  <section>
    <h2>Vederlag og frist</h2>
    <div class="document-totals">
      <div>
        <span>Netto vederlagsjustering</span><strong
          >{amount === null ? 'Uavklart' : formatCurrency(amount)}</strong
        ><small
          >{data.er_estimat
            ? 'Estimat'
            : amount === null
              ? 'Beløp er ikke fastsatt'
              : data.oppgjorsform
                ? settlementLabels[data.oppgjorsform]
                : amount === 0
                  ? 'Ingen vederlagsjustering'
                  : 'Oppgjørsform ikke oppgitt'}</small
        >
      </div>
      <div>
        <span>Fristforlengelse</span><strong
          >{data.frist_dager != null
            ? `${data.frist_dager} dager`
            : data.konsekvenser.fremdrift
              ? 'Uavklart'
              : '0 dager'}</strong
        ><small
          >{data.ny_sluttdato
            ? `Ny sluttdato: ${formatDateShort(data.ny_sluttdato)}`
            : data.konsekvenser.fremdrift && data.frist_dager == null
              ? 'Frist er ikke fastsatt'
              : 'Samlet for endringsordren'}</small
        >
      </div>
    </div>
    {#if amount !== null && data.konsekvenser.pris}<p class="muted">
        Tillegg {formatCurrency(data.kompensasjon_belop ?? 0)} · Fradrag {formatCurrency(
          data.fradrag_belop ?? 0
        )} · Alle beløp ekskl. mva.
      </p>{/if}
  </section>
  {#if otherConsequences.length || data.konsekvens_beskrivelse}
    <section>
      <h2>Konsekvenser og forutsetninger</h2>
      {#if otherConsequences.length}<p class="muted">
          Berørte områder: {otherConsequences.join(', ')}
        </p>{/if}{#if data.konsekvens_beskrivelse}<p class="prose">
          {data.konsekvens_beskrivelse}
        </p>{/if}
    </section>
  {/if}
  {#if data.te_kommentar}<section>
      <h2>Entreprenørens merknad</h2>
      <p class="prose">{data.te_kommentar}</p>
    </section>{/if}
  <footer>
    {preview
      ? 'Kontroller innholdet før endringsordren utstedes.'
      : `${data.eo_nummer} · ${projectName}`}
  </footer>
</article>

<style>
  .eo-document {
    background: var(--surface);
    border: var(--rule);
    border-radius: 12px;
    padding: 40px;
    color: var(--ink);
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
    padding-bottom: 28px;
    border-bottom: 2px solid var(--brand);
  }
  .eyebrow,
  dt {
    font-size: 11px;
    color: var(--ink-3);
    text-transform: uppercase;
    letter-spacing: 0.07em;
  }
  h1 {
    font-size: 30px;
    font-weight: 650;
    margin-top: 8px;
    letter-spacing: -0.8px;
  }
  .document-reference {
    display: grid;
    text-align: right;
    gap: 8px;
  }
  .document-reference strong,
  .mono {
    font-family: var(--font-mono);
    font-size: 12px;
    overflow-wrap: anywhere;
  }
  .document-reference span {
    color: var(--brand);
    font-size: 12px;
  }
  .document-meta {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    padding: 24px 0;
    border-bottom: var(--rule);
  }
  dd {
    font-size: 13px;
    margin-top: 6px;
  }
  section {
    padding-top: 28px;
  }
  h2 {
    font-size: 15px;
    font-weight: 650;
    margin-bottom: 12px;
  }
  .prose {
    font-family: var(--font-legal);
    font-size: 15px;
    line-height: 1.75;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .muted {
    color: var(--ink-3);
    font-size: 12px;
    line-height: 1.65;
    margin: 12px 0;
  }
  .count {
    color: var(--ink-3);
    font-weight: 400;
    padding-left: 8px;
  }
  .source-list {
    list-style: none;
    padding: 0;
  }
  .source-list li {
    border-bottom: var(--rule-subtle);
  }
  .source-list a {
    display: grid;
    grid-template-columns: minmax(100px, 1fr) 2fr;
    gap: 16px;
    padding: 12px 0;
    color: var(--brand);
    font-size: 13px;
  }
  .source-list a:hover {
    text-decoration: underline;
  }
  .document-totals {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    background: var(--surface-inset);
    border: var(--rule);
    border-radius: 6px;
  }
  .document-totals > div {
    display: grid;
    gap: 10px;
    padding: 20px;
  }
  .document-totals > div + div {
    border-left: var(--rule);
  }
  .document-totals span,
  small {
    font-size: 12px;
    color: var(--ink-3);
  }
  .document-totals strong {
    font-family: var(--font-mono);
    font-size: 21px;
    font-weight: 500;
    overflow-wrap: anywhere;
  }
  footer {
    margin-top: 36px;
    padding-top: 16px;
    border-top: var(--rule);
    color: var(--ink-3);
    font-size: 11px;
  }
  @media (max-width: 640px) {
    .eo-document {
      padding: 22px;
    }
    h1 {
      font-size: 25px;
    }
    .document-totals {
      grid-template-columns: 1fr;
    }
    .document-totals > div + div {
      border-left: 0;
      border-top: var(--rule);
    }
    .source-list a {
      grid-template-columns: 1fr;
      gap: 6px;
    }
  }
  @media print {
    .eo-document {
      border: 0;
      padding: 0;
      color: #000;
    }
    a {
      color: #000 !important;
      text-decoration: none;
    }
    section {
      break-inside: avoid;
    }
  }
</style>
