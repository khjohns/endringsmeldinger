<script lang="ts">
	import { page } from '$app/state';
	const prosjektId = $derived(page.params.prosjektId);
</script>

<div class="p-6">
	<h1 class="text-xl font-semibold">Saker i prosjekt {prosjektId}</h1>
	<p class="text-ink-secondary mt-2">Saksliste — implementeres i Fase 2</p>
</div>
