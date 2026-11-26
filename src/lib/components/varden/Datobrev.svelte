<!--
  Skjemaet for et eget brev der TE oppgir én dato: korrigeringen av datoen i påberopelsen (BF-02A)
  og datoen etter punkt 34.1.3 (BF-48). Utkastkortet har opplysningen brevet gjelder, hva brevet
  gjør med saken, datofeltet og forklaringen, og panelet til høyre har hovedlinjene og «Se brevet
  før sending» over tidslinja. Kalleren lager kommandoen, kontrollerer datoen og sender.
-->
<script lang="ts">
  import { FileText } from 'lucide-svelte';
  import type { Snippet } from 'svelte';
  import Arbeidsflate from './Arbeidsflate.svelte';
  import Datofelt from './Datofelt.svelte';
  import Forkastutkast from './Forkastutkast.svelte';
  import Hovedlinjer from './Hovedlinjer.svelte';
  import Tekstomraade from './Tekstomraade.svelte';
  import Utkastkort from './Utkastkort.svelte';
  import type { utkastetsHode } from './utkastetsHode';

  let {
    id,
    hode,
    onsubmit,
    rader,
    virkninger,
    dato,
    datoen = $bindable(),
    forklaring,
    forklaringen = $bindable(),
    panel,
    sendeknapp,
    tidslinje,
    forkastTekst,
    onforkast,
  }: {
    /** Prefikset for ID-ene; datofeltet har `${id}-dato`. */
    id: string;
    hode: ReturnType<typeof utkastetsHode>;
    onsubmit: () => void;
    /** Opplysningen brevet gjelder, som rader med etikett og verdi. */
    rader: { dt: string; dd: string }[];
    /** Hva brevet gjør med saken, ett avsnitt per linje. */
    virkninger: string[];
    dato: { etikett: string; hjelp: string; maks: string; feil: string | null };
    /** «2026-09-20», tom før TE har skrevet den. */
    datoen: string;
    forklaring: { etikett: string; hjelp: string };
    forklaringen: string;
    panel: { tittel: string; tom: string; linjer: { tekst: string; lag: null }[] };
    sendeknapp: Snippet;
    tidslinje: Snippet;
    forkastTekst: string;
    onforkast: () => void;
  } = $props();
</script>

<Arbeidsflate>
  {#snippet hoved()}
    <Utkastkort id={`${id}-tittel`} {...hode} avsender="TE" {onsubmit}>
      <div class="gjelder">
        <FileText size={16} aria-hidden="true" />
        <dl>
          {#each rader as r (r.dt)}
            <div>
              <dt>{r.dt}</dt>
              <dd>{r.dd}</dd>
            </div>
          {/each}
        </dl>
      </div>

      <div class="innhold">
        <div class="virkning">
          {#each virkninger as v (v)}<p>{v}</p>{/each}
        </div>

        <Datofelt
          id={`${id}-dato`}
          etikett={dato.etikett}
          hjelp={dato.hjelp}
          maks={dato.maks}
          bind:verdi={datoen}
          paakrevd
          feil={dato.feil}
        />

        <Tekstomraade
          id={`${id}-forklaring`}
          etikett={forklaring.etikett}
          valgfri
          hjelp={forklaring.hjelp}
          rader={4}
          bind:verdi={forklaringen}
        />

        <div class="skjemafot">
          <Forkastutkast tekst={forkastTekst} {onforkast} />
        </div>
      </div>
    </Utkastkort>
  {/snippet}

  {#snippet hoeyre()}
    <div class="feste">
      <Hovedlinjer
        tittel={panel.tittel}
        tom={panel.tom}
        linjer={panel.linjer}
        alternativer={false}
        handling={sendeknapp}
      />
    </div>
    {@render tidslinje()}
  {/snippet}
</Arbeidsflate>

<style>
  .gjelder {
    display: flex;
    gap: var(--spacing-3);
    padding: var(--spacing-3) var(--spacing-6);
    background: var(--surface-inset);
    border-top: var(--rule);
    border-bottom: var(--rule);
    font-size: 14px;
  }
  .gjelder :global(svg) {
    flex: none;
    margin-top: 3px;
  }
  .gjelder dl {
    display: grid;
    gap: var(--spacing-1);
    margin: 0;
  }
  .gjelder dl > div {
    display: grid;
    grid-template-columns: 8rem 1fr;
    gap: var(--spacing-3);
  }
  .gjelder dt {
    color: var(--ink-3);
  }
  .gjelder dd {
    margin: 0;
    color: var(--ink);
  }
  .innhold {
    display: grid;
    gap: var(--spacing-6);
    padding: var(--spacing-5) var(--spacing-6) var(--spacing-6);
  }
  .virkning {
    display: grid;
    gap: var(--spacing-2);
    color: var(--ink-2);
  }
  .skjemafot {
    padding-top: var(--spacing-4);
    border-top: var(--rule);
  }
  .feste {
    position: sticky;
    top: var(--spacing-6);
  }
  @media (max-width: 560px) {
    .gjelder dl > div {
      grid-template-columns: 1fr;
      gap: 0;
    }
  }
</style>
