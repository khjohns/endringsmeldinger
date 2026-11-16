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
    laster = $bindable(false),
    endret = () => {},
  }: {
    /** ID-en til feltet for hver del. */
    id: (felt: Korrespondansefelt) => string;
    valg: Korrespondansevalg;
    /** Feilen ved feltet, eller `null`. */
    feil?: (felt: Korrespondansefelt) => string | null;
    /** Opplastingen av dokumentet, eller `null` når dokumentet ikke kan legges ved ennå (#1488). */
    grense: VedleggForNySak | null;
    laster?: boolean;
    /** Kalles når et felt endres, så skjemaet kan fjerne feilen ved det. */
    endret?: (felt: Korrespondansefelt) => void;
  } = $props();

  const fid = (felt: Korrespondansefelt) => id(felt);
  const iDag = dagensDato();
  const beskrevet = (felt: Korrespondansefelt) =>
    `${fid(felt)}-hjelp${feil(felt) ? ` ${fid(felt)}-feil` : ''}`;
</script>

<div class="korrespondansen">
  <Valg
    navn={fid('type')}
    spoersmaal={KORRESPONDANSEN.typen}
    valg={KORRESPONDANSEN.typer}
    stablet
    lett
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
      navn={fid('sendemaate')}
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
    <Feltetikett for={fid('dato')}>{KORRESPONDANSEN.dato}</Feltetikett>
    <p class="hjelp" id={`${fid('dato')}-hjelp`}>{KORRESPONDANSEN.datoHjelp}</p>
    <input
      id={fid('dato')}
      type="date"
      class:ugyldig={feil('dato')}
      max={iDag}
      bind:value={valg.dato}
      aria-required="true"
      aria-invalid={feil('dato') ? 'true' : undefined}
      aria-describedby={beskrevet('dato')}
      oninput={() => endret('dato')}
    />
    {#if feil('dato')}<p class="feil" id={`${fid('dato')}-feil`}>{feil('dato')}</p>{/if}
  </div>

  {#if grense}
    <Filvalg
      id={fid('dokument')}
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
      bind:laster
      feil={feil('dokument')}
    />
  {:else}
    <div class="felt">
      <span class="etikett">{KORRESPONDANSEN.dokumentet}</span>
      <p class="hjelp">{KORRESPONDANSEN.dokumentetIkkeEnnaa}</p>
    </div>
  {/if}

  <div class="felt">
    <Feltetikett for={fid('beskrivelse')}>{KORRESPONDANSEN.beskrivelse}</Feltetikett>
    <p class="hjelp" id={`${fid('beskrivelse')}-hjelp`}>{KORRESPONDANSEN.beskrivelseHjelp}</p>
    <textarea
      id={fid('beskrivelse')}
      rows="3"
      class:ugyldig={feil('beskrivelse')}
      bind:value={valg.beskrivelse}
      aria-required="true"
      aria-invalid={feil('beskrivelse') ? 'true' : undefined}
      aria-describedby={beskrevet('beskrivelse')}
      oninput={() => endret('beskrivelse')}
    ></textarea>
    {#if feil('beskrivelse')}<p class="feil" id={`${fid('beskrivelse')}-feil`}>
        {feil('beskrivelse')}
      </p>{/if}
  </div>
</div>

<style>
  .korrespondansen {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
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
