<!--
  Brevtråden om forholdet (#1449, prototypen `grunnlagsoversikt.html`): brevene fra begge parter
  i rekkefølgen i journalen, med nummer, part, dato og den frosne tittelen (GR-U31), og de
  registrerte brevene med datoen avsenderen oppgir (OV-U85). Under hodet står TEs beskrivelse og
  datoen TE oppgir, eller byggherrens standpunkter med lagene brevet ga dem (OV-U32) og
  begrunnelsen. Sendemåten og vedleggene venter på #807.
-->
<script lang="ts">
  import Infotips from './Infotips.svelte';
  import Knapp from './Knapp.svelte';
  import type { Brevet, Innlegget } from './lesing';
  import { FORHOLDET } from './tekster';

  let {
    brev,
    innlegg = new Map(),
    dokumentasjon,
    venterPaaSvar,
    onles,
  }: {
    brev: Brevet[];
    /** Innholdet i brevene med krav eller svar om forholdet (`innleggene`). */
    innlegg?: Map<string, Innlegget>;
    /** De registrerte brevene kjernen ikke vurderer innholdet i (OV-U19). */
    dokumentasjon: string[];
    /** Sporets betegnelse er «Svar ikke registrert» (MM-U30). */
    venterPaaSvar: boolean;
    onles: (id: string) => void;
  } = $props();
  const uid = $props.id();
</script>

<ol class="traad" aria-label={FORHOLDET.traad}>
  {#each brev as b (b.id)}
    {@const registrert = b.art === 'registrert'}
    {@const i = innlegg.get(b.id)}
    <li class="innlegg">
      <span class="part" aria-hidden="true">{b.avsender}</span>
      <div class="hode">
        <div class="tittellinje">
          <h3 id={`${uid}-${b.id}`}>
            {registrert ? FORHOLDET.registrertTittel(b.avsender) : FORHOLDET.tittel(b)}
          </h3>
          {#if registrert && dokumentasjon.includes(b.id)}
            <span class="merke">{FORHOLDET.dokumentasjon}</span>
          {/if}
          {#if registrert}
            <Infotips navn={FORHOLDET.omKorrespondansen} tekst={FORHOLDET.omKorrespondansenTekst} />
          {/if}
        </div>
        {#if b.avsnitt}
          <Knapp
            variant="lenke"
            aria-describedby={`${uid}-${b.id}`}
            data-les={b.id}
            onclick={() => onles(b.id)}>{FORHOLDET.lesBrevet}</Knapp
          >
        {/if}
        <p class="meta">
          {[
            registrert
              ? b.sendt
                ? FORHOLDET.sendtIfoelge(b.avsender, b.sendt, b.registrert)
                : FORHOLDET.lagtTil(b.avsender, b.registrert)
              : FORHOLDET.sendtHerfra(b.avsender, b.registrert),
            b.merking,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
      {#if i}
        <div class="innhold">
          {#if i.standpunkter.some((l) => l.lag)}
            <ul class="lagene" aria-label={FORHOLDET.lagene}>
              {#each i.standpunkter as l (l.standpunkt.id)}
                <li>
                  {#if l.lag}<b>{l.lag[0].toUpperCase() + l.lag.slice(1)}</b>{/if}
                  <span>{FORHOLDET.standpunkt(l.standpunkt, l.brev)}</span>
                </li>
              {/each}
            </ul>
          {:else}
            {#each i.standpunkter as l (l.standpunkt.id)}
              <p class="standpunkt">{FORHOLDET.standpunkt(l.standpunkt, l.brev)}</p>
            {/each}
          {/if}
          {#if i.utdypning || i.oppgitt}
            <div class="sitat">
              {#if i.utdypning}
                <p class="sitat-hvem">
                  {b.art === 'svar'
                    ? FORHOLDET.begrunnelsen
                    : FORHOLDET.beskrivelse(i.gjelderPaalegg)}
                </p>
                <p>«{i.utdypning}»</p>
              {/if}
              {#if i.oppgitt}
                <p class="sitat-dato">
                  {FORHOLDET.oppgitt(i.oppgitt.hva, i.oppgitt.dato, b.avsender)}
                </p>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
    </li>
  {/each}
  {#if venterPaaSvar}
    <li class="innlegg tom">
      <span class="part" aria-hidden="true">BH</span>
      <p>{FORHOLDET.svarIkkeRegistrert}</p>
    </li>
  {/if}
</ol>

<style>
  .traad {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .innlegg {
    position: relative;
    padding: var(--spacing-4) 0 var(--spacing-4) 48px;
  }
  .innlegg + .innlegg {
    border-top: var(--rule-subtle);
  }
  .innlegg::before {
    content: '';
    position: absolute;
    left: 15px;
    top: 0;
    bottom: 0;
    border-left: 1px solid var(--rule-strong-color);
  }
  .innlegg:first-child::before {
    top: var(--spacing-5);
  }
  .innlegg:last-child::before {
    bottom: auto;
    height: var(--spacing-5);
  }
  .part {
    position: absolute;
    left: 0;
    top: var(--spacing-4);
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--surface);
    border: 1.5px solid var(--ink);
    font-size: 12px;
    font-weight: 600;
    color: var(--ink);
    z-index: 1;
  }
  .hode {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: baseline;
    gap: var(--spacing-1) var(--spacing-3);
  }
  .tittellinje {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-2);
  }
  h3 {
    font-size: 16px;
    font-weight: 600;
    color: var(--ink);
  }
  .merke {
    font-size: 12px;
    font-weight: 600;
    padding: 1px var(--spacing-2);
    border: 1px solid var(--rule-strong-color);
    border-radius: var(--r-merke);
    color: var(--ink);
  }
  .hode > :global(.knapp) {
    grid-row: 1 / 3;
    grid-column: 2;
    align-self: start;
  }
  .meta {
    grid-column: 1;
    font-size: 14px;
    color: var(--ink-3);
  }
  .innhold {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    margin-top: var(--spacing-3);
  }
  .standpunkt {
    font-weight: 500;
    color: var(--ink);
  }
  .lagene {
    display: grid;
    gap: var(--spacing-2);
  }
  .lagene li {
    display: grid;
    grid-template-columns: 7rem minmax(0, 1fr);
    gap: var(--spacing-1) var(--spacing-3);
    padding-left: var(--spacing-3);
    border-left: 2px solid var(--rule-strong-color);
  }
  .lagene b {
    font-weight: 600;
  }
  .lagene span {
    color: var(--ink-2);
  }
  .sitat {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
    padding-left: var(--spacing-3);
    border-left: 2px solid var(--rule-strong-color);
    font-size: 14px;
  }
  .sitat-hvem {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .sitat-dato {
    color: var(--ink-2);
  }
  .tom p {
    font-size: 14px;
    color: var(--ink-3);
    padding-top: 6px;
  }
  .tom .part {
    border-style: dashed;
    color: var(--ink-3);
  }
  @media (max-width: 560px) {
    .innlegg {
      padding-left: 44px;
    }
    .hode {
      grid-template-columns: 1fr;
    }
    .lagene li {
      grid-template-columns: 1fr;
    }
    .hode > :global(.knapp) {
      grid-row: auto;
      grid-column: 1;
      justify-self: start;
      margin-left: calc(-1 * var(--spacing-2));
    }
  }
</style>
