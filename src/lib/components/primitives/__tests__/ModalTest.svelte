<script lang="ts">
	import Modal from '../Modal.svelte';
	import Button from '../Button.svelte';

	interface Props {
		open?: boolean;
		title?: string;
		variant?: 'default' | 'destructive';
	}

	let { open = true, title = 'Bekreft handling', variant = 'default' }: Props = $props();
</script>

<Modal {open} {title} {variant}>
	Er du sikker på at du vil fortsette?
	{#snippet actions()}
		<Button variant="secondary">Avbryt</Button>
		<Button variant="primary">Bekreft</Button>
	{/snippet}
</Modal>
