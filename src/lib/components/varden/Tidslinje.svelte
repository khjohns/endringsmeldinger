<!--
  Tidslinja i sporet (Varden, valget 27.10 i #1331): datoene partene har oppgitt (ring), brev
  som er sendt (fylt prikk) og brev som er registrert (firkant), med kilden for hver. Brevet står
  med hva det gjør og nummeret i kilden, som i prototypen `grunnlagsoversikt.html`. Ingen
  dager mellom oppføringene: avstanden mellom to tilfeldige oppføringer kan se ut som et
  varslingsintervall. Står åpen fra starten og kan legges sammen (oppdragsgiver 29.10, #1391).
-->
<script lang="ts">
  import { ChevronRight } from 'lucide-svelte';
  import type { Brevet, OppgittDato } from './lesing';
  import { OPPGITT, TIDSLINJE, dato, klokke } from './tekster';

  let {
    brev,
    datoer,
    utfylt = [],
    frister = [],
    aapen = true,
  }: {
    brev: Brevet[];
    datoer: OppgittDato[];
    /** Datoene i et brev som ennå ikke er sendt, med teksten skjemaet gir dem. */
    utfylt?: { naar: string; hva: string; kilde: string }[];
    /** Fristene i kontrakten, etter datoen, i en egen gruppe (BF-20 U-5). En krevd frist har fylt ring. */
    frister?: { noekkel: string; naar: string; hva: string; kilde: string; krevd: boolean }[];
    aapen?: boolean;
  } = $props();

  type Oppfoering = {
    noekkel: string;
    naar: string;
    merke: 'oppgitt' | 'sendt' | 'registrert';
    hva: string;
    kilde: string;
  };

  const oppfoeringer = $derived<Oppfoering[]>(
    [
      // To parter kan oppgi samme dato i samme brev, så datoene skilles på plassen (#1393).
      // Datoen avsenderen oppgir for registrert korrespondanse står én gang, på brevet (OV-U85).
      ...datoer
        .filter(
          (d) =>
            !(
              d.hva === 'sendt' &&
              brev.some((b) => b.id === d.brev.id && b.art === 'registrert' && b.sendt === d.dato)
            )
        )
        .map(
          (d, i): Oppfoering => ({
            noekkel: `oppgitt-${i}`,
            naar: d.dato,
            merke: 'oppgitt',
            hva: OPPGITT[d.hva],
            kilde: TIDSLINJE.oppgitt(d.oppgittAv, d.brev),
          })
        ),
      ...utfylt.map((d, i): Oppfoering => ({ noekkel: `utfylt-${i}`, merke: 'oppgitt', ...d })),
      ...brev.map(
        (b): Oppfoering => ({
          noekkel: b.id,
          // Registrert korrespondanse står på datoen avsenderen oppgir (OV-U85, #1596).
          naar: b.sendt ?? b.registrert,
          merke: b.art === 'registrert' ? 'registrert' : 'sendt',
          hva: TIDSLINJE.hva(b),
          kilde:
            b.art === 'registrert'
              ? TIDSLINJE.registrert(b.avsender, b.registrert)
              : `${TIDSLINJE.sendt(b.avsender, b)} kl. ${klokke(b.registrert)}`,
        })
      ),
    ].sort((a, b) => a.naar.localeCompare(b.naar))
  );
  const uid = $props.id();
  const fristene = $derived([...frister].sort((a, b) => a.naar.localeCompare(b.naar)));
  const antall = $derived(oppfoeringer.length + fristene.length);
</script>

<section class="kort" aria-label={TIDSLINJE.tittel}>
  {#if antall}
    <details open={aapen}>
      <summary class="hode">
        <span class="tittel">{TIDSLINJE.tittel}</span>
        <span class="antall">{TIDSLINJE.oppfoeringer(antall)}</span>
        <ChevronRight size={16} aria-hidden="true" />
      </summary>
      <ol class="liste">
        {#each oppfoeringer as o (o.noekkel)}
          <li class="rad">
            <span class="merke merke-{o.merke}" aria-hidden="true"></span>
            <div>
              <p class="naar">{dato(o.naar)}</p>
              <p class="hva">{o.hva}</p>
              <p class="kilde">{o.kilde}</p>
            </div>
          </li>
        {/each}
      </ol>
      {#if fristene.length}
        <h3 class="gruppe" id={`${uid}-fristene`}>{TIDSLINJE.fristene}</h3>
        <ol class="liste" aria-labelledby={`${uid}-fristene`}>
          {#each fristene as f (f.noekkel)}
            <li class="rad">
              <span class="merke {f.krevd ? 'merke-sendt' : 'merke-oppgitt'}" aria-hidden="true"
              ></span>
              <div>
                <p class="naar">{dato(f.naar)}</p>
                <p class="hva">{f.hva}</p>
                {#if f.kilde}<p class="kilde">{f.kilde}</p>{/if}
              </div>
            </li>
          {/each}
        </ol>
      {/if}
    </details>
  {:else}
    <!-- Uten oppføringer er det ingenting å åpne, så hodet er ingen knapp (#1391). -->
    <div class="hode">
      <span class="tittel">{TIDSLINJE.tittel}</span>
      <span class="antall">{TIDSLINJE.tom}</span>
    </div>
  {/if}
</section>

<style>
  .kort {
    background: var(--surface);
    border: var(--rule);
    border-radius: var(--r-kort);
  }
  .hode {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    min-height: 48px;
    padding: var(--spacing-3) var(--spacing-5);
  }
  /* Fyller kortet, så hjørnene følger kortets innerkant. Åpen fortsetter lista under. */
  summary {
    border-radius: calc(var(--r-kort) - 1px);
    cursor: pointer;
    list-style: none;
  }
  details[open] summary {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }
  summary:hover {
    background: var(--surface-inset);
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  summary :global(svg) {
    color: var(--ink-3);
    transition: transform 150ms cubic-bezier(0.23, 1, 0.32, 1);
  }
  details[open] summary :global(svg) {
    transform: rotate(90deg);
  }
  @media (prefers-reduced-motion: reduce) {
    summary :global(svg) {
      transition: none;
    }
  }
  .tittel {
    font-size: 16px;
    font-weight: 600;
    margin-right: auto;
  }
  .antall {
    color: var(--ink-3);
    font-size: 12px;
  }
  .gruppe {
    padding: 0 var(--spacing-5) var(--spacing-3);
    color: var(--ink-3);
    font-size: 12px;
    font-weight: 600;
  }
  .liste {
    padding: 0 var(--spacing-5) var(--spacing-5);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }
  .rad {
    display: grid;
    grid-template-columns: 12px 1fr;
    gap: var(--spacing-3);
    align-items: start;
  }
  .merke {
    width: 10px;
    height: 10px;
    margin-top: 6px;
    border: 2px solid var(--ink-2);
  }
  .merke-oppgitt {
    border-radius: 50%;
    background: var(--surface);
  }
  .merke-sendt {
    border-radius: 50%;
    background: var(--ink-2);
  }
  .merke-registrert {
    background: var(--surface);
  }
  .naar {
    font-weight: 600;
    font-size: 14px;
  }
  .hva {
    font-size: 14px;
  }
  .kilde {
    color: var(--ink-3);
    font-size: 12px;
  }
</style>
