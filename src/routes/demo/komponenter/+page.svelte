<script lang="ts">
  /**
   * Showcase for Varden (#1371): komponentene i `src/lib/components/varden/` i tilstandene de
   * kan ha, med saken fra startjournalen for BF-01 og `lagKjernesak`, som i `Varden.test.ts`.
   * Dagens visning står ved siden av i rammene for hele visningen.
   */
  import '$lib/components/kontraktsbord/theme.css';
  import { resolve } from '$app/paths';
  import type { Part } from '$kjerne/typer';
  import Brev from '$lib/components/varden/Brev.svelte';
  import Brevtyper from '$lib/components/varden/Brevtyper.svelte';
  import Knapp from '$lib/components/varden/Knapp.svelte';
  import Tidslinje from '$lib/components/varden/Tidslinje.svelte';
  import { tomtSvar, type Svarvalg } from '$lib/components/varden/kommandoer';
  import { brevene, oppgitteDatoer } from '$lib/components/varden/lesing';
  import {
    BREVMENY,
    SAKEN,
    SPORNAVN,
    brevtittel,
    dato,
  } from '$lib/components/varden/prototypetekst';
  import Arbeid from './Arbeid.svelte';
  import { FORLOEPET, TILSTANDER, aapneSak } from './kjernesaker';

  const SIDER: Part[] = ['BH', 'TE'];

  // Hele visningen i rammer, så bredden er skjermens og ikke kolonnens.
  let tilstand = $state(TILSTANDER[2].id);
  let side = $state<Part>('BH');
  const ramme = (visning: 'varden' | 'dagens') =>
    `${resolve('/demo/komponenter/ramme')}?visning=${visning}&tilstand=${tilstand}&side=${side}`;
  const tilstandsnavn = $derived(TILSTANDER.find((t) => t.id === tilstand)!.navn);

  const SPORET = [
    { navn: 'Tomt spor: fristen har ingen brev', punkt: 'te-har-mottatt-svaret', spor: 'frist' },
    { navn: 'Ubesvart vederlagskrav', punkt: 'bh-har-mottatt-vederlagskravet', spor: 'vederlag' },
    { navn: 'Svaret er mottatt', punkt: 'te-har-mottatt-svaret', spor: 'vederlag' },
    { navn: 'Svaret er godtatt', punkt: 'te-har-godtatt-svaret', spor: 'vederlag' },
  ] as const;
  const sporet = SPORET.map((t) => ({
    ...t,
    saker: SIDER.map((p) => ({ part: p, kjernesak: aapneSak(t.punkt, p) })),
  }));

  // Valgene i steg 4 i BF-01, som i `Varden.test.ts`.
  const BEGRUNNELSE = 'Varselet kom for sent. Subsidiært godtas 60 000 kr.';
  const utfylt = (begrunnelse = BEGRUNNELSE): Svarvalg => ({
    ...tomtSvar(),
    iTide: false,
    metode: true,
    beloep: 'deler',
    delbeloep: '60 000',
    begrunnelse,
  });
  const UBESVART = 'bh-har-mottatt-vederlagskravet';
  const svaret = [
    { navn: 'Ubesvart: tomt skjema', valg: tomtSvar() },
    { navn: 'Utfylt som i steg 4 i BF-01', valg: utfylt() },
    { navn: 'Lang begrunnelse', valg: utfylt(Array(14).fill(BEGRUNNELSE).join(' ')) },
    {
      navn: 'Feil fra serveren ved sending (500)',
      valg: utfylt(),
      feil: 'sending' as const,
    },
    {
      navn: 'Saken er endret siden den ble lastet (409)',
      valg: utfylt(),
      feil: 'konflikt' as const,
    },
  ].map((t) => ({ ...t, kjernesak: aapneSak(UBESVART, 'BH', t.feil) }));

  // Brevene, tidslinja og brevtypene leses av saken når TE har godtatt svaret.
  const godtatt = aapneSak('te-har-godtatt-svaret', 'TE');
  const u = $derived(godtatt.utledning);
  const alleBrev = $derived(u ? brevene(u) : []);
  const lengst = $derived(
    alleBrev.reduce<(typeof alleBrev)[number] | null>(
      (a, b) => (a && lengde(a) >= lengde(b) ? a : b),
      null
    )
  );
  function lengde(b: (typeof alleBrev)[number]) {
    return (b.avsnitt ?? []).reduce((n, a) => n + a.laast.length + (a.utdypning?.length ?? 0), 0);
  }
</script>

<svelte:head><title>Varden — komponentene</title></svelte:head>

<main class="showcase">
  <header>
    <p class="merke">Prototype</p>
    <h1>Varden: komponentene i tilstandene sine</h1>
    <p class="ingress">
      Komponentene i <code>src/lib/components/varden/</code>, importert. Saken er startjournalen for {FORLOEPET.id}
      ved kontrollpunktene, i minnet i nettleseren. Ingenting sendes. Dagens visning står ved siden av
      i rammene for hele visningen. Forløpet kjøres i
      <!-- href er ruta fra resolve() med visningen i query. -->
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
      <a href={`${resolve('/demo/[forlop]', { forlop: FORLOEPET.id })}?visning=varden`}>demoruta</a
      >.
    </p>
    <nav aria-label="Komponentene">
      <ul>
        <li><a href="#hele">Hele visningen</a></li>
        <li><a href="#sporet">Sporlesing</a></li>
        <li><a href="#svaret">Vederlagssvar og Brevkontroll</a></li>
        <li><a href="#brevet">Brev</a></li>
        <li><a href="#tidslinja">Tidslinje</a></li>
        <li><a href="#brevtypene">Brevtyper</a></li>
        <li><a href="#knappen">Knapp</a></li>
      </ul>
    </nav>
  </header>

  <section id="hele" aria-labelledby="hele-tittel">
    <h2 id="hele-tittel">Hele visningen: Varden og dagens visning</h2>
    <p class="forklaring">
      <code>Vardensak</code> og <code>Kjernesakrom</code> med samme sak. Rammene har egen bredde, så visningen
      bruker utformingen for den skjermen.
    </p>
    <div class="velgere">
      <label>
        <span>Tilstand</span>
        <select bind:value={tilstand}>
          {#each TILSTANDER as t (t.id)}<option value={t.id}>{t.navn}</option>{/each}
        </select>
      </label>
      <fieldset>
        <legend>Side</legend>
        {#each SIDER as p (p)}
          <label class="radio"><input type="radio" bind:group={side} value={p} />{p}</label>
        {/each}
      </fieldset>
    </div>
    {#key tilstand + side}
      <h3>Smal skjerm, 390 px</h3>
      <div class="smale">
        <figure>
          <figcaption>Varden</figcaption>
          <iframe
            class="smal"
            title={`Varden, smal skjerm: ${tilstandsnavn}, ${side}`}
            src={ramme('varden')}
          ></iframe>
        </figure>
        <figure>
          <figcaption>Dagens visning</figcaption>
          <iframe
            class="smal"
            title={`Dagens visning, smal skjerm: ${tilstandsnavn}, ${side}`}
            src={ramme('dagens')}
          ></iframe>
        </figure>
      </div>
      <h3>Bred skjerm</h3>
      <figure>
        <figcaption>Varden</figcaption>
        <iframe
          class="bred"
          title={`Varden, bred skjerm: ${tilstandsnavn}, ${side}`}
          src={ramme('varden')}
        ></iframe>
      </figure>
      <figure>
        <figcaption>Dagens visning</figcaption>
        <iframe
          class="bred"
          title={`Dagens visning, bred skjerm: ${tilstandsnavn}, ${side}`}
          src={ramme('dagens')}
        ></iframe>
      </figure>
    {/key}
  </section>

  <section id="sporet" aria-labelledby="sporet-tittel">
    <h2 id="sporet-tittel">Sporlesing</h2>
    <p class="forklaring">
      Sporet med brevet, brevtypene og tidslinja, i <code>Arbeidsflate</code>. «Ta stilling til
      svaret» åpner aksepten, og «Se brevet» åpner <code>Brevkontroll</code> i kortet.
    </p>
    {#each sporet as t (t.navn)}
      <h3>{t.navn}</h3>
      <div class="par">
        {#each t.saker as s (s.part)}
          <div class="kort" data-eksempel={`sporet-${t.punkt}-${t.spor}-${s.part}`}>
            <p class="etikett">{s.part} · {SPORNAVN[t.spor]}</p>
            <Arbeid kjernesak={s.kjernesak} spor={t.spor} />
          </div>
        {/each}
      </div>
    {/each}
  </section>

  <section id="svaret" aria-labelledby="svaret-tittel">
    <h2 id="svaret-tittel">Vederlagssvar og Brevkontroll</h2>
    <p class="forklaring">
      BHs svar på vederlagskravet, med <code>Valg</code> og <code>Hovedlinjer</code>. «Se brevet før
      sending» åpner <code>Brevkontroll</code> i kortet. TE har ikke dette skjemaet: kjernen tilbyr ikke
      TE å svare på eget krav.
    </p>
    {#each svaret as t, i (t.navn)}
      <h3>{t.navn}</h3>
      <div class="kort" data-eksempel={`svaret-${i}`}>
        <Arbeid kjernesak={t.kjernesak} svar valg={t.valg} />
      </div>
    {/each}
  </section>

  <section id="brevet" aria-labelledby="brevet-tittel">
    <h2 id="brevet-tittel">Brev</h2>
    <p class="forklaring">
      Brevene i {FORLOEPET.id} med teksten kjernen frøs. Lengst først; det er den lengste teksten i startjournalen.
    </p>
    {#if !u}
      <p class="dempet" role="status">{godtatt.feil ?? SAKEN.laster}</p>
    {:else}
      <div class="brevene">
        {#each [...(lengst ? [lengst] : []), ...alleBrev.filter((b) => b !== lengst)] as b (b.id)}
          {#if b.avsnitt}
            <div class="kort">
              <Brev
                avsender={b.avsender}
                sak={godtatt.saksbilde?.tittel ?? ''}
                nummer={String(b.nummer)}
                dato={dato(b.registrert)}
                tittel={brevtittel(b)}
                avsnitt={b.avsnitt}
              />
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  </section>

  <section id="tidslinja" aria-labelledby="tidslinja-tittel">
    <h2 id="tidslinja-tittel">Tidslinje</h2>
    <div class="tre">
      <div class="kort">
        <p class="etikett">Tom</p>
        <Tidslinje brev={[]} datoer={[]} />
      </div>
      {#if u}
        <div class="kort">
          <p class="etikett">Lukket</p>
          <Tidslinje brev={alleBrev} datoer={oppgitteDatoer(u)} />
        </div>
        <div class="kort">
          <p class="etikett">Åpen</p>
          <Tidslinje brev={alleBrev} datoer={oppgitteDatoer(u)} aapen />
        </div>
      {/if}
    </div>
  </section>

  <section id="brevtypene" aria-labelledby="brevtypene-tittel">
    <h2 id="brevtypene-tittel">Brevtyper</h2>
    <p class="forklaring">
      Menyen med handlingene kjernen tilbyr står i <code>Sporlesing</code> over, for BH og TE. Det
      er <code>Sporlesing</code> som gir teksten for varslene og innsigelsene.
    </p>
    <div class="tre">
      <div class="kort">
        <p class="etikett">Ingen handlinger</p>
        <Brevtyper tittel={BREVMENY.skriv} handlinger={[]} bygget={[]} onvelg={() => {}} />
      </div>
    </div>
  </section>

  <section id="knappen" aria-labelledby="knappen-tittel">
    <h2 id="knappen-tittel">Knapp</h2>
    <div class="knapper">
      <Knapp variant="primaer">Primær</Knapp>
      <Knapp>Sekundær</Knapp>
      <Knapp variant="lenke">Lenke</Knapp>
      <Knapp variant="primaer" opptatt>Sender …</Knapp>
      <Knapp variant="primaer" sperret hvorfor="knapp-hvorfor">Sperret</Knapp>
      <p id="knapp-hvorfor" class="dempet">Sperret: teksten sier hvorfor.</p>
    </div>
  </section>
</main>

<style>
  .showcase {
    max-width: 1440px;
    margin: 0 auto;
    padding: var(--spacing-8) var(--spacing-6) var(--spacing-12);
    background: var(--canvas);
    color: var(--ink);
    font-family: var(--font-sans);
    line-height: 1.5;
  }
  :global(body) {
    background: var(--canvas);
  }
  .merke {
    display: inline-block;
    padding: 0 var(--spacing-2);
    border: 1px dashed var(--draft-border);
    border-radius: 999px;
    background: var(--draft-bg);
    color: var(--ink-2);
    font-size: 13px;
  }
  h1 {
    margin: var(--spacing-2) 0;
    font-size: 28px;
  }
  h2 {
    margin: 0 0 var(--spacing-2);
    font-size: 22px;
  }
  h3 {
    margin: var(--spacing-6) 0 var(--spacing-2);
    font-size: 16px;
  }
  .ingress,
  .forklaring {
    max-width: 72ch;
    color: var(--ink-2);
  }
  nav ul {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-2) var(--spacing-4);
    padding: 0;
    list-style: none;
  }
  section {
    margin-top: var(--spacing-10);
    padding-top: var(--spacing-6);
    border-top: 1px solid var(--rule);
  }
  .velgere {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-4);
    align-items: end;
  }
  .velgere label,
  .velgere fieldset {
    display: flex;
    gap: var(--spacing-2);
    align-items: center;
    margin: 0;
    padding: 0;
    border: 0;
  }
  .velgere legend {
    float: left;
    margin-right: var(--spacing-2);
  }
  .radio {
    gap: var(--spacing-1);
  }
  .velgere label:has(select) {
    flex-wrap: wrap;
    max-width: 100%;
  }
  select {
    max-width: 100%;
  }
  figure {
    margin: var(--spacing-2) 0 var(--spacing-4);
  }
  figcaption,
  .etikett {
    margin: 0 0 var(--spacing-2);
    color: var(--ink-2);
    font-size: 13px;
    font-weight: 600;
  }
  iframe {
    display: block;
    border: 1px solid var(--rule);
    border-radius: var(--radius-md);
    background: var(--canvas);
  }
  .smale {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-6);
  }
  .smal {
    width: 390px;
    max-width: 100%;
    height: 844px;
  }
  .bred {
    width: 100%;
    height: 900px;
  }
  .par,
  .tre,
  .brevene {
    display: grid;
    gap: var(--spacing-4);
  }
  /* Varden gir arbeidsflaten om lag 1100 px på bred skjerm, så BH og TE står under hverandre. */
  .par {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 1100px), 1fr));
  }
  .tre {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
  }
  .kort {
    min-width: 0;
    padding: var(--spacing-4);
    border: 1px solid var(--rule);
    border-radius: var(--radius-md);
    background: var(--surface);
  }
  .knapper {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-3);
    align-items: center;
  }
  .dempet {
    color: var(--ink-2);
  }
  @media (max-width: 767px) {
    .showcase {
      padding: var(--spacing-6) var(--spacing-4) var(--spacing-10);
    }
  }
</style>
