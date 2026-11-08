<script lang="ts">
  /**
   * Varden i én tilstand fra showcasen (#1371), for rammene på smal og bred skjerm:
   * `?tilstand=<id>&side=BH|TE`.
   */
  import { page } from '$app/state';
  import Vardensak from '$lib/components/varden/Vardensak.svelte';
  import { DEMOKONTRAKT } from '$lib/kjernesak/demosak';
  import { TILSTANDER, aapneSak } from '../kjernesaker';

  const s = page.url.searchParams;
  const tilstand = TILSTANDER.find((t) => t.id === s.get('tilstand')) ?? TILSTANDER[0];
  const side = s.get('side') === 'BH' ? 'BH' : 'TE';
  const kjernesak = aapneSak(tilstand.punkt, side, tilstand.feil);
</script>

<svelte:head><title>Varden · {tilstand.navn} · {side}</title></svelte:head>

<Vardensak {kjernesak} kontrakt={DEMOKONTRAKT} />
