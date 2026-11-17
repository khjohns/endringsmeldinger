<!--
  Korrespondansen sendt utenfor løsningen: varselet i skjemaet for ny sak, fristkravet og
  vederlagskravet, og kravet, svaret eller aksepten som legges til (OV-U98). Typen, sendemåten for
  et brev, datoen det ble sendt, dokumentet og den korte beskrivelsen (OV-U79, VS-U34, VS-U38, A1 i
  #2056). Skjemaet gir ID-en til hvert felt, så
  oppsummeringen av feilene kan flytte fokus dit.
-->
<script lang="ts">
  import Datofelt from './Datofelt.svelte';
  import Filvalg from './Filvalg.svelte';
  import Tekstomraade from './Tekstomraade.svelte';
  import Valg from './Valg.svelte';
  import { dagensDato, KORRESPONDANSEN, type Korrespondansehva } from './tekster';
  import type { Korrespondansefelt, Korrespondansevalg } from './korrespondansen';
  import type { VedleggForNySak } from './nysak';

  let {
    id,
    valg = $bindable(),
    feil = () => null,
    grense,
    endret = () => {},
    kapittelB = false,
    hva = 'varsel',
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
    /** Det korrespondansen er etter kontrakten, som bestemmer ordene (OV-U80). */
    hva?: Korrespondansehva;
  } = $props();

  const iDag = dagensDato();
</script>

<div class="korrespondansen">
  {#if kapittelB}<p class="kapittel-b" id={`${id('type')}-kapittel-b`}>
      {KORRESPONDANSEN.kapittelB}
    </p>{/if}
  <Valg
    navn={id('type')}
    spoersmaal={KORRESPONDANSEN.typen(hva)}
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

  <Datofelt
    id={id('dato')}
    etikett={KORRESPONDANSEN.dato}
    hjelp={KORRESPONDANSEN.datoHjelp}
    maks={iDag}
    bind:verdi={valg.dato}
    paakrevd
    feil={feil('dato')}
    oninput={() => endret('dato')}
  />

  {#if grense}
    <Filvalg
      id={id('dokument')}
      etikett={KORRESPONDANSEN.dokumentet(hva)}
      hjelp={KORRESPONDANSEN.dokumentetHjelp(hva)}
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
      <span class="etikett">{KORRESPONDANSEN.dokumentet(hva)}</span>
      <p class="hjelp">{KORRESPONDANSEN.dokumentetIkkeEnnaa}</p>
    </div>
  {/if}

  <Tekstomraade
    id={id('beskrivelse')}
    etikett={KORRESPONDANSEN.beskrivelse(hva)}
    hjelp={KORRESPONDANSEN.beskrivelseHjelp}
    bind:verdi={valg.beskrivelse}
    paakrevd
    feil={feil('beskrivelse')}
    oninput={() => endret('beskrivelse')}
  />
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
</style>
