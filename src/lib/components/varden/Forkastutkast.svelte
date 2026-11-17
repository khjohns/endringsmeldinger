<!--
  «Forkast utkast» nederst i utkastet, med en dialog som spør først (oppdragsgiver 06.11 og 07.11,
  PR 1650). Den trygge knappen heter «Behold utkastet», og «Forkast utkast» er rød, fordi
  handlingen ikke kan gjøres om. Fokus går tilbake til lenken når dialogen lukkes uten forkasting.
  Skjemaet for ny sak har egne ord på knappene (S2 i #1414), og samme dialog (#2119).
-->
<script lang="ts">
  import Knapp from './Knapp.svelte';
  import { BREVUTKAST, SKJEMA } from './tekster';

  let {
    tekst,
    onforkast,
    knapp = SKJEMA.forkast,
    forkast = SKJEMA.forkast,
    behold = SKJEMA.behold,
  }: {
    tekst: string;
    onforkast: () => void;
    /** Lenkeknappen som åpner dialogen. */
    knapp?: string;
    /** Den røde knappen i dialogen. */
    forkast?: string;
    /** Den trygge knappen i dialogen. */
    behold?: string;
  } = $props();
  const uid = $props.id();

  let dialog = $state<HTMLDialogElement | null>(null);
  let forkastet = false;
</script>

<Knapp variant="lenke" id={`${uid}-forkast`} onclick={() => dialog?.showModal()}>{knapp}</Knapp>

<dialog
  class="bekreft"
  bind:this={dialog}
  aria-labelledby={`${uid}-tittel`}
  aria-describedby={`${uid}-tekst`}
  onclose={() => {
    if (!forkastet) document.getElementById(`${uid}-forkast`)?.focus();
  }}
>
  <h2 id={`${uid}-tittel`}>{BREVUTKAST.forkastSpoersmaal}</h2>
  <p id={`${uid}-tekst`}>{tekst}</p>
  <div class="knapper">
    <Knapp onclick={() => dialog?.close()}>{behold}</Knapp>
    <Knapp
      variant="fare"
      onclick={() => {
        forkastet = true;
        dialog?.close();
        onforkast();
      }}>{forkast}</Knapp
    >
  </div>
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
  .knapper {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--spacing-3);
    margin-top: var(--spacing-5);
  }
</style>
