<!--
  Sporet med siste brev i sin helhet (Varden, skjerm D): brevet slik det ble frosset da det ble
  sendt, ikke en ny gjengivelse av dataene. Er det et svar kjernen tilbyr leseren å godta, står
  «Ta stilling til svaret» over brevet, og panelet i høyre kolonne viser aksepten og
  virkningen kjernen regner ut. Brevtypene kjernen tilbyr ellers, står i menyen.
-->
<script lang="ts">
  import { ChevronRight, X } from 'lucide-svelte';
  import { tick } from 'svelte';
  import type { Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';
  import { brevaarsak } from '$lib/kjernesak/kontekst.svelte';
  import type { Part, Spor } from '$kjerne/typer';
  import type { Utledning } from '$kjerne/utledning/utled';
  import Arbeidsflate from './Arbeidsflate.svelte';
  import Brev from './Brev.svelte';
  import Brevtyper from './Brevtyper.svelte';
  import Knapp from './Knapp.svelte';
  import Tidslinje from './Tidslinje.svelte';
  import { aksepten } from './kommandoer';
  import { brevene, handlingerISporet, oppgitteDatoer } from './lesing';
  import {
    BREVMENY,
    MOTTATT,
    SPORNAVN,
    STILLING,
    brevtittel,
    dato,
    innsigelsen,
    varselet,
  } from './prototypetekst';

  let {
    kjernesak,
    u,
    spor,
    onvelg,
    onakseptbrev,
  }: {
    kjernesak: Kjernesakkontekst;
    u: Utledning;
    spor: Spor;
    /** Brukeren valgte en brevtype i menyen, som `svare:vederlag`. */
    onvelg: (noekkel: string) => void;
    onakseptbrev: (k: { kommando: Record<string, unknown>; tekst: string[] }) => void;
  } = $props();
  const uid = $props.id();

  const part = $derived(kjernesak.part as Part);
  const sporbrev = $derived(brevene(u).filter((b) => b.spor.includes(spor)));
  const siste = $derived(sporbrev.at(-1) ?? null);
  const iSporet = $derived(handlingerISporet(u, kjernesak.handlinger, spor));
  const svaret = $derived(u.spor[spor].gjeldendeSvar);
  const kanGodta = $derived(svaret !== null && iSporet.includes(`godta:${spor}`));
  const svarbrevet = $derived(svaret ? sporbrev.find((b) => b.id === svaret.dokument) : undefined);
  const vist = $derived(kanGodta && svarbrevet ? svarbrevet : siste);

  let stilling = $state(false);
  let stillingTittel = $state<HTMLElement | null>(null);

  async function aapneStilling() {
    stilling = true;
    await tick();
    stillingTittel?.focus();
  }

  async function lukkStilling() {
    stilling = false;
    await tick();
    document.getElementById(`${uid}-ta-stilling`)?.focus();
  }
  let hindring = $state<string | null>(null);

  const akseptkommando = $derived(
    kanGodta && svaret ? aksepten(spor, svaret.id, kjernesak.regelversjon) : null
  );
  // Virkningen av aksepten slik kjernen regner den, av svaret slik det ble sendt (KA-U10).
  const enighet = $derived(
    akseptkommando ? (kjernesak.forhaandsvist(akseptkommando)?.spor[spor].enighet ?? null) : null
  );
  const paaberopt = $derived(
    svaret?.standpunkter.find((s) => s.art === 'rettidighet' && !s.iTide) ?? null
  );

  /** Teksten for et varsel med hjemmelen, og for innsigelsen mot et bestemt krav eller svar. */
  function innsigelsestekst(n: string): string | null {
    const [type, id] = n.split(':');
    if (type === 'varsle' || type === 'sende_varsel') return varselet(type, id);
    const e = u.elementer[id];
    if (type !== 'innsigelse' || !e) return null;
    return innsigelsen(e.art, sporbrev.find((b) => b.id === e.hendelse)?.nummer ?? null);
  }

  function seAksepten() {
    const b = kjernesak.brev(akseptkommando!, undefined, true);
    if (!b || !('tekst' in b) || !b.tekst) {
      hindring = (b && brevaarsak(b)) ?? STILLING.godta;
      return;
    }
    onakseptbrev({ kommando: akseptkommando!, tekst: b.tekst });
  }
</script>

<Arbeidsflate>
  {#snippet hoved()}
    {#snippet meny()}
      <Brevtyper
        tittel={kanGodta ? BREVMENY.andre : BREVMENY.skriv}
        handlinger={iSporet.filter((n) => n !== `godta:${spor}`)}
        bygget={spor === 'vederlag' ? ['svare'] : []}
        tekstFor={innsigelsestekst}
        {onvelg}
      />
    {/snippet}
    {#if vist}
      <div class="linje">
        <h2>
          Brev {vist.nummer} · {brevtittel(vist)}
          <span class="dempet">
            · {vist.avsender} · {vist.avsender === part ? 'sendt' : 'mottatt'}
            {dato(vist.registrert)}</span
          >
        </h2>
        {@render meny()}
      </div>
      {#if kanGodta}
        <div class="stilling">
          <p class="dempet">{MOTTATT.iSinHelhet(vist.avsender)}</p>
          <Knapp
            variant="primaer"
            aria-expanded={stilling}
            aria-controls={`${uid}-stillingspanel`}
            id={`${uid}-ta-stilling`}
            onclick={aapneStilling}
            >{MOTTATT.taStilling}<ChevronRight size={16} aria-hidden="true" /></Knapp
          >
        </div>
      {/if}
      {#if vist.avsnitt}
        <Brev
          avsender={vist.avsender}
          sak={kjernesak.saksbilde?.tittel ?? ''}
          nummer={`${vist.nummer}, ${SPORNAVN[spor].toLowerCase()}`}
          dato={dato(vist.registrert)}
          tittel={brevtittel(vist)}
          avsnitt={vist.avsnitt}
        >
          {#snippet fot()}{MOTTATT.sendt(vist.registrert)}{/snippet}
        </Brev>
      {/if}
    {:else}
      <div class="linje tomt">
        <p>{MOTTATT.ingenBrev}</p>
        {@render meny()}
      </div>
    {/if}
  {/snippet}

  {#snippet hoeyre()}
    {#if stilling && kanGodta && vist}
      <section class="kort" id={`${uid}-stillingspanel`} aria-labelledby={`${uid}-stilling-tittel`}>
        <header class="hode">
          <h2 id={`${uid}-stilling-tittel`} tabindex="-1" bind:this={stillingTittel}>
            {STILLING.tittel(vist.nummer)}
          </h2>
          <Knapp variant="lenke" onclick={lukkStilling}
            ><X size={16} aria-hidden="true" />{STILLING.lukk}</Knapp
          >
        </header>
        <div class="innhold">
          <h3>{STILLING.godta}</h3>
          <p>
            {STILLING.hele(vist.nummer)}
            {#if paaberopt?.art === 'rettidighet'}{STILLING.omfatter(paaberopt.hjemmel)}{/if}
          </p>
          {#if enighet?.grunnlag.utfall.beloep !== undefined}
            <p>{STILLING.beloep(enighet.grunnlag.utfall.beloep, vist.nummer)}</p>
          {/if}
          {#if enighet?.grunnlag.vilkaar === 'grunnlag_avklart' && !u.grunnlagAvklart}
            <p>{STILLING.vilkaar}</p>
          {/if}
          <p class="dempet">{STILLING.kilde(vist.nummer)}</p>
          <Knapp onclick={seAksepten}>{STILLING.seAksepten}</Knapp>
          {#if hindring}<p class="feil" role="alert">{hindring}</p>{/if}
        </div>
        <p class="dempet fot">{STILLING.andre}</p>
      </section>
    {/if}
    <Tidslinje
      brev={sporbrev}
      datoer={oppgitteDatoer(u).filter((d) => d.spor.includes(spor) || spor === 'vederlag')}
    />
  {/snippet}
</Arbeidsflate>

<style>
  .linje {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-3);
  }
  /* Tittelen brytes før menyen flyttes til en egen linje. */
  .linje > :first-child {
    flex: 1 1 18rem;
  }
  .linje .dempet {
    font-weight: 400;
  }
  .stilling {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-3);
  }
  .tomt {
    padding: var(--spacing-6);
    background: var(--surface);
    border: var(--rule);
    border-radius: 12px;
    color: var(--ink-2);
  }
  .kort {
    background: var(--surface);
    border: var(--rule);
    border-radius: 12px;
  }
  .hode {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-3);
    padding: var(--spacing-3) var(--spacing-5);
    border-bottom: var(--rule);
  }
  h2 {
    font-size: 16px;
    font-weight: 600;
  }
  h3 {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--ink-2);
  }
  .innhold {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    padding: var(--spacing-5);
    font-size: 14px;
  }
  .fot {
    padding: var(--spacing-4) var(--spacing-5);
    border-top: var(--rule);
  }
  .dempet {
    color: var(--ink-3);
    font-size: 14px;
  }
  .feil {
    padding: var(--spacing-3);
    background: var(--danger-bg);
    border: 1px solid var(--danger-border);
    border-radius: 4px;
  }
</style>
