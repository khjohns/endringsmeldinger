<script lang="ts">
  import ProjectOverview from '$lib/components/saksoversikt/ProjectOverview.svelte';
  import { demoOverviewCases, demoScenarioIds } from '$lib/mocks/projectOverview';
</script>

<svelte:head><title>Forhåndsvisning — Aktivitetslogg</title></svelte:head>
<div class="preview">
  <ProjectOverview
    activePage="activity"
    cases={demoOverviewCases}
    demoScenarios={demoScenarioIds}
    prosjektId="P001"
    prosjektNavn="Operatunnelen — Parsell 3"
    contract={{
      byggherre_navn: 'Oslo kommune · Oslobygg KF',
      totalentreprenor_navn: 'Veidekke Entreprenør AS',
    }}
    demo
  />
</div>

<style>
  .preview {
    height: 100dvh;
  }
</style>
