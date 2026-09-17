<script lang="ts">
  import { resolve } from '$app/paths';
  import EOApprovalPage from '$lib/components/endringsordre/EOApprovalPage.svelte';
  import { demoEOApprovals } from '$lib/approval/eoApproval.svelte';
  import { issueDemoOrder } from '$lib/mocks/endringsordre';
</script>

<svelte:head><title>Endringsordrer til godkjenning · Demo — Kontraktsbordet</title></svelte:head>
<EOApprovalPage
  source={demoEOApprovals(issueDemoOrder)}
  projectId="P001"
  projectName="Operatunnelen — Parsell 3"
  newOrderHref={resolve('/mockup/endringsordre/ny')}
  issuedHref={(sakId) => resolve(`/mockup/endringsordre/${encodeURIComponent(sakId)}`)}
/>
