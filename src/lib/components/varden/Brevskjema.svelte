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
  import type { Kjernesakkontekst } from '#lib/kjernesak/kontekst.svelte.ts';
  import type { Utledning } from '#kjerne/utledning/utled.ts';
  import type { Korrespondansevalg } from './korrespondansen';
  import type { Brevet } from './lesing';
  import type { Mangel } from './mangler';
  import type { sendeflyt } from './sendeflyt.svelte';
  import { fastLinje } from './fastlinje.svelte';
  import { brevetVedSiden } from './medie.svelte';
  import { utkastetsHode } from './utkastetsHode';
  import Arbeidsflate from './Arbeidsflate.svelte';
  import Brev from './Brev.svelte';
  import Brevsteg from './Brevsteg.svelte';
  import { organisasjonene } from './kontrakt';
  import { PARTEN, stor } from '#kjerne/frosset/brevdeler.ts';
  import Knapp from './Knapp.svelte';
  import Forkastutkast from './Forkastutkast.svelte';
  import Lagttillinje from './Lagttillinje.svelte';
  import Leseramme from './Leseramme.svelte';
  import Manglene from './Manglene.svelte';
  import Sendeknapp from './Sendeknapp.svelte';
  import Utkastkort from './Utkastkort.svelte';
  import { BREVSTEG, LEGG_TIL, SKJEMA, brevtittel, dato } from './tekster';

  let {
    id,
    tittel,
    kjernesak,
    u,
    avsender,
    oppfolging = null,
    onvedsiden,
    sendes = true,
    lagtTil = null,
    part = null,
    onendre = () => {},
    flyt,
    mangler,
    manglerTittel,
    ongaa,
    oppsummering = $bindable(null),
    forkastTekst,
    onforkast,
    skilt = false,
    knapp,
    panel,
    tidslinje,
    kompakt = null,
    children,
    stoettekort,
  }: {
    /** ID-en til overskriften i utkastkortet; resten av ID-ene i skallet bygges av den. */
    id: string;
    tittel: string;
    kjernesak: Kjernesakkontekst;
    u: Utledning;
    avsender: Part;
    oppfolging?: { tekst: string; brev: Brevet | null; forrige?: string } | null;
    onvedsiden?: (vedSiden: boolean) => void;
    sendes?: boolean;
    /** Korrespondansen kravet eller svaret legges til fra (OV-U80), eller `null`. */
    lagtTil?: Korrespondansevalg | null;
    part?: Part | null;
    /** Tilbake til korrespondansen. */
    onendre?: () => void;
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
    /** `bred` gir knappen hele bredden i panelet. */
    knapp: { tekst: string; onclick: () => void; opptatt: boolean; bred?: boolean } | null;
    /** Panelet i høyre kolonne, med sendeknappen der den skal stå. */
    panel: Snippet<[sendeknapp: Snippet | undefined]>;
    tidslinje: Snippet;
    /**
     * Linja nederst i vinduet når panelet er ute av syne (`fastLinje`), med etiketten, og
     * eventuelt det den viser i stedet for sendeknappen. `null` uten linja.
     */
    kompakt?: {
      etikett: string;
      innhold?: Snippet<[knappen: Snippet, tilPanelet: () => void]>;
    } | null;
    children: Snippet;
    /** Et kort i høyre kolonne under panelet, som svarene fra forrige brev (VS-U65). */
    stoettekort?: Snippet;
  } = $props();

  const uid = $props.id();
  const hentOrganisasjoner = organisasjonene();
  const avsendernavn = $derived(hentOrganisasjoner()[avsender] ?? stor(PARTEN[avsender]));
  const hode = $derived(utkastetsHode(u, kjernesak.sak?.merking, tittel));
  const lesebrev = $derived(oppfolging?.brev ?? null);
  const leseId = `${uid}-lesebrev`;
  let leser = $state(false);
  const side = brevetVedSiden(
    () => onvedsiden,
    () => leser && lesebrev !== null
  );
  let panelet = $state<HTMLElement | null>(null);
  const linja = fastLinje(
    uid,
    () => panelet,
    () => kompakt === null || knapp === null || side.vedSiden
  );
</script>

<!-- Hindringen står bare under knappen i panelet, så ID-en den har, finnes én gang. -->
{#snippet handlingsrad(innhold: Snippet)}
  <div class="handling" class:bred={knapp!.bred}>{@render innhold()}</div>
{/snippet}

{#snippet sendeknappen(medHindring: boolean)}
  <Sendeknapp
    {flyt}
    onclick={knapp!.onclick}
    opptatt={knapp!.opptatt}
    {medHindring}
    ramme={handlingsrad}>{knapp!.tekst}</Sendeknapp
  >
{/snippet}

{#snippet knappen()}{@render sendeknappen(false)}{/snippet}

{#snippet sendeknapp()}{@render sendeknappen(true)}{/snippet}

{#snippet brevet(b: Brevet, ramme: 'kant' | 'innfelt')}
  <Brev
    avsender={b.avsender}
    sak={kjernesak.saksbilde?.tittel ?? ''}
    merking={b.merking}
    deresRef={b.deresRef}
    dato={dato(b.registrert)}
    tittel={brevtittel(b)}
    avsnitt={b.avsnitt ?? []}
    {ramme}
  />
{/snippet}

{#snippet leselenke()}
  <Knapp
    variant="lenke"
    kompakt
    iFlukt
    onclick={() => (leser = !leser)}
    aria-expanded={leser}
    aria-controls={leser ? leseId : undefined}
    >{leser ? SKJEMA.lukkBrevet : side.smal ? SKJEMA.lesBrevetHer : SKJEMA.lesBrevet}</Knapp
  >
{/snippet}

<Arbeidsflate leser={side.vedSiden}>
  {#snippet hoved()}
    <Utkastkort
      {id}
      {...hode}
      {avsender}
      sendes={sendes && !lagtTil}
      merke={sendes && !lagtTil ? undefined : LEGG_TIL.utkast}
      leselenke={lesebrev ? leselenke : undefined}
    >
      {#snippet referanse()}
        {#if oppfolging}<span>{oppfolging.tekst}</span>{/if}
        {#if oppfolging?.forrige}<span>{oppfolging.forrige}</span>{/if}
      {/snippet}
      {#if lesebrev && leser && side.smal}
        <div class="innebrev" id={leseId}>{@render brevet(lesebrev, 'kant')}</div>
      {/if}
      {#if lagtTil && part}
        <Lagttillinje {part} valg={lagtTil} {onendre} />
      {/if}
      {#if knapp && flyt.forsoekt && mangler.length}
        <Manglene
          tittel={lagtTil ? LEGG_TIL.mangler : manglerTittel}
          {mangler}
          {ongaa}
          bind:element={oppsummering}
        />
      {/if}

      {@render children()}

      {#if sendes && !lagtTil}
        <div class="hilsen" class:bh={avsender === 'BH'}>
          <p>{BREVSTEG.hilsen}</p>
          <p><strong>{avsendernavn}</strong></p>
        </div>
      {/if}

      <div class="skjemafot" class:skilt>
        <Forkastutkast tekst={forkastTekst} {onforkast} />
      </div>
    </Utkastkort>
  {/snippet}

  {#snippet hoeyre()}
    {#if lesebrev && side.vedSiden}
      <Leseramme id={leseId} brev={lesebrev} bunn={knapp ? sendeknapp : undefined}>
        {@render brevet(lesebrev, 'innfelt')}
      </Leseramme>
    {:else}
      <div class="feste" class:fast={linja.faarPlass} bind:this={panelet}>
        {#if sendes && !lagtTil}<div class="steg"><Brevsteg /></div>{/if}
        {@render panel(knapp ? sendeknapp : undefined)}
      </div>
      {@render stoettekort?.()}
      {@render tidslinje()}
    {/if}
  {/snippet}
</Arbeidsflate>

{#if kompakt && linja.visKompakt}
  <div class="kompakt" role="region" aria-label={kompakt.etikett}>
    {#if kompakt.innhold}{@render kompakt.innhold(knappen, () =>
        panelet?.scrollIntoView({ block: 'start' })
      )}{:else}{@render knappen()}{/if}
  </div>
{/if}

<style>
  .hilsen {
    padding: var(--spacing-5) var(--spacing-6);
    border-top: var(--rule);
    font-family: var(--font-brev);
  }
  .hilsen.bh {
    font-family: var(--font-brev-bh);
  }
  .steg {
    background: var(--surface);
    border: var(--rule);
    border-radius: var(--r-kort);
    margin-bottom: var(--spacing-2);
  }

  .innebrev {
    padding: var(--spacing-4) var(--spacing-4) 0;
  }
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
  /* `display: contents`: knappen er da et barn i panelets kolonne og fyller bredden. */
  .handling.bred {
    display: contents;
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
