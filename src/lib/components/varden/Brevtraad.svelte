<!--
  Brevtråden om forholdet (#1449, prototypen `grunnlagsoversikt.html`): brevene fra begge parter
  i rekkefølgen i journalen, med nummer, part, dato og den frosne tittelen (GR-U31), og de
  registrerte brevene med datoen avsenderen oppgir (OV-U85). Sendemåten venter på #807.
-->
<script lang="ts">
  import Infotips from './Infotips.svelte';
  import Knapp from './Knapp.svelte';
  import type { Brevet } from './lesing';
  import { FORHOLDET } from './tekster';

  let {
    brev,
    dokumentasjon,
    venterPaaSvar,
    onles,
  }: {
    brev: Brevet[];
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
    <li class="innlegg" class:registrert>
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
            registrert && b.sendt
              ? FORHOLDET.sendtIfoelge(b.avsender, b.sendt, b.registrert)
              : FORHOLDET.sendtHerfra(b.avsender, b.registrert),
            b.merking,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
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
  .registrert .part {
    border-radius: var(--r-kort);
    border-style: dashed;
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
  .meta {
    grid-column: 1 / -1;
    font-size: 14px;
    color: var(--ink-3);
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
  }
</style>
