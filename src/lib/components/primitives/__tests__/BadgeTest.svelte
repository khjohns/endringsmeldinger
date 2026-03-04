<script lang="ts">
	import Badge from '../Badge.svelte';

	interface Props {
		text?: string;
		variant: 'godkjent' | 'avslatt' | 'delvis' | 'uavklart' | 'na';
	}

	let { text = 'Status', variant }: Props = $props();
</script>

<Badge {variant}>
	{text}
</Badge>
