<!--
  Forklaringene av hvordan løsningen virker, som ikke står ved feltene (OV-U81, #1443).
  Siden leses uten innlogging og henter ingen data (#1452).
-->
<script lang="ts">
  import { resolve } from '$app/paths';
</script>

<div class="tema-varden side">
  <header class="topp">
    <a class="merkenavn" href={resolve('/')}>Varden</a>
  </header>

  <main class="ark" aria-labelledby="om-varden-tittel">
    <div class="hode">
      <h1 id="om-varden-tittel">Om Varden</h1>
      <p class="ingress">
        I Varden sender totalentreprenøren og byggherren varsler, krav og svar om endringer etter NS
        8407. Her står det løsningen gjør med det dere sender og legger til, og det den ikke gjør.
      </p>
    </div>

    <section aria-labelledby="om-innholdet">
      <h2 id="om-innholdet">Innholdet i korrespondansen vurderes ikke</h2>
      <p>
        Løsningen vurderer ikke innholdet i dokumentene som legges til, og avgjør ikke hvilken
        betydning de har for partenes rettigheter og plikter.
      </p>
      <p>
        Ved korrespondansen står det løsningen vet: typen, avsenderen, datoen, sendemåten, hvem som
        la den til og når, og kategorien.
      </p>
    </section>

    <section aria-labelledby="om-datoen">
      <h2 id="om-datoen">Datoen er den avsenderen oppgir</h2>
      <p>
        Et varsel, et krav eller et svar som er sendt på en annen måte, har datoen avsenderen
        oppgir. Har motparten lagt det til med en annen dato, står begge, med parten som oppga dem.
        Løsningen avgjør ikke når korrespondansen ble sendt eller kom fram.
      </p>
    </section>

    <section aria-labelledby="om-begrunnelsen">
      <h2 id="om-begrunnelsen">Begrunnelsen tolkes ikke</h2>
      <p>
        I et brev herfra følger virkningen av valgene parten gjør i skjemaet. Begrunnelsen står i
        brevet slik parten skrev den, og løsningen tolker den ikke. Det er hele brevet som er
        partens standpunkt.
      </p>
    </section>

    <section aria-labelledby="om-avgjoerelsene">
      <h2 id="om-avgjoerelsene">Uenighet avgjøres ikke her</h2>
      <p>
        Løsningen avgjør ikke det kontrakten overlater til partene, en oppmann eller domstolene.
      </p>
    </section>

    <p class="fot"><a href={resolve('/')}>Til Varden</a></p>
  </main>
</div>

<style>
  .side {
    min-height: 100dvh;
    background: var(--canvas);
    color: var(--ink);
    font-family: var(--font-sans);
  }
  .topp {
    border-bottom: 1px solid var(--rule-color);
    background: var(--surface);
    padding: 0 var(--spacing-6);
  }
  .merkenavn {
    font-size: 16px;
    font-weight: 600;
    color: var(--ink);
    text-decoration: none;
  }
  .merkenavn:hover {
    text-decoration: underline;
  }
  a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    border-radius: 2px;
  }
  .ark {
    max-width: var(--varden-ark);
    margin: var(--spacing-8) auto;
    padding: var(--spacing-8) var(--spacing-10);
    background: var(--surface);
    border: 1px solid var(--rule-color);
    border-top: 3px solid var(--ink);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-8);
  }
  .hode {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }
  h1 {
    font-size: 24px;
    font-weight: 600;
    letter-spacing: var(--sperring-24);
  }
  .ingress {
    font-size: 16px;
    line-height: 1.6;
    color: var(--ink-2);
  }
  section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }
  h2 {
    font-size: 20px;
    font-weight: 600;
    letter-spacing: var(--sperring-20);
  }
  p {
    font-size: 14px;
    line-height: 1.6;
    max-width: 65ch;
  }
  .fot {
    font-size: 14px;
    color: var(--ink-2);
  }
  .fot a {
    color: var(--ink);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  a:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  @media (max-width: 640px) {
    .ark {
      margin: 0;
      padding: var(--spacing-6) var(--spacing-4);
      border-left: 0;
      border-right: 0;
    }
  }
</style>
