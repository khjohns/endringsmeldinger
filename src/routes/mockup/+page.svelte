<script lang="ts">
  import '$lib/components/kontraktsbord/mockup.css';
  import Kontrollrommet from '$lib/components/kontraktsbord/Kontrollrommet.svelte';
  import { createDemoStore } from '$lib/mockup/store.svelte';
  import { setCaseWorkspace } from '$lib/kontraktsbord/context.svelte';

  setCaseWorkspace(createDemoStore());
</script>

<svelte:head>
  <title>KOE Mockup — Kontraktsbordet</title>
</svelte:head>

<Kontrollrommet />
