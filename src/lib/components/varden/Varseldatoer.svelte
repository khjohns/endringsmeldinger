<!--
  Datoene ved spørsmålet om varselet i svarskjemaet: når TE ble klar over forholdet, når kravet
  ble sendt og avstanden mellom dem. Byggherren vurderer selv om varselet kom i tide.
-->
<script lang="ts">
  import type { Utledning } from '#kjerne/utledning/utled.ts';
  import { klarOverForholdet, type Brevet } from './lesing';
  import { kravbrevetI, kravetSendt } from './svarskjema';
  import Datoer from './Datoer.svelte';
  import { SKJEMA, kalenderdager } from './tekster';

  let {
    u,
    spor,
    sendt,
  }: {
    u: Utledning;
    spor: 'vederlag' | 'frist';
    /** Linjen om når kravet ble sendt, med sporets ord. */
    sendt: (dato: string, brev: Brevet) => string;
  } = $props();

  const kravbrevet = $derived(kravbrevetI(u, spor));
  const klarOver = $derived(klarOverForholdet(u));
  const kravSendt = $derived(kravetSendt(kravbrevet));
  const linjer = $derived([
    ...(klarOver ? [{ tekst: SKJEMA.klarOver(klarOver.dato, klarOver.brev) }] : []),
    { tekst: sendt(kravSendt ?? kravbrevet.registrert, kravbrevet) },
    ...(klarOver && kravSendt
      ? [
          {
            tekst: SKJEMA.avstand(kalenderdager(klarOver.dato, kravSendt)),
            art: 'avstand' as const,
          },
        ]
      : []),
  ]);
</script>

<Datoer {linjer} />
