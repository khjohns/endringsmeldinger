<script lang="ts">
  import type { SakState } from '$lib/types/timeline';
  import FristerSection from '../FristerSection.svelte';

  interface Props {
    state: SakState;
    now?: Date;
  }

  let { state, now }: Props = $props();
</script>

<FristerSection {state} {now} />
