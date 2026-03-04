<script lang="ts">
	import { Tooltip as BitsTooltip } from 'bits-ui';
	import Tooltip from '../Tooltip.svelte';

	interface Props {
		content?: string;
	}

	let { content = 'Hjelpetekst' }: Props = $props();
</script>

<BitsTooltip.Provider delayDuration={0}>
	<Tooltip {content}>
		<button>Hover meg</button>
	</Tooltip>
</BitsTooltip.Provider>
