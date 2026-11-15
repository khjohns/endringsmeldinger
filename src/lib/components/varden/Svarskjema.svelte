<!--
  Skallet for byggherrens svar på et krav om vederlag eller frist (#1925): skjemaet vurderer,
  panelet viser hovedlinjene slik kjernen forhåndsviser svaret, og brevet viser alt (prinsipp 3).
  Spørsmålene er sporets egne; skallet har brevet svaret gjelder, oppsummeringen av det som mangler,
  begrunnelsene, forbeholdet, «Forkast utkast» og brevkontrollen.

  Handlingene (oppdragsgiver 29.10, #1391): «Se brevet før sending» står bare i panelet og er
  alltid aktiv. Mangler et svar, vises ikke brevet, og det som mangler, står ved feltet og øverst
  i skjemaet (MM-U32, BF-01 S-3 med reserven B, fordi kjernen ikke lager tekst for et
  ufullstendig svar). Brevet leses ved siden av skjemaet, og på smal skjerm i skjemaet.
-->
<script lang="ts">
  import { FileText, Info } from 'lucide-svelte';
  import { tick, type Snippet } from 'svelte';
  import type { Utledning } from '$kjerne/utledning/utled';
  import { brevaarsak, type Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';
  import { VIRKNING } from '$lib/kjernesak/svarvirkning';
  import { kontrollbrev, type TilBrevkontrollen } from './Brevkontroll.svelte';
  import { fastLinje } from './fastlinje.svelte';
  import { medietreff } from './medie.svelte';
  import Arbeidsflate from './Arbeidsflate.svelte';
  import Brev from './Brev.svelte';
  import Forkastutkast from './Forkastutkast.svelte';
  import Hovedlinjer from './Hovedlinjer.svelte';
  import Infotips from './Infotips.svelte';
  import Knapp from './Knapp.svelte';
  import Melding from './Melding.svelte';
  import Tidslinje from './Tidslinje.svelte';
  import Utkastkort from './Utkastkort.svelte';
  import { brevene, datoerISporet } from './lesing';
  import {
    begrunnelsespunktene,
    kravbrevetI,
    SVARSKJEMA,
    type Mangel,
    type Postvelger,
  } from './svarskjema';
  import { FRISTSVAR, HOVEDLINJER, SKJEMA, brevhode, brevtittel, dato } from './tekster';

  let {
    kjernesak,
    u,
    spor,
    utkast,
    medTekstene,
    tekster = $bindable(),
    linjer,
    alternativer = false,
    virkninger,
    mangler,
    postliste,
    stopp = null,
    onbrevkontroll,
    onforkast,
    onvedsiden,
    spoersmaal,
  }: {
    kjernesak: Kjernesakkontekst;
    u: Utledning;
    spor: 'vederlag' | 'frist';
    /** Svaret uten begrunnelsene og forbeholdet, så det ikke regnes på nytt for hvert tegn. */
    utkast: Record<string, unknown>;
    /** Svaret med tekstene for punktene brevet har, når BH vil se brevet. */
    medTekstene: (punktene: readonly string[]) => Record<string, unknown>;
    /** Tekstene står når BH går til brevkontrollen og tilbake. */
    tekster: { begrunnelser: Record<string, string>; forbehold: string };
    linjer: TilBrevkontrollen['detteSender'];
    /** Beløp i mer enn ett lag er alternativer, ikke tillegg (Varden, skjerm B). */
    alternativer?: boolean;
    virkninger: string[];
    mangler: Mangel[];
    postliste?: Postvelger | null;
    /** Det som hindrer at svaret kan gis nå; skjemaet viser da bare meldingen. */
    stopp?: string | null;
    onbrevkontroll: (k: TilBrevkontrollen) => void;
    /** BH har bekreftet at utkastet skal forkastes. */
    onforkast: () => void;
    /** Brevet leses i en ramme ved siden av skjemaet, eller ikke lenger. */
    onvedsiden?: (vedSiden: boolean) => void;
    /** Spørsmålene, med beskjeden for feltet med ID-en når BH har prøvd å se brevet. */
    spoersmaal: Snippet<[feil: (id: string) => string | null]>;
  } = $props();
  const uid = $props.id();

  const alleBrev = $derived(brevene(u));
  const kravbrevet = $derived(kravbrevetI(u, spor));
  const sporbrev = $derived(alleBrev.filter((b) => b.spor.includes(spor)));
  const datoer = $derived(datoerISporet(u, spor));

  // Nummeret og tittelen står i raden kjernen ville skrevet (LV-U44, LV-U27), og punktene i
  // brevet kjernen lager uten tekstene.
  const utkastbrev = $derived(kjernesak.brev(utkast));
  const brevMedTekst = $derived(utkastbrev && 'tekst' in utkastbrev ? utkastbrev : null);
  const punktene = $derived(
    utkastbrev && 'avsnitt' in utkastbrev ? begrunnelsespunktene(utkastbrev.avsnitt ?? []) : []
  );

  // Beskjedene vises først når BH har prøvd å se brevet (MM-U32), og forsvinner når feltet er besvart.
  let forsoekt = $state(false);
  const feil = (id: string): string | null =>
    forsoekt ? (mangler.find((m) => m.felt === id)?.tekst ?? null) : null;
  let oppsummering = $state<HTMLElement | null>(null);
  let sendehindring = $state<string | null>(null);

  async function seBrevet() {
    sendehindring = null;
    if (mangler.length) {
      forsoekt = true;
      const foerste = mangler.find((m) => m.post !== null);
      if (foerste) postliste?.velg(foerste.post!);
      await tick();
      oppsummering?.focus();
      return;
    }
    const kommando = medTekstene(punktene.map((p) => p.punkt));
    const b = kjernesak.brev(kommando, undefined, true);
    const brevet = kontrollbrev(b);
    if (!brevet) {
      sendehindring =
        b && 'avvisning' in b && b.avvisning.regel === 'UGYLDIG_VURDERING'
          ? HOVEDLINJER.kanIkkeLages
          : (brevaarsak(b) ?? HOVEDLINJER.kanIkkeLages);
      // Fra den faste linja står hindringen utenfor syne; fokus viser den.
      await tick();
      document.getElementById(`${uid}-hindring`)?.focus();
      return;
    }
    onbrevkontroll({ kommando, ...brevet, detteSender: linjer, virkninger });
  }

  // Brevet leses i en ramme ved siden av skjemaet, og på smal skjerm i skjemaet, der høyre
  // kolonne står under arbeidet (oppdragsgiver 29.10, #1391).
  const vindu = medietreff('(max-width: 1180px)');
  const smal = $derived(vindu.treff);
  let leser = $state(false);
  const vedSiden = $derived(leser && !smal);
  $effect(() => {
    onvedsiden?.(vedSiden);
    return () => onvedsiden?.(false);
  });
  let panel = $state<HTMLElement | null>(null);
  const linja = fastLinje(
    uid,
    () => panel,
    () => stopp !== null || vedSiden
  );
</script>

{#snippet kravbrev(innfelt: boolean)}
  <Brev
    avsender={kravbrevet.avsender}
    sak={kjernesak.saksbilde?.tittel ?? ''}
    merking={kravbrevet.merking}
    deresRef={kravbrevet.deresRef}
    dato={dato(kravbrevet.registrert)}
    tittel={brevtittel(kravbrevet)}
    avsnitt={kravbrevet.avsnitt ?? []}
    {innfelt}
  />
{/snippet}

{#snippet sendeknapp()}
  <div class="handling">
    <Knapp
      variant="primaer"
      onclick={seBrevet}
      aria-describedby={sendehindring ? `${uid}-hindring` : undefined}>{HOVEDLINJER.seBrevet}</Knapp
    >
  </div>
  {#if sendehindring}
    <Melding art="feil" levende={false} id={`${uid}-hindring`} tabindex="-1"
      >{sendehindring}</Melding
    >
  {/if}
{/snippet}

<Arbeidsflate leser={vedSiden}>
  {#snippet hoved()}
    <Utkastkort
      id={`${uid}-tittel`}
      tittel={brevMedTekst
        ? brevhode({
            merking: brevMedTekst.merking,
            art: 'svar',
            brevtittel: brevMedTekst.brevtittel,
          })
        : null}
      mottaker={SKJEMA.tilTE}
    >
      {#snippet infotips()}<Infotips navn={SKJEMA.omSvaret} tekst={VIRKNING.alltid} />{/snippet}
      <div class="svarerpaa">
        <FileText size={16} aria-hidden="true" />
        <span>{SKJEMA.svarerPaa(kravbrevet)}</span>
        <Knapp
          variant="lenke"
          onclick={() => (leser = !leser)}
          aria-expanded={leser}
          aria-controls={`${uid}-kravbrev`}
        >
          {leser ? SKJEMA.lukkBrevet : smal ? SKJEMA.lesBrevetHer : SKJEMA.lesBrevet}
        </Knapp>
      </div>
      {#if leser && smal}
        <div class="innebrev" id={`${uid}-kravbrev`}>{@render kravbrev(false)}</div>
      {/if}

      {#if stopp !== null}
        <div class="ikke-stoettet" role="note">
          <Info size={18} aria-hidden="true" />
          <p>{stopp}</p>
        </div>
      {:else}
        {#if forsoekt && mangler.length}
          <div
            class="mangler"
            role="group"
            tabindex="-1"
            bind:this={oppsummering}
            aria-labelledby={`${uid}-mangler`}
          >
            <p id={`${uid}-mangler`}>{SKJEMA.mangler}</p>
            <ul>
              {#each mangler as m (m.felt)}
                <li>
                  <a
                    href={`#${m.felt}`}
                    onclick={(e) => {
                      if (m.post === null || !postliste || postliste.erAapen(m.post)) return;
                      e.preventDefault();
                      postliste.aapne(m.post, m.felt);
                    }}>{m.tekst}</a
                  >
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        {@render spoersmaal(feil)}

        <section class="begrunnelser" aria-labelledby={`${uid}-sp-begrunnelse`}>
          <h3 id={`${uid}-sp-begrunnelse`}>{SKJEMA.begrunnelse}</h3>
          <p class="dempet" id={`${uid}-begrunnelse-hjelp`}>{SKJEMA.begrunnelseHjelp}</p>
          {#each punktene as p (p.punkt)}
            <div class="begrunnelse">
              <label for={`${uid}-begrunnelse-${p.punkt}`}>{p.navn}</label>
              <textarea
                id={`${uid}-begrunnelse-${p.punkt}`}
                rows="2"
                bind:value={tekster.begrunnelser[p.punkt]}
                aria-describedby={`${uid}-begrunnelse-hjelp`}
              ></textarea>
            </div>
          {/each}
          <div class="begrunnelse forbehold">
            <label for={`${uid}-forbehold`}>{SKJEMA.forbehold}</label>
            <span class="dempet" id={`${uid}-forbehold-hjelp`}>{SKJEMA.forbeholdHjelp}</span>
            <textarea
              id={`${uid}-forbehold`}
              rows="3"
              bind:value={tekster.forbehold}
              aria-describedby={`${uid}-forbehold-hjelp`}
            ></textarea>
          </div>
        </section>
      {/if}

      <div class="skjemafot">
        <Forkastutkast tekst={FRISTSVAR.forkastTekst} {onforkast} />
      </div>
    </Utkastkort>
  {/snippet}

  {#snippet hoeyre()}
    {#if vedSiden}
      <section class="leseramme" id={`${uid}-kravbrev`} aria-labelledby={`${uid}-lesetittel`}>
        <h2 class="lesetittel" id={`${uid}-lesetittel`}>
          {brevhode(kravbrevet)}
          <span class="dempet">· {kravbrevet.avsender} · {dato(kravbrevet.registrert)}</span>
        </h2>
        <!-- Rammen ruller for seg selv, så den må kunne nås med tastaturet. -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div class="brevrulle" tabindex="0" role="region" aria-labelledby={`${uid}-lesetittel`}>
          {@render kravbrev(true)}
        </div>
        {#if stopp === null}<div class="lesebunn">{@render sendeknapp()}</div>{/if}
      </section>
    {:else}
      <div class="feste" class:fast={linja.faarPlass} bind:this={panel}>
        <Hovedlinjer {linjer} {alternativer} handling={stopp === null ? sendeknapp : undefined} />
      </div>
      <Tidslinje brev={sporbrev} {datoer} />
    {/if}
  {/snippet}
</Arbeidsflate>

{#if linja.visKompakt}
  <div class="kompakt" role="region" aria-label={SVARSKJEMA.kompaktLinje}>
    <Knapp variant="primaer" onclick={seBrevet}>{HOVEDLINJER.seBrevet}</Knapp>
    <Knapp onclick={() => panel?.scrollIntoView({ block: 'start' })}
      >{HOVEDLINJER.seHovedlinjene}</Knapp
    >
  </div>
{/if}

<style>
  .svarerpaa {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-3) var(--spacing-6);
    background: var(--surface-inset);
    border-top: var(--rule);
    border-bottom: var(--rule);
  }
  .svarerpaa > span {
    margin-right: auto;
  }
  .begrunnelser {
    padding: var(--spacing-5) var(--spacing-6);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }
  h3 {
    font-size: 16px;
    font-weight: 600;
    color: var(--ink);
  }
  .begrunnelse {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }
  /* Feltnavnet er punktet i brevet, under overskriften «Begrunnelse» (design-review #1858). */
  .begrunnelse label {
    font-size: 15px;
    color: var(--ink-2);
  }
  /* Forbeholdet gjelder hele svaret og står sist i brevet, skilt fra punktene. */
  .begrunnelse.forbehold {
    margin-top: var(--spacing-3);
    padding-top: var(--spacing-4);
    border-top: var(--rule);
  }
  .begrunnelse.forbehold label {
    font-size: 16px;
    font-weight: 600;
    color: var(--ink);
  }
  textarea {
    padding: var(--spacing-3);
    border: var(--control-border);
    border-radius: var(--r-felt);
    font: inherit;
    background: var(--surface);
    resize: vertical;
  }
  textarea:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  /* En melding om prøven, ikke en feil og ikke et utkast: blekk i kanten, ingen farge (#1391). */
  .ikke-stoettet {
    display: flex;
    gap: var(--spacing-3);
    margin: var(--spacing-5) var(--spacing-6);
    padding: var(--spacing-4);
    border-left: 3px solid var(--ink);
    background: var(--surface-inset);
    color: var(--ink);
  }
  .ikke-stoettet :global(svg) {
    flex: none;
    margin-top: 3px;
  }
  .mangler {
    margin: var(--spacing-5) var(--spacing-6) 0;
    padding: var(--spacing-4);
    border-left: 3px solid var(--danger);
    background: var(--danger-bg);
  }
  .mangler:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .mangler p {
    font-weight: 600;
  }
  .mangler ul {
    margin-top: var(--spacing-2);
    padding-left: var(--spacing-5);
    list-style: disc;
  }
  .mangler a {
    color: var(--ink);
    text-underline-offset: 3px;
  }
  .mangler a:hover {
    text-decoration-thickness: 2px;
  }
  .skjemafot {
    padding: var(--spacing-3) var(--spacing-6) var(--spacing-4);
    border-top: var(--rule);
  }
  .innebrev {
    padding: var(--spacing-4) var(--spacing-4) 0;
  }
  .dempet {
    color: var(--ink-3);
    font-size: 14px;
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
  /* Lesing ved siden av: rammen følger brevet og er høyst like høy som vinduet, med luften over
     og under. Et lengre brev ruller i den, og «Se brevet før sending» står fast i bunnen
     (oppdragsgiver 29.10, #1391, #1983). */
  .leseramme {
    position: sticky;
    top: var(--spacing-4);
    display: flex;
    flex-direction: column;
    max-height: calc(100dvh - 2 * var(--spacing-4));
    background: var(--surface);
    border: var(--rule);
    border-radius: var(--r-kort);
    overflow: hidden;
  }
  .lesetittel {
    padding: var(--spacing-3) var(--spacing-5);
    border-bottom: var(--rule);
    font-size: 16px;
    font-weight: 600;
  }
  .lesetittel .dempet {
    font-weight: 400;
  }
  .brevrulle {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }
  .brevrulle:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: -2px;
  }
  .lesebunn {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    padding: var(--spacing-4) var(--spacing-5) var(--spacing-5);
    border-top: var(--rule);
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
