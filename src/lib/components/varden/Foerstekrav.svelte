<!--
  Påminnelsen øverst i skjemaet for det første kravet i sporet (U-3 i BF-51, OV-U3): at kravet er
  det første, og varslene i sporet med brevet og datoen, sendt herfra eller oppgitt (OV-U5). Uten
  varsel står veien til å legge det til. Ingen avkrysning og ingen frist (OV-U126).
-->
<script lang="ts">
  import type { Utledning } from '#kjerne/utledning/utled.ts';
  import { varsleneISporet } from '#lib/kjernesak/kontekst.svelte.ts';
  import Knapp from './Knapp.svelte';
  import Melding from './Melding.svelte';
  import Spoersmaal from './Spoersmaal.svelte';
  import { brevet } from './lesing';
  import { HANDLINGENE, TOMT_SPOR, varselet } from './tekster';

  let {
    u,
    spor,
    hjemmel,
    onregistrer,
  }: {
    u: Utledning;
    spor: 'vederlag' | 'frist';
    /** Bestemmelsen for varselet i sporet, så registreringen heter som under «Andre handlinger» (U-3). */
    hjemmel: '33.4' | '34.1.2';
    /** Registreringen av et varsel sendt på annen måte, når den er bygget for sporet. */
    onregistrer?: () => void;
  } = $props();
  const uid = $props.id();

  const varslene = $derived(varsleneISporet(u, spor));
  let ikkeBygget = $state(false);
  const registrer = $derived(varselet('varsle', hjemmel));
</script>

<Melding art="info" levende={false}>{TOMT_SPOR.foersteKrav(spor)}</Melding>
<Spoersmaal id={`${uid}-varslene`} tittel={TOMT_SPOR.varslene(spor)}>
  {#if varslene.length}
    <ul>
      {#each varslene as v (v.id)}
        <li>{TOMT_SPOR.varselet(v, brevet(u, v.dokument))}</li>
      {/each}
    </ul>
  {:else}
    <p>{TOMT_SPOR.ingenVarsel(spor)}</p>
    <div>
      <Knapp
        variant="lenke"
        kompakt
        onclick={() => (onregistrer ? onregistrer() : (ikkeBygget = true))}>{registrer}</Knapp
      >
    </div>
    {#if !onregistrer}
      <p class="dempet" role="status">{ikkeBygget ? HANDLINGENE.ikkeBygget : ''}</p>
    {/if}
  {/if}
</Spoersmaal>

<style>
  p,
  ul {
    font-size: 14px;
    color: var(--ink-2);
  }
  ul {
    display: grid;
    gap: var(--spacing-1);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .dempet {
    color: var(--ink-3);
  }
</style>
