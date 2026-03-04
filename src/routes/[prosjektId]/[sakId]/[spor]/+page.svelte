<script lang="ts">
	import { page } from '$app/state';
	const spor = $derived(page.params.spor);
	const sakId = $derived(page.params.sakId);
</script>

<div class="p-6">
	<h1 class="text-xl font-semibold capitalize">{spor} — Sak {sakId}</h1>
	<p class="text-ink-secondary mt-2">Spordetalj — implementeres i Fase 3-5</p>
</div>
