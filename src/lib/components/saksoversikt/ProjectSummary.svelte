<script lang="ts">
  import type { ContractSettings } from '$lib/types/project';
  let {
    name,
    description,
    entreprise,
    contract,
    imageUrl,
    imageAlt = '',
    compact = false,
    headingId = 'project-summary-title',
  }: {
    name: string;
    description?: string | null;
    entreprise: string;
    contract?: Partial<ContractSettings>;
    imageUrl?: string;
    imageAlt?: string;
    compact?: boolean;
    headingId?: string;
  } = $props();
  let failedImage = $state<string | null>(null);
  const deadline = $derived.by(() => {
    if (!contract?.kontraktsfrist) return 'Ikke oppgitt';
    const date = new Date(`${contract.kontraktsfrist.slice(0, 10)}T12:00:00`);
    return Number.isNaN(date.getTime())
      ? 'Ikke oppgitt'
      : date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' });
  });
</script>

<aside class="project-summary" class:compact aria-labelledby={headingId}>
  <h2 id={headingId}>Prosjektet i korte trekk</h2>
  <p class="description">{compact ? name : description || name}</p>
  <figure class="project-visual">
    {#if imageUrl && failedImage !== imageUrl}
      <img src={imageUrl} alt={imageAlt || name} onerror={() => (failedImage = imageUrl ?? null)} />
    {:else}
      <!-- Dekorativ arkitekturskisse; erstattes av prosjektfoto når dette er registrert. -->
      <svg viewBox="0 0 280 160" fill="none" aria-hidden="true">
        <path d="m25 119 109-36 126 35-105 32Z" fill="currentColor" opacity=".09" />
        <path d="m58 63 84-29 80 29-84 32Z" fill="currentColor" opacity=".08" />
        <path
          d="M58 63v54l80 24 84-26V63l-80-29-84 29 80 32 84-32M138 95v46M142 34v28"
          stroke="currentColor"
          stroke-width="1.3"
          stroke-linejoin="round"
        />
        <path
          d="m69 77 58 22m-58-9 58 21m-58-9 58 21m-41-48v48m19-40v46m45-28 59-23m-59 35 59-22m-59 34 59-22m-44-15v45m22-53v46M29 123V98m-7 13 7-15 8 15m209 10V98m-7 13 7-15 8 15M20 126h37m163 0h40"
          stroke="currentColor"
          stroke-width="1.2"
          stroke-linecap="round"
        />
        <path d="m35 78 15-5m183-34 13 5m-8 7 17 5" stroke="currentColor" opacity=".45" />
      </svg>
      <figcaption>Illustrasjon</figcaption>
    {/if}
  </figure>
  <dl>
    <div>
      <dt>Kontraktsform</dt>
      <dd>{entreprise}</dd>
    </div>
    <div>
      <dt>Byggherre</dt>
      <dd>{contract?.byggherre_navn || 'Ikke oppgitt'}</dd>
    </div>
    <div>
      <dt>Entreprenør</dt>
      <dd>{contract?.totalentreprenor_navn || 'Ikke oppgitt'}</dd>
    </div>
    <div>
      <dt>Kontraktssum</dt>
      <dd>
        {contract?.kontraktssum != null
          ? `${contract.kontraktssum.toLocaleString('nb-NO')} kr`
          : 'Ikke oppgitt'}
      </dd>
    </div>
    <div>
      <dt>Kontraktsfrist</dt>
      <dd>{deadline}</dd>
    </div>
  </dl>
</aside>

<style>
  .project-summary {
    padding: 22px;
    border: 1px solid var(--color-wire);
    border-radius: 12px;
    background: var(--color-felt);
    align-self: start;
    min-width: 0;
  }
  h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 650;
    line-height: 1.4;
    letter-spacing: -0.02em;
  }
  .description {
    margin: 8px 0 20px;
    color: var(--color-ink-muted);
    font-size: 12px;
    line-height: 1.6;
  }
  .project-visual {
    margin: 0 0 22px;
    position: relative;
    overflow: hidden;
    border-radius: 8px;
    background: var(--color-vekt-bg);
    color: #8b9e7b;
  }
  svg,
  img {
    display: block;
    width: 100%;
    height: clamp(140px, 12vw, 200px);
    object-fit: cover;
  }
  figcaption {
    position: absolute;
    right: 9px;
    bottom: 6px;
    font-size: 9px;
    color: var(--color-ink-muted);
  }
  dl {
    margin: 0;
    display: grid;
    gap: 16px;
  }
  dl > div {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr);
    gap: 12px;
    font-size: 12px;
    line-height: 1.5;
  }
  dt {
    color: var(--color-ink-muted);
  }
  dd {
    margin: 0;
    text-align: right;
    font-weight: 550;
    overflow-wrap: anywhere;
  }
  .compact {
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    --color-ink-muted: #afc0b5;
    --color-vekt-bg: #2c3d32;
    color: #e8efe9;
  }
  .compact h2 {
    font-size: 13px;
    letter-spacing: 0;
  }
  .compact .description {
    margin: 6px 0 14px;
    font-size: 11px;
  }
  .compact .project-visual {
    margin-bottom: 18px;
    color: #b3c59e;
  }
  .compact svg,
  .compact img {
    height: 116px;
  }
  .compact dl {
    gap: 12px;
  }
  .compact dl > div {
    grid-template-columns: 1fr;
    gap: 2px;
    font-size: 12px;
  }
  .compact dt {
    font-size: 11px;
  }
  .compact dd {
    text-align: left;
    font-weight: 500;
  }
  @media (min-width: 700px) and (max-width: 1400px) {
    .project-summary:not(.compact) {
      display: grid;
      grid-template-columns: 240px minmax(0, 1fr);
      column-gap: 28px;
    }
    .project-summary:not(.compact) h2,
    .project-summary:not(.compact) .description {
      grid-column: 1 / -1;
    }
    .project-summary:not(.compact) .project-visual {
      margin-bottom: 0;
      align-self: center;
    }
    .project-summary:not(.compact) dl {
      align-self: center;
    }
  }
</style>
