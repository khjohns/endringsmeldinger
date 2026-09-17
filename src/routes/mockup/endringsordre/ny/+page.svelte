<script lang="ts">
  import { resolve } from '$app/paths';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import EndringsordreForm from '$lib/components/endringsordre/EndringsordreForm.svelte';
  import {
    availableDemoEOCandidates,
    nextDemoEONumber,
    issueDemoOrder,
  } from '$lib/mocks/endringsordre';
  import { demoScenarioIds } from '$lib/mocks/projectOverview';
  import { demoEOApprovals } from '$lib/approval/eoApproval.svelte';
  const demo = {
    getCandidates: availableDemoEOCandidates,
    getNextNumber: nextDemoEONumber,
    issue: issueDemoOrder,
  };
  const caseHref = (id: string): `/${string}` =>
    `/mockup?scenario=${encodeURIComponent(demoScenarioIds[id] ?? '')}&rolle=BH&spor=ansvar`;
</script>

<svelte:head><title>Ny endringsordre · Demo — Kontraktsbordet</title></svelte:head>
<EndringsordreForm
  projectId="P001"
  projectName="Operatunnelen — Parsell 3"
  userId="demo"
  {demo}
  {caseHref}
  approvalSource={demoEOApprovals(issueDemoOrder)}
  approvalsHref={resolve('/mockup/endringsordre/godkjenning')}
  initialKoe={page.url.searchParams.get('koe') ?? ''}
  oncreated={(sakId) => goto(resolve(`/mockup/endringsordre/${encodeURIComponent(sakId)}`))}
/>
