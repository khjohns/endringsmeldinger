<!--
  Arbeidet i ett spor i showcasen (#1371): `Sporlesing` eller `Vederlagssvar`, og
  `Brevkontroll` når brevet åpnes derfra. Propsene til brevkontrollen settes sammen som i
  `Vardensak.svelte`, med tekstene fra `tekster.ts`.
-->
<script lang="ts">
  import type { Spor } from '$kjerne/typer';
  import Brevkontroll from '$lib/components/varden/Brevkontroll.svelte';
  import Sporlesing from '$lib/components/varden/Sporlesing.svelte';
  import Vederlagssvar from '$lib/components/varden/Vederlagssvar.svelte';
  import { tomtSvar, type Svarvalg } from '$lib/components/varden/kommandoer';
  import { brevene } from '$lib/components/varden/lesing';
  import { BREVKONTROLL, SAKEN, STILLING } from '$lib/components/varden/tekster';
  import type { Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';

  let {
    kjernesak,
    spor = 'vederlag',
    svar = false,
    valg = tomtSvar(),
  }: {
    kjernesak: Kjernesakkontekst;
    spor?: Spor;
    /** BH svarer på kravet i stedet for å lese sporet. */
    svar?: boolean;
    valg?: Svarvalg;
  } = $props();

  type Kontroll = Omit<
    import('svelte').ComponentProps<typeof Brevkontroll>,
    'kjernesak' | 'ontilbake' | 'onsendt'
  >;
  let kontroll = $state<Kontroll | null>(null);
  let sendt = $state(false);
  // Valgene er startverdien for skjemaet og står når BH går til brevkontrollen og tilbake.
  // svelte-ignore state_referenced_locally
  let svarvalg = $state(valg);
  // svelte-ignore state_referenced_locally
  let svarer = $state(svar);

  // Skjemaene showcasen åpner, som i `Vardensak.svelte`.
  const skjemaene: Record<string, () => void> = { 'svare:vederlag': () => (svarer = true) };
  const skjemanoeklene = Object.keys(skjemaene);

  const u = $derived(kjernesak.utledning);
  const brev = $derived(u ? brevene(u) : []);
</script>

{#if !u}
  <p class="dempet" role="status">{kjernesak.feil ?? SAKEN.laster}</p>
{:else if kontroll}
  <Brevkontroll
    {kjernesak}
    {...kontroll}
    ontilbake={() => (kontroll = null)}
    onsendt={() => {
      kontroll = null;
      sendt = true;
    }}
  />
{:else if svarer && !sendt && spor === 'vederlag' && kjernesak.handlinger.includes('svare:vederlag')}
  <Vederlagssvar
    {kjernesak}
    {u}
    bind:valg={svarvalg}
    onforkast={() => {
      svarvalg = tomtSvar();
      svarer = false;
    }}
    onbrevkontroll={(k) => {
      const krav = brev.find((b) => b.id === u.spor.vederlag.gjeldendeKrav?.dokument);
      kontroll = {
        ...k,
        handling: BREVKONTROLL.sendSvaret,
        sendTekst: BREVKONTROLL.sendSvaret,
        tilbakeTil: 'utkastet',
        svarerPaa: krav ?? null,
      };
    }}
  />
{:else}
  <Sporlesing
    {kjernesak}
    {u}
    {spor}
    skjemaene={spor === 'vederlag' ? skjemanoeklene : []}
    onvelg={(n) => {
      if (Object.hasOwn(skjemaene, n)) skjemaene[n]();
    }}
    onakseptbrev={(k) => {
      const svaret = brev.find((b) => b.id === u.spor[spor].gjeldendeSvar?.dokument);
      kontroll = {
        ...k,
        detteSender: svaret ? [{ tekst: STILLING.godtarBrev(svaret), lag: null }] : [],
        handling: BREVKONTROLL.sendAksepten,
        sendTekst: BREVKONTROLL.sendAksepten,
        tilbakeTil: 'saken',
        svarerPaa: svaret ?? null,
      };
    }}
  />
{/if}

<style>
  .dempet {
    color: var(--ink-2);
  }
</style>
