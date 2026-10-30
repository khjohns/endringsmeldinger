<script lang="ts">
  /**
   * Hele visningen i én tilstand fra showcasen (#1371), for rammene på smal og bred skjerm:
   * `?visning=varden|dagens&tilstand=<id>&side=BH|TE`.
   */
  import { page } from '$app/state';
  import Kjernesakrom from '$lib/components/kjernesak/Kjernesakrom.svelte';
  import Vardensak from '$lib/components/varden/Vardensak.svelte';
  import { SAKEN } from '$lib/components/varden/prototypetekst';
  import { DEMOKONTRAKT, DEMOPROSJEKT } from '$lib/kjernesak/demosak';
  import type { WorkspaceView } from '$lib/kontraktsbord/viewState';
  import { TILSTANDER, aapneSak } from '../kjernesaker';

  const s = page.url.searchParams;
  const tilstand = TILSTANDER.find((t) => t.id === s.get('tilstand')) ?? TILSTANDER[0];
  const side = s.get('side') === 'BH' ? 'BH' : 'TE';
  const varden = s.get('visning') !== 'dagens';
  const kjernesak = aapneSak(tilstand.punkt, side, tilstand.feil);
  let view = $state<WorkspaceView>({ track: 'vederlag', mode: 'read', role: side });
</script>

<svelte:head
  ><title>{varden ? 'Varden' : 'Dagens visning'} · {tilstand.navn} · {side}</title></svelte:head
>

{#if varden}
  <Vardensak {kjernesak} kontrakt={DEMOKONTRAKT} />
{:else if kjernesak.saksbilde}
  <Kjernesakrom
    {kjernesak}
    projectId={DEMOPROSJEKT}
    {view}
    onviewchange={(neste) => (view = neste)}
    onnewcase={() => {}}
  />
{:else}
  <p role="status">{kjernesak.feil ?? SAKEN.laster}</p>
{/if}
