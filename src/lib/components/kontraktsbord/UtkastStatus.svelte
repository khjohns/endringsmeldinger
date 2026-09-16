<script lang="ts">
  /**
   * Lagringsstatus for det felles utkastet, og valget når to har skrevet.
   *
   * Utkastet deles av teamet, så brukeren må kunne se at det lagres, og hvem
   * som sist rørte det. Ved konflikt flettes ingenting automatisk: teksten går
   * inn i et kontraktsbrev, og da skal et menneske velge hvilken som gjelder
   * framfor at «siste skriving vinner» avgjør det stille.
   */
  import { CloudOff, Check, Loader, TriangleAlert } from 'lucide-svelte';
  import type { UtkastStatus } from '$lib/kontraktsbord/submission.svelte';

  let {
    status,
    konflikt,
    sistEndretAv,
    behold,
    hentInn,
  }: {
    status: UtkastStatus;
    konflikt: { oppdatert_av: string } | null;
    sistEndretAv: string | null;
    behold: () => void;
    hentInn: () => void;
  } = $props();
</script>

{#if status === 'konflikt'}
  <section class="konflikt" role="alert">
    <div class="konflikt-topp">
      <TriangleAlert size={15} />
      <h2>{konflikt ? `${konflikt.oppdatert_av} har endret utkastet` : 'Utkastet er slettet'}</h2>
    </div>
    <p>
      {#if konflikt}
        Dere har skrevet i det samme utkastet samtidig. Teksten flettes ikke automatisk — velg
        hvilken som skal gjelde. Den andre versjonen går tapt.
      {:else}
        Utkastet er slettet siden du åpnet skjemaet. Din tekst står fortsatt her. Du kan lagre den
        som et nytt utkast.
      {/if}
    </p>
    <div class="konflikt-valg">
      <button type="button" class="primar" onclick={behold}
        >{konflikt ? 'Behold min tekst' : 'Lagre min tekst på nytt'}</button
      >
      {#if konflikt}
        <button type="button" onclick={hentInn}>Hent inn deres</button>
      {/if}
    </div>
  </section>
{:else if status !== 'uendret'}
  <p class="status" class:frakoblet={status === 'frakoblet'} role="status">
    {#if status === 'lagrer'}
      <Loader size={12} /> Lagrer …
    {:else if status === 'lagret'}
      <Check size={12} /> Lagret for teamet{#if sistEndretAv}
        · sist endret av {sistEndretAv}{/if}
    {:else if status === 'frakoblet'}
      <CloudOff size={12} /> Ikke lagret — uten kontakt med serveren. Teksten blir stående her.
    {:else if status === 'gjenopprettet'}
      Usendt tekst er hentet tilbake fra denne fanen.
    {:else if status === 'sesjon_endret'}
      Innloggingen er endret. Last siden på nytt før du fortsetter.
    {/if}
  </p>
{/if}

<style>
  .status {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0 0 14px;
    font-size: 11px;
    color: var(--ink-4);
  }
  .status.frakoblet {
    color: var(--ink-2);
  }
  .konflikt {
    margin: 0 0 20px;
    padding: 14px 16px;
    background: var(--info-bg);
    border: var(--rule-strong);
    border-radius: 10px;
  }
  .konflikt-topp {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--ink);
  }
  .konflikt-topp h2 {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
  }
  .konflikt p {
    margin: 8px 0 12px;
    max-width: 70ch;
    font-size: 12px;
    line-height: 1.55;
    color: var(--ink-2);
  }
  .konflikt-valg {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .konflikt-valg button {
    padding: 7px 13px;
    background: var(--surface);
    border: var(--rule-strong);
    border-radius: 8px;
    color: var(--ink);
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  .konflikt-valg button.primar {
    background: var(--brand-2);
    border-color: var(--brand-2);
    color: #ffffff;
  }
  .konflikt-valg button:hover {
    filter: brightness(1.05);
  }
</style>
