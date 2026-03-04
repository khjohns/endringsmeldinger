<script lang="ts">
	import { page } from '$app/state';
	const sakId = $derived(page.params.sakId);
</script>

<div class="p-6">
	<h1 class="text-xl font-semibold">Forhandlingsbordet — Sak {sakId}</h1>
	<p class="text-ink-secondary mt-2">CasePage — implementeres i Fase 2</p>
</div>
