<script lang="ts">
  /** Minimalt skjema for å drive `createFormDraft` i test. */
  import { createFormDraft, type UtkastIdentitet } from '$lib/kontraktsbord/submission.svelte';

  let {
    identitet,
    ondraft,
  }: {
    identitet: UtkastIdentitet;
    ondraft: (api: {
      draft: ReturnType<typeof createFormDraft<{ tekst: string }>>;
      skriv: (verdi: string) => void;
      les: () => string;
    }) => void;
  } = $props();

  let tekst = $state('');
  // Harnessen monteres én gang per test og bytter aldri identitet eller
  // callback; initialverdien er derfor den rette å lukke over.
  // svelte-ignore state_referenced_locally
  const draft = createFormDraft(
    true,
    identitet,
    () => ({ tekst }),
    (lagret) => {
      tekst = lagret.tekst ?? '';
    }
  );

  // svelte-ignore state_referenced_locally
  ondraft({ draft, skriv: (verdi) => (tekst = verdi), les: () => tekst });
</script>

<span data-testid="status">{draft.status}</span>
<span data-testid="klar">{draft.ready}</span>
<span data-testid="tekst">{tekst}</span>
