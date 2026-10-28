<!--
  Arbeidet i ett spor i showcasen (#1371): `Sporlesing` eller `Vederlagssvar`, og
  `Brevkontroll` når brevet åpnes derfra. Propsene til brevkontrollen settes sammen som i
  `Vardensak.svelte`, med tekstene fra `prototypetekst.ts`.
-->
<script lang="ts">
  import type { Spor } from '$kjerne/typer';
  import Brevkontroll from '$lib/components/varden/Brevkontroll.svelte';
  import Sporlesing from '$lib/components/varden/Sporlesing.svelte';
  import Vederlagssvar from '$lib/components/varden/Vederlagssvar.svelte';
  import { tomtSvar, type Svarvalg } from '$lib/components/varden/kommandoer';
  import { brevene } from '$lib/components/varden/lesing';
  import { BREVKONTROLL, STILLING, brevtittel } from '$lib/components/varden/prototypetekst';
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

  const u = $derived(kjernesak.utledning);
  const brev = $derived(u ? brevene(u) : []);
</script>

{#if !u}
  <p class="dempet" role="status">{kjernesak.feil ?? 'Laster saken …'}</p>
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
{:else if svar && !sendt && kjernesak.handlinger.includes(`svare:${spor}`)}
  <Vederlagssvar
    {kjernesak}
    {u}
    bind:valg={svarvalg}
    onbrevkontroll={(k) => {
      const krav = brev.find((b) => b.id === u.spor.vederlag.gjeldendeKrav?.dokument);
      kontroll = {
        ...k,
        tittel: brevtittel({ art: 'svar', spor: ['vederlag'] }),
        handling: BREVKONTROLL.sendSvaret,
        sendTekst: BREVKONTROLL.sendSvaret,
        tilbakeTil: 'utkastet',
        svarerPaa: krav ? { nummer: krav.nummer, registrert: krav.registrert } : null,
      };
    }}
  />
{:else}
  <Sporlesing
    {kjernesak}
    {u}
    {spor}
    onvelg={() => {}}
    onakseptbrev={({ kommando, tekst }) => {
      const svaret = brev.find((b) => b.id === u.spor[spor].gjeldendeSvar?.dokument);
      kontroll = {
        kommando,
        tekst,
        detteSender: svaret ? [{ tekst: STILLING.godtarBrev(svaret.nummer), lag: null }] : [],
        bindinger: [],
        tittel: brevtittel({ art: 'aksept', spor: [spor] }),
        handling: BREVKONTROLL.sendAksepten,
        sendTekst: BREVKONTROLL.sendAksepten,
        tilbakeTil: 'saken',
        svarerPaa: svaret ? { nummer: svaret.nummer, registrert: svaret.registrert } : null,
      };
    }}
  />
{/if}

<style>
  .dempet {
    color: var(--ink-2);
  }
</style>
