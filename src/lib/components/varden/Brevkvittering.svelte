<!--
  Kvitteringen etter sending (#2188 punkt 4). Brevet og tidspunktet leses fra journalen.
-->
<script lang="ts">
  import { ChevronLeft } from 'lucide-svelte';
  import Brev from './Brev.svelte';
  import Knapp from './Knapp.svelte';
  import type { Brevet } from './lesing';
  import { BREVKONTROLL, MOTTATT, dato } from './tekster';

  let {
    brev,
    sak,
    tekst,
    ontilbake,
  }: {
    brev: Brevet;
    sak: string;
    tekst: string;
    ontilbake: () => void;
  } = $props();
</script>

<div class="kvittering">
  <div class="tilbake">
    <Knapp variant="lenke" onclick={ontilbake}>
      <ChevronLeft size={16} aria-hidden="true" />{BREVKONTROLL.tilbake(MOTTATT.saken)}
    </Knapp>
  </div>
  <Brev
    avsender={brev.avsender}
    {sak}
    merking={brev.merking}
    deresRef={brev.deresRef}
    dato={dato(brev.registrert)}
    tittel={brev.brevtittel ?? ''}
    avsnitt={brev.avsnitt ?? []}
    sendt={brev.registrert}
  />
  <p role="status">{tekst}</p>
</div>

<style>
  .kvittering {
    max-width: var(--varden-ark);
    display: grid;
    gap: var(--spacing-3);
  }

  p {
    color: var(--ink-2);
    font-size: 14px;
  }
</style>
