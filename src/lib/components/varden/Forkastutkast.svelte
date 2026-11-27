<!--
  «Forkast utkast» nederst i utkastet, med en dialog som spør først (oppdragsgiver 06.11 og 07.11,
  PR 1650). Den trygge knappen heter «Behold utkastet», og «Forkast utkast» er rød, fordi
  handlingen ikke kan gjøres om. Fokus går tilbake til lenken når dialogen lukkes uten forkasting.
  Knappene står som `system.md` sier, og alle skjemaene har de samme knappene (designvalget 17.11
  i #2119, oppdragsgiver 27.11 i #2493). Skjemaet for ny sak har «Avbryt» på lenken (S2 i #1414)
  og sin egen tittel og tekst. Et krav eller svar som legges til fra korrespondansen, spør heller om
  korrespondansen skal legges til uten skjemaet, med veien tilbake til skjemaet (`avbrudd`, U-9 i
  BF-49).
-->
<script lang="ts">
  import Knapp from './Knapp.svelte';
  import Melding from './Melding.svelte';
  import { BREVUTKAST, LEGG_TIL, SKJEMA } from './tekster';

  let {
    tekst,
    onforkast,
    knapp = SKJEMA.forkast,
    tittel = BREVUTKAST.forkastSpoersmaal,
    avbrudd = null,
  }: {
    tekst: string;
    onforkast: () => void;
    /** Lenkeknappen som åpner dialogen. */
    knapp?: string;
    /** Spørsmålet øverst i dialogen. */
    tittel?: string;
    /**
     * U-9 i BF-49: skjemaet for kravet eller svaret lagt til lukkes. `leggTil` legger
     * korrespondansen til som dokumentasjon og gir det som hindret, eller `null`.
     */
    avbrudd?: { hva: 'krav' | 'svar'; leggTil: () => Promise<string | null> } | null;
  } = $props();
  const uid = $props.id();

  let dialog = $state<HTMLDialogElement | null>(null);
  let forkastet = false;
  let hindring = $state<string | null>(null);
  let opptatt = $state(false);

  function forkast() {
    forkastet = true;
    dialog?.close();
    onforkast();
  }

  async function leggTil(a: NonNullable<typeof avbrudd>) {
    opptatt = true;
    try {
      hindring = await a.leggTil();
    } finally {
      opptatt = false;
    }
    if (hindring) return;
    forkastet = true;
    dialog?.close();
  }
</script>

<Knapp
  variant="lenke"
  id={`${uid}-forkast`}
  onclick={() => {
    hindring = null;
    dialog?.showModal();
  }}>{knapp}</Knapp
>

<dialog
  class="bekreft"
  bind:this={dialog}
  aria-labelledby={`${uid}-tittel`}
  aria-describedby={`${uid}-tekst`}
  onclose={() => {
    if (!forkastet) document.getElementById(`${uid}-forkast`)?.focus();
  }}
>
  {#if avbrudd}
    <h2 id={`${uid}-tittel`}>{LEGG_TIL.avbrudd.tittel(avbrudd.hva)}</h2>
    <p id={`${uid}-tekst`}>{LEGG_TIL.avbrudd.tekst(avbrudd.hva)}</p>
    {#if hindring}<div class="hindring"><Melding art="feil">{hindring}</Melding></div>{/if}
    <div class="knapper">
      <Knapp variant="primaer" {opptatt} onclick={() => leggTil(avbrudd)}
        >{LEGG_TIL.avbrudd.ja}</Knapp
      >
      <Knapp onclick={forkast}>{LEGG_TIL.avbrudd.nei}</Knapp>
      <Knapp variant="lenke" onclick={() => dialog?.close()}>{LEGG_TIL.avbrudd.tilbake}</Knapp>
    </div>
  {:else}
    <h2 id={`${uid}-tittel`}>{tittel}</h2>
    <p id={`${uid}-tekst`}>{tekst}</p>
    <div class="knapper">
      <Knapp onclick={() => dialog?.close()}>{SKJEMA.behold}</Knapp>
      <Knapp variant="fare" onclick={forkast}>{SKJEMA.forkast}</Knapp>
    </div>
  {/if}
</dialog>

<style>
  /* Den globale nullstillingen tar bort marginen som midtstiller dialogen. */
  .bekreft {
    margin: auto;
    max-width: min(28rem, calc(100vw - 2 * var(--spacing-4)));
    padding: var(--spacing-6);
    border: var(--rule);
    border-radius: var(--r-kort);
    background: var(--surface);
    color: var(--ink);
  }
  .bekreft::backdrop {
    background: rgb(0 0 0 / 0.35);
  }
  h2 {
    font-size: 16px;
    font-weight: 600;
  }
  p {
    margin-top: var(--spacing-2);
    font-size: 14px;
    color: var(--ink-2);
  }
  .hindring {
    margin-top: var(--spacing-3);
  }
  .knapper {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-3);
    margin-top: var(--spacing-5);
  }
  /* Knappene står ved siden av hverandre ned til 390 px (designvalget 17.11 i #2119); på en
     smalere skjerm brytes de heller enn å gå utenfor dialogen. */
  @media (max-width: 480px) {
    .bekreft {
      max-width: calc(100vw - 2 * var(--spacing-3));
      padding: var(--spacing-5);
    }
  }
</style>
