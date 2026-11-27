<!--
  Byggherrens standpunkt til et varsel etter punkt 34.3.3 eller 34.4, og til justeringen etter
  punkt 34.3.3, i svaret på kravposten og i svaret på et varsel som står alene (designdelen i
  VS-U77: samme svarskjema). Svaret på varselet etter punkt 33.4, 34.1.2 og 34.1.3 som står alene
  har samme spørsmål som for punkt 34.3.3 (VS-U87 punkt 32, VS-U96 punkt 32). Punkt 34.4 er en
  setning med en lenke (`system.md`, «Normalsvaret er en setning, unntaket en lenke»), og en innsigelse fra et tidligere svar gjentas til byggherren
  gir den opp (VS-U77 punkt 9, 10 og 12). I svaret på varselet står varselet og justeringen i
  hvert sitt punkt i brevet (`vis`), med punktet som overskrift og spørsmålet kort.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { SvarbarVarselhjemmel } from '#kjerne/typer.ts';
  import Knapp from './Knapp.svelte';
  import Valg from './Valg.svelte';
  import type { Brevref } from './lesing';
  import { SKJEMA } from './tekster';

  let {
    varselId,
    justeringId,
    hjemmel,
    foer,
    varsletITide = $bindable(null),
    godtarJustering = $bindable(null),
    ikkeGitt,
    varselValgfri = true,
    varselFeil = null,
    justeringValgfri,
    justeringFeil = null,
    foranVarselet,
    foranJusteringen,
    beskrevetAvVarselet,
    beskrevetAvJusteringen,
    etterVarselet,
    etterJusteringen,
    vis = 'begge',
  }: {
    /** Navnet på valget om varselet; standpunktet står i `${varselId}-standpunkt`. */
    varselId: string;
    justeringId: string;
    hjemmel: SvarbarVarselhjemmel;
    /**
     * Byggherrens siste standpunkt til varselet før svaret, med brevet det står i, og om
     * innsigelsen etter § 34.4 der var at varselet ikke ble gitt (`ikkeGitt`).
     */
    foer: { iTide: boolean; brev: Brevref | null; ikkeGitt: boolean } | null;
    varsletITide: boolean | null;
    godtarJustering: boolean | null;
    /** Innsigelsen etter § 34.4 i dette svaret er at varselet ikke ble gitt (VS-U77 punkt 31). */
    ikkeGitt: boolean;
    /** Svaret på varselet etter § 34.1.2 og § 34.1.3 som står alene, har bare standpunktet til det. */
    varselValgfri?: boolean;
    varselFeil?: string | null;
    justeringValgfri: boolean;
    justeringFeil?: string | null;
    /** «Gjelder hvis» over spørsmålet om varselet og om justeringen (U-8). */
    foranVarselet?: Snippet;
    foranJusteringen?: Snippet;
    beskrevetAvVarselet?: string;
    beskrevetAvJusteringen?: string;
    /** Begrunnelsen for punktet i brevet, under spørsmålet. */
    etterVarselet?: Snippet;
    etterJusteringen?: Snippet;
    /** Bare varselet eller bare justeringen, i et punkt med egen overskrift. */
    vis?: 'begge' | 'varselet' | 'justeringen';
  } = $props();

  const staar = $derived(foer?.iTide === false);
  const egetPunkt = $derived(vis !== 'begge');
  const varselTittel = $derived(
    egetPunkt ? null : hjemmel === '34.4' ? SKJEMA.varselRegning : SKJEMA.varselJustering
  );
</script>

{#snippet innsigelsenSomStaar()}
  <!-- VS-U77 punkt 9, 10 og 12: svaret gjentar innsigelsen til byggherren gir den opp. -->
  <div class="setning">
    <p id={`${varselId}-standpunkt`} aria-live="polite">
      {#if varselTittel}<strong>{varselTittel}</strong>{/if}
      {#if foer?.brev}{SKJEMA.innsigelsenStaar(foer.brev, hjemmel, foer.ikkeGitt)}{/if}
      {varsletITide === true ? SKJEMA.girOppInnsigelsen : SKJEMA.gjentarInnsigelsen}
    </p>
    <Knapp variant="lenke" iFlukt onclick={() => (varsletITide = varsletITide !== true)}
      >{varsletITide === true
        ? SKJEMA.gjentaInnsigelsenKnapp
        : SKJEMA.girOppInnsigelsenKnapp}</Knapp
    >
  </div>
{/snippet}

{#if hjemmel === '34.4' && staar}
  {@render innsigelsenSomStaar()}
  {@render etterVarselet?.()}
{:else if hjemmel === '34.4'}
  <div class="setning">
    <p id={`${varselId}-standpunkt`} aria-live="polite">
      {#if varselTittel}<strong>{varselTittel}</strong>{/if}
      {varsletITide === false
        ? ikkeGitt
          ? SKJEMA.ikkeGittEllerForSent
          : SKJEMA.varseletKomForSent
        : SKJEMA.ingenInnsigelse}
    </p>
    <Knapp
      variant="lenke"
      iFlukt
      onclick={() => (varsletITide = varsletITide === false ? null : false)}
      >{varsletITide === false
        ? SKJEMA.ingenInnsigelseLikevel
        : ikkeGitt
          ? SKJEMA.gjoerGjeldendeVarsel
          : SKJEMA.gjoerGjeldendeForSent}</Knapp
    >
  </div>
  {@render etterVarselet?.()}
{:else}
  {#if vis !== 'justeringen'}
    <div class="betinget">
      {@render foranVarselet?.()}
      {#if staar}
        {@render innsigelsenSomStaar()}
      {:else}
        <Valg
          navn={varselId}
          spoersmaal={egetPunkt ? SKJEMA.varselSpoersmaalKort : SKJEMA.varselJusteringSpoersmaal}
          valgfri={varselValgfri}
          feil={varselFeil}
          hjelp={foer?.brev ? SKJEMA.varseletITideFoer(foer.brev) : undefined}
          beskrevetAv={beskrevetAvVarselet}
          valg={[
            { verdi: true, tekst: SKJEMA.komITide },
            { verdi: false, tekst: SKJEMA.komForSent },
          ]}
          bind:verdi={varsletITide}
          lett
        />
      {/if}
      {@render etterVarselet?.()}
    </div>
  {/if}
  {#if vis !== 'varselet'}
    <div class="betinget">
      {@render foranJusteringen?.()}
      <Valg
        navn={justeringId}
        spoersmaal={egetPunkt ? SKJEMA.justeringSpoersmaalKort : SKJEMA.justeringSpoersmaal}
        valgfri={justeringValgfri}
        beskrevetAv={beskrevetAvJusteringen}
        valg={[
          { verdi: true, tekst: SKJEMA.godkjennerJustering },
          { verdi: false, tekst: SKJEMA.bestriderJustering },
        ]}
        bind:verdi={godtarJustering}
        feil={justeringFeil}
        lett
      />
      {@render etterJusteringen?.()}
    </div>
  {/if}
{/if}

<style>
  /* Punkt 34.4: normalsvaret er en setning, unntaket en lenke (system.md). */
  .setning {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-1);
  }
  /* «Gjelder hvis» hører til spørsmålet under seg, ikke til det over (U-8). */
  .betinget {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    margin-top: var(--spacing-2);
  }
</style>
