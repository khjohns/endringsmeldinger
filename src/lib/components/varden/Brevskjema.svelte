<!--
  Skallet for et skjema som blir et brev (#2119): utkastkortet med linja for korrespondanse lagt
  til, oppsummeringen av det som mangler, spørsmålene, «Forkast utkast» nederst og høyre kolonne
  med panelet, sendeknappen og tidslinja, eller brevet ved siden av. Mønstrene står i `system.md`:
  `Utkastkort`, «Høyre kolonne i et skjema», «Lesing ved siden av», «En knapp er aldri sperret»
  og «Forkast utkast». Svarskjemaet og kravskjemaene for vederlaget og fristen bruker det, og
  sendeflyten kommer fra `sendeflyt.svelte.ts`.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Part } from '#kjerne/typer.ts';
  import type { Korrespondansevalg } from './korrespondansen';
  import type { Brevet } from './lesing';
  import type { Mangel } from './mangler';
  import type { sendeflyt } from './sendeflyt.svelte';
  import { fastLinje } from './fastlinje.svelte';
  import Arbeidsflate from './Arbeidsflate.svelte';
  import Forkastutkast from './Forkastutkast.svelte';
  import Knapp from './Knapp.svelte';
  import Lagttillinje from './Lagttillinje.svelte';
  import Leseramme from './Leseramme.svelte';
  import Manglene from './Manglene.svelte';
  import Melding from './Melding.svelte';
  import Utkastkort from './Utkastkort.svelte';
  import { LEGG_TIL } from './tekster';

  let {
    id,
    tittel,
    undertittel = null,
    mottaker,
    infotips,
    lagtTil = null,
    part = null,
    onendre = () => {},
    oeverst,
    flyt,
    mangler,
    manglerTittel,
    ongaa,
    oppsummering = $bindable(null),
    forkastTekst,
    onforkast,
    skilt = false,
    knapp,
    lesing = null,
    panel,
    tidslinje,
    kompakt = null,
    children,
  }: {
    /** ID-en til overskriften i utkastkortet; resten av ID-ene i skallet bygges av den. */
    id: string;
    tittel: string | null;
    undertittel?: string | null;
    mottaker: string;
    infotips?: Snippet;
    /** Korrespondansen kravet eller svaret legges til fra (OV-U80), eller `null`. */
    lagtTil?: Korrespondansevalg | null;
    part?: Part | null;
    /** Tilbake til korrespondansen. */
    onendre?: () => void;
    /** Det som står over oppsummeringen, som linja om brevet skjemaet følger opp. */
    oeverst?: Snippet;
    flyt: ReturnType<typeof sendeflyt>;
    mangler: Mangel[];
    /** Tittelen på oppsummeringen av det som mangler, for et brev som sendes herfra. */
    manglerTittel: string;
    ongaa: (m: Mangel, e: MouseEvent) => void;
    oppsummering?: HTMLElement | null;
    forkastTekst: string;
    onforkast: () => void;
    /** En linje over «Forkast utkast», når det over ikke slutter med en. */
    skilt?: boolean;
    /** Sendeknappen, eller `null` når skjemaet ikke kan sendes nå. */
    knapp: { tekst: string; onclick: () => void; opptatt: boolean } | null;
    /** Brevet som leses ved siden av skjemaet, eller `null` når det ikke gjør det. */
    lesing?: { id: string; brev: Brevet; innhold: Snippet } | null;
    /** Panelet i høyre kolonne, med sendeknappen der den skal stå. */
    panel: Snippet<[sendeknapp: Snippet | undefined]>;
    tidslinje: Snippet;
    /**
     * Linja nederst i vinduet når panelet er ute av syne (`fastLinje`), med etiketten, og
     * eventuelt det den viser i stedet for sendeknappen. `null` uten linja.
     */
    kompakt?: {
      etikett: string;
      innhold?: Snippet<[tilPanelet: () => void]>;
    } | null;
    children: Snippet;
  } = $props();

  const uid = $props.id();
  let panelet = $state<HTMLElement | null>(null);
  const linja = fastLinje(
    uid,
    () => panelet,
    () => kompakt === null || knapp === null || lesing !== null
  );
</script>

{#snippet sendeknapp()}
  <div class="handling">
    <Knapp
      variant="primaer"
      onclick={knapp!.onclick}
      opptatt={knapp!.opptatt}
      aria-describedby={flyt.hindring ? flyt.hindringId : undefined}>{knapp!.tekst}</Knapp
    >
  </div>
  {#if flyt.hindring}
    <Melding art="feil" levende={false} id={flyt.hindringId} tabindex="-1">{flyt.hindring}</Melding>
  {/if}
{/snippet}

<Arbeidsflate leser={lesing !== null}>
  {#snippet hoved()}
    <Utkastkort
      {id}
      {tittel}
      {undertittel}
      {mottaker}
      merke={lagtTil ? LEGG_TIL.utkast : undefined}
      {infotips}
    >
      {#if lagtTil && part}
        <Lagttillinje {part} valg={lagtTil} {onendre} />
      {/if}
      {@render oeverst?.()}
      {#if flyt.forsoekt && mangler.length}
        <Manglene
          tittel={lagtTil ? LEGG_TIL.mangler : manglerTittel}
          {mangler}
          {ongaa}
          bind:element={oppsummering}
        />
      {/if}

      {@render children()}

      <div class="skjemafot" class:skilt>
        <Forkastutkast tekst={forkastTekst} {onforkast} />
      </div>
    </Utkastkort>
  {/snippet}

  {#snippet hoeyre()}
    {#if lesing}
      <Leseramme id={lesing.id} brev={lesing.brev} bunn={knapp ? sendeknapp : undefined}>
        {@render lesing.innhold()}
      </Leseramme>
    {:else}
      <div class="feste" class:fast={linja.faarPlass} bind:this={panelet}>
        {@render panel(knapp ? sendeknapp : undefined)}
      </div>
      {@render tidslinje()}
    {/if}
  {/snippet}
</Arbeidsflate>

{#if kompakt && linja.visKompakt}
  <div class="kompakt" role="region" aria-label={kompakt.etikett}>
    {#if kompakt.innhold}{@render kompakt.innhold(() =>
        panelet?.scrollIntoView({ block: 'start' })
      )}{:else}{@render sendeknapp()}{/if}
  </div>
{/if}

<style>
  .skjemafot {
    padding: var(--spacing-3) var(--spacing-6) var(--spacing-4);
  }
  .skjemafot.skilt {
    border-top: var(--rule);
  }
  .handling {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }
  /* Over tidslinja, som ruller under: den åpne chevronen er rotert og ville ellers ligget
     øverst og tatt klikkene i panelet. */
  .feste.fast {
    position: sticky;
    top: var(--spacing-4);
    z-index: 1;
  }
  .kompakt {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-3);
    padding: var(--spacing-3) var(--spacing-6);
    background: var(--surface);
    border-top: var(--rule-strong);
  }
</style>
