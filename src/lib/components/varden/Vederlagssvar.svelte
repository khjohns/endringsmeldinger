<!--
  BH skriver svar på krav om vederlag (Varden, skjerm B). Skjemaet vurderer, panelet viser
  hovedlinjene slik kjernen forhåndsviser svaret, og brevet viser alt (prinsipp 3). Ingenting
  er forhåndsvalgt. Kommandoen bygges i `kommandoer.ts`, og kjernen regner resultatet, lager
  brevet og avviser det den ikke godtar.

  Handlingene (oppdragsgiver 29.10, #1391): «Se brevet før sending» står bare i panelet og er
  alltid aktiv. Mangler et svar, vises ikke brevet, og det som mangler, står ved feltet og
  øverst i skjemaet (MM-U32, BF-01 S-3 med reserven B, fordi kjernen ikke lager tekst for et
  ufullstendig svar). «Forkast utkast» står nederst i skjemaet og spør først.
-->
<script lang="ts">
  import { BookOpen, FileText, Info, Lock } from 'lucide-svelte';
  import { tick } from 'svelte';
  import { brevaarsak, type Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';
  import { VIRKNING } from '$lib/kjernesak/svarvirkning';
  import { lesKroner } from '$lib/utils/belop';
  import type { Utledning } from '$kjerne/utledning/utled';
  import Arbeidsflate from './Arbeidsflate.svelte';
  import Brev from './Brev.svelte';
  import Hovedlinjer from './Hovedlinjer.svelte';
  import Knapp from './Knapp.svelte';
  import Tidslinje from './Tidslinje.svelte';
  import Valg from './Valg.svelte';
  import { tomtSvar, vederlagssvaret, type Svarvalg } from './kommandoer';
  import { brevene, oppgitteDatoer, standpunktene } from './lesing';
  import {
    BREVKONTROLL,
    HOVEDLINJER,
    SKJEMA,
    brevtittel,
    dato,
    kalenderdager,
    standpunkttekst,
  } from './prototypetekst';

  let {
    kjernesak,
    u,
    valg = $bindable(tomtSvar()),
    onbrevkontroll,
    onforkast,
    onvedsiden,
  }: {
    kjernesak: Kjernesakkontekst;
    u: Utledning;
    /** Valgene står når BH går til brevkontrollen og tilbake. */
    valg?: Svarvalg;
    onbrevkontroll: (k: {
      kommando: Record<string, unknown>;
      tekst: string[];
      utdypning?: string;
      detteSender: { tekst: string; lag: string | null }[];
      virkninger: string[];
    }) => void;
    /** BH har bekreftet at utkastet skal forkastes. */
    onforkast: () => void;
    /** Brevet leses i en ramme ved siden av skjemaet, eller ikke lenger. */
    onvedsiden?: (vedSiden: boolean) => void;
  } = $props();
  const uid = $props.id();

  const krav = $derived(u.spor.vederlag.gjeldendeKrav!);
  const krevd = $derived(krav.innhold.beloep as number);
  const alleBrev = $derived(brevene(u));
  const kravbrevet = $derived(alleBrev.find((b) => b.id === krav.dokument)!);
  const sporbrev = $derived(alleBrev.filter((b) => b.spor.includes('vederlag')));
  const datoer = $derived(oppgitteDatoer(u));
  const klarOver = $derived(datoer.find((d) => d.hva === 'klar_over_forholdet'));
  const harPost = $derived(
    (krav.innhold.saerskilt as { produktivitet?: unknown } | undefined)?.produktivitet !== undefined
  );

  const kommando = $derived(vederlagssvaret(valg, u, kjernesak.regler)!);
  const etter = $derived(kjernesak.forhaandsvist(kommando));
  const nyttSvar = $derived.by(() => {
    const s = etter?.spor.vederlag.gjeldendeSvar;
    return s && !u.spor.vederlag.svar.some((x) => x.id === s.id) ? s : null;
  });
  const linjer = $derived(
    nyttSvar
      ? standpunktene(nyttSvar, u).map(({ standpunkt, lag }) => ({
          tekst: standpunkttekst(
            standpunkt,
            true,
            standpunkt.art === 'beloep' && !standpunkt.saerskilt ? krevd : undefined
          ),
          lag,
        }))
      : []
  );
  // Beløp i mer enn ett lag er alternativer, ikke tillegg (Varden, skjerm B).
  const alternativer = $derived(
    new Set(
      nyttSvar
        ? standpunktene(nyttSvar, u)
            .filter((s) => s.lag && s.standpunkt.art === 'beloep')
            .map((s) => s.lag)
        : []
    ).size > 1
  );
  const delbeloep = $derived(lesKroner(valg.delbeloep));
  // Med `sendes` avviser kjernen også et svar uten begrunnelse der kontrakten krever den.
  const avvisning = $derived.by(() => {
    const b = kjernesak.brev(kommando, undefined, true);
    return b && 'avvisning' in b ? b.avvisning : null;
  });
  // Det som mangler, med skjemaets ord. Kjernen avviser det samme med feltkoder.
  const delbeloepFeil = $derived(
    valg.beloep !== 'deler'
      ? null
      : 'feil' in delbeloep
        ? delbeloep.feil
        : delbeloep.verdi === undefined
          ? SKJEMA.manglerDelbeloep
          : delbeloep.verdi <= 0 || delbeloep.verdi >= krevd
            ? HOVEDLINJER.beloepUtenfor(krevd)
            : null
  );
  const mangler = $derived(
    [
      { felt: `${uid}-itide`, tekst: valg.iTide === null ? SKJEMA.manglerITide : null },
      { felt: `${uid}-metode`, tekst: valg.metode === null ? SKJEMA.manglerMetode : null },
      {
        felt: `${uid}-oensket`,
        tekst: valg.metode === false && valg.oensket === null ? SKJEMA.manglerOensket : null,
      },
      { felt: `${uid}-beloep`, tekst: valg.beloep === null ? SKJEMA.manglerBeloep : null },
      { felt: `${uid}-delbeloep`, tekst: delbeloepFeil },
      // KA-U24: kjernen sier når svaret må ha en begrunnelse, og hvorfor.
      {
        felt: `${uid}-begrunnelse`,
        tekst: avvisning?.regel === 'BEGRUNNELSE_MANGLER' ? avvisning.melding : null,
      },
    ].filter((m): m is { felt: string; tekst: string } => m.tekst !== null)
  );
  // Beskjedene vises først når BH har prøvd å se brevet (MM-U32), og forsvinner når feltet er besvart.
  let forsoekt = $state(false);
  const feil = (felt: string) =>
    forsoekt ? (mangler.find((m) => m.felt === `${uid}-${felt}`)?.tekst ?? null) : null;
  const begrunnelseFeil = $derived(feil('begrunnelse'));
  let oppsummering = $state<HTMLElement | null>(null);
  let sendehindring = $state<string | null>(null);

  const virkninger = $derived([
    VIRKNING.alltid,
    ...(nyttSvar?.beslutningsgrunnlag.sammenfall ? [VIRKNING.sammenfall] : []),
    ...(!u.spor.grunnlag.gjeldendeSvar && !u.frafalt ? [VIRKNING.forbehold] : []),
    ...(nyttSvar?.standpunkter.some((s) => s.art === 'rettidighet' && !s.iTide)
      ? [BREVKONTROLL.akseptOmfatter]
      : []),
  ]);

  async function seBrevet() {
    sendehindring = null;
    if (mangler.length) {
      forsoekt = true;
      await tick();
      oppsummering?.focus();
      return;
    }
    const b = kjernesak.brev(kommando, undefined, true);
    if (!b || !('tekst' in b) || !b.tekst) {
      sendehindring =
        b && 'avvisning' in b && b.avvisning.regel === 'UGYLDIG_VURDERING'
          ? HOVEDLINJER.kanIkkeLages
          : (brevaarsak(b) ?? HOVEDLINJER.kanIkkeLages);
      return;
    }
    onbrevkontroll({
      kommando,
      tekst: b.tekst,
      utdypning: kommando.svar[0].utdypning,
      detteSender: linjer,
      virkninger,
    });
  }

  let bekreftForkast = $state(false);
  let forkastSpoersmaal = $state<HTMLElement | null>(null);
  async function spoerOmForkast() {
    bekreftForkast = true;
    await tick();
    forkastSpoersmaal?.focus();
  }
  async function behold() {
    bekreftForkast = false;
    await tick();
    document.getElementById(`${uid}-forkast`)?.focus();
  }

  // Brevet leses i en ramme ved siden av skjemaet, og på smal skjerm i skjemaet, der
  // høyre kolonne står under arbeidet (oppdragsgiver 29.10, #1391).
  let smal = $state(false);
  $effect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(max-width: 1023px)');
    const sett = () => (smal = mq.matches);
    sett();
    mq.addEventListener('change', sett);
    return () => mq.removeEventListener('change', sett);
  });
  let leser = $state(false);
  $effect(() => {
    onvedsiden?.(leser && !smal);
    return () => onvedsiden?.(false);
  });

  // Panelet følger rullingen bare når det får plass i vinduet; ellers vises en kompakt linje
  // nederst når panelet er ute av syne (skjerm E).
  let panel = $state<HTMLElement | null>(null);
  let faarPlass = $state(true);
  let iSyne = $state(true);
  // Panelet fjernes når brevet leses ved siden av, så målingen bindes på nytt hver gang det
  // settes inn.
  $effect(() => {
    const el = panel;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const maal = () => (faarPlass = el.offsetHeight + 32 <= window.innerHeight);
    const ro = new ResizeObserver(maal);
    ro.observe(el);
    window.addEventListener('resize', maal);
    const io =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([e]) => (iSyne = e.isIntersecting));
    io?.observe(el);
    maal();
    return () => {
      ro.disconnect();
      io?.disconnect();
      window.removeEventListener('resize', maal);
    };
  });
</script>

{#snippet kravbrev(innfelt: boolean)}
  <Brev
    avsender={kravbrevet.avsender}
    sak={kjernesak.saksbilde?.tittel ?? ''}
    nummer={String(kravbrevet.nummer)}
    dato={dato(kravbrevet.registrert)}
    tittel={brevtittel(kravbrevet)}
    avsnitt={kravbrevet.avsnitt ?? []}
    {innfelt}
  />
{/snippet}

{#snippet sendeknapp()}
  <p class="sterk">{VIRKNING.alltid}</p>
  <Knapp variant="primaer" onclick={seBrevet}>{HOVEDLINJER.seBrevet}</Knapp>
  {#if sendehindring}<p class="feil" role="alert">{sendehindring}</p>{/if}
{/snippet}

<Arbeidsflate leser={leser && !smal}>
  {#snippet hoved()}
    <form class="utkast" aria-labelledby={`${uid}-tittel`} onsubmit={(e) => e.preventDefault()}>
      <header class="utkasthode">
        <h2 class="tittel" id={`${uid}-tittel`}>
          <span class="merke-utkast">{BREVKONTROLL.utkast}</span>
          <span
            >Brev {(kjernesak.versjon ?? 0) + 1} · {brevtittel({
              art: 'svar',
              spor: ['vederlag'],
            })}</span
          >
        </h2>
        <p class="dempet">Til entreprenøren (TE)</p>
        <p class="dempet synlig"><Lock size={14} aria-hidden="true" />{SKJEMA.synlig}</p>
      </header>
      <div class="svarerpaa">
        <FileText size={16} aria-hidden="true" />
        <span>{SKJEMA.svarerPaa(kravbrevet.nummer, kravbrevet.registrert)}</span>
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

      {#if harPost}
        <div class="ikke-stoettet" role="note">
          <Info size={18} aria-hidden="true" />
          <p>{SKJEMA.ikkeStoettet}</p>
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
                <li><a href={`#${m.felt}`}>{m.tekst}</a></li>
              {/each}
            </ul>
          </div>
        {/if}
        <section class="spoersmaal" aria-labelledby={`${uid}-sp-varsel`}>
          <div class="sp-hode">
            <h3 id={`${uid}-sp-varsel`}>{SKJEMA.varselTittel}</h3>
            <span class="hjemmel"><BookOpen size={14} aria-hidden="true" />§ 34.1.2</span>
          </div>
          <div class="datoer">
            {#if klarOver}<p>{SKJEMA.klarOver(klarOver.dato, klarOver.brev)}</p>{/if}
            <p>{SKJEMA.kravSendt(kravbrevet.registrert, kravbrevet.nummer)}</p>
            {#if klarOver}
              <p>
                <strong
                  >{SKJEMA.avstand(kalenderdager(klarOver.dato, kravbrevet.registrert))}</strong
                >
              </p>
            {/if}
            <p class="dempet">{SKJEMA.datoGrense}</p>
          </div>
          <Valg
            navn={`${uid}-itide`}
            spoersmaal={SKJEMA.varselSpoersmaal}
            valg={[
              { verdi: true, tekst: SKJEMA.iTide },
              { verdi: false, tekst: SKJEMA.forSent },
            ]}
            bind:verdi={valg.iTide}
            feil={feil('itide')}
          />
        </section>

        <section class="spoersmaal" aria-labelledby={`${uid}-sp-metode`}>
          <div class="sp-hode">
            <h3 id={`${uid}-sp-metode`}>{SKJEMA.metodeTittel}</h3>
            <span class="hjemmel"><BookOpen size={14} aria-hidden="true" />§ 34.2</span>
          </div>
          <Valg
            navn={`${uid}-metode`}
            spoersmaal={SKJEMA.metodeSpoersmaal(krav.innhold.metode)}
            valg={[
              { verdi: true, tekst: SKJEMA.godtarMetode },
              { verdi: false, tekst: SKJEMA.godtarIkkeMetode },
            ]}
            bind:verdi={valg.metode}
            feil={feil('metode')}
          />
          {#if valg.metode === false}
            <Valg
              navn={`${uid}-oensket`}
              spoersmaal={SKJEMA.oensketSpoersmaal}
              valg={[
                { verdi: 'enhetspriser', tekst: 'Enhetspriser (§ 34.3)' },
                { verdi: 'regningsarbeid', tekst: 'Regningsarbeid (§ 34.4)' },
              ]}
              bind:verdi={valg.oensket}
              feil={feil('oensket')}
            />
          {/if}
        </section>

        <section class="spoersmaal" aria-labelledby={`${uid}-sp-beloep`}>
          <div class="sp-hode">
            <h3 id={`${uid}-sp-beloep`}>{SKJEMA.beloepTittel(krevd)}</h3>
            <span class="hjemmel"><BookOpen size={14} aria-hidden="true" />§ 34.1</span>
          </div>
          {#if valg.iTide === false}
            <!-- Forutsetningene for laget, ett per linje (oppdragsgiver 30.10, #1391). Lagene
                 fra grunnlaget og et delvis svar venter på kjernen (#1400). -->
            <div class="forutsetninger" id={`${uid}-beloep-forutsetninger`}>
              <p>{SKJEMA.gjelderHvis}</p>
              <ul>
                <li>
                  <a href={`#${uid}-itide`}>{SKJEMA.innsigelsenSenVarsling}</a>
                  {SKJEMA.ikkeFoererFrem}
                </li>
              </ul>
            </div>
          {/if}
          <Valg
            navn={`${uid}-beloep`}
            spoersmaal={SKJEMA.beloepSpoersmaal}
            beskrevetAv={valg.iTide === false ? `${uid}-beloep-forutsetninger` : undefined}
            valg={[
              { verdi: 'hele', tekst: SKJEMA.hele },
              { verdi: 'deler', tekst: SKJEMA.deler },
              { verdi: 'ingenting', tekst: SKJEMA.ingenting },
            ]}
            bind:verdi={valg.beloep}
            feil={feil('beloep')}
          />
          {#if valg.beloep === 'deler'}
            {@const beloepFeil = feil('delbeloep')}
            <div class="beloepfelt">
              <label for={`${uid}-delbeloep`}>{SKJEMA.belopEtikett}</label>
              <span id={`${uid}-beloep-hjelp`} class="dempet">{SKJEMA.belopHjelp(krevd)}</span>
              <span class="inndata" class:ugyldig={beloepFeil}>
                <input
                  id={`${uid}-delbeloep`}
                  inputmode="decimal"
                  bind:value={valg.delbeloep}
                  aria-describedby={beloepFeil
                    ? `${uid}-beloep-hjelp ${uid}-beloep-feil`
                    : `${uid}-beloep-hjelp`}
                  aria-invalid={beloepFeil ? 'true' : undefined}
                />
                <span class="kr" aria-hidden="true">kr</span>
              </span>
              {#if beloepFeil}<p class="feilmelding" id={`${uid}-beloep-feil`}>{beloepFeil}</p>{/if}
            </div>
          {/if}
        </section>

        <section class="spoersmaal">
          <div class="begrunnelse">
            <label for={`${uid}-begrunnelse`} class="h3">{SKJEMA.begrunnelse}</label>
            <span class="dempet" id={`${uid}-begrunnelse-hjelp`}>{SKJEMA.begrunnelseHjelp}</span>
            <textarea
              id={`${uid}-begrunnelse`}
              class:ugyldig={begrunnelseFeil}
              rows="5"
              bind:value={valg.begrunnelse}
              aria-describedby={begrunnelseFeil
                ? `${uid}-begrunnelse-hjelp ${uid}-begrunnelse-feil`
                : `${uid}-begrunnelse-hjelp`}
              aria-invalid={begrunnelseFeil ? 'true' : undefined}
            ></textarea>
            {#if begrunnelseFeil}<p class="feilmelding" id={`${uid}-begrunnelse-feil`}>
                {begrunnelseFeil}
              </p>{/if}
          </div>
        </section>
      {/if}

      <div class="skjemafot">
        {#if bekreftForkast}
          <div class="bekreft" role="group" aria-labelledby={`${uid}-forkast-spoersmaal`}>
            <p id={`${uid}-forkast-spoersmaal`} tabindex="-1" bind:this={forkastSpoersmaal}>
              {SKJEMA.forkastSpoersmaal}
            </p>
            <div class="knapper">
              <Knapp onclick={onforkast}>{SKJEMA.forkastJa}</Knapp>
              <Knapp variant="lenke" onclick={behold}>{SKJEMA.behold}</Knapp>
            </div>
          </div>
        {:else}
          <Knapp variant="lenke" id={`${uid}-forkast`} onclick={spoerOmForkast}
            >{SKJEMA.forkast}</Knapp
          >
        {/if}
      </div>
    </form>
  {/snippet}

  {#snippet hoeyre()}
    {#if leser && !smal}
      <section class="leseramme" id={`${uid}-kravbrev`} aria-labelledby={`${uid}-lesetittel`}>
        <h2 class="lesetittel" id={`${uid}-lesetittel`}>
          Brev {kravbrevet.nummer} · {brevtittel(kravbrevet)}
          <span class="dempet">· {kravbrevet.avsender} · {dato(kravbrevet.registrert)}</span>
        </h2>
        <!-- Rammen ruller for seg selv, så den må kunne nås med tastaturet. -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div class="brevrulle" tabindex="0" role="region" aria-labelledby={`${uid}-lesetittel`}>
          {@render kravbrev(true)}
        </div>
        {#if !harPost}<div class="lesebunn">{@render sendeknapp()}</div>{/if}
      </section>
    {:else}
      <div class="feste" class:fast={faarPlass} bind:this={panel}>
        <Hovedlinjer {linjer} {alternativer} handling={harPost ? undefined : sendeknapp} />
      </div>
      <Tidslinje brev={sporbrev} datoer={datoer.filter((d) => d.spor.includes('grunnlag'))} />
    {/if}
  {/snippet}
</Arbeidsflate>

{#if !harPost && !faarPlass && !iSyne && !(leser && !smal)}
  <div class="kompakt" role="region" aria-label="Hovedlinjene og brevkontrollen">
    <Knapp onclick={() => panel?.scrollIntoView({ block: 'start' })}>Se hovedlinjene</Knapp>
    <Knapp variant="primaer" onclick={seBrevet}>{HOVEDLINJER.seBrevet}</Knapp>
  </div>
{/if}

<style>
  .utkast {
    background: var(--surface);
    border: 1.5px dashed var(--draft-border);
    border-radius: 12px;
  }
  .utkasthode {
    background: var(--draft-bg);
    border-radius: 10.5px 10.5px 0 0;
    padding: var(--spacing-5) var(--spacing-6);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }
  .tittel {
    display: flex;
    line-height: 1.4;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-3);
    font-size: 20px;
    font-weight: 600;
  }
  .merke-utkast {
    padding: 0 var(--spacing-2);
    border: 1px dashed var(--draft-border);
    border-radius: 999px;
    background: var(--surface);
    font-size: 12px;
    font-weight: 500;
  }
  .synlig {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
  }
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
  .spoersmaal {
    padding: var(--spacing-5) var(--spacing-6);
    border-bottom: var(--rule);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }
  .spoersmaal:last-child {
    border-bottom: 0;
  }
  .sp-hode {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }
  h3,
  .h3 {
    font-size: 16px;
    font-weight: 600;
    color: var(--ink);
  }
  .hjemmel {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
    padding: 0 var(--spacing-2);
    border: var(--rule-strong);
    border-radius: 999px;
    color: var(--ink-2);
    font-size: 12px;
  }
  /* Subsidiært har ingen farge; laget skilles med kantlinjen og teksten (#197). */
  .forutsetninger {
    padding: var(--spacing-1) 0 var(--spacing-1) var(--spacing-3);
    border-left: 3px solid var(--ink-3);
    color: var(--ink-2);
    font-size: 14px;
  }
  .forutsetninger p {
    font-weight: 600;
    color: var(--ink);
  }
  .forutsetninger ul {
    margin: var(--spacing-1) 0 0;
    padding-left: var(--spacing-5);
    list-style: disc;
  }
  .forutsetninger a {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .datoer {
    padding: var(--spacing-3) var(--spacing-4);
    background: var(--surface-inset);
    border-radius: 4px;
    font-size: 14px;
  }
  .beloepfelt,
  .begrunnelse {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }
  .inndata {
    display: inline-flex;
    align-items: stretch;
    width: 220px;
    border: var(--control-border);
    border-radius: 4px;
  }
  .inndata:focus-within,
  textarea:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .inndata input {
    flex: 1;
    min-width: 0;
    min-height: 44px;
    padding: 0 var(--spacing-3);
    border: 0;
    text-align: right;
    font: inherit;
    font-variant-numeric: tabular-nums;
    background: var(--surface);
    outline: none;
  }
  .kr {
    display: flex;
    align-items: center;
    padding: 0 var(--spacing-3);
    border-left: var(--rule);
    color: var(--ink-3);
  }
  textarea {
    padding: var(--spacing-3);
    border: var(--control-border);
    border-radius: 4px;
    font: inherit;
    background: var(--surface);
    resize: vertical;
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
  .feilmelding {
    color: var(--danger);
    font-size: 14px;
    font-weight: 500;
  }
  .inndata.ugyldig,
  textarea.ugyldig {
    border-color: var(--danger);
    box-shadow: inset 0 0 0 1px var(--danger);
  }
  .skjemafot {
    padding: var(--spacing-3) var(--spacing-6) var(--spacing-4);
    border-top: var(--rule);
  }
  .bekreft {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    padding: var(--spacing-2) 0;
  }
  .bekreft p:focus {
    outline: none;
  }
  .knapper {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-3);
  }
  .innebrev {
    padding: var(--spacing-4) var(--spacing-4) 0;
  }
  .dempet {
    color: var(--ink-3);
    font-size: 14px;
  }
  .sterk {
    font-weight: 600;
    font-size: 14px;
  }
  .feil {
    padding: var(--spacing-3);
    background: var(--danger-bg);
    border: 1px solid var(--danger-border);
    border-radius: 4px;
    font-size: 14px;
  }
  .feste.fast {
    position: sticky;
    top: var(--spacing-4);
  }
  /* Lesing ved siden av: rammen følger brevet og er høyst like høy som vinduet under
     topplinja. Et lengre brev ruller i den, og «Se brevet før sending» står fast i bunnen
     (oppdragsgiver 29.10, #1391). */
  .leseramme {
    position: sticky;
    top: var(--spacing-4);
    display: flex;
    flex-direction: column;
    max-height: calc(100dvh - var(--mockup-topbar-height) - var(--spacing-10));
    background: var(--surface);
    border: var(--rule);
    border-radius: 12px;
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
