<script lang="ts">
  import type { Sakslinje } from '$lib/types/api';
  import CaseListRow from '../CaseListRow.svelte';

  interface Props {
    linje: Sakslinje;
    prosjektId: string;
  }

  let { linje, prosjektId }: Props = $props();
</script>

<table>
  <tbody>
    <CaseListRow {linje} {prosjektId} />
  </tbody>
</table>
