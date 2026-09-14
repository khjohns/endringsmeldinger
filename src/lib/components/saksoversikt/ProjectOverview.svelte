<script lang="ts">
  import AppTopbar from '$lib/components/navigation/AppTopbar.svelte';
  import { readPreferredRole, savePreferredRole } from '$lib/utils/rolePreference';
  import type { Role } from '$lib/components/kontraktsbord/types';
  import {
    History,
    FolderOpen,
    Search,
    Plus,
    Coins,
    Check,
    Clock3,
    ArrowRight,
    X,
  } from 'lucide-svelte';
  import CaseListTable from '$lib/components/case-list/CaseListTable.svelte';
  import WorkQueue from './WorkQueue.svelte';
  import { activityHref as caseLink } from './activity';
  import ProjectActivity from './ProjectActivity.svelte';
  import ProjectSummary from './ProjectSummary.svelte';
  import type { ContractSettings } from '$lib/types/project';
  import {
    filterCases,
    overviewStats,
    isTimeClaim,
    type CaseFilter,
    type CaseTypeFilter,
  } from './overview';
  import type { CaseListItem } from '$lib/types/api';
  import osloLogo from '../../../../public/logos/Oslo-logo-hvit-RGB.png?inline';

  let {
    cases,
    prosjektId,
    prosjektNavn,
    entreprise = 'Totalentreprise NS 8407',
    loading = false,
    error = null,
    demo = false,
    contract,
    projectDescription,
    projectImageUrl,
    projectImageAlt,
    demoScenarios = {},
    activePage = 'overview',
  }: {
    cases: CaseListItem[];
    prosjektId: string;
    prosjektNavn: string;
    entreprise?: string;
    loading?: boolean;
    error?: string | null;
    demo?: boolean;
    contract?: Partial<ContractSettings>;
    projectDescription?: string | null;
    projectImageUrl?: string;
    projectImageAlt?: string;
    demoScenarios?: Record<string, string>;
    activePage?: 'overview' | 'activity';
  } = $props();

  const overviewHref = $derived(demo ? '/mockup/oversikt' : `/${encodeURIComponent(prosjektId)}`);
  const activityHref = $derived(`${overviewHref}/aktivitet`);

  let role = $state<Role>(readPreferredRole());
  function changeRole(next: Role) {
    role = next;
    savePreferredRole(next);
  }

  let query = $state('');
  let filter = $state<CaseFilter>('all');
  let caseType = $state<CaseTypeFilter>('all');
  let timeClaimsOnly = $state(false);
  let registerElement: HTMLElement | undefined = $state();
  function showTimeClaims() {
    timeClaimsOnly = true;
    filter = 'all';
    caseType = 'standard';
    query = '';
    registerElement?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  const filtered = $derived(
    filterCases(cases, query, filter, caseType).filter(
      (item) => !timeClaimsOnly || isTimeClaim(item)
    )
  );
  const stats = $derived(overviewStats(cases));
  const filters: { id: CaseFilter; label: string }[] = [
    { id: 'all', label: 'Alle saker' },
    { id: 'active', label: 'Aktive' },
    { id: 'closed', label: 'Avklarte og lukkede' },
    { id: 'draft', label: 'Kladder' },
  ];
  const fmt = (value: number) => value.toLocaleString('nb-NO');
</script>

<div class="project-overview">
  <aside class="project-rail" aria-label="Prosjektmeny">
    <div class="sender">
      <div class="oslo-logo" style:background-image={`url(${osloLogo})`} aria-hidden="true"></div>
      <div><strong>Oslo kommune</strong><span>Oslobygg KF</span></div>
    </div>
    <nav class="rail-nav" aria-label="Arbeidsområde">
      <span class="eyebrow">Arbeidsområde</span>
      <a href={overviewHref} aria-current={activePage === 'overview' ? 'page' : undefined}
        ><FolderOpen size={18} /> Krav og endringer
        <span class="count">{loading || error ? '—' : stats.total}</span></a
      >
      <a href={activityHref} aria-current={activePage === 'activity' ? 'page' : undefined}
        ><History size={18} /> Aktivitetslogg</a
      >
    </nav>
    <div class="rail-summary">
      <ProjectSummary
        name={prosjektNavn}
        description={projectDescription}
        {entreprise}
        {contract}
        imageUrl={projectImageUrl}
        imageAlt={projectImageAlt}
        compact
      />
      <p class="project-number">Prosjekt {prosjektId}</p>
      <a href="/" class="switch-project">Bytt prosjekt <ArrowRight size={14} /></a>
    </div>
  </aside>

  <div class="main-column">
    <AppTopbar projectName={prosjektNavn} {role} onrolechange={changeRole} />
    <div class="workspace">
      <nav class="mobile-project-nav" aria-label="Prosjektsider">
        <a href={overviewHref} aria-current={activePage === 'overview' ? 'page' : undefined}
          >Krav og endringer</a
        >
        <a href={activityHref} aria-current={activePage === 'activity' ? 'page' : undefined}
          >Aktivitetslogg</a
        >
      </nav>
      <header class="page-heading">
        <div>
          <p class="eyebrow">{prosjektNavn} · {entreprise}</p>
          <h1>{activePage === 'activity' ? 'Aktivitetslogg' : 'Krav og endringer'}</h1>
          <p class="subtitle">
            {activePage === 'activity'
              ? 'Hendelser på grunnlag, vederlag og frist – på tvers av sakene.'
              : 'Oversikt over sakene, kravene og det som er avklart.'}
          </p>
        </div>
        {#if demo && activePage === 'overview'}
          <div class="heading-actions">
            <a class="primary" class:secondary-action={role === 'BH'} href="/mockup"
              >Åpne eksempelsak</a
            >
            {#if role === 'BH'}<a class="primary" href="/mockup/endringsordre/ny"
                ><Plus size={17} />Ny endringsordre</a
              >{/if}
          </div>
        {:else if role === 'TE' && activePage === 'overview'}
          <a class="primary" href={`/${encodeURIComponent(prosjektId)}/ny`}
            ><Plus size={17} /> Ny sak</a
          >
        {:else if role === 'BH' && activePage === 'overview'}
          <a class="primary" href={`/${encodeURIComponent(prosjektId)}/endringsordre/ny`}
            ><Plus size={17} /> Ny endringsordre</a
          >
        {/if}
      </header>
      <details class="mobile-project-info">
        <summary>Prosjektinformasjon</summary>
        <ProjectSummary
          name={prosjektNavn}
          description={projectDescription}
          {entreprise}
          {contract}
          imageUrl={projectImageUrl}
          imageAlt={projectImageAlt}
          headingId="mobile-project-summary-title"
        />
        <a href="/">Bytt prosjekt <ArrowRight size={14} /></a>
      </details>
      {#if demo}<p class="demo-note">Forhåndsvisning med eksempelsaker.</p>{/if}
      {#if loading}
        <div class="state-message" role="status">Laster saker …</div>
      {:else if error}
        <div class="state-message" role="alert">Kunne ikke laste saker. {error}</div>
      {:else if activePage === 'activity'}
        <ProjectActivity {cases} {role} projectId={prosjektId} scenarios={demoScenarios} />
      {:else}
        <div class="stats" aria-label="Nøkkeltall for hele prosjektet">
          <section class="stat">
            <div class="stat-label">Saker i prosjektet <FolderOpen size={17} /></div>
            <strong class="stat-value">{stats.total}</strong>
            <p>{stats.active} aktive · {stats.drafts} kladder</p>
            <p>{stats.claims} KOE · {stats.orders} endringsordrer</p>
          </section>
          <button
            type="button"
            class="stat time-stat"
            class:accent={timeClaimsOnly}
            aria-pressed={timeClaimsOnly}
            aria-controls="case-register"
            onclick={showTimeClaims}
          >
            <span class="stat-label">Fristkrav <Clock3 size={17} /></span>
            <strong class="stat-value"
              >{stats.timeClaims}<small>{stats.timeClaims === 1 ? 'sak' : 'saker'}</small></strong
            >
            <span class="stat-foot"
              >{stats.unassessedTimeClaims} ikke vurdert · spesifiserte krav</span
            >
            <span class="stat-action">Vis fristkrav <ArrowRight size={13} /></span>
          </button>
          <section class="stat">
            <div class="stat-label">Fremsatt vederlag · KOE <Coins size={17} /></div>
            <strong class="stat-value amount"
              >{stats.claimed === null ? '—' : fmt(stats.claimed)}{#if stats.claimed !== null}<small
                  >kr</small
                >{/if}</strong
            >
            <p>Registrerte KOE-krav · kladder og trukne saker utelatt</p>
          </section>
          <section class="stat">
            <div class="stat-label">Prinsipalt godkjent · KOE <Check size={17} /></div>
            <strong class="stat-value amount"
              >{stats.approved === null
                ? '—'
                : fmt(stats.approved)}{#if stats.approved !== null}<small>kr</small>{/if}</strong
            >
            <p>
              {stats.assessed
                ? `Vurdert beløp registrert i ${stats.assessed} saker`
                : 'Ingen beløpsvurderinger registrert'}
            </p>
          </section>
        </div>

        <WorkQueue {cases} {role} projectId={prosjektId} scenarios={demoScenarios} {demo} />
        <div class="overview-content">
          <section
            class="register"
            id="case-register"
            bind:this={registerElement}
            aria-labelledby="register-heading"
          >
            <div class="register-header">
              <div>
                <p class="eyebrow">Felles saksoversikt</p>
                <h2 id="register-heading">Saker i prosjektet</h2>
              </div>
            </div>
            <div class="filters" role="group" aria-label="Saksutvalg">
              {#each filters as option}<button
                  class:active={filter === option.id}
                  aria-pressed={filter === option.id}
                  onclick={() => (filter = option.id)}
                  >{option.label}<span
                    >{filterCases(
                      timeClaimsOnly ? cases.filter(isTimeClaim) : cases,
                      '',
                      option.id,
                      caseType
                    ).length}</span
                  ></button
                >{/each}
            </div>
            <div class="toolbar">
              <label class="search"
                ><Search size={17} /><input
                  type="search"
                  bind:value={query}
                  aria-label="Søk i saker"
                  placeholder="Søk etter saksnummer eller tittel"
                /></label
              >
              <label class="type-filter"
                >Sakstype
                <select bind:value={caseType} onchange={() => (timeClaimsOnly = false)}>
                  <option value="all">Alle typer</option>
                  <option value="standard">KOE-krav</option>
                  <option value="endringsordre">Endringsordrer</option>
                  {#if cases.some((item) => item.sakstype === 'forsering')}
                    <option value="forsering">Forsering</option>
                  {/if}
                </select>
              </label>
              <span class="result-count" role="status"
                >{filtered.length} av {cases.length} saker</span
              >
            </div>
            {#if timeClaimsOnly}
              <div class="active-filter">
                <span>Viser spesifiserte fristkrav</span><button
                  type="button"
                  onclick={() => {
                    timeClaimsOnly = false;
                    caseType = 'all';
                  }}
                  aria-label="Fjern fristfilter"><X size={13} />Fjern filter</button
                >
              </div>
            {/if}
            {#if !cases.length}<div class="state-message">
                Ingen saker ennå. {role === 'BH'
                  ? 'Opprett den første endringsordren med «Ny endringsordre».'
                  : 'Opprett det første KOE-kravet med «Ny sak».'}
              </div>
            {:else if !filtered.length}<div class="state-message">
                Ingen saker passer søket og utvalget.<button
                  class="reset"
                  onclick={() => {
                    query = '';
                    filter = 'all';
                    caseType = 'all';
                    timeClaimsOnly = false;
                  }}>Vis alle saker</button
                >
              </div>
            {:else}<div class="table-area">
                <CaseListTable
                  cases={filtered}
                  {prosjektId}
                  caseHref={(item) =>
                    item.sakstype === 'endringsordre'
                      ? `${demo ? '/mockup/endringsordre' : `/${encodeURIComponent(prosjektId)}`}/${encodeURIComponent(item.sak_id)}?rolle=${role}`
                      : caseLink(
                          { caseId: item.sak_id, type: 'K' },
                          prosjektId,
                          role,
                          demoScenarios[item.sak_id]
                        )}
                />
              </div>{/if}
          </section>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .heading-actions {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }
  .primary.secondary-action {
    background: var(--color-felt);
    color: var(--color-ink-secondary);
    border-color: var(--color-wire);
  }
  .project-overview {
    display: flex;
    height: 100%;
    min-height: 0;
    background: var(--color-canvas);
    color: var(--color-ink);
    font-family: var(--font-ui);
  }
  .project-rail {
    width: 280px;
    overflow-y: auto;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    padding: 24px 20px 20px;
    background: var(--sidebar-bg);
    color: var(--sidebar-text);
  }
  .sender {
    display: flex;
    align-items: center;
    gap: 11px;
  }
  .sender strong {
    display: block;
    font-size: 15px;
  }
  .sender span {
    display: block;
    margin-top: 3px;
    color: var(--sidebar-muted);
    font-size: 12px;
  }
  .oslo-logo {
    width: 36px;
    height: 43px;
    flex: 0 0 36px;
    background-position: -22px -22px;
    background-size: 128px auto;
    background-repeat: no-repeat;
  }
  .rail-nav {
    margin-top: 40px;
  }
  .rail-nav .eyebrow {
    color: var(--sidebar-muted);
  }
  .rail-nav a {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 14px;
    padding: 12px;
    border-radius: 8px;
    background: transparent;
    color: var(--sidebar-link);
    text-decoration: none;
    font-size: 13px;
    font-weight: 600;
  }
  .rail-nav a[aria-current='page'] {
    background: var(--sidebar-active);
    color: var(--sidebar-text);
  }
  .rail-nav a:hover {
    background: var(--sidebar-hover);
  }
  .mobile-project-nav {
    display: none;
  }
  .count {
    margin-left: auto;
    font-size: 11px;
  }
  .rail-summary {
    margin-top: auto;
    padding-top: 48px;
  }
  .project-number {
    margin: 20px 0 0;
    color: var(--sidebar-dim);
    font-size: 12px;
  }
  .switch-project {
    display: flex;
    align-items: center;
    gap: 8px;
    width: fit-content;
    margin-top: 16px;
    padding: 4px 0;
    color: var(--sidebar-bright);
    text-underline-offset: 4px;
  }
  .switch-project:hover {
    color: var(--sidebar-text);
  }
  .project-rail a:focus-visible {
    outline: 2px solid var(--sidebar-focus);
    outline-offset: 4px;
  }
  .mobile-project-info {
    display: none;
  }
  .main-column {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    min-height: 0;
  }
  .workspace {
    flex: 1;
    min-width: 0;
    overflow: auto;
    padding: 36px clamp(20px, 3vw, 48px) 48px;
  }
  .page-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 28px;
  }
  .eyebrow {
    margin: 0;
    color: var(--color-ink-muted);
    font-size: 10px;
    font-weight: 650;
    letter-spacing: 0.09em;
    text-transform: uppercase;
  }
  h1 {
    margin: 9px 0 10px;
    font-size: 30px;
    line-height: 1.2;
    font-weight: 700;
    letter-spacing: -0.035em;
  }
  .subtitle {
    margin: 0;
    color: var(--color-ink-muted);
    font-size: 13px;
  }
  .primary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 11px 16px;
    background: var(--brand-contrast);
    color: white;
    border-radius: 8px;
    text-decoration: none;
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 28px;
  }
  .stat {
    padding: 20px;
    border: 1px solid var(--color-wire);
    border-radius: 10px;
    background: var(--color-felt);
  }
  .stat.accent {
    background: var(--color-vekt-bg);
  }
  .stat-label {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    color: var(--color-ink-muted);
    font-size: 12px;
  }
  .stat-label :global(svg) {
    flex-shrink: 0;
  }
  .stat-value {
    display: block;
    margin: 20px 0 10px;
    font-size: clamp(22px, 2.2vw, 32px);
    font-weight: 650;
    font-variant-numeric: tabular-nums;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }
  .stat-value small {
    margin-left: 5px;
    font-size: 12px;
    font-weight: 500;
  }
  .stat p,
  .stat-foot {
    color: var(--color-ink-muted);
    font-size: 11px;
    line-height: 1.5;
    margin: 0;
  }
  .overview-content {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
    align-items: start;
  }
  .time-stat {
    text-align: left;
    color: inherit;
    position: relative;
  }
  .time-stat:hover {
    border-color: var(--color-vekt);
    background: var(--color-vekt-bg);
  }
  .stat-foot {
    display: block;
  }
  .stat-action {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    font-size: 11px;
    color: var(--color-vekt);
  }
  .active-filter {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    padding: 0 24px 16px;
    color: var(--color-ink-muted);
    font-size: 12px;
  }
  .active-filter button {
    display: flex;
    gap: 5px;
    align-items: center;
    border: 1px solid var(--color-wire);
    background: var(--color-canvas);
    border-radius: 5px;
    padding: 4px 7px;
    color: var(--color-ink-secondary);
  }
  .register {
    min-width: 0;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--color-wire);
    border-radius: 12px;
    background: var(--color-felt);
  }
  .register-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 24px;
  }
  h2 {
    margin: 5px 0 0;
    font-size: 18px;
    font-weight: 650;
  }
  button {
    cursor: pointer;
    font: inherit;
  }
  button:focus-visible,
  a:focus-visible,
  input:focus-visible {
    outline: 2px solid var(--color-wire-focus);
    outline-offset: 3px;
  }
  .filters {
    display: flex;
    gap: 22px;
    padding: 0 24px;
    border-bottom: 1px solid var(--color-wire);
    overflow-x: auto;
  }
  .filters button {
    display: flex;
    align-items: center;
    gap: 7px;
    white-space: nowrap;
    padding: 12px 0;
    border: 0;
    border-bottom: 2px solid transparent;
    background: transparent;
    color: var(--color-ink-muted);
    font-size: 12px;
  }
  .filters button.active {
    color: var(--color-ink);
    border-bottom-color: var(--color-vekt);
    font-weight: 600;
  }
  .filters span {
    font-size: 10px;
    padding: 1px 5px;
    border-radius: 4px;
    background: var(--color-canvas);
  }
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 18px 24px;
    flex-wrap: wrap;
  }
  .type-filter {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--color-ink-muted);
    font-size: 12px;
  }
  .type-filter select {
    padding: 8px 10px;
    border: 1px solid var(--color-wire);
    border-radius: 7px;
    background: var(--color-felt);
    color: var(--color-ink-secondary);
    font: inherit;
  }
  .type-filter select:focus-visible {
    outline: 2px solid var(--color-wire-focus);
    outline-offset: 3px;
  }
  .search {
    display: flex;
    align-items: center;
    gap: 9px;
    width: min(100%, 380px);
    padding: 9px 12px;
    border: 1px solid var(--color-wire);
    border-radius: 7px;
    color: var(--color-ink-muted);
  }
  input {
    min-width: 0;
    width: 100%;
    border: 0;
    background: transparent;
    color: var(--color-ink);
    font: inherit;
    font-size: 12px;
  }
  .result-count {
    color: var(--color-ink-muted);
    font-size: 11px;
    white-space: nowrap;
  }
  .table-area {
    padding: 0 24px 24px;
  }
  .state-message {
    padding: 40px 24px;
    font-size: 14px;
    text-align: center;
    color: var(--color-ink-muted);
  }
  .reset {
    display: block;
    margin: 12px auto 0;
    border: 0;
    background: transparent;
    color: var(--color-vekt);
    text-decoration: underline;
  }
  .demo-note {
    margin: -12px 0 22px;
    font-size: 12px;
    color: var(--color-ink-muted);
  }
  @media (max-width: 1200px) {
    .stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 1023px) {
    .mobile-project-nav {
      display: flex;
      gap: 20px;
      margin-bottom: 24px;
      font-size: 13px;
    }
    .mobile-project-nav a {
      color: var(--color-ink-muted);
      text-decoration: none;
      padding-bottom: 8px;
    }
    .mobile-project-nav a[aria-current='page'] {
      color: var(--color-ink);
      border-bottom: 2px solid var(--color-vekt);
    }

    .mobile-project-info {
      display: block;
      margin: 0 0 24px;
      font-size: 13px;
    }
    .mobile-project-info summary {
      cursor: pointer;
      padding: 12px 0;
      color: var(--color-ink-secondary);
    }
    .mobile-project-info > a {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 0;
      color: var(--color-vekt);
    }
    .project-rail {
      display: none;
    }
  }
  @media (max-width: 640px) {
    .workspace {
      padding: 24px 16px;
    }
    .page-heading {
      align-items: flex-start;
    }
    h1 {
      font-size: 25px;
    }
    .page-heading .primary {
      padding: 9px;
    }
    .stat {
      padding: 16px;
    }
    .stats {
      gap: 10px;
    }
    .register-header {
      flex-wrap: wrap;
      padding: 18px;
    }
    .filters {
      padding: 0 18px;
      gap: 16px;
    }
    .toolbar {
      padding: 16px 18px;
      flex-wrap: wrap;
    }
    .table-area {
      padding: 0 0 16px;
    }
  }
</style>
