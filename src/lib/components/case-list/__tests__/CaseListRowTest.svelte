<script lang="ts">
	import type { CaseListItem } from '$lib/types/api';
	import CaseListRow from '../CaseListRow.svelte';

	interface Props {
		case_item: CaseListItem;
		prosjektId: string;
	}

	let { case_item, prosjektId }: Props = $props();
</script>

<table>
	<tbody>
		<CaseListRow {case_item} {prosjektId} />
	</tbody>
</table>
