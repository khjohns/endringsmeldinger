<script lang="ts">
	import VerdictButtons from '../VerdictButtons.svelte';

	interface Props {
		value?: string | null;
		options?: { id: string; label: string; variant: 'godkjent' | 'delvis' | 'avslatt' }[];
		onchange?: (value: string) => void;
	}

	let {
		value = null,
		options = [
			{ id: 'godkjent', label: 'Godkjent', variant: 'godkjent' as const },
			{ id: 'delvis', label: 'Delvis', variant: 'delvis' as const },
			{ id: 'avslatt', label: 'Avslått', variant: 'avslatt' as const }
		],
		onchange = () => {}
	}: Props = $props();
</script>

<VerdictButtons {value} {options} {onchange} />
