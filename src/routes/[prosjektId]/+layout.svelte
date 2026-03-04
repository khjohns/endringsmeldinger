<script lang="ts">
	import { page } from '$app/state';
	let { children } = $props();

	const prosjektId = $derived(page.params.prosjektId);
</script>

<div class="min-h-screen bg-canvas text-ink">
	<header class="h-12 border-b border-wire flex items-center px-4">
		<span class="text-ink-secondary text-sm font-medium">Prosjekt {prosjektId}</span>
	</header>
	<main>
		{@render children()}
	</main>
</div>
