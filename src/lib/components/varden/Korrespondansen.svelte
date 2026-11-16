<!--
  Varselet sendt utenfor løsningen, felles for skjemaet for ny sak, fristkravet og
  vederlagskravet: typen, sendemåten for et brev, datoen det ble sendt, dokumentet og den korte
  beskrivelsen (OV-U79, VS-U34, VS-U38, A1 i #2056). Skjemaet gir ID-en til hvert felt, så
  oppsummeringen av feilene kan flytte fokus dit.
-->
<script lang="ts">
  import Feltetikett from './Feltetikett.svelte';
  import Filvalg from './Filvalg.svelte';
  import Valg from './Valg.svelte';
  import { dagensDato, KORRESPONDANSEN } from './tekster';
  import type { Korrespondansefelt, Korrespondansevalg } from './korrespondansen';
  import type { VedleggForNySak } from './nysak';

  let {
    id,
    valg = $bindable(),
    feil = () => null,
    grense,
    endret = () => {},
    kapittelB = false,
  }: {
    /** ID-en til feltet for hver del. */
    id: (felt: Korrespondansefelt) => string;
    valg: Korrespondansevalg;
    /** Feilen ved feltet, eller `null`. */
    feil?: (felt: Korrespondansefelt) => string | null;
    /** Opplastingen av dokumentet, eller `null` når dokumentet ikke kan legges ved ennå (#1488). */
    grense: VedleggForNySak | null;
    /** Kalles når et felt endres, så skjemaet kan fjerne feilen ved det. */
    endret?: (felt: Korrespondansefelt) => void;
    /**
     * Opplysningen fra kapittel B over typen, for totalentreprenørens varsler og krav etter
     * kapittel 33 og 34 (VS-U72). Skjemaet for ny sak har den ved spørsmålet om punkt 32.2 (VS-U39).
     */
    kapittelB?: boolean;
  } = $props();

  const iDag = dagensDato();
  const beskrevet = (felt: Korrespondansefelt) =>
    `${id(felt)}-hjelp${feil(felt) ? ` ${id(felt)}-feil` : ''}`;
</script>

<div class="korrespondansen">
  {#if kapittelB}<p class="kapittel-b" id={`${id('type')}-kapittel-b`}>
      {KORRESPONDANSEN.kapittelB}
    </p>{/if}
  <Valg
    navn={id('type')}
    spoersmaal={KORRESPONDANSEN.typen}
    valg={KORRESPONDANSEN.typer}
    stablet
    lett
    beskrevetAv={kapittelB ? `${id('type')}-kapittel-b` : undefined}
    bind:verdi={
      () => valg.type,
      (v) => {
        valg.type = v;
        endret('type');
      }
    }
    feil={feil('type')}
  />
  {#if valg.type === 'brev'}
    <Valg
      navn={id('sendemaate')}
      spoersmaal={KORRESPONDANSEN.sendemaaten}
      valg={KORRESPONDANSEN.sendemaater}
      stablet
      lett
      bind:verdi={
        () => valg.sendemaate,
        (v) => {
          valg.sendemaate = v;
          endret('sendemaate');
        }
      }
      feil={feil('sendemaate')}
    />
  {/if}

  <div class="felt">
    <Feltetikett for={id('dato')}>{KORRESPONDANSEN.dato}</Feltetikett>
    <p class="hjelp" id={`${id('dato')}-hjelp`}>{KORRESPONDANSEN.datoHjelp}</p>
    <input
      id={id('dato')}
      type="date"
      class:ugyldig={feil('dato')}
      max={iDag}
      bind:value={valg.dato}
      aria-required="true"
      aria-invalid={feil('dato') ? 'true' : undefined}
      aria-describedby={beskrevet('dato')}
      oninput={() => endret('dato')}
    />
    {#if feil('dato')}<p class="feil" id={`${id('dato')}-feil`}>{feil('dato')}</p>{/if}
  </div>

  {#if grense}
    <Filvalg
      id={id('dokument')}
      etikett={KORRESPONDANSEN.dokumentet}
      hjelp={KORRESPONDANSEN.dokumentetHjelp}
      {grense}
      bind:vedlegg={
        () => valg.vedlegg,
        (v) => {
          valg.vedlegg = v;
          endret('dokument');
        }
      }
      feil={feil('dokument')}
    />
  {:else}
    <div class="felt">
      <span class="etikett">{KORRESPONDANSEN.dokumentet}</span>
      <p class="hjelp">{KORRESPONDANSEN.dokumentetIkkeEnnaa}</p>
    </div>
  {/if}

  <div class="felt">
    <Feltetikett for={id('beskrivelse')}>{KORRESPONDANSEN.beskrivelse}</Feltetikett>
    <p class="hjelp" id={`${id('beskrivelse')}-hjelp`}>{KORRESPONDANSEN.beskrivelseHjelp}</p>
    <textarea
      id={id('beskrivelse')}
      rows="3"
      class:ugyldig={feil('beskrivelse')}
      bind:value={valg.beskrivelse}
      aria-required="true"
      aria-invalid={feil('beskrivelse') ? 'true' : undefined}
      aria-describedby={beskrevet('beskrivelse')}
      oninput={() => endret('beskrivelse')}
    ></textarea>
    {#if feil('beskrivelse')}<p class="feil" id={`${id('beskrivelse')}-feil`}>
        {feil('beskrivelse')}
      </p>{/if}
  </div>
</div>

<style>
  /* Samme størrelse på spørsmålene, labelene og opplysningen uansett skjemaet rundt (system.md). */
  .korrespondansen {
    font-size: 16px;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }
  .kapittel-b {
    margin: 0;
    color: var(--ink-2);
  }
  .felt {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }
  .etikett {
    font-size: 16px;
    font-weight: 600;
    color: var(--ink);
  }
  .hjelp {
    color: var(--ink-3);
    font-size: 14px;
  }
  input,
  textarea {
    min-height: 44px;
    padding: 0 var(--spacing-3);
    border: var(--control-border);
    border-radius: var(--r-felt);
    font: 16px var(--font-sans);
    color: var(--ink);
    background: var(--surface);
  }
  input {
    width: 12em;
  }
  textarea {
    padding: var(--spacing-3);
    resize: vertical;
  }
  input:focus-visible,
  textarea:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .ugyldig {
    border-color: var(--danger);
    box-shadow: inset 0 0 0 1px var(--danger);
  }
  .feil {
    color: var(--danger);
    font-size: 14px;
    font-weight: 500;
  }
</style>
